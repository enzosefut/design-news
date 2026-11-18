import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(ROOT, "content");
const CATEGORY = "game";

/** Video game art / game UI craft — not sports branding or film-only posters */
const GAME_SLUGS = new Set([
  "ffx2-amano",
  "fate-samurai",
  "pokemon",
  "catherine-creative-uncut",
  "ffxiv-endwalker",
  "persona-3-creative-uncut",
  "dmc5-creative-uncut",
  "ffxii-fran-balthier",
  "ffxi-jobs",
  "fantasian-kina",
  "persona-4-chie-yukiko",
  "meng-fable-trailer",
  "ffx2-creative-uncut",
  "special-esc-menu",
]);

for (const jf of fs.readdirSync(CONTENT).filter((f) => f.endsWith("-items.json"))) {
  const date = jf.slice(0, 10);
  const p = path.join(CONTENT, jf);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  let changed = false;
  for (const item of data.items) {
    if (!GAME_SLUGS.has(item.id)) continue;
    if (item.category !== CATEGORY) {
      item.category = CATEGORY;
      changed = true;
    }
    const mdPath = path.join(CONTENT, "items", `${date}-${item.id}.md`);
    if (fs.existsSync(mdPath)) {
      const raw = fs.readFileSync(mdPath, "utf8");
      const parsed = matter(raw);
      if (parsed.data.category !== CATEGORY) {
        parsed.data.category = CATEGORY;
        fs.writeFileSync(
          mdPath,
          matter.stringify(parsed.content, parsed.data, { lineWidth: 1000 }),
          "utf8"
        );
      }
    }
  }
  if (changed) fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

console.log(`Retagged ${GAME_SLUGS.size} slugs to category "${CATEGORY}"`);