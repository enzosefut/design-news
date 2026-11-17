import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content");
const DIST = path.join(ROOT, "dist");
const ASSETS_SRC = path.join(ROOT, "assets");
const MEDIA_SRC = path.join(ROOT, "media");

const BASE = "/design-news";

const SERIES_LABEL = {
  x: "X 设计动态",
  ai: "AI 辅助设计日报",
};

marked.setOptions({ gfm: true, breaks: false });

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value);
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  throw new Error(`Invalid date: ${s}`);
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

function resolveItemMedia(item, meta, date) {
  if (item.typographic) {
    return { typographic: true };
  }
  if (item.coverKey && meta.extras?.[item.coverKey]) {
    const file = meta.extras[item.coverKey];
    const url = mediaUrl(date, file);
    return {
      cover: url,
      images: [url],
      alt: `${item.title} — ${item.author}`,
    };
  }
  if (!item.tweetId || !meta.tweets?.[item.tweetId]) {
    return { typographic: true };
  }
  const t = meta.tweets[item.tweetId];
  const images = (t.images ?? []).slice(0, 3).map((f) => mediaUrl(date, f));
  const cover = mediaUrl(date, t.cover || t.poster || t.images?.[0]);
  return {
    cover,
    images,
    poster: t.poster ? mediaUrl(date, t.poster) : null,
    video: t.video ? mediaUrl(date, t.video) : null,
    alt: `${item.title} — ${item.author}`,
  };
}

function renderFigureBlock(media, item, opts = {}) {
  const { hero = false, autoplay = false } = opts;
  if (media.typographic) {
    return `
    <div class="story-figure story-figure--type${hero ? " story-figure--hero" : ""}" role="img" aria-label="${escapeHtml(item.title)}">
      <div class="type-card">
        <span class="type-card__glyph" aria-hidden="true">Aa</span>
        <span class="type-card__label">${escapeHtml(item.title)}</span>
      </div>
    </div>`;
  }

  const imgs = media.images?.length ? media.images : media.cover ? [media.cover] : [];
  const gallery =
    imgs.length > 1
      ? `<div class="story-gallery">${imgs
          .map(
            (src, i) =>
              `<figure class="story-gallery__cell"><img src="${src}" alt="${escapeHtml(item.title)}${i ? ` ${i + 1}` : ""}" loading="lazy" decoding="async"></figure>`
          )
          .join("")}</div>`
      : imgs[0]
        ? `<figure class="story-figure__still"><img src="${imgs[0]}" alt="${escapeHtml(media.alt || item.title)}" loading="${hero ? "eager" : "lazy"}" decoding="async"></figure>`
        : "";

  let video = "";
  if (media.video) {
    const loop = autoplay ? ' data-autoplay-loop="true" loop' : "";
    video = `<figure class="story-figure__video">
      <video class="story-video" poster="${media.poster || imgs[0] || ""}" muted playsinline controls preload="metadata"${loop}>
        <source src="${media.video}" type="video/mp4">
      </video>
    </figure>`;
  }

  const inner = video || gallery;
  return `<div class="story-figure${hero ? " story-figure--hero" : ""}" id="${item.id}">${inner}</div>`;
}

function injectStoryMedia(html, items, meta, date) {
  const $ = cheerio.load(`<div class="article-root">${html}</div>`, null, false);

  for (const item of items) {
    if (item.featured) continue;
    const media = resolveItemMedia(item, meta, date);
    const figure = renderFigureBlock(media, item, { autoplay: item.videoAutoplay });

    if (item.tweetId) {
      const $a = $(`a[href*="${item.tweetId}"]`).first();
      if ($a.length) {
        $a.before(`<span id="${item.id}" class="story-jump"></span>`);
        $a.before(figure);
      }
    } else if (item.anchorMatch) {
      let $target = null;
      $("p, li").each((_, el) => {
        if ($(el).text().includes(item.anchorMatch) && !$target) $target = $(el);
      });
      if ($target?.length) {
        $target.before(`<span id="${item.id}" class="story-jump"></span>`);
        $target.before(figure);
      }
    }
  }

  // Featured lead (Allo) — first paragraphs before section list
  const featured = items.find((i) => i.featured);
  if (featured) {
    const media = resolveItemMedia(featured, meta, date);
    const hero = renderFigureBlock(media, featured, { hero: true, autoplay: true });
    const $lead = $(".article-root > p").first();
    if ($lead.length) {
      $lead.before(`<span id="${featured.id}" class="story-jump"></span>`);
      $lead.before(hero);
    }
  }

  return $(".article-root").html() ?? "";
}

function loadPosts() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const category = data.category;
    if (!data.date || !category || !data.title) {
      throw new Error(`Missing front matter in ${file}`);
    }
    const date = normalizeDate(data.date);
    const dayItems = loadDayItems(date);
    const meta = loadMediaMeta(date);
    const itemsForPost = dayItems?.items?.filter((i) => i.category === category) ?? [];
    const htmlBody = injectStoryMedia(marked.parse(content), itemsForPost, meta, date);

    return {
      file,
      date,
      category,
      title: data.title,
      content,
      html: htmlBody,
      permalink: `${BASE}/${date}/${category}/`,
      dayItems,
      meta,
    };
  });
  posts.sort((a, b) => {
    const dc = b.date.localeCompare(a.date);
    if (dc !== 0) return dc;
    return { x: 0, ai: 1 }[a.category] - { x: 0, ai: 1 }[b.category];
  });
  return posts;
}

function layout({ title, body, extraHead = "", extraScripts = "" }) {
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
  ${extraHead}
</head>
<body>
  <header class="site-header">
    <div class="site-header__inner">
      <h1 class="site-title"><a href="${BASE}/">设计动态</a></h1>
      <p class="site-subtitle">前沿设计与 AI 辅助设计的工作日笔记</p>
    </div>
  </header>
  <main class="site-main">
    ${body}
  </main>
  <footer class="site-footer">工作日更新</footer>
  ${extraScripts}
</body>
</html>`;
}

function buildMagazineCard(item, media, date) {
  const aspect = item.cardAspect || "4/3";
  const cat = item.category;
  const href = `${BASE}/${date}/${cat}/#${item.id}`;
  const tick = SERIES_LABEL[cat];

  let visual = "";
  if (media.typographic) {
    visual = `<div class="mag-card__visual mag-card__visual--type"><span aria-hidden="true">Aa</span></div>`;
  } else if (media.cover) {
    visual = `<div class="mag-card__visual" style="--ar:${aspect}"><img src="${media.cover}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async"></div>`;
  }

  return `
  <article class="mag-card" data-category="${cat}">
    <a class="mag-card__link" href="${href}">
      ${visual}
      <div class="mag-card__meta">
        <span class="mag-card__tick mag-card__tick--${cat}">${tick}</span>
        <h3 class="mag-card__title">${escapeHtml(item.title)}</h3>
        <p class="mag-card__author">${escapeHtml(item.author)}</p>
      </div>
    </a>
  </article>`;
}

function buildFeatured(featured, media, date) {
  const href = `${BASE}/${date}/${featured.category}/#${featured.id}`;
  const deck = featured.deck ? `<p class="feature-hero__deck">${escapeHtml(featured.deck)}</p>` : "";
  let visual = renderFigureBlock(media, featured, { hero: true, autoplay: true });
  visual = visual.replace(`id="${featured.id}"`, "");

  return `
  <section class="feature-hero" data-category="${featured.category}">
    <a class="feature-hero__link" href="${href}">
      <div class="feature-hero__media">${visual}</div>
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

function buildIndex(posts) {
  const dates = [...new Set(posts.map((p) => p.date))].sort((a, b) => b.localeCompare(a));
  const sections = dates
    .map((date) => {
      const dayItems = loadDayItems(date);
      if (!dayItems) return "";
      const meta = loadMediaMeta(date);
      const featuredId = dayItems.featured;
      const featured = dayItems.items.find((i) => i.id === featuredId);
      const rest = dayItems.items.filter((i) => i.id !== featuredId);

      const hero = featured
        ? buildFeatured(featured, resolveItemMedia(featured, meta, date), date)
        : "";

      const grid = rest
        .map((item) => buildMagazineCard(item, resolveItemMedia(item, meta, date), date))
        .join("");

      return `
      <section class="edition" data-date="${date}">
        <h2 class="edition__date">${formatDateLabel(date)}</h2>
        ${hero}
        <div class="mag-grid">${grid}</div>
      </section>`;
    })
    .join("");

  const body = `
    <nav class="filter-bar" aria-label="栏目筛选">
      <button type="button" class="is-active" data-filter="all">全部</button>
      <button type="button" data-filter="x">X 设计动态</button>
      <button type="button" data-filter="ai">AI 辅助设计日报</button>
    </nav>
  <div class="editions">${sections}</div>`;

  return layout({
    title: "首页",
    body,
    extraScripts: `<script src="${BASE}/assets/home.js" defer></script>`,
  });
}

function buildArticle(post) {
  const body = `
    <header class="article-mast">
      <a class="article-back" href="${BASE}/">← 返回首页</a>
      <p class="article-series article-series--${post.category}">${SERIES_LABEL[post.category]}</p>
      <p class="article-date">${formatDateLabel(post.date)}</p>
      <h1 class="article-title">${escapeHtml(post.title)}</h1>
    </header>
    <article class="article-body magazine-article">
      ${post.html}
    </article>
  `;
  return layout({
    title: post.title,
    body,
    extraScripts: `<script src="${BASE}/assets/article.js" defer></script>`,
  });
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

function copyAssets() {
  const dest = path.join(DIST, "assets");
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(ASSETS_SRC)) {
    fs.copyFileSync(path.join(ASSETS_SRC, file), path.join(dest, file));
  }
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function main() {
  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const posts = loadPosts();
  writeFile(path.join(DIST, "index.html"), buildIndex(posts));
  for (const post of posts) {
    writeFile(path.join(DIST, post.date, post.category, "index.html"), buildArticle(post));
  }
  copyAssets();
  copyDir(MEDIA_SRC, path.join(DIST, "media"));
  console.log(`Built ${posts.length} post(s) → ${DIST}`);
}

main();