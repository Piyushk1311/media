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
    rss: "https://www.thehindu.com/news/national/karnataka/feeder/default.rss"
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
    rss: "https://timesofindia.indiatimes.com/rssfeeds/-2128833038.cms"
  },
  {
    id: "ndtv",
    name: "NDTV",
    type: "competitor",
    rss: "https://feeds.feedburner.com/ndtvnews-india-news"
  },
  {
    id: "india-today",
    name: "India Today",
    type: "competitor",
    rss: "https://www.indiatoday.in/rss/1206578"
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
  search: document.querySelector("#search"),
  source: document.querySelector("#source"),
  from: document.querySelector("#from"),
  to: document.querySelector("#to"),
  pinWrap: document.querySelector("#pinWrap"),
  refreshBtn: document.querySelector("#refreshBtn"),
  exportLink: document.querySelector("#exportLink"),
  statusText: document.querySelector("#statusText"),
  aiMode: document.querySelector("#aiMode"),
  articleCount: document.querySelector("#articleCount"),
  dhCount: document.querySelector("#dhCount"),
  competitorCount: document.querySelector("#competitorCount"),
  clusterCount: document.querySelector("#clusterCount"),
  gapCount: document.querySelector("#gapCount"),
  updatedAt: document.querySelector("#updatedAt"),
  trendingTopics: document.querySelector("#trendingTopics"),
  keywords: document.querySelector("#keywords"),
  missingAngles: document.querySelector("#missingAngles"),
  followUps: document.querySelector("#followUps"),
  explainers: document.querySelector("#explainers"),
  coverage: document.querySelector("#coverage"),
  dynamicSources: document.querySelector("#dynamicSources"),
  stories: document.querySelector("#stories")
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

function parseFeed(xml, source) {
  const itemBlocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  const entryBlocks = itemBlocks.length ? itemBlocks : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => m[0]);

  return entryBlocks.slice(0, 35).map((block, index) => {
    const title = stripHtml(tagValue(block, "title"));
    const summary = stripHtml(tagValue(block, "description") || tagValue(block, "summary") || tagValue(block, "content:encoded"));
    const linkMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
    const link = decodeEntities(tagValue(block, "link") || (linkMatch && linkMatch[1]) || source.rss);
    const rawDate = tagValue(block, "pubDate") || tagValue(block, "published") || tagValue(block, "updated");
    const publishedAt = Number.isNaN(Date.parse(rawDate)) ? new Date().toISOString() : new Date(rawDate).toISOString();
    const keywords = extractKeywords(`${title} ${summary}`, 8);

    return {
      id: `${source.id}-${btoa(unescape(encodeURIComponent(link || title || String(index)))).replace(/[^a-z0-9]/gi, "").slice(0, 18)}`,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      title: title || "Untitled story",
      summary,
      link,
      publishedAt,
      image: extractImage(block),
      keywords
    };
  });
}

async function fetchFeed(source) {
  const urls = [
    source.rss,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(source.rss)}`,
    `https://corsproxy.io/?${encodeURIComponent(source.rss)}`
  ];

  let lastError = "Feed unavailable";
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      if (!xml.includes("<item") && !xml.includes("<entry")) throw new Error("No RSS items found");
      return parseFeed(xml, source);
    } catch (error) {
      lastError = error.message;
    }
  }
  throw new Error(lastError);
}

async function refreshFeeds() {
  if (isFetching) return;
  isFetching = true;
  els.statusText.textContent = "Fetching RSS feeds…";
  els.statusText.classList.add("is-loading");
  updateFetchButton();
  const articles = [];
  const health = [];

  for (const source of SOURCES) {
    try {
      const parsed = await fetchFeed(source);
      articles.push(...parsed);
      health.push({ sourceId: source.id, name: source.name, ok: true, count: parsed.length });
    } catch (error) {
      health.push({ sourceId: source.id, name: source.name, ok: false, count: 0, error: error.message });
    }
  }

  sourceHealth = health;
  if (articles.length) {
    allArticles = dedupeArticles(articles).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    generatedAt = new Date().toISOString();
    hasFetchedData = true;
    localStorage.setItem("dh-static-cache", JSON.stringify({ articles: allArticles, sourceHealth, generatedAt }));
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

  return allArticles.filter((article) => {
    const published = new Date(article.publishedAt);
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
    dynamicSources: suggestDynamicSources(topKeywords),
    sourceHealth,
    aiMode: "Static GitHub Pages mode"
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

function suggestDynamicSources(topKeywords) {
  const terms = topKeywords.slice(0, 3).map((item) => item.keyword).join(" ");
  return [
    {
      name: "Google News Search",
      reason: `Track fresh outlets ranking for "${terms || "Bengaluru Karnataka"}".`,
      url: `https://news.google.com/search?q=${encodeURIComponent(terms || "Bengaluru Karnataka")}`
    },
    {
      name: "Bar & Bench",
      reason: "Useful when courts, governance, or policy keywords are trending.",
      url: "https://www.barandbench.com/"
    },
    {
      name: "Moneycontrol",
      reason: "Useful when infrastructure, business, markets, or civic finance angles appear.",
      url: "https://www.moneycontrol.com/news/"
    }
  ];
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
  const status = sourceHealth.length
    ? `Loaded ${allArticles.length} articles from ${loaded}/${SOURCES.length} feeds.`
    : "Using starter sample data. Click Fetch to load live RSS.";
  render({ articles, insights, status, refreshInProgress: false });
}

function render({ articles, insights, status, refreshInProgress }) {
  els.statusText.textContent = refreshInProgress ? "Fetching RSS feeds…" : status;
  els.aiMode.textContent = insights.aiMode;
  els.articleCount.textContent = insights.stats.totalArticles;
  els.dhCount.textContent = insights.stats.dhArticles;
  els.competitorCount.textContent = insights.stats.competitorArticles;
  els.clusterCount.textContent = insights.stats.clusters;
  els.gapCount.textContent = insights.missingAngles.length;
  els.updatedAt.textContent = `Updated ${formatDate.format(new Date(insights.stats.lastUpdated))}`;

  renderTopics(insights.clusters);
  renderKeywords(insights.topKeywords);
  renderInsights(els.missingAngles, insights.missingAngles, "reason");
  renderInsights(els.followUps, insights.followUps);
  renderInsights(els.explainers, insights.explainers);
  renderCoverage(insights.clusters);
  renderSources(insights.dynamicSources);
  renderStories(articles);
}

function renderTopics(clusters) {
  els.trendingTopics.innerHTML = "";
  if (!clusters.length) return empty(els.trendingTopics, "No matching topics.");
  for (const cluster of clusters.slice(0, 9)) {
    const node = document.createElement("article");
    node.className = "topic";
    const sourceText = cluster.sources.slice(0, 4).join(", ");
    node.innerHTML = `
      <div class="topic-top">
        <h4>${escapeHtml(cluster.topic)}</h4>
        <span class="badge ${cluster.competitorCount > cluster.dhCount ? "red" : "teal"}">${cluster.articles.length} stories</span>
      </div>
      <p>${escapeHtml(sourceText)}</p>
      <div class="badge-row">
        <span class="badge teal">DH ${cluster.dhCount}</span>
        <span class="badge gold">Competitors ${cluster.competitorCount}</span>
        ${cluster.keywords.slice(0, 5).map((keyword) => `<span class="badge">${escapeHtml(keyword)}</span>`).join("")}
      </div>
    `;
    els.trendingTopics.appendChild(node);
  }
}

function renderKeywords(keywords) {
  els.keywords.innerHTML = "";
  if (!keywords.length) return empty(els.keywords, "No keywords found.");
  for (const item of keywords) {
    const node = document.createElement("span");
    node.className = "keyword";
    node.textContent = `${item.keyword} ${item.count}`;
    els.keywords.appendChild(node);
  }
}

function renderInsights(container, items, metaKey) {
  container.innerHTML = "";
  if (!items.length) return empty(container, "No items for the current filter.");
  for (const item of items) {
    const node = document.createElement("article");
    node.className = "insight";
    const keywordBadges = item.keywords?.length
      ? `<div class="badge-row">${item.keywords.map((keyword) => `<span class="badge">${escapeHtml(keyword)}</span>`).join("")}</div>`
      : "";
    const priority = item.priority ? `<span class="badge ${item.priority === "High" ? "red" : item.priority === "Medium" ? "gold" : "teal"}">${escapeHtml(item.priority)}</span>` : "";
    node.innerHTML = `
      <div class="insight-title">
        <h4>${escapeHtml(item.topic)}</h4>
        ${priority}
      </div>
      ${metaKey && item[metaKey] ? `<p><strong>${escapeHtml(item[metaKey])}</strong></p>` : ""}
      <p>${escapeHtml(item.suggestion)}</p>
      ${item.evidence ? `<p>${escapeHtml(item.evidence)}</p>` : ""}
      ${item.readerQuestion ? `<p><strong>${escapeHtml(item.readerQuestion)}</strong></p>` : ""}
      ${item.assignment ? `<p>${escapeHtml(item.assignment)}</p>` : ""}
      ${keywordBadges}
    `;
    container.appendChild(node);
  }
}

function renderCoverage(clusters) {
  els.coverage.innerHTML = "";
  const rows = clusters.filter((cluster) => cluster.competitorCount || cluster.dhCount).slice(0, 10);
  if (!rows.length) return empty(els.coverage, "No coverage to compare.");
  const max = Math.max(...rows.map((cluster) => cluster.competitorCount + cluster.dhCount), 1);
  for (const cluster of rows) {
    const total = cluster.competitorCount + cluster.dhCount;
    const node = document.createElement("article");
    node.className = "coverage-item";
    node.innerHTML = `
      <div>
        <h4>${escapeHtml(cluster.topic)}</h4>
        <p>DH ${cluster.dhCount} · Competitors ${cluster.competitorCount}</p>
        <div class="bar"><span style="width:${Math.max(8, (total / max) * 100)}%"></span></div>
      </div>
      <span class="badge ${cluster.competitorCount > cluster.dhCount ? "red" : "teal"}">${cluster.competitorCount > cluster.dhCount ? "Gap" : "Covered"}</span>
    `;
    els.coverage.appendChild(node);
  }
}

function renderSources(items) {
  els.dynamicSources.innerHTML = "";
  for (const item of items) {
    const node = document.createElement("article");
    node.className = "source-item";
    node.innerHTML = `
      <h4><a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.name)}</a></h4>
      <p>${escapeHtml(item.reason)}</p>
    `;
    els.dynamicSources.appendChild(node);
  }
}

function renderStories(articles) {
  els.stories.innerHTML = "";
  if (!articles.length) return empty(els.stories, "No stories match this filter.");
  for (const article of articles.slice(0, 18)) {
    const node = document.createElement("article");
    node.className = "story";
    const image = article.image ? `style="background-image:url('${escapeAttr(article.image)}')"` : "";
    node.innerHTML = `
      <div class="thumb" ${image}></div>
      <div>
        <div class="story-top">
          <h4><a href="${escapeAttr(article.link)}" target="_blank" rel="noreferrer">${escapeHtml(article.title)}</a></h4>
          <span class="badge ${article.sourceType === "primary" ? "teal" : "gold"}">${escapeHtml(article.sourceName)}</span>
        </div>
        <p>${escapeHtml(article.summary || "No summary available.")}</p>
        <div class="badge-row">
          <span class="badge">${formatDate.format(new Date(article.publishedAt))}</span>
          ${article.keywords.slice(0, 4).map((keyword) => `<span class="badge">${escapeHtml(keyword)}</span>`).join("")}
        </div>
      </div>
    `;
    els.stories.appendChild(node);
  }
}

function exportCsv() {
  const articles = getFilteredArticles();
  const insights = buildInsights(articles);
  const rows = [
    ["type", "topic", "source", "title", "published_at", "link", "suggestion"],
    ...articles.map((article) => ["article", "", article.sourceName, article.title, article.publishedAt, article.link, ""]),
    ...insights.missingAngles.map((item) => ["missing_angle", item.topic, "", "", "", "", `${item.suggestion} ${item.evidence || ""}`]),
    ...insights.followUps.map((item) => ["follow_up", item.topic, "", "", "", "", item.suggestion]),
    ...insights.explainers.map((item) => ["explainer", item.topic, "", "", "", "", item.suggestion])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dh-editorial-intelligence.csv";
  link.click();
  URL.revokeObjectURL(url);
}

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

function markFiltersDirty() {
  filtersDirty = true;
  updateFetchButton();
}
els.filters.addEventListener("input", markFiltersDirty);
els.filters.addEventListener("input", debounce(loadDashboard));
els.source.addEventListener("change", markFiltersDirty);
els.source.addEventListener("change", loadDashboard);
els.refreshBtn.addEventListener("click", refreshFeeds);
els.exportLink.addEventListener("click", (event) => {
  event.preventDefault();
  exportCsv();
});

const cached = loadCachedArticles();
if (cached?.articles?.length) {
  allArticles = cached.articles;
  sourceHealth = cached.sourceHealth || [];
  generatedAt = cached.generatedAt || generatedAt;
  hasFetchedData = true;
}
loadSources();
loadDashboard();
updateFetchButton();
