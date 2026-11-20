import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import {
  discoverContentDates,
  getRetentionDays,
  isWithinRetention,
  todayShanghai,
} from "./lib/retention.mjs";
import {
  HomeThumbRegistry,
  generateHomeThumbs,
  homeThumbImgTag,
} from "./lib/home-images.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content");
const ITEMS_DIR = path.join(CONTENT_DIR, "items");
const DIST = path.join(ROOT, "dist");
const ASSETS_SRC = path.join(ROOT, "assets");
const MEDIA_SRC = path.join(ROOT, "media");

const BASE = "/design-news";

function assetQuery() {
  let max = 0;
  for (const name of ["style.css", "home.js", "article.js"]) {
    const p = path.join(ASSETS_SRC, name);
    if (fs.existsSync(p)) max = Math.max(max, fs.statSync(p).mtimeMs);
  }
  return max ? `?v=${Math.floor(max).toString(36)}` : "";
}

const ASSET_Q = assetQuery();

const SERIES_LABEL = {
  x: "X 设计动态",
  game: "娱乐设计动态",
  ai: "AI 辅助设计日报",
};

const X_LOGO_PATH =
  "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";
/** Header X mark — explicit px for WebKit; pairs with `.site-logo__x` 2.75rem in CSS */
const HEADER_X_LOGO_PX = 44;

function xLogoSvg(className = "site-logo__x", size) {
  const sizeAttr = size != null ? ` width="${size}" height="${size}"` : "";
  return `<svg class="${className}"${sizeAttr} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${X_LOGO_PATH}"/></svg>`;
}

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

function dateNavLabel(isoDate) {
  const wd = new Intl.DateTimeFormat("zh-Hans", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  }).format(parseYmdRetention(isoDate));
  const [, m, d] = isoDate.split("-").map(Number);
  return `${m} 月 ${d} 日 ${wd}`;
}

function weekdayLong(isoDate) {
  return new Intl.DateTimeFormat("zh-Hans", {
    timeZone: "Asia/Shanghai",
    weekday: "long",
  }).format(parseYmdRetention(isoDate));
}

function buildEditionMast(date, todayYmd) {
  const isToday = date === todayYmd;
  const [y, m, d] = date.split("-").map(Number);
  const wd = weekdayLong(date);
  const todayMark = isToday
    ? `<p class="edition__today" aria-hidden="true">今天</p>`
    : "";
  return `
    <header class="edition__mast${isToday ? " edition__mast--today" : ""}">
      ${todayMark}
      <h2 class="edition__title">${escapeHtml(`${m} 月 ${d} 日`)} · ${escapeHtml(wd)}</h2>
      <p class="edition__meta">
        <span class="edition__year">${y} 年</span>
        <span class="edition__sep" aria-hidden="true">·</span>
        <a class="edition__digest" href="${BASE}/${date}/x/">X</a>
        <span class="edition__sep" aria-hidden="true">/</span>
        <a class="edition__digest" href="${BASE}/${date}/ai/">AI</a>
      </p>
    </header>`;
}

function buildNavDateContent(date, todayYmd) {
  const label = dateNavLabel(date);
  if (date === todayYmd) {
    return `<span class="date-nav__today">今天</span><span class="date-nav__text">${escapeHtml(label)}</span>`;
  }
  return `<span class="date-nav__text">${escapeHtml(label)}</span>`;
}

function parseYmdRetention(ymd) {
  return new Date(`${ymd}T12:00:00+08:00`);
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

function mediaIsArchived(item, dayItems) {
  return Boolean(item?.mediaArchived || dayItems?.mediaArchived);
}

function resolveCardMedia(item, meta, date, dayItems) {
  if (mediaIsArchived(item, dayItems)) {
    return { typographic: true, archived: true };
  }
  if (item.typographic && !item.tweetId) {
    return { typographic: true };
  }
  if (item.coverKey && meta.extras?.[item.coverKey]) {
    const file = meta.extras[item.coverKey];
    const url = mediaUrl(date, file);
    return { cover: url, coverFile: file, posterFile: null, images: [url] };
  }
  if (item.tweetId && meta.tweets?.[item.tweetId]) {
    const t = meta.tweets[item.tweetId];
    const coverFile = t.cover || t.poster || t.images?.[0];
    const cover = mediaUrl(date, coverFile);
    return {
      cover,
      coverFile: coverFile || null,
      posterFile: t.poster || null,
      images: (t.images ?? []).map((f) => mediaUrl(date, f)),
      poster: t.poster ? mediaUrl(date, t.poster) : null,
      video: t.video ? mediaUrl(date, t.video) : null,
    };
  }
  if (item.typographic) return { typographic: true };
  return { typographic: true };
}

function resolveDetailMedia(detail, meta, date, cardItem, dayItems) {
  if (mediaIsArchived(detail, dayItems) || mediaIsArchived(cardItem, dayItems)) {
    return {
      images: [],
      videos: [],
      hero: null,
      heroIsVideo: false,
      archived: true,
    };
  }
  const order = [];
  const add = (f) => {
    if (f && !order.includes(f)) order.push(f);
  };

  (detail.gallery ?? []).forEach((file) => {
    if (typeof file === "string" && /\.(mp4|webm|mov)$/i.test(file)) return;
    add(file);
  });

  if (detail.tweetId && meta.tweets[detail.tweetId]) {
    const t = meta.tweets[detail.tweetId];
    if (!detail.gallery?.length) {
      (t.images ?? []).forEach(add);
      if (t.poster) add(t.poster);
    }
    if (t.video) {
      /* video handled below */
    }
  } else if (cardItem?.coverKey && meta.extras?.[cardItem.coverKey]) {
    add(meta.extras[cardItem.coverKey]);
  }

  const videos = [];
  if (detail.tweetId && meta.tweets[detail.tweetId]?.video) {
    const t = meta.tweets[detail.tweetId];
    videos.push({
      src: mediaUrl(date, t.video),
      poster: t.poster ? mediaUrl(date, t.poster) : null,
      autoplay: cardItem?.videoAutoplay,
    });
  }
  for (const v of detail.extraVideos ?? []) {
    videos.push({
      src: mediaUrl(date, v.file),
      poster: v.poster ? mediaUrl(date, v.poster) : null,
      autoplay: v.autoplay,
    });
  }

  const images = order.map((f) => mediaUrl(date, f));
  const preferStill = detail.preferStillHero !== false;
  const heroStill = images[0];
  const hero = preferStill && heroStill ? heroStill : videos[0]?.src || heroStill;
  return {
    images,
    videos,
    hero,
    heroIsVideo: !preferStill && Boolean(videos[0]),
  };
}

function renderVideo(v) {
  const loop = v.autoplay ? ' data-autoplay-loop="true" loop' : "";
  return `<figure class="detail-hero__video detail-hero__video--lead">
    <video class="story-video story-video--large" poster="${v.poster || ""}" muted playsinline controls preload="metadata"${loop}>
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

function buildTag(tag) {
  if (!tag) return "";
  return `<p class="detail-tag">${escapeHtml(tag)}</p>`;
}

function buildPrimaryCta(detail) {
  const primaryUrl = detail.official || detail.tweet;
  if (!primaryUrl) return "";
  const label = detail.official
    ? detail.primaryLabel || "打开官方项目"
    : "查看原帖";
  const secondary =
    detail.official && detail.tweet
      ? `<a class="detail-cta__secondary" href="${escapeHtml(detail.tweet)}" rel="noopener noreferrer">查看 X 原帖</a>`
      : "";
  return `<div class="detail-cta">
    <a class="detail-cta__primary" href="${escapeHtml(primaryUrl)}" rel="noopener noreferrer">${escapeHtml(label)}</a>
    ${secondary}
  </div>`;
}

function buildGalleryLarge(images, title) {
  const unique = [...new Set(images)];
  if (!unique.length) return "";
  return `<section class="detail-gallery detail-gallery--large" aria-label="图集">
    <div class="detail-gallery__stack">${unique
      .map(
        (src, i) =>
          `<figure class="detail-gallery__frame"><img src="${src}" alt="${escapeHtml(title)} · ${i + 1}" loading="${i < 2 ? "eager" : "lazy"}" decoding="async"></figure>`
      )
      .join("")}</div>
  </section>`;
}

function buildVideosLarge(videos) {
  if (!videos?.length) return "";
  return `<section class="detail-videos" aria-label="视频">
    ${videos
      .map((v) => {
        const loop = v.autoplay ? ' data-autoplay-loop="true" loop' : "";
        return `<figure class="detail-videos__item">
        <video class="story-video story-video--large" poster="${v.poster || ""}" muted playsinline controls preload="metadata"${loop}>
          <source src="${v.src}" type="video/mp4">
        </video>
      </figure>`;
      })
      .join("")}
  </section>`;
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

function layout({ title, body, extraScripts = "", headerAppend = "" }) {
  const headerClass = headerAppend ? "site-header site-header--with-rail" : "site-header";
  return `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(title)} · 设计动态</title>
  <link rel="stylesheet" href="${BASE}/assets/style.css${ASSET_Q}">
</head>
<body>
  <header class="${headerClass}">
    <div class="site-header__inner">
      <h1 class="site-title"><a class="site-wordmark" href="${BASE}/">${xLogoSvg("site-logo__x", HEADER_X_LOGO_PX)}<span class="site-brand__text"><span class="site-wordmark__text">设计动态</span><span class="site-subtitle">探索前沿设计 ｜ AI 辅助设计</span></span></a></h1>
    </div>
    ${headerAppend}
  </header>
  <main class="site-main">${body}</main>
  <footer class="site-footer">工作日更新</footer>
  ${extraScripts}
</body>
</html>`;
}

function buildArchivedMediaNote() {
  return `<p class="detail-archived-note">本期图片已归档</p>`;
}

function buildDetailPage(detail, cardItem, meta, ordered, dayItems) {
  const media = resolveDetailMedia(detail, meta, detail.date, cardItem, dayItems);
  const cat = detail.category;
  const isType =
    (cardItem?.typographic || media.archived) && !media.images.length && !media.videos.length;

  const intro = `<div class="detail-intro magazine-article">${detail.bodyHtml}</div>`;
  const archivedNote = media.archived ? buildArchivedMediaNote() : "";

  const galleryImages = media.images.length > 1 ? media.images.slice(1) : [];
  const heroBlock = isType
    ? `<div class="detail-hero detail-hero--type" role="img" aria-label="${escapeHtml(detail.title)}"><span>Aa</span></div>`
    : media.images[0]
      ? `<figure class="detail-hero detail-hero--lead"><img src="${media.images[0]}" alt="${escapeHtml(detail.title)}" decoding="async" fetchpriority="high"></figure>`
      : media.videos[0]
        ? `<div class="detail-hero detail-hero--lead">${renderVideo(media.videos[0])}</div>`
        : "";
  const heroBlockFixed = heroBlock;

  const body = `
  <article class="detail-page detail-page--gallery">
    <header class="detail-mast detail-mast--compact">
      <a class="article-back" href="${BASE}/">← 返回首页</a>
      <p class="article-series article-series--${cat}">${SERIES_LABEL[cat]}</p>
      <p class="article-date">${formatDateLabel(detail.date)}</p>
      <h1 class="detail-title">${escapeHtml(detail.title)}</h1>
      <p class="detail-author">${escapeHtml(detail.author)}</p>
    </header>
    ${intro}
    ${archivedNote}
    ${buildTag(detail.tag)}
    ${buildPrimaryCta(detail)}
    ${heroBlockFixed}
    ${buildGalleryLarge(galleryImages, detail.title)}
    ${buildVideosLarge(media.videos)}
    ${buildNav(detail.date, detail.slug, ordered)}
  </article>`;

  return layout({
    title: detail.title,
    body,
    extraScripts: `<script src="${BASE}/assets/article.js${ASSET_Q}" defer></script>`,
  });
}

function buildMagazineCard(item, media, date, thumbRegistry) {
  const href = itemPermalink(date, item.id);
  let visual = "";
  if (media.typographic) {
    visual = `<div class="mag-card__visual mag-card__visual--type"><span aria-hidden="true">Aa</span></div>`;
  } else if (media.cover) {
    const thumb =
      thumbRegistry && media.coverFile
        ? thumbRegistry.register(date, media.coverFile, "card")
        : null;
    const img = thumb
      ? homeThumbImgTag(thumb, escapeHtml(item.title), { loading: "lazy" })
      : `<img src="${media.cover}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async">`;
    visual = `<div class="mag-card__visual">${img}</div>`;
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

function buildFeatured(featured, media, date, thumbRegistry) {
  const href = itemPermalink(date, featured.id);
  const deck = featured.deck ? `<p class="feature-hero__deck">${escapeHtml(featured.deck)}</p>` : "";
  let mediaInner = "";
  const heroPosterFile = media.posterFile || media.coverFile;
  const heroThumb =
    thumbRegistry && heroPosterFile
      ? thumbRegistry.register(date, heroPosterFile, "hero")
      : null;
  if (media.archived) {
    mediaInner = `<div class="feature-hero__placeholder" aria-hidden="true"><span>Aa</span></div>`;
  } else if (media.video) {
    const poster = heroThumb?.src || media.poster || media.cover;
    mediaInner = `<video class="feature-hero__vid" poster="${poster}" muted playsinline loop data-autoplay-loop playsinline><source src="${media.video}" type="video/mp4"></video>`;
  } else if (media.cover) {
    mediaInner = heroThumb
      ? homeThumbImgTag(heroThumb, "", { loading: "eager" })
      : `<img src="${media.cover}" alt="" decoding="async" fetchpriority="high">`;
  }
  return `<section class="feature-hero" data-category="${featured.category}">
    <a class="feature-hero__link" href="${href}">
      <div class="feature-hero__media">${mediaInner}</div>
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

function buildEditionSection(
  date,
  dayItems,
  meta,
  { showFeatured = false, todayYmd, thumbRegistry } = {}
) {
  const featured = dayItems.items.find((i) => i.id === dayItems.featured);
  const rest = dayItems.items.filter((i) => i.id !== dayItems.featured);
  const grid = rest
    .map((item) =>
      buildMagazineCard(
        item,
        resolveCardMedia(item, meta, date, dayItems),
        date,
        thumbRegistry
      )
    )
    .join("");
  const hero =
    showFeatured && featured
      ? buildFeatured(
          featured,
          resolveCardMedia(featured, meta, date, dayItems),
          date,
          thumbRegistry
        )
      : "";
  const todayAttr = date === todayYmd ? ' data-is-today="true"' : "";
  return `
    <section class="edition" id="${date}" data-date="${date}"${todayAttr}>
      ${buildEditionMast(date, todayYmd)}
      ${hero}
      <div class="mag-grid">${grid}</div>
    </section>`;
}

function buildDateSidebar(dates, todayYmd) {
  const links = dates
    .map((d) => {
      const todayCls = d === todayYmd ? " date-nav__link--today" : "";
      return `<a class="date-nav__link${todayCls}" href="${BASE}/#${d}" data-date="${d}">${buildNavDateContent(d, todayYmd)}</a>`;
    })
    .join("");
  const chips = dates
    .map((d) => {
      const todayCls = d === todayYmd ? " date-rail__chip--today" : "";
      return `<a class="date-rail__chip${todayCls}" href="${BASE}/#${d}" data-date="${d}">${buildNavDateContent(d, todayYmd)}</a>`;
    })
    .join("");
  return {
    aside: `
    <aside class="home-aside">
      <nav class="date-sidebar" aria-label="日期导航">
        <p class="date-sidebar__label">日期</p>
        <div class="date-nav">${links}</div>
      </nav>
    </aside>`,
    rail: `<nav class="date-rail" aria-label="日期">${chips}</nav>`,
  };
}

function buildHomeIndex(visibleDates, loader, thumbRegistry) {
  const retentionDays = getRetentionDays();
  const todayYmd = todayShanghai();
  const sections = visibleDates
    .map((date, index) => {
      const dayItems = loader.loadDayItems(date);
      if (!dayItems) return "";
      const meta = loader.loadMediaMeta(date);
      return buildEditionSection(date, dayItems, meta, {
        showFeatured: index === 0,
        todayYmd,
        thumbRegistry,
      });
    })
    .filter(Boolean)
    .join("\n");
  const { aside, rail } = buildDateSidebar(visibleDates, todayYmd);
  const body = `
    <p class="retention-note">首页展示近 ${retentionDays} 天</p>
    <div class="home-layout">
      ${aside}
      <div class="home-main">
        <nav class="filter-bar" role="tablist" aria-label="栏目筛选">
          <button type="button" class="filter-tab is-active" role="tab" data-filter="all">全部</button>
          <button type="button" class="filter-tab" role="tab" data-filter="x">${xLogoSvg("filter-tab__x", 15)}<span>X 设计动态</span></button>
          <button type="button" class="filter-tab" role="tab" data-filter="game">娱乐设计动态</button>
          <button type="button" class="filter-tab" role="tab" data-filter="ai">AI 辅助设计日报</button>
        </nav>
        ${sections}
      </div>
    </div>`;
  return layout({
    title: "首页",
    body,
    headerAppend: rail,
    extraScripts: `<script src="${BASE}/assets/home.js${ASSET_Q}" defer></script>`,
  });
}

function buildDigest(date, category, items, details, meta, dayItems) {
  const cards = items
    .filter((i) => i.category === category)
    .map((item) => {
      const d = details.find((x) => x.slug === item.id);
      const media = resolveCardMedia(item, meta, date, dayItems);
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

function copyMediaForBuild() {
  if (!fs.existsSync(MEDIA_SRC)) return;
  const mediaDest = path.join(DIST, "media");
  fs.mkdirSync(mediaDest, { recursive: true });
  for (const date of fs.readdirSync(MEDIA_SRC)) {
    const src = path.join(MEDIA_SRC, date);
    if (!fs.statSync(src).isDirectory()) continue;
    const dayItems = loadDayItems(date);
    if (dayItems?.mediaArchived) continue;
    copyDir(src, path.join(mediaDest, date));
  }
}

async function main() {
  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const today = todayShanghai();
  const retentionDays = getRetentionDays();
  const allDates = discoverContentDates(CONTENT_DIR);
  const visibleDates = allDates.filter((d) => isWithinRetention(d, today, retentionDays));

  const thumbRegistry = new HomeThumbRegistry();
  const loader = { loadDayItems, loadMediaMeta };
  if (visibleDates.length) {
    writeFile(
      path.join(DIST, "index.html"),
      buildHomeIndex(visibleDates, loader, thumbRegistry)
    );
  } else {
    writeFile(
      path.join(DIST, "index.html"),
      layout({
        title: "首页",
        body: `<p class="retention-note">首页展示近 ${retentionDays} 天</p><p class="empty-home">近期暂无新刊。</p>`,
      })
    );
  }

  let totalDetails = 0;
  for (const date of allDates) {
    const dayItems = loadDayItems(date);
    const meta = loadMediaMeta(date);
    const details = loadItemDetails(date).sort((a, b) => {
      const order = dayItems?.items?.map((i) => i.id) ?? [];
      return order.indexOf(a.slug) - order.indexOf(b.slug);
    });

    if (dayItems && isWithinRetention(date, today, retentionDays)) {
      writeFile(
        path.join(DIST, date, "x", "index.html"),
        buildDigest(date, "x", dayItems.items, details, meta, dayItems)
      );
      writeFile(
        path.join(DIST, date, "ai", "index.html"),
        buildDigest(date, "ai", dayItems.items, details, meta, dayItems)
      );
      if (dayItems.items.some((i) => i.category === "game")) {
        writeFile(
          path.join(DIST, date, "game", "index.html"),
          buildDigest(date, "game", dayItems.items, details, meta, dayItems)
        );
      }
    }

    totalDetails += details.length;
    for (const detail of details) {
      const cardItem = dayItems?.items?.find((i) => i.id === detail.slug);
      writeFile(
        path.join(DIST, date, detail.slug, "index.html"),
        buildDetailPage(detail, cardItem, meta, details, dayItems)
      );
    }
  }

  const assetsDest = path.join(DIST, "assets");
  fs.mkdirSync(assetsDest, { recursive: true });
  for (const file of fs.readdirSync(ASSETS_SRC)) {
    fs.copyFileSync(path.join(ASSETS_SRC, file), path.join(assetsDest, file));
  }
  copyMediaForBuild();
  await generateHomeThumbs(thumbRegistry, { mediaSrc: MEDIA_SRC, distDir: DIST });

  console.log(
    `Built detail pages (${totalDetails}), home editions (${visibleDates.length}) → ${DIST}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});