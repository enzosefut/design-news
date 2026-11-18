import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CONTENT = path.join(ROOT, "content");
const map = JSON.parse(
  fs.readFileSync(path.join(__dirname, "title-updates.json"), "utf8")
);

let updatedJson = 0;
let updatedMd = 0;

for (const jf of fs.readdirSync(CONTENT).filter((f) => f.endsWith("-items.json"))) {
  const date = jf.slice(0, 10);
  const p = path.join(CONTENT, jf);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  let changed = false;
  for (const item of data.items) {
    const key = `${date}:${item.id}`;
    const next = map[key];
    if (!next || next === item.title) continue;
    item.title = next;
    changed = true;
    updatedJson++;

    const mdPath = path.join(CONTENT, "items", `${date}-${item.id}.md`);
    if (fs.existsSync(mdPath)) {
      const raw = fs.readFileSync(mdPath, "utf8");
      const parsed = matter(raw);
      parsed.data.title = next;
      const out =
        matter.stringify(parsed.content, parsed.data, {
          lineWidth: 1000,
        });
      fs.writeFileSync(mdPath, out, "utf8");
      updatedMd++;
    }
  }
  if (changed) fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

console.log(`Updated items.json fields: ${updatedJson}, markdown titles: ${updatedMd}`);