import fs from "node:fs";
import path from "node:path";

const BASE = "/design-news";

/** Card grid: ~3 cols at 72rem → ~380px display; 2× DPR */
const CARD_WIDTHS = [400, 800];
/** Hero media column: up to ~700px display; 2× */
const HERO_WIDTHS = [800, 1280];

function safeStem(file) {
  return file.replace(/\.[^.]+$/i, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export class HomeThumbRegistry {
  constructor() {
    /** @type {Map<string, { date: string, file: string, role: 'card' | 'hero' }>} */
    this.jobs = new Map();
  }

  /**
   * @param {'card' | 'hero'} role
   * @returns {{ src: string, srcset: string, sizes: string } | null}
   */
  register(date, file, role = "card") {
    if (!date || !file) return null;
    const key = `${date}\0${file}\0${role}`;
    if (!this.jobs.has(key)) this.jobs.set(key, { date, file, role });

    const widths = role === "hero" ? HERO_WIDTHS : CARD_WIDTHS;
    const stem = safeStem(file);
    const suffix = role === "hero" ? "-hero" : "-card";
    const base = `${BASE}/media/_home/${date}/${stem}${suffix}`;
    const src = `${base}-${widths[widths.length - 1]}.webp`;
    const srcset = widths.map((w) => `${base}-${w}.webp ${w}w`).join(", ");
    const sizes =
      role === "hero"
        ? "(min-width: 900px) 58vw, 100vw"
        : "(min-width: 960px) 22vw, (min-width: 560px) 46vw, 94vw";
    return { src, srcset, sizes };
  }
}

export function homeThumbImgTag(thumb, alt, { loading = "lazy" } = {}) {
  if (!thumb) return "";
  const altAttr = alt ? ` alt="${alt.replace(/"/g, "&quot;")}"` : ' alt=""';
  return `<img src="${thumb.src}" srcset="${thumb.srcset}" sizes="${thumb.sizes}"${altAttr} loading="${loading}" decoding="async">`;
}

/**
 * @param {HomeThumbRegistry} registry
 * @param {{ mediaSrc: string, distDir: string }} opts
 */
export async function generateHomeThumbs(registry, { mediaSrc, distDir }) {
  if (!registry.jobs.size) return;
  const { default: sharp } = await import("sharp");

  for (const { date, file, role } of registry.jobs.values()) {
    const srcPath = path.join(mediaSrc, date, file);
    if (!fs.existsSync(srcPath)) continue;

    const widths = role === "hero" ? HERO_WIDTHS : CARD_WIDTHS;
    const stem = safeStem(file);
    const suffix = role === "hero" ? "-hero" : "-card";
    const outDir = path.join(distDir, "media", "_home", date);
    fs.mkdirSync(outDir, { recursive: true });

    const quality = role === "hero" ? 85 : 82;
    for (const w of widths) {
      const out = path.join(outDir, `${stem}${suffix}-${w}.webp`);
      await sharp(srcPath)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toFile(out);
    }
  }
}