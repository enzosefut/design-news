#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TWEETS_JSON = "/home/ubuntu/.cursor/projects/workspace/uploads/tweets-backfill-11-11-to-16_bf72.json";
const MANIFEST = path.join(__dirname, "backfill-manifest.json");

const MAX_VIDEO_MS = 45_000;
const MAX_VIDEO_BYTES = 12 * 1024 * 1024;

function ensureOrig(url) {
  if (url.includes("pbs.twimg.com/media/") && !url.includes("name=orig")) {
    return `${url.split("?")[0]}?name=orig`;
  }
  return url;
}

function extFromUrl(url, contentType) {
  if (contentType?.includes("video")) return ".mp4";
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("webp")) return ".webp";
  const m = url.match(/\.(jpe?g|png|webp|mp4)/i);
  if (m) return m[0].toLowerCase().replace("jpeg", ".jpg");
  return ".jpg";
}

async function downloadOne(url, destPath) {
  const res = await fetch(ensureOrig(url), {
    headers: { "User-Agent": "design-news-build/1.0" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  return { bytes: buf.length, contentType: res.headers.get("content-type") };
}

function pickVideoUrl(entry) {
  const videos = entry.videos ?? [];
  const preferred = videos.find((u) => /720x|640x|480x/.test(u) && !/2160x|1920x/.test(u));
  return preferred || videos.find((u) => /720x|640x/.test(u)) || videos[0];
}

async function ingestTweet(id, entry, outDir, meta) {
  if (meta.tweets[id]) return meta.tweets[id];
  const record = { cover: null, images: [], poster: null, video: null };
  let idx = 0;

  const pushImage = async (url, kind) => {
    const dest = path.join(outDir, `${id}-${kind}-${idx}${extFromUrl(url)}`);
    try {
      await downloadOne(url, dest);
      const rel = path.basename(dest);
      record.images.push(rel);
      if (!record.cover) record.cover = rel;
      idx += 1;
    } catch (e) {
      console.warn("skip image", url, e.message);
    }
  };

  for (const url of entry.link_imgs ?? []) await pushImage(url, "link");
  for (const url of entry.photos ?? []) await pushImage(url, "photo");

  for (const url of entry.posters ?? []) {
    const dest = path.join(outDir, `${id}-poster${extFromUrl(url)}`);
    try {
      await downloadOne(url, dest);
      record.poster = path.basename(dest);
      if (!record.cover) record.cover = record.poster;
    } catch (e) {
      console.warn("poster", e.message);
    }
  }

  const dur = entry.video_duration_ms;
  if (dur != null && dur <= MAX_VIDEO_MS && entry.videos?.length) {
    const vUrl = pickVideoUrl(entry);
    const dest = path.join(outDir, `${id}-video.mp4`);
    try {
      const { bytes } = await downloadOne(vUrl, dest);
      if (bytes <= MAX_VIDEO_BYTES) record.video = path.basename(dest);
      else {
        fs.unlinkSync(dest);
        console.warn(`video too large (${bytes}): ${id}`);
      }
    } catch (e) {
      console.warn("video", id, e.message);
    }
  }

  if (!record.cover && record.poster) record.cover = record.poster;
  meta.tweets[id] = record;
  return record;
}

async function ogImageUrl(pageUrl) {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": "design-news-build/1.0" },
      redirect: "follow",
    });
    const html = await res.text();
    const m =
      html.match(/property="og:image" content="([^"]+)"/i) ||
      html.match(/name="twitter:image" content="([^"]+)"/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function patchItemMd(date, item, meta) {
  const mdPath = path.join(ROOT, "content", "items", `${date}-${item.id}.md`);
  if (!fs.existsSync(mdPath)) return;
  const raw = fs.readFileSync(mdPath, "utf8");
  const { data, content } = matter(raw);
  const gallery = [];

  if (item.tweetId && meta.tweets[item.tweetId]) {
    const t = meta.tweets[item.tweetId];
    gallery.push(...t.images);
    if (t.poster && !gallery.includes(t.poster)) gallery.unshift(t.poster);
    if (t.video) {
      const vid = { file: t.video };
      if (t.poster) vid.poster = t.poster;
      if (item.videoAutoplay) vid.autoplay = true;
      data.extraVideos = [vid];
    }
  }

  const urls = [item.official, ...(item.extraOfficials ?? [])].filter(Boolean);
  for (const url of urls) {
    const key = `${item.id}-og`;
    const rel = meta.extras[key];
    if (rel && !gallery.includes(rel)) gallery.unshift(rel);
  }

  const clean = [...new Set(gallery.filter(Boolean))];
  if (clean.length) data.gallery = clean;
  for (const k of Object.keys(data)) {
    if (data[k] === undefined) delete data[k];
  }
  fs.writeFileSync(mdPath, matter.stringify(content, data));
}

async function main() {
  const tweets = JSON.parse(fs.readFileSync(TWEETS_JSON, "utf8"));
  const byId = Object.fromEntries(tweets.map((t) => [t.id, t]));
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));

  for (const [date, block] of Object.entries(manifest)) {
    const itemsPath = path.join(ROOT, "content", `${date}-items.json`);
    const itemsFile = JSON.parse(fs.readFileSync(itemsPath, "utf8"));
    const outDir = path.join(ROOT, "media", date);
    fs.mkdirSync(outDir, { recursive: true });
    const meta = { tweets: {}, extras: {} };

    const ids = new Set(
      block.items.filter((i) => i.tweetId && !i.typographic).map((i) => i.tweetId)
    );
    for (const id of ids) {
      if (byId[id]) await ingestTweet(id, byId[id], outDir, meta);
      else console.warn(`missing tweet json: ${id}`);
    }

    for (const item of block.items) {
      if (item.typographic) continue;
      if (item.official) {
        const og = await ogImageUrl(item.official);
        if (og) {
          const key = `${item.id}-og`;
          const dest = path.join(outDir, `${key}.jpg`);
          try {
            await downloadOne(og, dest);
            meta.extras[key] = path.basename(dest);
            const row = itemsFile.items.find((r) => r.id === item.id);
            if (row) row.coverKey = key;
          } catch (e) {
            console.warn("og", item.official, e.message);
          }
        }
      }
      patchItemMd(date, item, meta);
    }

    itemsFile.extras = { ...(itemsFile.extras ?? {}), ...meta.extras };
    fs.writeFileSync(itemsPath, JSON.stringify(itemsFile, null, 2) + "\n");
    fs.writeFileSync(path.join(outDir, "media-meta.json"), JSON.stringify(meta, null, 2) + "\n");

    const manifestEntries = [...ids].map((id) => byId[id]).filter(Boolean);
    fs.writeFileSync(
      path.join(ROOT, "content", `media-manifest-${date}.json`),
      JSON.stringify(manifestEntries, null, 2) + "\n"
    );

    console.log(`${date}: tweets=${Object.keys(meta.tweets).length} extras=${Object.keys(meta.extras).length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});