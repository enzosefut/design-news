#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import matter from "gray-matter";
import {
  discoverContentDates,
  getRetentionDays,
  isExpired,
  todayShanghai,
} from "./lib/retention.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT = path.join(__dirname, "..");

export function makePaths(root = DEFAULT_ROOT) {
  return {
    root,
    content: path.join(root, "content"),
    items: path.join(root, "content", "items"),
    media: path.join(root, "media"),
    archive: path.join(root, "archive"),
  };
}

const paths = makePaths();

function* walkMedia(dir, prefix = "") {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (fs.statSync(p).isDirectory()) yield* walkMedia(p, rel);
    else yield rel;
  }
}

export function collectDayFiles(date, p = paths) {
  const rel = [];
  const add = (abs, r) => {
    if (fs.existsSync(abs)) rel.push(r);
  };
  add(path.join(p.content, `${date}-x.md`), `content/${date}-x.md`);
  add(path.join(p.content, `${date}-ai.md`), `content/${date}-ai.md`);
  add(path.join(p.content, `${date}-items.json`), `content/${date}-items.json`);
  add(
    path.join(p.content, `media-manifest-${date}.json`),
    `content/media-manifest-${date}.json`
  );
  if (fs.existsSync(p.items)) {
    for (const f of fs.readdirSync(p.items)) {
      if (f.startsWith(`${date}-`) && f.endsWith(".md")) {
        add(path.join(p.items, f), `content/items/${f}`);
      }
    }
  }
  const mediaDir = path.join(p.media, date);
  if (fs.existsSync(mediaDir)) {
    for (const walk of walkMedia(mediaDir)) {
      rel.push(`media/${date}/${walk}`);
    }
  }
  return rel;
}

export function packDay(date, archiveDir, p = paths) {
  fs.mkdirSync(archiveDir, { recursive: true });
  const files = collectDayFiles(date, p);
  const zipName = `design-news-${date}.zip`;
  const zipPath = path.join(archiveDir, zipName);
  const manifest = {
    date,
    packedAt: new Date().toISOString(),
    files,
  };
  const manifestPath = path.join(archiveDir, `.manifest-${date}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  if (!files.length) {
    console.warn(`[${date}] nothing to pack`);
    return { ok: false, zipPath, manifest };
  }

  const args = ["-r", "-q", zipPath, ...files];
  const r = spawnSync("zip", args, { cwd: p.root, encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`zip failed for ${date}:`, r.stderr || r.stdout);
    return { ok: false, zipPath, manifest };
  }
  fs.unlinkSync(manifestPath);
  console.log(`Packed ${date} → ${zipPath}`);
  console.log(`  ${files.length} file(s):`);
  for (const f of files) console.log(`    ${f}`);
  return { ok: true, zipPath, manifest };
}

export function markDayMediaArchived(date, p = paths) {
  const itemsPath = path.join(p.content, `${date}-items.json`);
  if (fs.existsSync(itemsPath)) {
    const data = JSON.parse(fs.readFileSync(itemsPath, "utf8"));
    data.mediaArchived = true;
    delete data.extras;
    for (const item of data.items ?? []) {
      item.mediaArchived = true;
      delete item.tweetId;
      delete item.coverKey;
    }
    fs.writeFileSync(itemsPath, JSON.stringify(data, null, 2) + "\n");
  }

  if (fs.existsSync(p.items)) {
    for (const f of fs.readdirSync(p.items)) {
      if (!f.startsWith(`${date}-`) || !f.endsWith(".md")) continue;
      const fp = path.join(p.items, f);
      const raw = fs.readFileSync(fp, "utf8");
      const { data, content } = matter(raw);
      data.mediaArchived = true;
      delete data.gallery;
      delete data.extraVideos;
      delete data.tweetId;
      delete data.coverKey;
      fs.writeFileSync(fp, matter.stringify(content, data));
    }
  }

  const mediaDir = path.join(p.media, date);
  if (fs.existsSync(mediaDir)) {
    fs.rmSync(mediaDir, { recursive: true, force: true });
  }
}

export function runArchive({ p = paths, pruneFlag = false } = {}) {
  const today = todayShanghai();
  const retention = getRetentionDays();
  const dates = discoverContentDates(p.content);
  const expired = dates.filter((d) => isExpired(d, today, retention));

  if (!expired.length) {
    console.log(
      `No expired days (retention ${retention}d, today ${today} Asia/Shanghai).`
    );
    return { expired: [], packed: [] };
  }

  const packed = [];
  for (const date of expired) {
    const result = packDay(date, p.archive, p);
    if (!result.ok) {
      console.error(`Skip prune for ${date}: pack failed`);
      continue;
    }
    packed.push(date);
    if (pruneFlag) {
      markDayMediaArchived(date, p);
      console.log(`Pruned media + marked archived: ${date}`);
    }
  }
  return { expired, packed };
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const prune = process.argv.includes("--prune");
  runArchive({ pruneFlag: prune });
}