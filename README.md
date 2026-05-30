# Atalay Denknalbant Portfolio Website

## Files

1. `index.html` holds the page structure, portfolio copy, links, project cards, publication cards, and contact icons.
2. `styles.css` holds the full visual system and responsive layout.
3. `script.js` controls the animated network, mobile navigation, project filters, and cached profile metrics.
4. `assets/` stores the portrait graphic, publication graphics, `profile-stats.json`, and `scholar-stats.json`.
5. `scripts/update-profile-cache.js` refreshes public GitHub and Hugging Face counts when the cache is older than five days.
6. `scripts/update-scholar-cache.js` refreshes Google Scholar publication data through SerpApi when the cache is older than five days.
7. `.github/workflows/update-portfolio-stats.yml` refreshes all stats caches through GitHub Actions.

