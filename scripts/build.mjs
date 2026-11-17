import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content");
const ITEMS_DIR = path.join(CONTENT_DIR, "items");
const DIST = path.join(ROOT, "dist");
const ASSETS_SRC = path.join(ROOT, "assets");
const MEDIA_SRC = path.join(ROOT, "media");

const BASE = "/design-news";

const SERIES_LABEL = { x: "X 设计动态", ai: "AI 辅助设计日报" };

marked.setOptions({ gfm: true, breaks: false });

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  throw new Error(`Invalid date: ${value}`);
}

function formatDateLabel(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${y} 年 ${m} 月 ${d} 日`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mediaUrl(date, file) {
  return file ? `${BASE}/media/${date}/${file}` : null;
}

function itemPermalink(date, slug) {
  return `${BASE}/${date}/${slug}/`;
}

function loadMediaMeta(date) {
  const p = path.join(MEDIA_SRC, date, "media-meta.json");
  if (!fs.existsSync(p)) return { tweets: {}, extras: {} };
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadDayItems(date) {
  const p = path.join(CONTENT_DIR, `${date}-items.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadItemDetails(date) {
  if (!fs.existsSync(ITEMS_DIR)) return [];
  const prefix = `${date}-`;
  return fs
    .readdirSync(ITEMS_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(ITEMS_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const slug = data.slug || file.slice(prefix.length, -3);
      return {
        ...data,
        slug,
        date: normalizeDate(data.date),
        bodyMd: content,
        bodyHtml: marked.parse(content),
      };
    });
}

function resolveCardMedia(item, meta, date) {
  if (item.typographic && !item.tweetId) {
    return { typographic: true };
  }
  if (item.coverKey && meta.extras?.[item.coverKey]) {
    const file = meta.extras[item.coverKey];
    const url = mediaUrl(date, file);
    return { cover: url, images: [url] };
  }
  if (item.tweetId && meta.tweets?.[item.tweetId]) {
    const t = meta.tweets[item.tweetId];
    const cover = mediaUrl(date, t.cover || t.poster || t.images?.[0]);
    return {
      cover,
      images: (t.images ?? []).map((f) => mediaUrl(date, f)),
      poster: t.poster ? mediaUrl(date, t.poster) : null,
      video: t.video ? mediaUrl(date, t.video) : null,
    };
  }
  if (item.typographic) return { typographic: true };
  return { typographic: true };
}

function resolveDetailMedia(detail, meta, date, cardItem) {
  const files = new Set();
  const videos = [];

  if (detail.gallery?.length) {
    detail.gallery.forEach((f) => files.add(f));
  }
  if (detail.tweetId && meta.tweets[detail.tweetId]) {
    const t = meta.tweets[detail.tweetId];
    (t.images ?? []).forEach((f) => files.add(f));
    if (t.poster) files.add(t.poster);
    if (t.video) {
      videos.push({
        src: mediaUrl(date, t.video),
        poster: t.poster ? mediaUrl(date, t.poster) : null,
        autoplay: cardItem?.videoAutoplay,
      });
    }
  }
  if (detail.extraVideos?.length) {
    for (const v of detail.extraVideos) {
      videos.push({
        src: mediaUrl(date, v.file),
        poster: v.poster ? mediaUrl(date, v.poster) : null,
        autoplay: v.autoplay,
      });
    }
  }
  if (cardItem?.coverKey && meta.extras?.[cardItem.coverKey]) {
    files.add(meta.extras[cardItem.coverKey]);
  }

  const images = [...files].map((f) => mediaUrl(date, f));
  const hero = videos[0] || images[0];
  return { images, videos, hero, heroIsVideo: Boolean(videos[0]) };
}

function renderVideo(v) {
  const loop = v.autoplay ? ' data-autoplay-loop="true" loop' : "";
  return `<figure class="detail-hero__video">
    <video class="story-video" poster="${v.poster || ""}" muted playsinline controls preload="metadata"${loop}>
      <source src="${v.src}" type="video/mp4">
    </video>
  </figure>`;
}

function renderDetailHero(media, title) {
  if (media.heroIsVideo) return renderVideo(media.videos[0]);
  if (media.hero)
    return `<figure class="detail-hero__image"><img src="${media.hero}" alt="${escapeHtml(title)}" decoding="async" fetchpriority="high"></figure>`;
  if (detailTypographic(title))
    return `<div class="detail-hero__type" aria-hidden="true"><span>Aa</span></div>`;
  return "";
}

function detailTypographic(title) {
  return title.includes("490") || title.includes("Underlay");
}

function buildFacts(facts) {
  if (!facts?.length) return "";
  const rows = facts
    .map(
      (f) =>
        `<motion.div class="detail-facts__row"><dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd></motion.div>`
    )
    .join("");
  return `<dl class="detail-facts">${rows}</dl>`;
}

function buildGallery(images, title, skipFirst) {
  const list = skipFirst ? images.slice(1) : images;
  if (!list.length) return "";
  return `<section class="detail-gallery" aria-label="图集">
    <h2 class="detail-section-title">图集</h2>
    <div class="detail-gallery__grid">${list
      .map(
        (src, i) =>
          `<figure><img src="${src}" alt="${escapeHtml(title)} ${i + 2}" loading="lazy" decoding="async"></figure>`
      )
      .join("")}</motion.div>
  </section>`;
}

function buildExtraVideos(videos, skipFirst) {
  const list = skipFirst ? videos.slice(1) : videos;
  if (!list.length) return "";
  return list
    .map((v) => {
      const loop = v.autoplay ? ' data-autoplay-loop="true" loop' : "";
      return `<figure class="detail-gallery__video">
      <video class="story-video" poster="${v.poster || ""}" muted playsinline controls preload="metadata"${loop}>
        <source src="${v.src}" type="video/mp4">
      </video>
    </figure>`;
    })
    .join("");
}

function buildLinks(sources, official, tweet) {
  const items = [];
  if (tweet) items.push({ label: "X 原帖", url: tweet });
  if (official) items.push({ label: "官方页面", url: official });
  (sources ?? []).forEach((s) => items.push(s));
  if (!items.length) return "";
  return `<section class="detail-links">
    <h2 class="detail-section-title">延伸阅读</h2>
    <ul>${items.map((l) => `<li><a href="${escapeHtml(l.url)}" rel="noopener noreferrer">${escapeHtml(l.label)}</a></li>`).join("")}</ul>
  </section>`;
}

function buildQuote(quote) {
  if (!quote?.text) return "";
  const cite = quote.url ? `<footer><a href="${escapeHtml(quote.url)}">原帖</a></footer>` : "";
  return `<blockquote class="detail-quote"><p>${escapeHtml(quote.text)}</p>${cite}</blockquote>`;
}

function buildNav(date, slug, ordered) {
  const idx = ordered.findIndex((i) => i.slug === slug);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
  return `<nav class="detail-nav" aria-label="同日条目">
    ${prev ? `<a class="detail-nav__prev" href="${itemPermalink(date, prev.slug)}">← ${escapeHtml(prev.title)}</a>` : "<span></span>"}
    <a class="detail-nav__home" href="${BASE}/">返回首页</a>
    ${next ? `<a class="detail-nav__next" href="${itemPermalink(date, next.slug)}">${escapeHtml(next.title)} →</a>` : "<span></span>"}
  </nav>`;
}

function layout({ title, body, extraScripts = "" }) {
  return `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · 设计动态</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${BASE}/assets/style.css">
</head>
<body>
  <header class="site-header">
    <div class="site-header__inner">
      <h1 class="site-title"><a href="${BASE}/">设计动态</a></h1>
      <p class="site-subtitle">前沿设计与 AI 辅助设计的工作日笔记</p>
    </div>
  </header>
  <main class="site-main">${body}</main>
  <footer class="site-footer">工作日更新</footer>
  ${extraScripts}
</body>
</html>`;
}

function buildDetailPage(detail, cardItem, meta, ordered) {
  const media = resolveDetailMedia(detail, meta, detail.date, cardItem);
  const cat = detail.category;
  const isType =
    cardItem?.typographic && !detail.tweetId && !media.hero;

  let hero = "";
  if (isType) {
    hero = `<motion.div class="detail-hero__type" role="img" aria-label="${escapeHtml(detail.title)}"><span>Aa</span><p>${escapeHtml(detail.title)}</p></div>`;
  } else if (media.heroIsVideo) {
    hero = `<div class="detail-hero">${renderVideo(media.videos[0])}</motion.div>`;
  } else if (media.hero) {
    hero = `<div class="detail-hero"><figure class="detail-hero__image"><img src="${media.hero}" alt="${escapeHtml(detail.title)}" decoding="async" fetchpriority="high"></figure></div>`;
  }

  const body = `
  <article class="detail-page">
    <header class="detail-mast">
      <a class="article-back" href="${BASE}/">← 返回首页</a>
      <p class="article-series article-series--${cat}">${SERIES_LABEL[cat]}</p>
      <p class="article-date">${formatDateLabel(detail.date)}</p>
      <h1 class="detail-title">${escapeHtml(detail.title)}</h1>
      <p class="detail-author">${escapeHtml(detail.author)}</p>
      ${detail.deck ? `<p class="detail-deck">${escapeHtml(detail.deck)}</p>` : ""}
    </header>
    ${hero}
    ${buildFacts(detail.facts)}
    <div class="detail-body magazine-article">${detail.bodyHtml}</div>
    ${buildGallery(media.images, detail.title, true)}
    ${buildExtraVideos(media.videos, true)}
    ${buildQuote(detail.quote)}
    ${buildLinks(detail.sources, detail.official, detail.tweet)}
    ${buildNav(detail.date, detail.slug, ordered)}
  </article>`;

  return layout({
    title: detail.title,
    body,
    extraScripts: `<script src="${BASE}/assets/article.js" defer></script>`,
  });
}

function buildMagazineCard(item, media, date) {
  const href = itemPermalink(date, item.id);
  const aspect = item.cardAspect || "4/3";
  let visual = "";
  if (media.typographic) {
    visual = `<div class="mag-card__visual mag-card__visual--type"><span aria-hidden="true">Aa</span></motion.div>`;
  } else if (media.cover) {
    visual = `<div class="mag-card__visual" style="--ar:${aspect}"><img src="${media.cover}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async"></div>`;
  }
  return `<article class="mag-card" data-category="${item.category}">
    <a class="mag-card__link" href="${href}">
      ${visual}
      <div class="mag-card__meta">
        <span class="mag-card__tick mag-card__tick--${item.category}">${SERIES_LABEL[item.category]}</span>
        <h3 class="mag-card__title">${escapeHtml(item.title)}</h3>
        <p class="mag-card__author">${escapeHtml(item.author)}</p>
      </div>
    </a>
  </article>`;
}

function buildFeatured(featured, media, date) {
  const href = itemPermalink(date, featured.id);
  const deck = featured.deck ? `<p class="feature-hero__deck">${escapeHtml(featured.deck)}</p>` : "";
  let mediaInner = "";
  if (media.video) {
    mediaInner = `<video class="feature-hero__vid" poster="${media.poster || media.cover}" muted playsinline loop data-autoplay-loop playsinline><source src="${media.video}" type="video/mp4"></video>`;
  } else if (media.cover) {
    mediaInner = `<img src="${media.cover}" alt="" decoding="async">`;
  }
  return `<section class="feature-hero" data-category="${featured.category}">
    <a class="feature-hero__link" href="${href}">
      <motion.div class="feature-hero__media">${mediaInner}</div>
      <div class="feature-hero__text">
        <span class="mag-card__tick mag-card__tick--${featured.category}">今日主推 · ${SERIES_LABEL[featured.category]}</span>
        <h2 class="feature-hero__title">${escapeHtml(featured.title)}</h2>
        <p class="feature-hero__author">${escapeHtml(featured.author)}</p>
        ${deck}
        <span class="feature-hero__cta">阅读全文</span>
      </div>
    </a>
  </section>`;
}

function buildIndex(date, dayItems, meta) {
  const featured = dayItems.items.find((i) => i.id === dayItems.featured);
  const rest = dayItems.items.filter((i) => i.id !== dayItems.featured);
  const grid = rest.map((item) => buildMagazineCard(item, resolveCardMedia(item, meta, date), date)).join("");
  const hero = featured ? buildFeatured(featured, resolveCardMedia(featured, meta, date), date) : "";
  const body = `
    <nav class="filter-bar" aria-label="栏目筛选">
      <button type="button" class="is-active" data-filter="all">全部</button>
      <button type="button" data-filter="x">X 设计动态</button>
      <button type="button" data-filter="ai">AI 辅助设计日报</button>
    </motion.div>
    <section class="edition" data-date="${date}">
      <h2 class="edition__date"><a href="${BASE}/${date}/">${formatDateLabel(date)}</a> · <a href="${BASE}/${date}/x/">X</a> / <a href="${BASE}/${date}/ai/">AI</a></h2>
      ${hero}
      <div class="mag-grid">${grid}</motion.div>
    </section>`;
  return layout({ title: "首页", body, extraScripts: `<script src="${BASE}/assets/home.js" defer></script>` });
}

function buildDigest(date, category, items, details, meta) {
  const cards = items
    .filter((i) => i.category === category)
    .map((item) => {
      const d = details.find((x) => x.slug === item.id);
      const media = resolveCardMedia(item, meta, date);
      const href = itemPermalink(date, item.id);
      const thumb = media.cover
        ? `<img src="${media.cover}" alt="" loading="lazy">`
        : `<span class="digest-card__type">Aa</span>`;
      return `<li class="digest-card"><a href="${href}">${thumb}<span><strong>${escapeHtml(d?.title || item.title)}</strong><em>${escapeHtml(item.author)}</em></span></a></li>`;
    })
    .join("");
  const body = `
    <header class="detail-mast">
      <a class="article-back" href="${BASE}/">← 返回首页</a>
      <p class="article-series article-series--${category}">${SERIES_LABEL[category]}</p>
      <p class="article-date">${formatDateLabel(date)}</p>
      <h1 class="detail-title">${SERIES_LABEL[category]}</h1>
      <p class="detail-deck">当日 ${items.filter((i) => i.category === category).length} 条，点击进入单条详情。</p>
    </header>
    <ul class="digest-list">${cards}</ul>`;
  return layout({ title: SERIES_LABEL[category], body });
}

function loadDigestPosts() {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-(x|ai)\.md$/.test(f))
    .map((f) => f);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function main() {
  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const dates = [...new Set(loadItemDetails("2026-11-17").map((d) => d.date))];
  if (!dates.length) dates.push("2026-11-17");

  let totalDetails = 0;
  for (const date of dates) {
    const dayItems = loadDayItems(date);
    const meta = loadMediaMeta(date);
    const details = loadItemDetails(date).sort((a, b) => {
      const order = dayItems.items.map((i) => i.id);
      return order.indexOf(a.slug) - order.indexOf(b.slug);
    });

    if (dayItems) {
      writeFile(path.join(DIST, "index.html"), buildIndex(date, dayItems, meta));
      writeFile(path.join(DIST, date, "x", "index.html"), buildDigest(date, "x", dayItems.items, details, meta));
      writeFile(path.join(DIST, date, "ai", "index.html"), buildDigest(date, "ai", dayItems.items, details, meta));
    }

    totalDetails += details.length;
    for (const detail of details) {
      const cardItem = dayItems?.items?.find((i) => i.id === detail.slug);
      writeFile(
        path.join(DIST, date, detail.slug, "index.html"),
        buildDetailPage(detail, cardItem, meta, details)
      );
    }
  }

  const assetsDest = path.join(DIST, "assets");
  fs.mkdirSync(assetsDest, { recursive: true });
  for (const file of fs.readdirSync(ASSETS_SRC)) {
    fs.copyFileSync(path.join(ASSETS_SRC, file), path.join(assetsDest, file));
  }
  copyDir(MEDIA_SRC, path.join(DIST, "media"));

  console.log(`Built detail pages (${totalDetails}) → ${DIST}`);
}

main();