import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { fresh, isPublishedPaper, publicUrl, publisherMetadata } = require('../scripts/publication-utils.cjs');
const { collectArticles } = require('../scripts/update-scholar-cache.js');
const { renderHtml, enrich, syncPublications, samePaper } = require('../scripts/update-publications.js');
const sharp = require('sharp');
const { parseScholarPage, checkScholar } = require('../scripts/check-scholar-publications.js');
const now = '2026-09-07T10:00:00.000Z';
const paper = { citationId: 'author:new', title: 'New segmentation study', publication: 'IEEE Conference 2026', year: '2026', link: 'https://scholar.google.com/citations?citation_for_view=author:new' };
const template = '<main><!-- AUTO-WORK:START -->\n<!-- AUTO-WORK:END --><section><!-- AUTO-PUBLICATIONS:START -->\n<!-- AUTO-PUBLICATIONS:END --></section><p>Keep curated content</p></main>';

test('publication filtering excludes arXiv and unpublished records', () => {
  assert.ok(isPublishedPaper(paper));
  for (const publication of ['arXiv:123', 'bioRxiv preprint', 'Doctoral thesis', 'Working paper', '']) assert.equal(isPublishedPaper({ ...paper, publication }), false);
  assert.equal(isPublishedPaper({ ...paper, link: 'https://arxiv.org/abs/123' }), false);
});
test('5 day freshness includes future clock protection', () => {
  assert.ok(fresh('2026-09-03T10:00:00Z', Date.parse(now)));
  assert.equal(fresh('2026-09-02T10:00:00Z', Date.parse(now)), false);
  assert.equal(fresh('2027-09-02T10:00:00Z', Date.parse(now)), false);
});
test('free Scholar HTML parsing filters preprints and recognizes pagination', () => {
  const html = '<table><tbody id="gsc_a_b"><tr class="gsc_a_tr"><td><a class="gsc_a_at">Published study</a><div class="gs_gray">Author</div><div class="gs_gray">IEEE Conference</div></td></tr><tr class="gsc_a_tr"><td><a class="gsc_a_at">Preprint</a><div class="gs_gray">Author</div><div class="gs_gray">arXiv preprint</div></td></tr></tbody></table><button id="gsc_bpf_more" disabled>More</button>';
  const result = parseScholarPage(html);
  assert.equal(result.more, false);
  assert.equal(result.papers.filter(isPublishedPaper).length, 1);
  assert.throws(() => parseScholarPage('<h1>Access denied</h1>'), /unavailable/);
});
test('missing identifiers do not make unrelated papers duplicates', () => {
  assert.equal(samePaper({ title: 'Study A' }, { title: 'Study B' }), false);
});
test('pagination and duplicate titles do not inflate the count', async () => {
  const offsets = [];
  const papers = await collectArticles('test', async params => {
    offsets.push(params.start);
    return params.start === '0' ? { articles: [{ ...paper, citation_id: 'a' }], serpapi_pagination: { next: 'unused' } }
      : { articles: [{ ...paper, citation_id: 'b' }, { ...paper, title: 'Other study', citation_id: 'c' }, { ...paper, title: 'Preprint', publication: 'arxiv' }] };
  });
  assert.deepEqual(offsets, ['0', '100']);
  assert.equal(papers.length, 2);
  await assert.rejects(collectArticles('test', async () => ({})), /Missing/);
});
test('HTML rendering is idempotent, escaped and preserves curated content', () => {
  const html = renderHtml(template, [{ ...paper, title: '<script>alert(1)</script>', description: '<img src=x onerror=bad>' }]);
  assert.equal(renderHtml(html, [{ ...paper, title: '<script>alert(1)</script>', description: '<img src=x onerror=bad>' }]), html);
  assert.ok(html.includes('Keep curated content'));
  assert.equal((html.match(/data-publication-id=/g) || []).length, 2);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.throws(() => renderHtml('<main/>', []), /markers/);
});
test('URL and metadata parsing reject active URLs and prefer real figure candidates', () => {
  for (const url of ['javascript:alert(1)', 'file:///secret', 'http://example.com', 'https://user:pass@example.com', 'https://localhost/', 'https://example.com:8443']) assert.equal(publicUrl(url), '');
  const meta = publisherMetadata('<meta property="og:image" content="/logo.png"><figure><img src="/fig1.png"></figure><meta name="citation_doi" content="10.1/test">', 'https://publisher.example/paper');
  assert.deepEqual(meta.images, ['https://publisher.example/fig1.png']);
  assert.equal(meta.doi, '10.1/test');
  assert.ok(samePaper({ ...paper, doi: '10.1/X' }, { citationId: 'different', title: 'Other title', doi: 'https://doi.org/10.1/x' }));
});
test('citation enrichment downloads a validated figure and uses source description', async () => {
  const bytes = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#4499aa' } }).png().toBuffer();
  let saved = false;
  const result = await enrich(paper, null, { now, request: async () => ({ citation: { title: paper.title, conference: paper.publication, link: 'https://publisher.example/study', description: '<p>Actual abstract.</p>', authors: 'A. Author' } }),
    get: async url => url.endsWith('.png') ? { bytes, type: 'image/png', url } : { bytes: Buffer.from('<figure><img src="/figure.png"></figure>'), type: 'text/html', url },
    saveImage: async image => { saved = (await sharp(image).metadata()).format === 'webp'; return 'assets/publications/abc.webp'; } });
  assert.ok(saved);
  assert.equal(result.description, 'Actual abstract.');
  assert.equal(result.authors, 'A. Author');
  assert.equal(result.imageStatus, 'downloaded');
});
test('blocked publisher still produces metadata and a fallback, with no repeated detail call', async () => {
  const result = await enrich(paper, { ...paper, detailsFetchedAt: now, publisherUrl: 'https://publisher.example/study' }, {
    now, request: async () => { throw new Error('Should not call'); }, get: async () => { throw new Error('403'); },
  });
  assert.equal(result.imageStatus, 'unavailable');
  assert.ok(renderHtml(template, [result]).includes('book-open.svg'));
});

async function fixture(fn) {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-publications-'));
  try {
    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'index.html'), template);
    await writeFile(join(directory, 'assets/publications.json'), JSON.stringify({ papers: [{ citationId: 'old', title: 'Curated', curated: true }] }));
    await writeFile(join(directory, 'assets/scholar-stats.json'), JSON.stringify({ papers: [paper], paperCount: 1, updatedAt: now }));
    await fn(directory);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
test('failed free Scholar check never permits SerpApi', async () => fixture(async directory => {
  const result = await checkScholar({ directory, get: async () => { throw Error('403'); } });
  assert.equal(result.increased, false);
  assert.equal(result.status, 'unavailable');
}));
test('unchanged free publication count never permits SerpApi', async () => fixture(async directory => {
  const html = '<table><tbody id="gsc_a_b"><tr class="gsc_a_tr"><td><a class="gsc_a_at">Published study</a><div class="gs_gray">Author</div><div class="gs_gray">IEEE Conference</div></td></tr></tbody></table><button id="gsc_bpf_more" disabled>More</button>';
  const result = await checkScholar({ directory, get: async () => ({ bytes: Buffer.from(html) }) });
  assert.equal(result.increased, false);
  assert.equal(result.count, 1);
}));
test('new paper works even without count growth; repeated sync makes no requests or changes', async () => fixture(async directory => {
  let calls = 0;
  const options = { directory, now, request: async () => { calls++; return { citation: { title: paper.title, journal: paper.publication, description: 'Source abstract' } }; } };
  await syncPublications(options);
  const first = await readFile(join(directory, 'index.html'), 'utf8');
  const catalog = await readFile(join(directory, 'assets/publications.json'), 'utf8');
  await syncPublications(options);
  assert.equal(calls, 1);
  assert.equal(await readFile(join(directory, 'index.html'), 'utf8'), first);
  assert.equal(await readFile(join(directory, 'assets/publications.json'), 'utf8'), catalog);
  assert.ok(first.includes('New segmentation study'));
}));
test('citation errors retry only after 5 days and retain existing entries', async () => fixture(async directory => {
  let calls = 0;
  const options = { directory, now, request: async () => { calls++; throw new Error('Rate limit'); } };
  await syncPublications(options);
  await syncPublications(options);
  assert.equal(calls, 1);
  await syncPublications({ ...options, now: '2026-09-12T10:00:00.000Z' });
  assert.equal(calls, 2);
  const catalog = JSON.parse(await readFile(join(directory, 'assets/publications.json')));
  assert.equal(catalog.papers.length, 2);
}));
test('arxiv discovered in citation details is removed from automatic cards and metrics', async () => fixture(async directory => {
  await syncPublications({ directory, now, request: async () => ({ citation: { title: paper.title, journal: 'arXiv preprint', link: 'https://arxiv.org/abs/123' } }) });
  assert.ok(!(await readFile(join(directory, 'index.html'), 'utf8')).includes('New segmentation study'));
  const cache = JSON.parse(await readFile(join(directory, 'assets/scholar-stats.json')));
  assert.equal(cache.paperCount, 0);
}));
