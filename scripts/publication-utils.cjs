const https = require('node:https');
const dns = require('node:dns/promises');
const { BlockList } = require('node:net');
const { load } = require('cheerio');

const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;
const text = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const titleKey = (value) => text(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const isPublishedPaper = (paper) => {
  const venue = text(paper.publication || paper.journal || paper.conference);
  return Boolean(text(paper.title) && venue) &&
    !/arxiv|biorxiv|medrxiv|preprint|working paper|thesis|dissertation/i.test(
      [venue, paper.link, paper.publisher].filter(Boolean).join(' '));
};
const fresh = (date, now = Date.now()) => {
  const age = now - Date.parse(date);
  return age >= 0 && age < FIVE_DAYS;
};
const publicUrl = (value, base) => {
  try {
    const url = new URL(value, base);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return '';
    if (!url.hostname.includes('.') || /(^|\.)(localhost|local|internal)$/.test(url.hostname)) return '';
    return url.href;
  } catch { return ''; }
};
const blocked = new BlockList();
for (const [ip, bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]]) blocked.addSubnet(ip, bits);

// Pin a validated public DNS address on each redirect; publisher HTML is untrusted.
async function download(value, limit = 8 * 1024 * 1024, redirects = 0) {
  const url = publicUrl(value);
  if (!url || redirects > 5) throw new Error('Unsafe URL or too many redirects');
  const hostname = new URL(url).hostname;
  const addresses = await dns.resolve4(hostname);
  if (!addresses.length || addresses.some(ip => blocked.check(ip))) throw new Error('Nonpublic host');
  const result = await new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: { 'user-agent': 'PortfolioPublicationUpdater/1.0', 'accept-encoding': 'identity' },
      lookup: (_host, options, callback) => options.all
        ? callback(null, [{ address: addresses[0], family: 4 }])
        : callback(null, addresses[0], 4),
    }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        resolve({ redirect: new URL(response.headers.location, url).href });
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Remote HTTP ${response.statusCode}`));
        return;
      }
      let size = 0;
      const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > limit) request.destroy(new Error('Download exceeds size limit'));
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({ bytes: Buffer.concat(chunks), type: response.headers['content-type'] || '', url }));
    });
    const timeout = setTimeout(() => request.destroy(new Error('Download timeout')), 20000);
    request.on('close', () => clearTimeout(timeout));
    request.on('error', reject);
  });
  return result.redirect ? download(result.redirect, limit, redirects + 1) : result;
}

async function serpRequest(params, apiKey, fetcher = fetch) {
  if (!apiKey) throw new Error('SERPAPI_KEY is not set');
  const query = new URLSearchParams({ engine: 'google_scholar_author', hl: 'en', ...params, api_key: apiKey });
  let response;
  try { response = await fetcher(`https://serpapi.com/search.json?${query}`, { signal: AbortSignal.timeout(30000) }); }
  catch { throw new Error('SerpApi connection failed'); }
  if (!response.ok) throw new Error(`SerpApi HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error('SerpApi returned an API error; cache retained');
  return payload;
}

function publisherMetadata(html, url) {
  const $ = load(html);
  const meta = key => $(`meta[name="${key}"], meta[property="${key}"]`).first().attr('content') || '';
  const candidates = [];
  $('figure img, .fig img, .figure img').each((_i, el) => candidates.push($(el).attr('src') || $(el).attr('data-src')));
  candidates.push(meta('og:image'), meta('twitter:image'));
  return {
    description: text(meta('citation_abstract') || $('[id="abstract"], .abstract').first().text()),
    doi: text(meta('citation_doi')),
    images: [...new Set(candidates.filter(Boolean).map(src => publicUrl(src, url)).filter(src => src && !/logo|favicon|avatar|icon|banner|cover/i.test(src)))].slice(0, 5),
  };
}

module.exports = { FIVE_DAYS, text, titleKey, isPublishedPaper, fresh, publicUrl, download, serpRequest, publisherMetadata };
