// Builds data/snapshot.json by running the dashboard's own code (app.js) inside jsdom.
//
// Browsers on GitHub Pages cannot read news feeds (cross-origin blocking), but a server-side job can.
// This script loads index.html + app.js in jsdom, answers every fetch() with a real network request
// from Node (no browser restrictions), runs the same refreshFeeds() the page runs locally, and saves
// the result. The live page then just reads data/snapshot.json.
//
// Run:  npm install --no-save jsdom && node scripts/build-snapshot.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const MIN_ARTICLES = 80; // refuse to overwrite a good snapshot with a mostly empty one
const MIN_HEALTHY_FEEDS = 5;
const BODY_LIMIT = 600; // keep the file small: "Read more" text is trimmed

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const page = html.replace(/<script src="\.\/app\.js[^"]*"><\/script>/, () => `<script>${app.replace(/<\/script/gi, "<\\/script")}</script>`);

const dom = new JSDOM(page, {
  url: "http://localhost:8123/", // makes the app use its "local" fetch path (/proxy?url=...)
  runScripts: "dangerously",
  pretendToBeVisual: true,
  beforeParse(window) {
    window.fetch = async (input) => {
      let url = String(input);
      const proxied = url.match(/\/proxy\?url=(.+)$/);
      if (proxied) url = decodeURIComponent(proxied[1]);
      if (!/^https?:\/\//.test(url)) throw new Error(`unsupported url ${url}`);
      // The page's public-proxy fallbacks are pointless from a server, so skip them.
      if (/allorigins\.win|corsproxy\.io/.test(url)) throw new Error("skipped");
      const response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "*/*" },
        redirect: "follow",
        signal: AbortSignal.timeout(25000)
      });
      return response;
    };
  }
});

const { window } = dom;
await new Promise((resolve) => setTimeout(resolve, 500));

const started = Date.now();
await window.eval("refreshFeeds()");
const seconds = Math.round((Date.now() - started) / 1000);

const state = JSON.parse(
  window.eval("JSON.stringify({ generatedAt, articles: allArticles, sourceHealth, gnSummary, trendsSummary })")
);

const healthy = state.sourceHealth.filter((h) => h.ok).length;
console.log(`Fetched in ${seconds}s: ${state.articles.length} articles, ${healthy}/${state.sourceHealth.length} feeds healthy.`);
for (const h of state.sourceHealth) console.log(`  ${h.ok ? "ok  " : "FAIL"} ${h.name}${h.ok ? ` (${h.count})` : `: ${h.error}`}`);
console.log(`  Google News: ${state.gnSummary ? `${state.gnSummary.okJobs}/${state.gnSummary.jobs} lookups` : "none"}; Trends: ${state.trendsSummary ? (state.trendsSummary.ok ? `${state.trendsSummary.matched} matched` : "failed") : "none"}`);

if (state.articles.length < MIN_ARTICLES || healthy < MIN_HEALTHY_FEEDS) {
  console.error("Too little data; keeping the previous snapshot.");
  process.exit(1);
}

for (const article of state.articles) {
  if (article.body && article.body.length > BODY_LIMIT) article.body = article.body.slice(0, BODY_LIMIT).trimEnd() + "…";
}

const out = path.join(root, "data", "snapshot.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ ...state, generatedAt: new Date().toISOString() }));
console.log(`Wrote ${path.relative(root, out)} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
process.exit(0);
