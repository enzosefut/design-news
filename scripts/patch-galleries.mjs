import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ITEMS = path.join(process.cwd(), "content", "items");

const GALLERY = {
  allo: [
    "extra-allo-og.png",
    "2122329345670988258-link-0.jpg",
    "2122329345670988258-poster.jpg",
  ],
  "die-grotesk": [
    "extra-die-grotesk-social.jpg",
    "2122436959574573204-link-0.jpg",
    "2122436959574573204-photo-1.jpg",
    "2122436959574573204-photo-2.jpg",
    "2122436959574573204-photo-3.jpg",
  ],
  likeweiss: [
    "likeweiss-dieline-01.jpg",
    "likeweiss-dieline-02.jpg",
    "likeweiss-dieline-03.jpg",
    "2122291291237015576-poster.jpg",
  ],
  cannes: [
    "gallery-cannes-01.png",
    "gallery-cannes-02.png",
    "gallery-cannes-03.png",
    "2122359275972399474-poster.jpg",
  ],
  "anima-canvas": [
    "gallery-anima-cover.jpg",
    "gallery-anima-01.png",
    "gallery-anima-02.png",
    "gallery-anima-03.png",
    "gallery-anima-04.png",
    "gallery-anima-05.png",
    "gallery-anima-06.png",
  ],
  kuda: [
    "gallery-kuda-barkas.avif",
    "gallery-kuda-1.jpg",
    "gallery-kuda-3.jpg",
    "gallery-kuda-5.jpg",
    "2122394766725751255-link-0.jpg",
    "2122394766725751255-photo-1.jpg",
    "2122394766725751255-photo-2.jpg",
  ],
  mlb: [
    "2122454342016111056-link-0.jpg",
    "2122454342016111056-photo-1.jpg",
    "2122454342016111056-photo-2.jpg",
    "2122454342016111056-photo-3.jpg",
  ],
  olearius: [
    "2122498798681219334-photo-0.jpg",
    "2122498798681219334-photo-1.jpg",
    "2122498798681219334-photo-2.jpg",
  ],
  vsgoods: [
    "2122409989289480480-link-0.jpg",
    "2122409989289480480-photo-1.jpg",
    "2122409989289480480-photo-2.jpg",
    "2122409989289480480-photo-3.jpg",
  ],
  "object-01": [
    "2122485689090507211-link-0.jpg",
    "2122485689090507211-photo-1.jpg",
    "2122485689090507211-photo-2.jpg",
    "2122485689090507211-photo-3.jpg",
  ],
  "fate-samurai": [
    "2122421840983543888-link-0.jpg",
    "2122421840983543888-photo-1.jpg",
    "2122421840983543888-photo-2.jpg",
    "2122421840983543888-photo-3.jpg",
    "2122421840983543888-photo-4.jpg",
  ],
  pokemon: [
    "2122277246740185151-link-0.jpg",
    "2122277246740185151-photo-1.jpg",
    "2122277246740185151-photo-2.jpg",
    "2122277246740185151-photo-3.jpg",
    "2122277246740185151-photo-4.jpg",
  ],
  code2video: ["2122495234646941744-poster.jpg"],
  "marvel-app": [
    "2122455327228469579-photo-0.jpg",
    "2122455327228469579-photo-1.jpg",
    "2122455327228469579-photo-2.jpg",
    "2122455327228469579-photo-3.jpg",
  ],
  "ramin-sweater": ["2122408220685730098-photo-0.jpg", "2122408220685730098-photo-1.jpg"],
  "ahmed-metal": ["2122301528132460746-photo-0.jpg"],
  "ahmed-nectai": ["2122288482890699055-photo-0.jpg"],
  "ahmed-spectr": ["2122256336008442139-photo-0.jpg"],
  "miggi-iphone": ["2122474018557350106-poster.jpg"],
  "ramin-tickets": ["2122433340250718529-poster.jpg"],
  "sheared-type": ["2122495012223307797-poster.jpg"],
  "marcel-underlay": [],
};

for (const [slug, gallery] of Object.entries(GALLERY)) {
  const file = path.join(ITEMS, `2026-11-17-${slug}.md`);
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  data.gallery = gallery;
  data.preferStillHero = slug !== "miggi-iphone" && slug !== "ramin-tickets";
  fs.writeFileSync(file, matter.stringify(content, data));
}
console.log("patched galleries");