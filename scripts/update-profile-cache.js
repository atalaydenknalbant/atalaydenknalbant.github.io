const fs = require("node:fs/promises");
const path = require("node:path");

const cachePath = path.join(__dirname, "..", "assets", "profile-stats.json");
const username = "atalaydenknalbant";
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

const getPublicGithubRepoCount = async () => {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "atalay-portfolio-stats",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status}`);
  }

  const user = await response.json();
  return user.public_repos;
};

const getPublicHfSpaceCount = async () => {
  let count = 0;
  let url = `https://huggingface.co/api/spaces?author=${encodeURIComponent(username)}&limit=500`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Hugging Face request failed: ${response.status}`);
    }

    const spaces = await response.json();
    count += spaces.length;

    const linkHeader = response.headers.get("Link");
    const nextMatch = linkHeader && linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : null;
  }

  return count;
};

const updateProfileCache = async () => {
  const currentCache = await readCurrentCache();

  if (isFresh(currentCache) && process.env.PROFILE_REFRESH_FORCE !== "true") {
    console.log("Profile cache is newer than five days. No external request made.");
    return;
  }

  const [githubRepoCount, hfSpaceCount] = await Promise.all([
    getPublicGithubRepoCount(),
    getPublicHfSpaceCount(),
  ]);

  const nextCache = {
    updatedAt: new Date().toISOString(),
    source: "github_huggingface_public_api",
    githubRepoCount,
    hfSpaceCount,
  };

  await fs.writeFile(cachePath, `${JSON.stringify(nextCache, null, 2)}\n`, "utf8");
  console.log(`Profile cache updated with ${githubRepoCount} repos and ${hfSpaceCount} Spaces.`);
};

updateProfileCache().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
