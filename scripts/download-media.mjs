import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MANIFEST = path.join(ROOT, "content", "media-manifest-2026-11-17.json");
const ITEMS = path.join(ROOT, "content", "2026-11-17-items.json");
const OUT = path.join(ROOT, "media", "2026-11-17");
const META = path.join(OUT, "media-meta.json");

const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

function ensureOrig(url) {
  if (url.includes("pbs.twimg.com/media/") && !url.includes("name=orig")) {
    const base = url.split("?")[0];
    return `${base}?name=orig`;
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

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const itemsFile = JSON.parse(fs.readFileSync(ITEMS, "utf8"));
  fs.mkdirSync(OUT, { recursive: true });

  const byTweet = Object.fromEntries(manifest.map((m) => [m.id, m]));
  const meta = { tweets: {}, extras: {} };

  for (const entry of manifest) {
    const id = entry.id;
    const record = {
      cover: null,
      images: [],
      poster: null,
      video: null,
    };

    let idx = 0;
    const pushImage = async (url, kind) => {
      const dest = path.join(OUT, `${id}-${kind}-${idx}${extFromUrl(url)}`);
      try {
        await downloadOne(url, dest);
        const rel = path.basename(dest);
        record.images.push(rel);
        if (!record.cover) record.cover = rel;
        idx += 1;
        return rel;
      } catch (e) {
        console.warn("skip", url, e.message);
        return null;
      }
    };

    for (const url of entry.link_imgs ?? []) {
      await pushImage(url, "link");
    }
    for (const url of entry.photos ?? []) {
      await pushImage(url, "photo");
    }
    for (const url of entry.posters ?? []) {
      const dest = path.join(OUT, `${id}-poster${extFromUrl(url)}`);
      try {
        await downloadOne(url, dest);
        record.poster = path.basename(dest);
        if (!record.cover) record.cover = record.poster;
      } catch (e) {
        console.warn("poster", e.message);
      }
    }
    for (const url of entry.videos ?? []) {
      const dest = path.join(OUT, `${id}-video.mp4`);
      try {
        const { bytes } = await downloadOne(url, dest);
        if (bytes <= MAX_VIDEO_BYTES) {
          record.video = path.basename(dest);
        } else {
          fs.unlinkSync(dest);
          console.warn(`video too large (${bytes}): ${id}`);
        }
      } catch (e) {
        console.warn("video", e.message);
      }
    }

    if (!record.cover && record.poster) record.cover = record.poster;
    meta.tweets[id] = record;
  }

  const animaUrl = itemsFile.extras["anima-cover"];
  const animaDest = path.join(OUT, "anima-cover.jpg");
  await downloadOne(animaUrl, animaDest);
  meta.extras["anima-cover"] = "anima-cover.jpg";

  // joshpuckett supplement poster (optional gallery)
  const supp = byTweet["2122476493481865674"];
  if (supp?.posters?.[0]) {
    const dest = path.join(OUT, "2122329345670988258-supplement-poster.jpg");
    try {
      await downloadOne(supp.posters[0], dest);
      meta.tweets["2122329345670988258"].images.push(path.basename(dest));
    } catch {
      /* optional */
    }
  }

  fs.writeFileSync(META, JSON.stringify(meta, null, 2));
  console.log("Downloaded media →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});