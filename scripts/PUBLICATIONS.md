# Automatic Publications

## GitHub Setup

1. Commit and push the updated scripts, index.html markers, assets/publications.json, package files, tests, and workflow to main.
2. In Settings > Secrets and variables > Actions, set the repository secret SERPAPI_KEY. Never put the key in the HTML or JSON caches.
3. In Settings > Pages > Build and deployment > Source, select GitHub Actions.
4. In Settings > Actions > General > Workflow permissions, allow read and write permissions if your repository policy requires it. Branch rules must permit the workflow to push main; otherwise the commit step will fail rather than bypass protection.
5. In Actions, select Update Portfolio Stats and Run workflow on main.

The workflow runs daily at 05:18 UTC, but checks Scholar through SerpApi only when the stored cache is at least 5 days old. The current profile fits in 1 author request, approximately 6 requests per 30 days. On intervening days the stored timestamp prevents author requests. Direct Scholar scraping is not used.

The returned list excludes arXiv and other explicitly unpublished entries. New papers trigger individual detail requests; unchanged papers consume no detail requests. Failed requests retain a 5 day retry guard. Public GitHub and Hugging Face metrics also retain their 5 day refresh. Paper IDs, normalized titles, and DOI values prevent duplicate cards. Existing curated cards remain unchanged. No visitor spends API credits.

New records get 1 SerpApi citation detail request, up to 10 new detail requests per run. Failed detail requests retry after 5 days. The author list is paginated, so profiles larger than 100 entries are supported. A malformed response does not replace the cache.

## Cards and Images

Both Selected work and Publications receive new cards inside AUTO comment markers in index.html. Metadata includes title, publication venue, year, authors in the catalog, publisher link, and a source description excerpt up to 600 characters. Without a description, the card displays factual venue information. No generated claims are added.

Records explicitly labeled arXiv, other preprints, theses, or working papers are excluded. A nonempty publication venue is required. Scholar metadata can be incomplete, so this is a metadata filter, not an independent peer review certification.

The updater follows the citation's publisher link and tries figure images, then article preview metadata. Valid raster images are downloaded and converted to local WebP files with equal display framing. Publisher access restrictions are not bypassed. Missing or blocked images get a neutral book icon and retry after 5 days without repeating successful SerpApi detail requests. An automatically selected preview is not guaranteed to be the paper's main figure. You can replace the local image when needed.

The catalog records source URLs and attempt timestamps. The original 2 entries are marked curated to avoid duplicating or changing their handpicked images and text. Automatic entries are retained if Scholar temporarily omits them. To remove a mistaken automatic record, set status to excluded in assets/publications.json and regenerate the HTML; keep its citation ID to prevent immediate rediscovery.

The workflow commits updated HTML, catalogs, and images, then explicitly deploys the allowlisted website files. A push to main also deploys without spending SerpApi credits. The private .codex-backup directory, secrets, node_modules, tests, and updater scripts are not deployed.

## Local Verification

```powershell
npm ci
npm test
node scripts/update-publications.js
```

The existing curated catalog requires no citation detail calls. Set SERPAPI_KEY privately in the process environment for Scholar refreshes. The workflow enables citation requests only for new or pending papers found in the saved SerpApi list. Completed metadata can retry a missing publisher image without SerpApi.
