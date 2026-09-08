const fs = require("node:fs/promises");
const path = require("node:path");
const { fresh, isPublishedPaper, serpRequest, titleKey } = require('./publication-utils.cjs');
const { checkScholar } = require('./check-scholar-publications.js');

const cachePath = path.join(__dirname, "..", "assets", "scholar-stats.json");
const authorId = "Mkpm2noAAAAJ";

const readCurrentCache = async () => {
  try {
    const raw = await fs.readFile(cachePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isFresh = (cache) => {
  if (!cache || cache.source === "manual") return false;

  return fresh(cache.updatedAt);
};

const sanitizeText = (value) => String(value || "").replace(/\u2026/g, "...");

const normalizeArticle = (article) => ({
  title: sanitizeText(article.title),
  year: sanitizeText(article.year),
  publication: sanitizeText(article.publication),
  link: sanitizeText(article.link),
  citationId: sanitizeText(article.citation_id),
  authors: sanitizeText(article.authors),
});

async function collectArticles(apiKey, request = serpRequest) {
  const articles = [];
  for (let start = 0; start < 2000; start += 100) {
    const payload = await request({ author_id: authorId, sort: 'pubdate', num: '100', start: String(start) }, apiKey);
    if (!Array.isArray(payload.articles) || !payload.articles.length) throw new Error('Missing Scholar articles; existing cache retained');
    articles.push(...payload.articles);
    if (!payload.serpapi_pagination?.next && !payload.serpapi_pagination?.next_link) {
      const seen = new Set();
      return articles.filter(isPublishedPaper).map(normalizeArticle).filter(paper => {
        const key = titleKey(paper.title);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }
  throw new Error('Scholar pagination exceeded limit; existing cache retained');
}

const updateScholarCache = async () => {
  const currentCache = await readCurrentCache();
  const check = await checkScholar();
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `increased=${check.increased}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,
    `Scholar free check: ${check.status}. Saved baseline: ${check.baseline}. Observed published count: ${check.count ?? 'unavailable'}. SerpApi permitted: ${check.increased}.\n`);
  console.log(`Free Scholar check: ${check.status}; count ${check.count ?? 'unavailable'}; baseline ${check.baseline}.`);
  if (!check.increased) {
    console.log('No confirmed publication increase. No SerpApi requests made.');
    return;
  }

  if (isFresh(currentCache) || fresh(currentCache?.lastAttemptAt)) {
    console.log("Scholar cache is newer than five days. No SerpApi request made.");
    return;
  }

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_KEY is not set.");
  }

  let papers;
  try { papers = await collectArticles(apiKey); }
  catch {
    await fs.writeFile(cachePath, JSON.stringify({ ...currentCache, lastAttemptAt: new Date().toISOString() }, null, 2) + '\n');
    console.warn('SerpApi refresh failed. Existing papers retained; retry after 5 days.');
    return;
  }

  const nextCache = {
    updatedAt: new Date().toISOString(),
    source: "serpapi_google_scholar_author",
    paperCount: papers.length,
    papers,
  };

  await fs.writeFile(cachePath, `${JSON.stringify(nextCache, null, 2)}\n`, "utf8");
  console.log(`Scholar cache updated with ${papers.length} papers.`);
};

module.exports = { collectArticles, isFresh };
if (require.main === module) updateScholarCache().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
