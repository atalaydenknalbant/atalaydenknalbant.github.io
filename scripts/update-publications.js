const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { load } = require('cheerio');
const { text, titleKey, isPublishedPaper, fresh, publicUrl, download, serpRequest, publisherMetadata } = require('./publication-utils.cjs');

const root = path.join(__dirname, '..');
const escape = value => text(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const plain = value => text(load(String(value || ''), null, false).text());
const doiKey = value => text(value).replace(/^https?:\/\/(dx\.)?doi.org\//i, '').toLowerCase();
const samePaper = (a, b) => Boolean(a.citationId && a.citationId === b.citationId) || Boolean(titleKey(a.title) && titleKey(a.title) === titleKey(b.title)) || Boolean(a.doi && b.doi && doiKey(a.doi) === doiKey(b.doi));

function renderCard(paper, work) {
  const title = escape(paper.title);
  const link = escape(publicUrl(paper.publisherUrl) || publicUrl(paper.link));
  if (!link) return '';
  const image = /^assets\/publications\/[a-f0-9]+\.webp$/.test(paper.image || '') ? paper.image : '';
  const media = image
    ? `<img src="${image}" alt="Figure from ${title}" width="1200" height="750" loading="lazy" decoding="async">`
    : '<img src="assets/icons/book-open.svg" alt="" width="64" height="64" loading="lazy" style="object-fit:contain;padding:16px;box-sizing:border-box;filter:invert(1);opacity:0.65">';
  const info = escape([paper.year, paper.publication].filter(Boolean).join(' | '));
  const description = escape(paper.description || `Published in ${paper.publication}.`);
  return `<article class="${work ? 'featured-project' : 'research-card'}" data-publication-id="${escape(paper.citationId)}">
            ${work ? `<a class="featured-media" href="${link}" target="_blank" rel="noopener noreferrer" aria-label="Read ${title}">${media}</a>` : `<div class="publication-media">${media}</div>`}
            ${work ? `<p class="project-venue">${info}</p>` : `<span>${info}</span>`}
            <h3>${title}</h3>
            <p>${description}</p>
            <a${work ? ' class="text-link"' : ''} href="${link}" target="_blank" rel="noopener noreferrer">Read paper</a>
          </article>`;
}

function renderHtml(html, papers) {
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const automatic = papers.filter(p => !p.curated && p.status !== 'excluded' && isPublishedPaper(p))
    .sort((a,b) => Number(b.year || 0) - Number(a.year || 0) || a.title.localeCompare(b.title));
  for (const [name, work] of [['WORK', true], ['PUBLICATIONS', false]]) {
    const start = `<!-- AUTO-${name}:START -->`;
    const end = `<!-- AUTO-${name}:END -->`;
    if (html.split(start).length !== 2 || html.split(end).length !== 2 || html.indexOf(start) > html.indexOf(end)) throw new Error(`Missing or duplicate ${name} markers`);
    const contents = automatic.map(p => renderCard(p, work).replace(/\n/g, eol)).join(eol + '          ');
    html = html.slice(0, html.indexOf(start) + start.length) + eol + (contents ? '          ' + contents + eol : '') + '          ' + html.slice(html.indexOf(end));
  }
  return html;
}

async function enrich(paper, existing, { apiKey, request = serpRequest, get = download, now = new Date().toISOString(), saveImage } = {}) {
  let result = { ...paper, ...existing, lastAttemptAt: now };
  if (!result.detailsFetchedAt) {
    const payload = await request({ view_op: 'view_citation', citation_id: paper.citationId }, apiKey);
    const citation = payload.citation;
    if (!citation?.title) throw new Error('Citation metadata missing');
    const publication = text(citation.journal || citation.conference || citation.book || paper.publication);
    const publisherUrl = publicUrl(citation.link);
    result = { ...result, title: text(citation.title), publication, publisherUrl,
      authors: text(citation.authors || paper.authors), year: text(citation.publication_date).slice(0, 4) || paper.year,
      description: plain(citation.description).slice(0, 600), detailsFetchedAt: now };
    if (!isPublishedPaper({ ...result, link: publisherUrl, publisher: citation.publisher })) return { ...result, status: 'excluded', excludedSourcePublication: paper.publication };
  }
  result.status = 'published';
  if (!result.image && result.publisherUrl) {
    try {
      const page = await get(result.publisherUrl, 3 * 1024 * 1024);
      if (!/text\/html/i.test(page.type)) throw new Error('Publisher does not expose HTML');
      const metadata = publisherMetadata(page.bytes.toString('utf8'), page.url);
      result.doi = metadata.doi || result.doi;
      if (!result.description) result.description = metadata.description.slice(0, 600);
      for (const url of metadata.images) {
        try {
          const image = await get(url);
          if (!/^image\/(png|jpeg|webp)/i.test(image.type)) continue;
          const decoder = sharp(image.bytes, { limitInputPixels: 40000000 });
          const size = await decoder.metadata();
          if (size.width < 300 || size.height < 180 || size.width / size.height > 4) continue;
          const bytes = await decoder.resize({ width: 1200, height: 900, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
          result.image = await saveImage(bytes, result.citationId);
          result.imageSource = url;
          break;
        } catch { /* Try the next figure or article preview. */ }
      }
      result.imageStatus = result.image ? 'downloaded' : 'unavailable';
    } catch { result.imageStatus = 'unavailable'; }
  }
  return result;
}

async function syncPublications({ directory = root, request = serpRequest, get = download, apiKey = process.env.SERPAPI_KEY, now = new Date().toISOString() } = {}) {
  const catalogPath = path.join(directory, 'assets/publications.json');
  const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
  const scholar = JSON.parse(await fs.readFile(path.join(directory, 'assets/scholar-stats.json'), 'utf8'));
  if (!Array.isArray(scholar.papers) || !Array.isArray(catalog.papers)) throw new Error('Invalid publication cache');
  const htmlPath = path.join(directory, 'index.html');
  const html = await fs.readFile(htmlPath, 'utf8');
  renderHtml(html, catalog.papers); // Validate destinations before fetching or writing anything.
  const saveImage = async (bytes, id) => {
    const relative = `assets/publications/${crypto.createHash('sha256').update(id).digest('hex').slice(0,24)}.webp`;
    await fs.mkdir(path.dirname(path.join(directory, relative)), { recursive: true });
    await fs.writeFile(path.join(directory, relative), bytes);
    return relative;
  };
  let detailRequests = 0;
  for (const paper of scholar.papers.filter(isPublishedPaper)) {
    if (!paper.citationId) continue;
    const index = catalog.papers.findIndex(item => samePaper(item, paper));
    let existing = catalog.papers[index];
    if (!existing?.detailsFetchedAt && !existing?.curated && process.env.PUBLICATIONS_INCREASED === 'false') continue;
    if (existing?.curated || (existing?.image && existing?.detailsFetchedAt) || fresh(existing?.lastAttemptAt, Date.parse(now))) continue;
    if (existing?.status === 'excluded') {
      if (!existing.excludedSourcePublication || existing.excludedSourcePublication === paper.publication) continue;
      // Revisit an automatically excluded preprint when Scholar reports a new venue.
      existing = undefined;
    }
    if (!existing?.detailsFetchedAt && detailRequests >= 10) continue;
    let next;
    try {
      if (!existing?.detailsFetchedAt) detailRequests++;
      next = await enrich(paper, existing, { apiKey, request, get, now, saveImage });
    } catch {
      next = { ...paper, ...existing, lastAttemptAt: now, status: 'pending' };
      console.warn(`Citation metadata unavailable for ${paper.citationId}; retry in 5 days.`);
    }
    if (catalog.papers.some((item, i) => i !== index && samePaper(item, next))) continue;
    if (index >= 0) catalog.papers[index] = next;
    else catalog.papers.push(next);
  }
  // Pending entries use author-list metadata and a neutral icon until enrichment succeeds.
  let nextHtml = renderHtml(html, catalog.papers);
  const retained = scholar.papers.filter(p => !catalog.papers.some(item => item.status === 'excluded' && samePaper(item, p)));
  if (retained.length !== scholar.papers.length) {
    scholar.papers = retained;
    scholar.paperCount = retained.length;
    await fs.writeFile(path.join(directory, 'assets/scholar-stats.json'), JSON.stringify(scholar, null, 2) + '\n');
  }
  nextHtml = nextHtml.replace(/(<span id="publishedPaperCount">)\d+(<\/span>)/, `$1${scholar.paperCount}$2`);
  const serialized = JSON.stringify(catalog, null, 2) + '\n';
  if (serialized !== await fs.readFile(catalogPath, 'utf8')) await fs.writeFile(catalogPath, serialized);
  if (nextHtml !== html) await fs.writeFile(htmlPath, nextHtml);
  console.log(`Publication sync complete: ${catalog.papers.filter(p => p.status !== 'excluded').length} known papers; ${detailRequests} citation requests.`);
}

module.exports = { renderHtml, renderCard, enrich, syncPublications, samePaper };
if (require.main === module) syncPublications().catch(() => {
  console.error('Publication sync failed; check cache structure and HTML markers.');
  process.exitCode = 1;
});
