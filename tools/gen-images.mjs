#!/usr/bin/env node
/* =========================================================================
   gen-images.mjs — regenerate images/images.json from the images/ folder.

   Convention (see LESSONS.md):
     images/<category>_<subject><N>.<ext>
       category  ∈ work | hobby | volunteer | graduation | profile
       subject   lowercase, underscores for spaces (milanocortina, f1, lab)
       N         optional sequence number for several shots of the same
                 subject (lab1, lab2 -> one "lab" group)

   The FIRST underscore splits category from the subject. For raster photos a
   downscaled copy in images/web/ is preferred when present; originals are
   kept untouched. .mp4/.heic sources are ignored (convert them first — see
   LESSONS.md).

   Usage: node tools/gen-images.mjs
   ========================================================================= */
import { readdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "images");
const OUT = join(ROOT, "images", "images.json");

const CATEGORIES = ["work", "hobby", "volunteer", "graduation", "profile"];
const EXT_OK = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const IGNORE = new Set([".DS_Store", "images.json"]);

/* Known exceptions — files that don't follow the clean first-token rule. */
const OVERRIDES = {
  "hobby_profile_travel1": { category: "profile", subject: "travel" },
  "work_hobby_halfmarathon": { category: "work", subject: "halfmarathon" }
};

const SECTION_FOR = {
  work: "research",
  hobby: "about",
  personal: "about",
  graduation: "about",
  volunteer: "community",
  profile: "about"
};

const TITLES = {
  lab: "In the Lab",
  eeg: "EEG Sessions",
  halfmarathon: "Half Marathon",
  climb: "Climbing",
  camp: "Camping",
  f1: "Pit Lane",
  hike: "Hiking",
  milanocortina: "Milano Cortina 2026",
  wizzair: "Wizz Air Milano Marathon",
  graduation: "Graduation",
  travel: "On the Road"
};

/* Subjects where the trailing number is part of the word, not an index. */
const DIGIT_SUBJECTS = new Set(["f1"]);

function humanize(subject) {
  if (TITLES[subject]) return TITLES[subject];
  return subject
    .split("_")
    .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
    .join(" ");
}

function parse(base) {
  if (OVERRIDES[base]) return OVERRIDES[base];
  /* category = leading letters (a trailing index like "hobby1_" is allowed),
     subject  = everything after the first "_", minus trailing digits
     (unless the whole subject is a known digit-subject such as "f1"). */
  const m = base.match(/^([a-z]+\d*)(?:_(.*))?$/);
  if (!m) return null;
  const category = m[1].replace(/\d+$/, "");
  if (!CATEGORIES.includes(category)) return null;
  const rawSubject = m[2] || "";
  const subject = DIGIT_SUBJECTS.has(rawSubject)
    ? rawSubject
    : rawSubject.replace(/\d+$/, "");
  return { category, subject: subject || category }; /* graduation1 -> "graduation" */
}

/* Scan images/ root rasters plus images/web/ conversions (HEIC sources only
   exist as web JPEGs). A web copy, when present, becomes the served src. */
const byBase = new Map();
for (const f of readdirSync(IMG)) {
  if (IGNORE.has(f)) continue;
  if (!EXT_OK.has(extname(f).toLowerCase())) continue;
  byBase.set(basename(f, extname(f)), { file: f, web: null });
}
for (const wf of readdirSync(join(IMG, "web"))) {
  if (!EXT_OK.has(extname(wf).toLowerCase())) continue;
  const base = basename(wf, extname(wf));
  if (byBase.has(base)) byBase.get(base).web = "images/web/" + wf;
  else byBase.set(base, { file: "web/" + wf, web: "images/web/" + wf });
}

const files = [];
for (const [base, entry] of byBase) {
  const src = entry.web || "images/" + entry.file;
  files.push({ base, file: entry.file, src });
}

const groups = new Map();
const profiles = [];

for (const { base, file, src } of files) {
  const parsed = parse(base);
  if (!parsed) { console.warn("skip (unparseable): " + file); continue; }

  if (parsed.category === "profile") {
    profiles.push({ file, src, subject: parsed.subject, caption: "" });
    continue;
  }

  const key = parsed.category + "__" + parsed.subject;
  let g = groups.get(key);
  if (!g) {
    g = {
      id: key,
      category: parsed.category,
      section: SECTION_FOR[parsed.category] || "about",
      title: humanize(parsed.subject),
      caption: "",
      images: []
    };
    groups.set(key, g);
  }
  g.images.push({ file, src, caption: "" });
}

/* The file literally named profile<N> is the hero headshot; any other
   profile shots fold into an "On the Road"-style group. */
profiles.sort(function (a, b) {
  const aHead = /^profile/i.test(a.file) ? 0 : 1;
  const bHead = /^profile/i.test(b.file) ? 0 : 1;
  return (aHead - bHead) || a.file.localeCompare(b.file);
});
const hero = profiles[0] || null;
const extra = profiles.slice(1);
if (extra.length) {
  groups.set("profile__extras", {
    id: "profile__extras",
    category: "profile",
    section: "about",
    title: humanize(extra[0].subject || "travel"),
    caption: "",
    images: extra
  });
}

const groupList = Array.from(groups.values()).map(function (g) {
  g.count = g.images.length;
  return g;
});

/* Sort groups: by section order, then by oldest file name. */
const SECTION_ORDER = ["about", "research", "community"];
groupList.sort(function (a, b) {
  const d = SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section);
  return d || a.title.localeCompare(b.title);
});

writeFileSync(OUT, JSON.stringify({ hero, groups: groupList }, null, 2) + "\n", "utf8");
console.log("wrote " + OUT);
console.log("  hero:   " + (hero ? hero.src : "none"));
console.log("  groups: " + groupList.length);
for (const g of groupList) console.log("   - [" + g.section + "] " + g.title + " (" + g.count + ")");
