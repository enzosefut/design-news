#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MANIFEST = path.join(__dirname, "backfill-manifest.json");
const UPLOADS = "/home/ubuntu/.cursor/projects/workspace/uploads";

const DIGEST_MAP = {
  "2026-11-11": { x: "2026-11-11-x_46ba.md", ai: "2026-11-11-ai_402f.md" },
  "2026-11-12": { x: "2026-11-12-x_af40.md", ai: "2026-11-12-ai_8485.md" },
  "2026-11-13": { x: "2026-11-13-x_000e.md", ai: "2026-11-13-ai_5caa.md" },
  "2026-11-16": { x: "2026-11-16-x_61ea.md", ai: "2026-11-16-ai_417c.md" },
};

function copyDigest(date, cat) {
  const src = path.join(UPLOADS, DIGEST_MAP[date][cat]);
  const body = fs.readFileSync(src, "utf8").trim();
  const title = cat === "x" ? "X 设计动态" : "AI 辅助设计日报";
  const fm = matter.stringify(body, { date, category: cat, title });
  fs.writeFileSync(path.join(ROOT, "content", `${date}-${cat}.md`), fm);
}

function writeItemsJson(date, block) {
  const items = block.items.map((item) => {
    const row = {
      id: item.id,
      category: item.category,
      title: item.title,
      author: item.author,
      cardAspect: item.cardAspect || "4/3",
    };
    if (item.tweetId) row.tweetId = item.tweetId;
    if (item.typographic) row.typographic = true;
    if (item.videoAutoplay) row.videoAutoplay = true;
    if (item.id === block.featured) {
      row.deck = item.deck;
    }
    return row;
  });
  const json = { date, featured: block.featured, items };
  fs.writeFileSync(
    path.join(ROOT, "content", `${date}-items.json`),
    JSON.stringify(json, null, 2) + "\n"
  );
}

function writeItemMd(date, item) {
  const data = {
    date,
    slug: item.id,
    category: item.category,
    title: item.title,
    author: item.author,
  };
  if (item.tweet) data.tweet = item.tweet;
  if (item.official) data.official = item.official;
  if (item.tweetId) data.tweetId = item.tweetId;
  if (item.tag) data.tag = item.tag;
  if (item.deck) data.deck = item.deck;
  if (item.typographic) data.typographic = true;
  if (item.videoAutoplay) data.videoAutoplay = true;
  if (item.official) {
    data.primaryLabel = item.primaryLabel || "打开官方项目";
  }
  data.preferStillHero = item.preferStillHero !== false;
  const body = item.intro.trim();
  const dir = path.join(ROOT, "content", "items");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${date}-${item.id}.md`),
    matter.stringify(body + "\n", data)
  );
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
for (const [date, block] of Object.entries(manifest)) {
  copyDigest(date, "x");
  copyDigest(date, "ai");
  writeItemsJson(date, block);
  for (const item of block.items) writeItemMd(date, item);
  console.log(`${date}: ${block.items.length} items`);
}
console.log("materialize-backfill done");