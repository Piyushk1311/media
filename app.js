const SOURCES = [
  {
    id: "dh",
    name: "Deccan Herald",
    type: "primary",
    rss: "https://www.deccanherald.com/api/v1/collections/latest-news.rss"
  },
  {
    id: "hindu",
    name: "The Hindu",
    type: "competitor",
    rss: "https://www.thehindu.com/feeder/default.rss"
  },
  {
    id: "quint",
    name: "The Quint",
    type: "competitor",
    rss: "https://www.thequint.com/feed"
  },
  {
    id: "toi",
    name: "Times of India",
    type: "competitor",
    rss: "https://timesofindia.indiatimes.com/rssfeedmostrecent.cms"
  },
  {
    id: "ndtv",
    name: "NDTV",
    type: "competitor",
    rss: "https://feeds.feedburner.com/ndtvnews-latest"
  },
  {
    id: "india-today",
    name: "India Today",
    type: "competitor",
    rss: "https://www.indiatoday.in/rss/home"
  },
  {
    id: "ht",
    name: "Hindustan Times",
    type: "competitor",
    rss: "https://www.hindustantimes.com/feeds/rss/latest/rssfeed.xml"
  },
  {
    id: "iexp",
    name: "Indian Express",
    type: "competitor",
    rss: "https://indianexpress.com/feed/"
  },
  {
    id: "dchron",
    name: "Deccan Chronicle",
    type: "competitor",
    rss: "https://www.deccanchronicle.com/rss_feed"
  },
  {
    id: "tnm",
    name: "The News Minute",
    type: "competitor",
    rss: "https://www.thenewsminute.com/feed"
  },
  {
    id: "mint",
    name: "Livemint",
    type: "competitor",
    gnNames: ["Mint"], // how Google News spells this outlet
    rss: ["news", "companies", "markets", "politics", "technology", "money", "sports", "opinion"].map((section) => `https://www.livemint.com/rss/${section}`)
  },
  {
    id: "news18",
    name: "News18",
    type: "competitor",
    rss: ["india", "world", "politics", "business", "sports", "movies", "tech", "lifestyle-2"].map((section) => `https://www.news18.com/commonfeeds/v1/eng/rss/${section}.xml`)
  },
  {
    id: "et",
    name: "Economic Times",
    type: "competitor",
    rss: "https://economictimes.indiatimes.com/rssfeedsdefault.cms"
  },
  {
    // Moneycontrol's own RSS feeds are years out of date, so its stories are read from a Google News
    // search restricted to moneycontrol.com. Links are Google News redirect links.
    id: "mc",
    name: "Moneycontrol",
    type: "competitor",
    kind: "googlenews",
    rss: "https://news.google.com/rss/search?q=site%3Amoneycontrol.com+when%3A2d&hl=en-IN&gl=IN&ceid=IN%3Aen"
  }
];

const STOP_WORDS = new Set(
  "about after again against all also amid among an and are as at be been being bengaluru bengaluru's by can could day delhi did do does doing down during each for from had has have he her here him his how in india indian into is it its just karnataka may more most new news no not of on one only or other our out over said says she should so some such than that the their them then there these they this those through to under up was we were what when where which while who why will with would you".split(" ")
);

const SAMPLE_ARTICLES = [
  {
    id: "sample-dh-1",
    sourceId: "dh",
    sourceName: "Deccan Herald",
    sourceType: "primary",
    title: "Bengaluru civic works pick up after pre-monsoon review",
    summary: "City officials review drain clearance, road repairs, and ward-level preparedness ahead of heavy rain.",
    link: "https://www.deccanherald.com/",
    publishedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    keywords: ["bengaluru", "civic", "monsoon", "roads", "drainage"]
  },
  {
    id: "sample-comp-1",
    sourceId: "hindu",
    sourceName: "The Hindu",
    sourceType: "competitor",
    title: "Rain readiness in Bengaluru: civic agencies race against time",
    summary: "Officials say flood-prone zones need faster drain desilting and ward-level monitoring.",
    link: "https://www.thehindu.com/",
    publishedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    keywords: ["bengaluru", "rain", "civic", "drainage", "flooding"]
  },
  {
    id: "sample-comp-2",
    sourceId: "ndtv",
    sourceName: "NDTV",
    sourceType: "competitor",
    title: "Karnataka schools prepare heat and rain contingency plans",
    summary: "Administrators are revising safety routines as weather volatility affects school operations.",
    link: "https://www.ndtv.com/",
    publishedAt: new Date(Date.now() - 1000 * 60 * 100).toISOString(),
    keywords: ["karnataka", "schools", "weather", "safety", "rain"]
  }
];

const els = {
  filters: document.querySelector("#filters"),
  window: document.querySelector("#timeWindow"),
  search: document.querySelector("#search"),
  source: document.querySelector("#source"),
  from: document.querySelector("#from"),
  to: document.querySelector("#to"),
  pinWrap: document.querySelector("#pinWrap"),
  refreshBtn: document.querySelector("#refreshBtn"),
  controls: document.querySelector("#controls"),
  controlsToggle: document.querySelector("#controlsToggle"),
  statusText: document.querySelector("#statusText"),
  articleCount: document.querySelector("#articleCount"),
  dhCount: document.querySelector("#dhCount"),
  competitorCount: document.querySelector("#competitorCount"),
  clusterCount: document.querySelector("#clusterCount"),
  gapCount: document.querySelector("#gapCount"),
  updatedAt: document.querySelector("#updatedAt"),
  trendingTopics: document.querySelector("#trendingTopics"),
  keywords: document.querySelector("#keywords"),
  coverage: document.querySelector("#coverage"),
  stories: document.querySelector("#stories"),
  feedChecked: document.querySelector("#feedChecked"),
  feedWarnings: document.querySelector("#feedWarnings"),
  feedList: document.querySelector("#feedList"),
  guideWindow: document.querySelector("#guideWindow"),
  guidePrimary: document.querySelector("#guidePrimary"),
  guideCompetitors: document.querySelector("#guideCompetitors"),
  storyControls: document.querySelector("#storyControls"),
  storyPager: document.querySelector("#storyPager")
};

let allArticles = SAMPLE_ARTICLES;
let sourceHealth = [];
let generatedAt = new Date().toISOString();
let hasFetchedData = false;
let filtersDirty = false;
let isFetching = false;

function updateFetchButton() {
  const label = els.refreshBtn.querySelector(".btn-label");
  const icon = els.refreshBtn.querySelector(".btn-icon");
  const isRefresh = hasFetchedData && !filtersDirty;
  if (isFetching) {
    label.textContent = "Fetching…";
    icon.textContent = "";
    els.refreshBtn.classList.add("loading");
  } else {
    label.textContent = isRefresh ? "Refresh" : "Fetch";
    icon.textContent = isRefresh ? "↻" : "⇣";
    els.refreshBtn.classList.remove("loading");
  }
  els.refreshBtn.disabled = isFetching;
  els.refreshBtn.setAttribute("aria-busy", String(isFetching));
  els.refreshBtn.title = isRefresh ? "Fetch the latest RSS feeds" : "Fetch RSS feeds";
}

const formatDate = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
});

function debounce(fn, wait = 280) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function decodeEntities(value = "") {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1");
  return textarea.value.trim();
}

function stripHtml(value = "") {
  return decodeEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function tagValue(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function extractImage(block) {
  const media = block.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i);
  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  return decodeEntities((media && media[1]) || (enclosure && enclosure[1]) || "");
}

function extractTags(block, limit = 4) {
  const tags = [...block.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)]
    .map((m) => stripHtml(m[1]))
    .filter((tag) => tag && tag.length < 40);
  return [...new Set(tags)].slice(0, limit);
}

function extractKeywords(text, limit = 12) {
  const counts = new Map();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));

  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function hashString(value) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

function parseFeed(xml, source) {
  const itemBlocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  const entryBlocks = itemBlocks.length ? itemBlocks : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => m[0]);

  const isGn = source.kind === "googlenews";
  // Google News lists results by relevance, so take the newest first.
  const ordered = isGn
    ? entryBlocks.slice().sort((a, b) => Date.parse(tagValue(b, "pubDate")) - Date.parse(tagValue(a, "pubDate")))
    : entryBlocks;

  return ordered.slice(0, 35).map((block, index) => {
    let title = stripHtml(tagValue(block, "title"));
    if (isGn) {
      const cut = title.lastIndexOf(" - ");
      if (cut > 0) title = title.slice(0, cut); // drop the " - Publisher" suffix Google adds
    }
    const summary = isGn ? "" : stripHtml(tagValue(block, "description") || tagValue(block, "summary") || tagValue(block, "content:encoded"));
    const linkMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
    const link = decodeEntities(tagValue(block, "link") || (linkMatch && linkMatch[1]) || [source.rss].flat()[0]);
    const rawDate = tagValue(block, "pubDate") || tagValue(block, "published") || tagValue(block, "updated");
    const publishedAt = Number.isNaN(Date.parse(rawDate)) ? new Date().toISOString() : new Date(rawDate).toISOString();
    const bodyRaw = isGn ? "" : tagValue(block, "content:encoded") || tagValue(block, "description") || tagValue(block, "summary") || tagValue(block, "content");
    const body = stripHtml(bodyRaw).slice(0, 4000);
    const inlineImage = (bodyRaw.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || "";
    const tags = extractTags(block);
    const keywords = extractKeywords(`${title} ${summary}`, 8);

    return {
      id: `${source.id}-${hashString(link || title || String(index))}`,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      title: title || "Untitled story",
      summary,
      link,
      publishedAt,
      image: extractImage(block) || inlineImage,
      body,
      tags,
      keywords
    };
  });
}

// server.py exposes /proxy when running locally; on static hosting it 404s and we fall back.
function localProxyUrl(target) {
  return `./proxy?url=${encodeURIComponent(target)}`;
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchOneFeed(source, feedUrl) {
  const urls = [
    localProxyUrl(feedUrl),
    feedUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`
  ];
  const errors = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      if (!xml.includes("<item") && !xml.includes("<entry")) throw new Error("No RSS items found");
      return parseFeed(xml, source);
    } catch (error) {
      errors.push(error.message);
    }
  }
  // Report the most telling failure (a block or rate limit beats a generic network error).
  const best =
    errors.find((e) => /HTTP (401|403|429|451)/.test(e)) ||
    errors.find((e) => /HTTP 5\d\d/.test(e)) ||
    errors.find((e) => /No RSS items/.test(e)) ||
    errors[errors.length - 1] ||
    "Feed unavailable";
  throw new Error(best);
}

const MERGED_LIMIT = 50;

async function fetchFeed(source) {
  const feeds = Array.isArray(source.rss) ? source.rss : [source.rss];
  if (feeds.length === 1) return fetchOneFeed(source, feeds[0]);

  // Several section feeds make up one outlet: merge them, drop duplicates, keep the newest.
  const settled = await mapPool(feeds, 3, async (feedUrl) => {
    try {
      return { items: await fetchOneFeed(source, feedUrl) };
    } catch (error) {
      return { error };
    }
  });
  const merged = settled.flatMap((r) => r.items || []);
  if (!merged.length) throw settled.find((r) => r.error)?.error || new Error("Feed unavailable");
  const seen = new Set();
  return merged
    .filter((article) => (seen.has(article.link) ? false : seen.add(article.link)))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, MERGED_LIMIT);
}

const GN_BASE = "https://news.google.com/rss";
const GN_LOCALE = "hl=en-IN&gl=IN&ceid=IN:en";
let gnSummary = null;

async function fetchViaProxy(target) {
  const urls = [
    localProxyUrl(target),
    `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    `https://corsproxy.io/?${encodeURIComponent(target)}`
  ];
  let lastError = "Google News unavailable";
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      if (!xml.includes("<item")) throw new Error("No items");
      return xml;
    } catch (error) {
      lastError = error.message;
    }
  }
  throw new Error(lastError);
}

function parseGoogleNews(xml) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m, index) => {
    const block = m[0];
    const rawTitle = stripHtml(tagValue(block, "title"));
    const publisher = stripHtml(tagValue(block, "source"));
    const cut = rawTitle.lastIndexOf(" - ");
    const title = cut > 0 ? rawTitle.slice(0, cut) : rawTitle;
    return { rank: index + 1, title, publisher: publisher || (cut > 0 ? rawTitle.slice(cut + 3) : "") };
  });
}

function normPublisher(name = "") {
  return name.toLowerCase().replace(/\.com|\.in|\bthe\b/g, "").replace(/[^a-z]/g, "");
}

function gnOutletNames(article) {
  const source = SOURCES.find((s) => s.id === article.sourceId);
  return [normPublisher(article.sourceName), ...((source && source.gnNames) || []).map(normPublisher)];
}

function titleWords(title) {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function titlesMatch(a, b) {
  const wa = titleWords(a);
  const wb = titleWords(b);
  if (!wa.size || !wb.size) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / Math.min(wa.size, wb.size) >= 0.6;
}

async function enrichWithGoogleNews(articles) {
  for (const article of articles) {
    delete article.gnRank;
    delete article.gnQuery;
  }
  // Look up the biggest topics of the last 24 hours, to match the dashboard's default time window.
  const fresh = articles.filter((a) => Date.now() - Date.parse(a.publishedAt) <= 24 * 36e5);
  const topClusters = clusterArticles(fresh.length ? fresh : articles).slice(0, 12);
  const jobs = [
    { label: "Top stories (India)", url: `${GN_BASE}?${GN_LOCALE}` },
    { label: "Karnataka & Bengaluru", url: `${GN_BASE}/search?q=${encodeURIComponent("Karnataka OR Bengaluru when:1d")}&${GN_LOCALE}` },
    ...topClusters.map((cluster) => ({
      label: cluster.topic,
      url: `${GN_BASE}/search?q=${encodeURIComponent(`${cluster.keywords.slice(0, 3).join(" ")} when:1d`)}&${GN_LOCALE}`
    }))
  ];

  let okJobs = 0;
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      try {
        const items = parseGoogleNews(await fetchViaProxy(job.url));
        okJobs += 1;
        for (const article of articles) {
          const outlets = gnOutletNames(article);
          for (const item of items) {
            if (article.gnRank && article.gnRank <= item.rank) break;
            const pub = normPublisher(item.publisher);
            const samePublisher = Boolean(pub) && outlets.includes(pub);
            if (samePublisher && titlesMatch(article.title, item.title)) {
              article.gnRank = item.rank;
              article.gnQuery = job.label;
              break;
            }
          }
        }
      } catch {
        /* a failed lookup just leaves those stories unranked */
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);

  const ranked = (type) => articles.filter((a) => a.sourceType === type && a.gnRank);
  const total = (type) => articles.filter((a) => a.sourceType === type).length;
  return {
    okJobs,
    jobs: jobs.length,
    dhRanked: ranked("primary").length,
    dhTotal: total("primary"),
    compRanked: ranked("competitor").length,
    compTotal: total("competitor")
  };
}

const TRENDS_URL = "https://trends.google.com/trending/rss?geo=IN";
let trendsSummary = (() => {
  try {
    return JSON.parse(localStorage.getItem("dh-trends-summary"));
  } catch {
    return null;
  }
})();

function parseTrends(xml) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m, index) => {
    const block = m[0];
    const newsTitles = [...block.matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/gi)].map((n) => stripHtml(n[1]));
    return {
      rank: index + 1,
      term: stripHtml(tagValue(block, "title")),
      traffic: stripHtml(tagValue(block, "ht:approx_traffic")),
      newsTitles
    };
  });
}

async function enrichWithTrends(articles) {
  for (const article of articles) delete article.trend;
  const items = parseTrends(await fetchViaProxy(TRENDS_URL));
  // A story is marked only when it is the same story as a news item Google lists under a trending search.
  for (const article of articles) {
    for (const item of items) {
      if (item.newsTitles.some((title) => titlesMatch(article.title, title))) {
        article.trend = { term: item.term, traffic: item.traffic, rank: item.rank };
        break;
      }
    }
  }
  const summary = { ok: true, terms: items.length, matched: articles.filter((a) => a.trend).length, at: new Date().toISOString() };
  return summary;
}

function saveTrendsSummary() {
  try {
    localStorage.setItem("dh-trends-summary", JSON.stringify(trendsSummary));
  } catch {
    /* storage may be unavailable */
  }
}

async function refreshFeeds() {
  if (isFetching) return;
  isFetching = true;
  els.statusText.textContent = "Fetching RSS feeds…";
  els.statusText.classList.add("is-loading");
  updateFetchButton();
  const articles = [];
  const health = [];

  const outcomes = await mapPool(SOURCES, 4, async (source) => {
    try {
      return { source, parsed: await fetchFeed(source) };
    } catch (error) {
      return { source, error };
    }
  });
  for (const { source, parsed, error } of outcomes) {
    if (parsed) {
      articles.push(...parsed);
      health.push({ sourceId: source.id, name: source.name, ok: true, count: parsed.length });
    } else {
      health.push({ sourceId: source.id, name: source.name, ok: false, count: 0, error: error.message });
    }
  }

  sourceHealth = health;
  if (articles.length) {
    allArticles = dedupeArticles(articles).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    generatedAt = new Date().toISOString();
    hasFetchedData = true;
    els.statusText.textContent = "Checking Google News rankings…";
    try {
      gnSummary = await enrichWithGoogleNews(allArticles);
    } catch {
      gnSummary = null;
    }
    try {
      trendsSummary = await enrichWithTrends(allArticles);
    } catch {
      trendsSummary = { ok: false, terms: 0, matched: 0, at: new Date().toISOString() };
    }
    saveTrendsSummary();
    localStorage.setItem("dh-static-cache", JSON.stringify({ articles: allArticles, sourceHealth, generatedAt, gnSummary }));
  } else {
    const cached = loadCachedArticles();
    allArticles = cached?.articles || SAMPLE_ARTICLES;
    sourceHealth = cached?.sourceHealth || health;
    generatedAt = cached?.generatedAt || new Date().toISOString();
  }
  filtersDirty = false;
  isFetching = false;
  els.statusText.classList.remove("is-loading");
  updateFetchButton();
  loadDashboard();
}

function loadCachedArticles() {
  try {
    return JSON.parse(localStorage.getItem("dh-static-cache"));
  } catch {
    return null;
  }
}

function dedupeArticles(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = `${article.sourceId}:${article.link || article.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function clusterArticles(articles) {
  const clusters = [];
  for (const article of articles) {
    const terms = new Set(article.keywords);
    let best = null;
    let bestScore = 0;
    for (const cluster of clusters) {
      const overlap = cluster.keywords.filter((term) => terms.has(term)).length;
      if (overlap > bestScore) {
        best = cluster;
        bestScore = overlap;
      }
    }
    if (best && bestScore >= 2) {
      best.articles.push(article);
      best.keywords = extractKeywords(`${best.keywords.join(" ")} ${article.title} ${article.summary}`, 10);
    } else {
      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        topic: titleCase(article.keywords.slice(0, 3).join(" ")) || article.title,
        keywords: article.keywords.slice(0, 8),
        articles: [article]
      });
    }
  }

  return clusters
    .map((cluster) => {
      const dhCount = cluster.articles.filter((article) => article.sourceType === "primary").length;
      const competitorCount = cluster.articles.length - dhCount;
      const sources = [...new Set(cluster.articles.map((article) => article.sourceName))];
      return {
        ...cluster,
        topic: titleCase(cluster.keywords.slice(0, 3).join(" ")),
        dhCount,
        competitorCount,
        sources,
        latestAt: cluster.articles.map((article) => article.publishedAt).sort().at(-1)
      };
    })
    .sort((a, b) => b.competitorCount + b.dhCount - (a.competitorCount + a.dhCount));
}

function titleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFilteredArticles() {
  const source = els.source.value || "all";
  const from = els.from.value ? new Date(els.from.value) : null;
  const to = els.to.value ? new Date(`${els.to.value}T23:59:59`) : null;
  const term = els.search.value.toLowerCase().trim();
  const cutoff = Date.now() - (Number(els.window.value) || 24) * 36e5; // time window: 24 h, 48 h or 7 days

  return allArticles.filter((article) => {
    const published = new Date(article.publishedAt);
    if (published.getTime() < cutoff) return false;
    const matchesSource = source === "all" || article.sourceId === source || article.sourceType === source;
    const matchesFrom = !from || published >= from;
    const matchesTo = !to || published <= to;
    const haystack = `${article.title} ${article.summary} ${article.keywords.join(" ")}`.toLowerCase();
    const matchesTerm = !term || haystack.includes(term);
    return matchesSource && matchesFrom && matchesTo && matchesTerm;
  });
}

function buildInsights(articles) {
  const clusters = clusterArticles(articles);
  const keywordCounts = new Map();
  for (const article of articles) {
    for (const keyword of article.keywords) keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
  }

  const topKeywords = [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 18)
    .map(([keyword, count]) => ({ keyword, count }));

  const missingAngles = clusters.filter((cluster) => cluster.competitorCount > cluster.dhCount).slice(0, 8).map((cluster) => makeMissingAngle(cluster));
  const followUps = clusters.slice(0, 8).map((cluster) => ({
    topic: cluster.topic,
    suggestion: makeFollowUp(cluster)
  }));
  const explainers = clusters
    .filter((cluster) => cluster.keywords.some((keyword) => ["policy", "court", "school", "tax", "rain", "traffic", "metro", "water", "health", "election"].includes(keyword)))
    .slice(0, 6)
    .map((cluster) => ({
      topic: cluster.topic,
      suggestion: "Explain what changed, who is affected, and what readers in Bengaluru or Karnataka should watch next."
    }));

  return {
    stats: {
      totalArticles: articles.length,
      dhArticles: articles.filter((article) => article.sourceType === "primary").length,
      competitorArticles: articles.filter((article) => article.sourceType === "competitor").length,
      clusters: clusters.length,
      lastUpdated: generatedAt
    },
    clusters,
    topKeywords,
    missingAngles,
    followUps,
    explainers,
    sourceHealth
  };
}

function makeMissingAngle(cluster) {
  const competitorArticles = cluster.articles.filter((article) => article.sourceType === "competitor");
  const dhArticles = cluster.articles.filter((article) => article.sourceType === "primary");
  const leadKeyword = cluster.keywords[0] || cluster.topic.toLowerCase();
  const supportingKeywords = cluster.keywords.slice(1, 5).join(", ");
  const competitorSources = [...new Set(competitorArticles.map((article) => article.sourceName))].slice(0, 3);
  const competitorTitles = competitorArticles.slice(0, 3).map((article) => article.title);
  const dhTitles = dhArticles.slice(0, 2).map((article) => article.title);
  const gapType = dhArticles.length ? "depth_gap" : "coverage_gap";
  const sourcePhrase = competitorSources.length ? competitorSources.join(", ") : "competitors";
  const evidence = competitorTitles.length
    ? `${sourcePhrase} are pushing this through: ${competitorTitles.join(" | ")}.`
    : `${sourcePhrase} have more visible coverage on this topic than DH.`;
  const dhPosition = dhTitles.length
    ? `DH has related coverage (${dhTitles.join(" | ")}), but it needs a more distinct reader-first angle.`
    : "DH does not have a matching story in the current feed window, so this is a catch-up opportunity.";

  return {
    topic: cluster.topic,
    reason: `${cluster.competitorCount} competitor stories vs ${cluster.dhCount} DH stories`,
    priority: cluster.dhCount === 0 && cluster.competitorCount >= 3 ? "High" : cluster.competitorCount >= 2 ? "Medium" : "Watch",
    gapType,
    suggestion: `${dhPosition} ${buildReportingAction(cluster, gapType)}`,
    evidence,
    readerQuestion: buildReaderQuestion(cluster),
    keywords: [leadKeyword, ...cluster.keywords.slice(1, 5)].filter(Boolean),
    assignment: `Assign one reporter to verify the latest development, call the responsible agency or stakeholder, and add one Bengaluru/Karnataka-specific consequence tied to ${leadKeyword}${supportingKeywords ? `, especially ${supportingKeywords}` : ""}.`
  };
}

function buildReportingAction(cluster, gapType) {
  const terms = new Set(cluster.keywords);
  const lead = cluster.keywords[0] || "this topic";
  if (terms.has("court") || terms.has("case") || terms.has("accused") || terms.has("custody")) return "Recommended angle: explain the legal status, next hearing or procedural step, why it matters, and what remains unverified.";
  if (terms.has("farmers") || terms.has("land") || terms.has("acquisition")) return "Recommended angle: map who loses or gains, compensation status, official timeline, and voices from affected families or local representatives.";
  if (terms.has("metro") || terms.has("traffic") || terms.has("road") || terms.has("bus")) return "Recommended angle: convert the update into a commuter service piece with route impact, timings, alternatives, and agency accountability.";
  if (terms.has("school") || terms.has("students") || terms.has("neet") || terms.has("exam")) return "Recommended angle: focus on students and parents, deadlines, official instructions, helplines, and what changed from the previous process.";
  if (terms.has("rain") || terms.has("water") || terms.has("heatwave") || terms.has("weather")) return "Recommended angle: localize the risk by ward or district, add preparedness gaps, official advisories, and reader utility.";
  if (terms.has("modi") || terms.has("congress") || terms.has("bjp") || terms.has("election")) return "Recommended angle: move beyond statements by adding Karnataka political stakes, affected constituencies, and what the development changes.";
  return gapType === "coverage_gap"
    ? `Recommended angle: publish a concise catch-up that explains what happened, why ${lead} matters locally, and what readers should watch next.`
    : "Recommended angle: deepen DH's existing coverage with a data point, local voice, accountability question, and clear next step.";
}

function buildReaderQuestion(cluster) {
  const terms = new Set(cluster.keywords);
  if (terms.has("court") || terms.has("case")) return "Reader question to answer: What exactly happens next, and who is affected by the decision or allegation?";
  if (terms.has("farmers") || terms.has("land")) return "Reader question to answer: What changes on the ground for affected residents, farmers, or landowners?";
  if (terms.has("metro") || terms.has("traffic") || terms.has("bus")) return "Reader question to answer: How will this change today's commute, costs, or route choices?";
  if (terms.has("school") || terms.has("students") || terms.has("neet")) return "Reader question to answer: What should students or parents do now, and by when?";
  if (terms.has("rain") || terms.has("water") || terms.has("weather")) return "Reader question to answer: Which areas are at risk, and what practical precautions should readers take?";
  return "Reader question to answer: What is new, why does it matter locally, and what should readers watch next?";
}

function makeFollowUp(cluster) {
  const lead = cluster.keywords[0] || cluster.topic.toLowerCase();
  return `Ask what happens next on ${lead}: timeline, accountable agency, reader impact, and one human-interest case.`;
}

function loadSources() {
  els.pinWrap.classList.add("hidden");
  for (const source of SOURCES) {
    if (source.id === "dh") continue;
    const option = document.createElement("option");
    option.value = source.id;
    option.textContent = source.name;
    els.source.appendChild(option);
  }
}

function loadDashboard() {
  const articles = getFilteredArticles();
  const insights = buildInsights(articles);
  const loaded = sourceHealth.filter((item) => item.ok).length;
  const windowLabel = els.window.selectedOptions[0].text.toLowerCase();
  const status = sourceHealth.length
    ? `Loaded ${allArticles.length} articles from ${loaded}/${SOURCES.length} feeds. Showing ${articles.length} from the ${windowLabel}.${gnSummary ? (gnSummary.okJobs ? ` Google News: ${gnSummary.dhRanked + gnSummary.compRanked} stories ranked.` : " Google News ranks unavailable.") : ""}`
    : "Using starter sample data. Click Fetch to load live RSS.";
  render({ articles, insights, status, refreshInProgress: false });
}

function render({ articles, insights, status, refreshInProgress }) {
  hoverLists = [];
  hideHoverCard();
  els.statusText.textContent = refreshInProgress ? "Fetching RSS feeds…" : status;
  els.articleCount.textContent = insights.stats.totalArticles;
  els.dhCount.textContent = insights.stats.dhArticles;
  els.competitorCount.textContent = insights.stats.competitorArticles;
  els.clusterCount.textContent = insights.stats.clusters;
  els.gapCount.textContent = insights.missingAngles.length;
  els.updatedAt.textContent = `Updated ${formatDate.format(new Date(insights.stats.lastUpdated))}`;

  renderTopics(insights.clusters);
  renderKeywords(insights.topKeywords, articles);
  renderCoverage(insights.clusters);
  renderFeedHealth();
  renderGuideWindow(articles);
  renderGuideOutlets();
  renderStories(articles);
}

function renderTopics(clusters) {
  els.trendingTopics.innerHTML = "";
  if (!clusters.length) return empty(els.trendingTopics, "No matching topics.");

  for (const cluster of clusters.slice(0, 9)) {
    const node = document.createElement("article");
    node.className = "topic";
    const idsFor = (filter) => listRef(cluster.articles.filter(filter));
    // Competitor outlets that covered this topic; DH's own stories are reached through the DH badge.
    const competitorNames = [...new Set(cluster.articles.filter((a) => a.sourceType === "competitor").map((a) => a.sourceName))];
    const outletChips = competitorNames.length
      ? competitorNames.map((name) => `<span class="platform hover-trigger" tabindex="0" role="button" data-title="${escapeAttr(name)} · ${escapeAttr(cluster.topic)}" data-list="${idsFor((a) => a.sourceName === name)}">${escapeHtml(name)}</span>`).join("")
      : '<span class="topic-none">No competitor has covered this yet</span>';
    node.innerHTML = `
      <div class="tcol-topic">
        <h4>${escapeHtml(cluster.topic)}</h4>
        <p class="tkeys" title="${escapeAttr(cluster.keywords.slice(0, 6).join(", "))}">${escapeHtml(cluster.keywords.slice(0, 5).join(" · "))}</p>
      </div>
      <div class="tcol-counts">
        <span class="badge ${cluster.competitorCount > cluster.dhCount ? "red" : "teal"}">${cluster.articles.length} stories</span>
        <span class="badge teal hover-trigger" tabindex="0" role="button" data-title="DH stories · ${escapeAttr(cluster.topic)}" data-list="${idsFor((a) => a.sourceType === "primary")}">DH ${cluster.dhCount}</span>
        <span class="badge gold hover-trigger" tabindex="0" role="button" data-title="Competitor stories · ${escapeAttr(cluster.topic)}" data-list="${idsFor((a) => a.sourceType === "competitor")}">Competitors ${cluster.competitorCount}</span>
      </div>
      <div class="tcol-outlets">${outletChips}</div>
    `;
    els.trendingTopics.appendChild(node);
  }
}

function renderKeywords(keywords, articles = []) {
  els.keywords.innerHTML = "";
  if (!keywords.length) return empty(els.keywords, "No keywords found.");
  for (const item of keywords) {
    const node = document.createElement("span");
    node.className = "keyword hover-trigger";
    node.tabIndex = 0;
    node.setAttribute("role", "button");
    node.dataset.title = `Stories mentioning "${item.keyword}"`;
    node.dataset.list = listRef(articles.filter((a) => a.keywords.includes(item.keyword)));
    node.textContent = `${item.keyword} ${item.count}`;
    els.keywords.appendChild(node);
  }
}

const COMPARE_PROMPT = "Compare the stories below based on content quality and SEO, covering all aspects including technical SEO (page speed, mobile experience, structured data, canonical and meta tags, headline and title optimisation, internal linking, image optimisation and crawlability). Suggest how Deccan Herald stories can be made better than the competitors.";
const COPY_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function comparisonText(stories) {
  const lines = [COMPARE_PROMPT, ""];
  for (const source of SOURCES) {
    const urls = [...new Set(stories.filter((a) => a.sourceId === source.id).map((a) => a.link))];
    if (!urls.length) continue;
    lines.push(`${source.name}:`, ...urls, "");
  }
  if (stories.some((a) => /news\.google\.com/.test(a.link))) {
    lines.push("Note: links on news.google.com are Google News redirect links. Open them to reach the original article.");
  }
  return lines.join("\n").trim();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

let coverageFilter = "all";
let coverageScope = "trending";
const TRENDING_COUNT = 9; // same cut-off as the Trending Topics block
let lastCoverageClusters = [];

function renderCoverage(clusters) {
  lastCoverageClusters = clusters;
  els.coverage.innerHTML = "";
  if (!clusters.length) return empty(els.coverage, "No coverage to compare.");

  const countFor = (cluster, sourceId) => cluster.articles.filter((article) => article.sourceId === sourceId).length;
  const outletTotals = SOURCES.map((source) => ({
    ...source,
    total: clusters.reduce((sum, cluster) => sum + countFor(cluster, source.id), 0)
  })).filter((source) => source.total > 0);
  const competitorIds = outletTotals.filter((source) => source.type === "competitor").map((source) => source.id);

  const allRows = clusters.map((cluster, index) => {
    const outletsCovering = competitorIds.filter((id) => countFor(cluster, id) > 0).length;
    const status = cluster.dhCount === 0 && outletsCovering > 0 ? "gap" : cluster.dhCount > 0 && outletsCovering === 0 ? "exclusive" : "covered";
    return { cluster, outletsCovering, status, trending: index < TRENDING_COUNT };
  });
  const scopeCounts = {
    all: allRows.length,
    trending: allRows.filter((r) => r.trending).length,
    other: allRows.filter((r) => !r.trending).length
  };
  const rows = allRows.filter((r) => coverageScope === "all" || (coverageScope === "trending" ? r.trending : !r.trending));

  const competitorTopics = rows.filter((row) => row.outletsCovering > 0);
  const dhAlso = competitorTopics.filter((row) => row.cluster.dhCount > 0).length;
  const gaps = competitorTopics.length - dhAlso;
  const parity = competitorTopics.length ? Math.round((dhAlso / competitorTopics.length) * 100) : 0;
  const maxTotal = Math.max(...outletTotals.map((source) => source.total), 1);

  const counts = {
    all: rows.length,
    gap: rows.filter((r) => r.status === "gap").length,
    covered: rows.filter((r) => r.status === "covered").length,
    exclusive: rows.filter((r) => r.status === "exclusive").length
  };
  if (!counts[coverageFilter]) coverageFilter = "all";
  const top = rows
    .filter((r) => coverageFilter === "all" || r.status === coverageFilter)
    .sort((a, b) => b.cluster.articles.length - a.cluster.articles.length || b.outletsCovering - a.outletsCovering)
    .slice(0, 12);

  const statusLabel = { gap: "Gap", covered: "Covered", exclusive: "DH exclusive" };
  const statusClass = { gap: "red", covered: "teal", exclusive: "gold" };

  const summary = `
    <div class="cov-summary">
      <div class="cov-score">
        <strong>${parity}%</strong>
        <span>of topics competitors cover, DH also covers (${dhAlso} of ${competitorTopics.length})</span>
        <span class="badge ${gaps ? "red" : "teal"}">${gaps} ${gaps === 1 ? "gap" : "gaps"} to close</span>
        ${gnSummary && gnSummary.okJobs ? `<span class="gn-line">On Google News: DH ${gnSummary.dhRanked}/${gnSummary.dhTotal} stories ranked, competitors ${gnSummary.compRanked}/${gnSummary.compTotal}</span>` : `<span class="gn-line">Google News ranks not loaded</span>`}
      </div>
      <div class="cov-outlets">
        ${outletTotals.map((source) => `
          <div class="cov-outlet ${source.type === "primary" ? "is-dh" : ""}">
            <span class="cov-name">${escapeHtml(source.name)}</span>
            <div class="bar"><span style="width:${Math.max(6, (source.total / maxTotal) * 100)}%"></span></div>
            <span class="cov-num">${source.total}</span>
          </div>`).join("")}
      </div>
    </div>`;

  const head = outletTotals.map((source) => `<th class="${source.type === "primary" ? "is-dh" : ""}">${escapeHtml(source.name)}</th>`).join("");
  const body = top.map(({ cluster, status, trending }) => {
    const cells = outletTotals.map((source) => {
      const n = countFor(cluster, source.id);
      const ranks = cluster.articles.filter((a) => a.sourceId === source.id && a.gnRank).map((a) => a.gnRank);
      const best = ranks.length ? Math.min(...ranks) : null;
      return `<td class="${source.type === "primary" ? "is-dh" : ""}">${n ? `<span class="cell on hover-trigger" tabindex="0" role="button" data-title="${escapeAttr(source.name)} · ${escapeAttr(cluster.topic)}" data-list="${listRef(cluster.articles.filter((a) => a.sourceId === source.id))}">${n}</span>` : `<span class="cell off">–</span>`}${best ? `<span class="gn-rank" title="Best Google News position">G#${best}</span>` : ""}</td>`;
    }).join("");
    return `
      <tr class="row-${status}">
        <th scope="row">
          <span class="cov-topic">${escapeHtml(cluster.topic)}${trending ? ' <span class="trend-tag" title="One of the top topics shown in the Trending Topics block">In a top topic</span>' : ""}${cluster.articles.some((a) => a.trend) ? ` <span class="trend-tag search" title="Google Trends: ${escapeAttr([...new Set(cluster.articles.filter((a) => a.trend).map((a) => a.trend.term))].join(", "))}">Trending search</span>` : ""}</span>
        </th>
        ${cells}
        <td class="status-cell"><span class="badge ${statusClass[status]} hover-trigger" tabindex="0" role="button" data-title="${statusLabel[status]} · ${escapeAttr(cluster.topic)}" data-list="${listRef(cluster.articles)}">${statusLabel[status]}</span></td>
        <td class="copy-cell"><button type="button" class="cov-copy" data-list="${listRef(cluster.articles)}" title="Copy prompt and story links" aria-label="Copy comparison prompt and story links for ${escapeAttr(cluster.topic)}">${COPY_ICON}</button></td>
      </tr>`;
  }).join("");

  const scopeLabels = [["all", "All topics"], ["trending", "Top trending only"], ["other", "Without top trending"]];
  const scopeSelect = `
    <select id="covScope" class="cov-select" aria-label="Topic scope">
      ${scopeLabels.map(([key, label]) => `<option value="${key}" ${coverageScope === key ? "selected" : ""}>${label} (${scopeCounts[key]})</option>`).join("")}
    </select>`;
  const filterLabels = [["all", "All"], ["gap", "Gaps"], ["covered", "DH covered"], ["exclusive", "DH exclusive"]];
  const filters = `
    <div class="cov-filters" role="group" aria-label="Topic filters">
      ${scopeSelect}
      ${filterLabels.map(([key, label]) => `<button type="button" class="cov-filter ${coverageFilter === key ? "active" : ""}" data-filter="${key}" aria-pressed="${coverageFilter === key}">${label} <span>${counts[key]}</span></button>`).join("")}
    </div>`;

  els.coverage.innerHTML = `
    ${summary}
    ${filters}
    <div class="cov-table-wrap">
      <table class="cov-table">
        <thead><tr><th scope="col">Topic</th>${head}<th scope="col">Status</th><th scope="col" class="copy-col"><span class="sr-only">Copy prompt and links</span></th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

function describeFeedError(message = "") {
  if (/HTTP (401|403|451)/.test(message)) return "Blocked by the website (access denied). Its stories are missing from every count.";
  if (/HTTP 429/.test(message)) return "Too many requests: the website is limiting us. Try again in a few minutes.";
  if (/HTTP 5\d\d/.test(message)) return "The website had an error. Try again later.";
  if (/HTTP 404/.test(message)) return "The feed address was not found. It may have moved.";
  if (/No RSS items/.test(message)) return "The feed answered but contained no stories.";
  return "Could not reach the feed (network problem or blocked by the browser).";
}

function renderFeedHealth() {
  const warnings = [];
  const rows = SOURCES.map((source) => {
    const health = sourceHealth.find((item) => item.sourceId === source.id);
    const mine = allArticles.filter((a) => a.sourceId === source.id && !String(a.id).startsWith("sample-"));
    let state = "idle";
    let text = "Not checked yet. Click Fetch.";
    if (health && health.ok) {
      state = "ok";
      const times = mine.map((a) => Date.parse(a.publishedAt)).filter(Number.isFinite);
      const range = times.length
        ? ` · covers ${formatDate.format(new Date(Math.min(...times)))} to ${formatDate.format(new Date(Math.max(...times)))}`
        : "";
      text = `Working · ${health.count} stories${range}`;
    } else if (health) {
      state = "bad";
      text = describeFeedError(health.error);
      warnings.push({ level: "bad", name: source.name, text });
    }
    return `<li class="feed-row ${state}"><span class="feed-dot" aria-hidden="true"></span><strong>${escapeHtml(source.name)}</strong><span>${escapeHtml(text)}</span></li>`;
  });

  if (gnSummary) {
    if (!gnSummary.okJobs) warnings.push({ level: "bad", name: "Google News", text: "Rankings could not be loaded, so no Google News positions are shown." });
    else if (gnSummary.okJobs < gnSummary.jobs) warnings.push({ level: "warn", name: "Google News", text: `${gnSummary.okJobs} of ${gnSummary.jobs} lookups worked, so some Google News positions may be missing.` });
  }

  if (trendsSummary && !trendsSummary.ok) warnings.push({ level: "bad", name: "Google Trends", text: "Trending searches could not be loaded, so no trending-search badges are shown." });

  const checked = sourceHealth.length;
  const checkedAt = checked ? `Last checked ${formatDate.format(new Date(generatedAt))}` : "";
  const banner = !checked
    ? '<div class="feed-banner idle">Feeds have not been checked yet. Click Fetch in the filter menu (top right) to load them.</div>'
    : warnings.length
      ? `<div class="feed-banner ${warnings.some((w) => w.level === "bad") ? "bad" : "warn"}" role="alert"><strong>${warnings.length} ${warnings.length === 1 ? "problem" : "problems"} found</strong><ul>${warnings.map((w) => `<li class="${w.level}"><strong>${escapeHtml(w.name)}:</strong> ${escapeHtml(w.text)}</li>`).join("")}</ul></div>`
      : '<div class="feed-banner ok">All feeds are working.</div>';

  els.feedChecked.textContent = checkedAt;
  els.feedWarnings.innerHTML = banner;
  els.feedList.innerHTML = rows.join("");
}

function renderGuideOutlets() {
  els.guidePrimary.textContent = SOURCES.filter((s) => s.type === "primary").map((s) => s.name).join(", ");
  els.guideCompetitors.textContent = SOURCES.filter((s) => s.type === "competitor").map((s) => s.name).join(", ");
}

function renderGuideWindow(articles) {
  const times = articles.map((a) => Date.parse(a.publishedAt)).filter(Number.isFinite);
  if (!times.length) {
    els.guideWindow.textContent = "No stories are loaded right now.";
    return;
  }
  const from = Math.min(...times);
  const to = Math.max(...times);
  const hours = Math.max(1, Math.round((to - from) / 36e5));
  els.guideWindow.textContent = `Right now the window is the ${els.window.selectedOptions[0].text.toLowerCase()} and they use ${articles.length} stories published from ${formatDate.format(new Date(from))} to ${formatDate.format(new Date(to))} (about ${hours} hour${hours === 1 ? "" : "s"}).`;
}

const storyView = { outlet: "all", show: "all", sort: "newest", pageSize: 12, page: 1 };
let lastStoryArticles = [];

function pageList(current, last) {
  const nums = [...new Set([1, last, current - 1, current, current + 1])].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

function renderStories(articles) {
  lastStoryArticles = articles;
  const focusId = document.activeElement && document.activeElement.closest && document.activeElement.closest("#storyControls") ? document.activeElement.id : "";
  els.stories.innerHTML = "";
  els.storyControls.innerHTML = "";
  els.storyPager.innerHTML = "";
  if (!articles.length) return empty(els.stories, "No stories match this filter.");
  const trendingOf = new Map();
  clusterArticles(articles).slice(0, TRENDING_COUNT).forEach((cluster) => {
    for (const story of cluster.articles) trendingOf.set(story, cluster);
  });

  // --- filters, sorting and counts for the dropdowns
  const outletList = SOURCES.filter((source) => articles.some((a) => a.sourceId === source.id));
  if (storyView.outlet !== "all" && !outletList.some((source) => source.id === storyView.outlet)) storyView.outlet = "all";
  const inOutlet = articles.filter((a) => storyView.outlet === "all" || a.sourceId === storyView.outlet);
  const showTests = {
    all: () => true,
    trend: (a) => Boolean(a.trend),
    gn: (a) => Boolean(a.gnRank),
    topic: (a) => trendingOf.has(a)
  };
  const showLabels = [
    ["all", "All stories"],
    ["trend", "Trending search (Google Trends)"],
    ["gn", "Ranked on Google News"],
    ["topic", "In a top topic"]
  ];
  const sortLabels = [
    ["newest", "Newest first"],
    ["oldest", "Oldest first"],
    ["rank", "Google News rank (best first)"],
    ["trend", "Trending search first"],
    ["outlet", "Outlet (A to Z)"]
  ];
  const newest = (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  const sorters = {
    newest,
    oldest: (a, b) => -newest(a, b),
    rank: (a, b) => (a.gnRank || 1e9) - (b.gnRank || 1e9) || newest(a, b),
    trend: (a, b) => Number(Boolean(b.trend)) - Number(Boolean(a.trend)) || newest(a, b),
    outlet: (a, b) => a.sourceName.localeCompare(b.sourceName) || newest(a, b)
  };
  const filtered = inOutlet.filter(showTests[storyView.show] || showTests.all).sort(sorters[storyView.sort] || newest);

  els.storyControls.innerHTML = `
    <label>Outlet
      <select id="svOutlet" class="cov-select">
        <option value="all" ${storyView.outlet === "all" ? "selected" : ""}>All outlets (${articles.length})</option>
        ${outletList.map((source) => `<option value="${source.id}" ${storyView.outlet === source.id ? "selected" : ""}>${escapeHtml(source.name)} (${articles.filter((a) => a.sourceId === source.id).length})</option>`).join("")}
      </select>
    </label>
    <label>Show
      <select id="svShow" class="cov-select">
        ${showLabels.map(([key, label]) => `<option value="${key}" ${storyView.show === key ? "selected" : ""}>${label} (${inOutlet.filter(showTests[key]).length})</option>`).join("")}
      </select>
    </label>
    <label>Sort by
      <select id="svSort" class="cov-select">
        ${sortLabels.map(([key, label]) => `<option value="${key}" ${storyView.sort === key ? "selected" : ""}>${label}</option>`).join("")}
      </select>
    </label>
    <label>Per page
      <select id="svSize" class="cov-select">
        ${[12, 24, 48].map((n) => `<option value="${n}" ${storyView.pageSize === n ? "selected" : ""}>${n}</option>`).join("")}
      </select>
    </label>`;
  if (focusId) document.getElementById(focusId)?.focus();

  if (!filtered.length) return empty(els.stories, "No stories match these filters. Try a different filter.");

  const pages = Math.max(1, Math.ceil(filtered.length / storyView.pageSize));
  storyView.page = Math.min(Math.max(1, storyView.page), pages);
  const start = (storyView.page - 1) * storyView.pageSize;
  const pageItems = filtered.slice(start, start + storyView.pageSize);

  for (const article of pageItems) {
    const node = document.createElement("article");
    node.className = "story";
    const text = article.body || article.summary || "No summary available.";
    const tags = (article.tags || []).slice(0, 3);
    const keywords = (article.keywords || []).slice(0, 3);
    const hero = article.image
      ? `<img src="${escapeAttr(article.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />`
      : "";
    node.innerHTML = `
      <div class="hero">${hero}</div>
      <div class="story-body">
        <div class="story-meta">
          <span class="badge ${article.sourceType === "primary" ? "teal" : "gold"}">${escapeHtml(article.sourceName)}</span>
          ${trendingOf.has(article) ? `<span class="trend-tag" title="Part of a top topic: ${escapeAttr(trendingOf.get(article).topic)} (${trendingOf.get(article).articles.length} stories)">In a top topic</span>` : ""}
          ${article.gnRank ? `<span class="badge gn" title="Position in Google News results (${escapeAttr(article.gnQuery || "")})">Google News #${article.gnRank}</span>` : ""}
          ${article.trend ? `<span class="badge gt" title="Google Trends (India): people are searching &quot;${escapeAttr(article.trend.term)}&quot;. This story is one of the news items Google lists under that trend.">Trending: ${escapeHtml(article.trend.term)}${article.trend.traffic ? ` · ${escapeHtml(article.trend.traffic)}` : ""}</span>` : ""}
          <time datetime="${escapeAttr(article.publishedAt)}">${formatDate.format(new Date(article.publishedAt))}</time>
        </div>
        <h4>${escapeHtml(article.title)}</h4>
        <p class="story-text">${escapeHtml(text)}</p>
        <div class="badge-row">
          ${tags.map((tag) => `<span class="badge tag">#${escapeHtml(tag)}</span>`).join("")}
          ${keywords.map((keyword) => `<span class="badge">${escapeHtml(keyword)}</span>`).join("")}
        </div>
        <div class="story-actions">
          ${text.length > 140 ? '<button type="button" class="read-more" aria-expanded="false">Read more</button>' : ""}
          <a class="open-link" href="${escapeAttr(article.link)}" target="_blank" rel="noreferrer">Open in browser ↗</a>
        </div>
      </div>
    `;
    els.stories.appendChild(node);
  }

  const info = `Showing ${start + 1}\u2013${start + pageItems.length} of ${filtered.length} ${filtered.length === 1 ? "story" : "stories"}`;
  const buttons = pages > 1
    ? `<button type="button" class="pg" data-page="${storyView.page - 1}" ${storyView.page === 1 ? "disabled" : ""} aria-label="Previous page">\u2039 Prev</button>
       ${pageList(storyView.page, pages).map((n) => (n === "\u2026" ? '<span class="pg-gap">\u2026</span>' : `<button type="button" class="pg ${n === storyView.page ? "active" : ""}" data-page="${n}" ${n === storyView.page ? 'aria-current="page"' : ""}>${n}</button>`)).join("")}
       <button type="button" class="pg" data-page="${storyView.page + 1}" ${storyView.page === pages ? "disabled" : ""} aria-label="Next page">Next \u203a</button>`
    : "";
  els.storyPager.innerHTML = `<span class="pager-info">${info}</span><div class="pager-buttons">${buttons}</div>`;
}

els.storyControls.addEventListener("change", (event) => {
  const keys = { svOutlet: "outlet", svShow: "show", svSort: "sort", svSize: "pageSize" };
  const key = keys[event.target.id];
  if (!key) return;
  storyView[key] = key === "pageSize" ? Number(event.target.value) : event.target.value;
  storyView.page = 1;
  renderStories(lastStoryArticles);
});

els.storyPager.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");
  if (!button || button.disabled) return;
  storyView.page = Number(button.dataset.page);
  renderStories(lastStoryArticles);
  els.storyControls.scrollIntoView({ block: "start", behavior: "smooth" });
});

const hoverCard = document.createElement("div");
hoverCard.className = "hover-card hidden";
hoverCard.setAttribute("role", "dialog");
document.body.appendChild(hoverCard);
let hoverLists = [];
function listRef(list) {
  hoverLists.push(list);
  return hoverLists.length - 1;
}
let hoverTimer = null;
let hoverTrigger = null;

function hideHoverCard() {
  hoverCard.classList.add("hidden");
  hoverTrigger = null;
}

function showHoverCard(trigger) {
  clearTimeout(hoverTimer);
  if (hoverTrigger === trigger && !hoverCard.classList.contains("hidden")) return;
  const stories = (hoverLists[Number(trigger.dataset.list)] || [])
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  hoverCard.innerHTML = `
    <div class="hover-card-head">${escapeHtml(trigger.dataset.title || "Stories")} <span>${stories.length}</span></div>
    <ul>
      ${stories.length
        ? stories.map((a) => `
          <li>
            <span class="badge ${a.sourceType === "primary" ? "teal" : "gold"}">${escapeHtml(a.sourceName)}</span>
            <a href="${escapeAttr(a.link)}" target="_blank" rel="noreferrer">${escapeHtml(a.title)}</a>
          </li>`).join("")
        : '<li class="hover-empty">No stories found.</li>'}
    </ul>`;
  hoverCard.classList.remove("hidden");
  hoverTrigger = trigger;
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(380, window.innerWidth - 16);
  hoverCard.style.width = `${width}px`;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const below = window.innerHeight - rect.bottom;
  const height = Math.min(hoverCard.offsetHeight, 340);
  const top = below >= height + 12 || rect.top < height + 12 ? rect.bottom + 6 : rect.top - height - 6;
  hoverCard.style.left = `${left}px`;
  hoverCard.style.top = `${Math.max(8, top)}px`;
}

function scheduleHide() {
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(hideHoverCard, 200);
}

document.addEventListener("mouseover", (event) => {
  const trigger = event.target.closest(".hover-trigger");
  if (trigger) return showHoverCard(trigger);
  if (event.target.closest(".hover-card")) clearTimeout(hoverTimer);
});
document.addEventListener("mouseout", (event) => {
  if (event.target.closest(".hover-trigger, .hover-card")) scheduleHide();
});
document.addEventListener("focusin", (event) => {
  const trigger = event.target.closest(".hover-trigger");
  if (trigger) showHoverCard(trigger);
});
document.addEventListener("click", (event) => {
  const trigger = event.target.closest(".hover-trigger");
  if (trigger) return showHoverCard(trigger);
  if (!event.target.closest(".hover-card")) hideHoverCard();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideHoverCard();
});
window.addEventListener("scroll", hideHoverCard, { passive: true });

els.coverage.addEventListener("change", (event) => {
  if (!event.target.matches("#covScope")) return;
  coverageScope = event.target.value;
  renderCoverage(lastCoverageClusters);
});

els.coverage.addEventListener("click", async (event) => {
  const copy = event.target.closest(".cov-copy");
  if (copy) {
    const ok = await copyText(comparisonText(hoverLists[Number(copy.dataset.list)] || []));
    copy.innerHTML = ok ? CHECK_ICON : COPY_ICON;
    copy.classList.toggle("copied", ok);
    copy.title = ok ? "Copied!" : "Copy failed. Select and copy manually.";
    setTimeout(() => {
      copy.innerHTML = COPY_ICON;
      copy.classList.remove("copied");
      copy.title = "Copy prompt and story links";
    }, 1800);
    return;
  }
  const button = event.target.closest(".cov-filter");
  if (!button) return;
  coverageFilter = button.dataset.filter;
  renderCoverage(lastCoverageClusters);
});

els.stories.addEventListener("click", (event) => {
  const button = event.target.closest(".read-more");
  if (!button) return;
  const expanded = button.closest(".story").classList.toggle("expanded");
  button.textContent = expanded ? "Show less" : "Read more";
  button.setAttribute("aria-expanded", String(expanded));
});

function empty(container, message) {
  const node = document.createElement("div");
  node.className = "empty";
  node.textContent = message;
  container.appendChild(node);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

els.controlsToggle.addEventListener("click", () => {
  const open = els.controls.classList.toggle("hidden") === false;
  els.controlsToggle.setAttribute("aria-expanded", String(open));
  els.controlsToggle.classList.toggle("open", open);
});

function markFiltersDirty() {
  filtersDirty = true;
  updateFetchButton();
}
els.filters.addEventListener("input", markFiltersDirty);
els.filters.addEventListener("input", debounce(loadDashboard));
els.source.addEventListener("change", markFiltersDirty);
els.source.addEventListener("change", loadDashboard);
els.refreshBtn.addEventListener("click", refreshFeeds);

const cached = loadCachedArticles();
if (cached?.articles?.length) {
  allArticles = cached.articles;
  sourceHealth = cached.sourceHealth || [];
  generatedAt = cached.generatedAt || generatedAt;
  gnSummary = cached.gnSummary || null;
  hasFetchedData = true;
}
loadSources();
loadDashboard();
updateFetchButton();
