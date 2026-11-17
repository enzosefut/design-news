#!/usr/bin/env node
/**
 * Dry-run: pack+prune on a disposable fixture (does not touch live 2026-11-17).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import matter from "gray-matter";
import {
  collectDayFiles,
  makePaths,
  markDayMediaArchived,
  packDay,
} from "./archive-expired.mjs";
import { isWithinRetention, todayShanghai } from "./lib/retention.mjs";

const FIXTURE_DATE = "2099-01-01";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-news-retention-"));
const p = makePaths(root);
const media = path.join(p.media, FIXTURE_DATE);

fs.mkdirSync(p.items, { recursive: true });
fs.mkdirSync(media, { recursive: true });
fs.writeFileSync(path.join(media, "sample.jpg"), "fake");
fs.writeFileSync(
  path.join(p.content, `${FIXTURE_DATE}-items.json`),
  JSON.stringify({ date: FIXTURE_DATE, items: [{ id: "x", category: "x" }] })
);
fs.writeFileSync(
  path.join(p.items, `${FIXTURE_DATE}-x.md`),
  matter.stringify("短文", {
    date: FIXTURE_DATE,
    slug: "x",
    gallery: ["sample.jpg"],
  })
);

const files = collectDayFiles(FIXTURE_DATE, p);
if (!files.includes(`media/${FIXTURE_DATE}/sample.jpg`)) {
  throw new Error("fixture collectDayFiles missing media");
}

const { ok } = packDay(FIXTURE_DATE, p.archive, p);
if (!ok) throw new Error("fixture pack failed");

markDayMediaArchived(FIXTURE_DATE, p);

if (fs.existsSync(media)) throw new Error("media dir should be deleted after prune");

const itemRaw = fs.readFileSync(path.join(p.items, `${FIXTURE_DATE}-x.md`), "utf8");
const { data } = matter(itemRaw);
if (!data.mediaArchived || data.gallery) throw new Error("item front matter not archived");

const json = JSON.parse(
  fs.readFileSync(path.join(p.content, `${FIXTURE_DATE}-items.json`), "utf8")
);
if (!json.mediaArchived) throw new Error("items json not archived");

const today = todayShanghai();
if (!isWithinRetention("2026-11-17", today, 60)) {
  throw new Error("2026-11-17 should be within 60-day window");
}

fs.rmSync(root, { recursive: true, force: true });
console.log("test-archive-retention: OK");