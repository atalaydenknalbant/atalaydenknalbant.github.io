# Automatic Publications

## GitHub Setup

1. Commit and push the updated scripts, index.html markers, assets/publications.json, package files, tests, and workflow to main.
2. In Settings > Secrets and variables > Actions, set the repository secret SERPAPI_KEY. Never put the key in the HTML or JSON caches.
3. In Settings > Pages > Build and deployment > Source, select GitHub Actions.
4. In Settings > Actions > General > Workflow permissions, allow read and write permissions if your repository policy requires it. Branch rules must permit the workflow to push main; otherwise the commit step will fail rather than bypass protection.
5. In Actions, select Update Portfolio Stats and Run workflow on main.

The workflow checks the public Scholar HTML page daily at 05:18 UTC without SerpApi. It excludes arXiv and other explicitly unpublished entries and compares the result with the saved completed publication baseline, initially 2. Only a confirmed increase permits SerpApi requests. If Scholar blocks the free check, paid requests are skipped and the action summary reports the check as unavailable. Runs may be delayed by GitHub.

After an increase, Scholar refreshes and failed detail requests retain a 5 day guard. Public GitHub and Hugging Face metrics also retain their 5 day refresh. Paper IDs, normalized titles, and DOI values prevent duplicate cards. Existing curated cards remain unchanged. No visitor spends API credits.

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

The existing curated catalog requires no API calls. For new records, set SERPAPI_KEY privately in the process environment. The scheduled workflow passes PUBLICATIONS_INCREASED=false unless the free check confirms an increase, disabling citation detail requests. Completed metadata can still retry a missing publisher image without SerpApi. There is no scheduled paid fallback when the free check fails.
