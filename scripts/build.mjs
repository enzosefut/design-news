import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content");
const DIST = path.join(ROOT, "dist");
const ASSETS_SRC = path.join(ROOT, "assets");

const BASE = "/design-news";

const SERIES_LABEL = {
  x: "X 设计动态",
  ai: "AI 辅助设计日报",
};

marked.setOptions({
  gfm: true,
  breaks: false,
});

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

function formatDateShort(isoDate) {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${m} 月 ${d} 日`;
}

function stripMarkdownForExcerpt(md, maxLen = 200) {
  let text = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
  if (text.length > maxLen) {
    text = text.slice(0, maxLen).trim() + "…";
  }
  return text;
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
    if (category !== "x" && category !== "ai") {
      throw new Error(`Invalid category in ${file}`);
    }
    const date = normalizeDate(data.date);
    return {
      file,
      date,
      category,
      title: data.title,
      content,
      html: marked.parse(content),
      excerpt: stripMarkdownForExcerpt(content),
      permalink: `${BASE}/${date}/${category}/`,
    };
  });
  posts.sort((a, b) => {
    const dc = b.date.localeCompare(a.date);
    if (dc !== 0) return dc;
    const order = { x: 0, ai: 1 };
    return order[a.category] - order[b.category];
  });
  return posts;
}

function groupByDate(posts) {
  const map = new Map();
  for (const post of posts) {
    if (!map.has(post.date)) map.set(post.date, []);
    map.get(post.date).push(post);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
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
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${BASE}/assets/style.css">
  ${extraHead}
</head>
<body>
  <header class="site-header">
    <h1 class="site-title"><a href="${BASE}/" style="text-decoration:none;color:inherit;">设计动态</a></h1>
    <p class="site-subtitle">前沿设计与 AI 辅助设计的工作日笔记</p>
  </header>
  <main class="site-main">
    ${body}
  </main>
  <footer class="site-footer">工作日更新</footer>
  ${extraScripts}
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildIndex(posts) {
  const groups = groupByDate(posts);
  const cardsHtml = groups
    .map(([date, dayPosts]) => {
      const cards = dayPosts
        .map(
          (p) => `
        <article class="post-card" data-category="${p.category}">
          <p class="post-card__series post-card__series--${p.category}">${SERIES_LABEL[p.category]}</p>
          <h2 class="post-card__title"><a href="${p.permalink}">${escapeHtml(p.title)}</a></h2>
          <p class="post-card__excerpt">${escapeHtml(p.excerpt)}</p>
          <a class="post-card__read" href="${p.permalink}">阅读全文</a>
        </article>`
        )
        .join("\n");
      return `
      <section class="day-group" data-date="${date}">
        <h2 class="day-label">${formatDateLabel(date)}</h2>
        <div class="post-cards">${cards}</div>
      </section>`;
    })
    .join("\n");

  const body = `
    <nav class="filter-bar" aria-label="栏目筛选">
      <button type="button" class="is-active" data-filter="all">全部</button>
      <button type="button" data-filter="x">X 设计动态</button>
      <button type="button" data-filter="ai">AI 辅助设计日报</button>
    </nav>
    ${cardsHtml}
  `;

  return layout({
    title: "首页",
    body,
    extraScripts: `<script src="${BASE}/assets/home.js" defer></script>`,
  });
}

function buildArticle(post) {
  const body = `
    <header class="article-header">
      <a class="article-back" href="${BASE}/">← 返回首页</a>
      <p class="article-series article-series--${post.category}">${SERIES_LABEL[post.category]}</p>
      <p class="article-date">${formatDateLabel(post.date)}</p>
      <h1 class="article-title">${escapeHtml(post.title)}</h1>
    </header>
    <article class="article-body">
      ${post.html}
    </article>
  `;
  return layout({ title: post.title, body });
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
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST, { recursive: true });

  const posts = loadPosts();
  if (posts.length === 0) {
    throw new Error("No content posts found");
  }

  writeFile(path.join(DIST, "index.html"), buildIndex(posts));

  for (const post of posts) {
    const out = path.join(DIST, post.date, post.category, "index.html");
    writeFile(out, buildArticle(post));
  }

  copyAssets();
  console.log(`Built ${posts.length} post(s) → ${DIST}`);
}

main();