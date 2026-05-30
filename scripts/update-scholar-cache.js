const fs = require("node:fs/promises");
const path = require("node:path");

const cachePath = path.join(__dirname, "..", "assets", "scholar-stats.json");
const authorId = "Mkpm2noAAAAJ";
const maxCacheAgeMs = 5 * 24 * 60 * 60 * 1000;

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

  const updatedAt = Date.parse(cache.updatedAt);
  if (Number.isNaN(updatedAt)) return false;

  return Date.now() - updatedAt < maxCacheAgeMs;
};

const sanitizeText = (value) => String(value || "").replace(/\u2026/g, "...");

const normalizeArticle = (article) => ({
  title: sanitizeText(article.title),
  year: sanitizeText(article.year),
  publication: sanitizeText(article.publication),
  link: sanitizeText(article.link),
  citationId: sanitizeText(article.citation_id),
});

const isPublishedPaper = (article) => {
  const combined = [
    article.title,
    article.publication,
    article.link,
    article.snippet,
  ].filter(Boolean).join(" ").toLowerCase();

  return !combined.includes("arxiv");
};

const updateScholarCache = async () => {
  const currentCache = await readCurrentCache();

  if (isFresh(currentCache) && process.env.SCHOLAR_REFRESH_FORCE !== "true") {
    console.log("Scholar cache is newer than five days. No SerpApi request made.");
    return;
  }

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_KEY is not set.");
  }

  const params = new URLSearchParams({
    engine: "google_scholar_author",
    author_id: authorId,
    api_key: apiKey,
  });

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`SerpApi request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(`SerpApi error: ${payload.error}`);
  }

  const papers = Array.isArray(payload.articles)
    ? payload.articles.filter((article) => article.title && isPublishedPaper(article)).map(normalizeArticle)
    : [];

  const nextCache = {
    updatedAt: new Date().toISOString(),
    source: "serpapi_google_scholar_author",
    paperCount: papers.length,
    papers,
  };

  await fs.writeFile(cachePath, `${JSON.stringify(nextCache, null, 2)}\n`, "utf8");
  console.log(`Scholar cache updated with ${papers.length} papers.`);
};

updateScholarCache().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
