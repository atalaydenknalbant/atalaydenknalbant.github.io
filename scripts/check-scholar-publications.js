const fs = require('node:fs/promises');
const path = require('node:path');
const { load } = require('cheerio');
const { download, isPublishedPaper, titleKey } = require('./publication-utils.cjs');

function parseScholarPage(html) {
  const $ = load(html);
  if (!$('#gsc_a_b').length) throw new Error('Scholar publication table unavailable');
  const papers = [];
  $('#gsc_a_b .gsc_a_tr').each((_i, row) => {
    const title = $(row).find('.gsc_a_at').text().trim();
    if (!title) return;
    papers.push({ title, publication: $(row).find('.gs_gray').eq(1).text().trim() });
  });
  if (!papers.length) throw new Error('Scholar returned no readable papers');
  const button = $('#gsc_bpf_more');
  if (!button.length) throw new Error('Scholar pagination control unavailable');
  return { papers, more: !button.is('[disabled]') };
}

async function checkScholar({ directory = path.join(__dirname, '..'), get = download } = {}) {
  const cache = JSON.parse(await fs.readFile(path.join(directory, 'assets/scholar-stats.json'), 'utf8'));
  const catalog = JSON.parse(await fs.readFile(path.join(directory, 'assets/publications.json'), 'utf8'));
  const completed = catalog.papers.filter(p => p.curated || (p.detailsFetchedAt && p.status === 'published')).length;
  const baseline = Math.min(cache.paperCount, completed);
  try {
    const papers = [];
    for (let start = 0; start < 2000; start += 100) {
      const page = await get(`https://scholar.google.com/citations?user=Mkpm2noAAAAJ&hl=en&pagesize=100&cstart=${start}`);
      const parsed = parseScholarPage(page.bytes.toString('utf8'));
      papers.push(...parsed.papers);
      if (parsed.more) continue;
      const excluded = new Set(catalog.papers.filter(p => p.status === 'excluded').map(p => titleKey(p.title)));
      const count = new Set(papers.filter(isPublishedPaper).filter(p => !excluded.has(titleKey(p.title))).map(p => titleKey(p.title))).size;
      return { checkedAt: new Date().toISOString(), status: 'ok', count, baseline, increased: count > baseline };
    }
    throw new Error('Scholar pagination limit reached');
  } catch {
    return { checkedAt: new Date().toISOString(), status: 'unavailable', baseline, increased: false };
  }
}

module.exports = { parseScholarPage, checkScholar };
