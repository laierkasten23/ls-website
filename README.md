# Lia Schmid — Living Terrain

A small explorable personal site. Not a scrollable CV — a terrain of camps
(Research, Education, Nutrition, Community) where each landmark opens a detail
note. Plain HTML/CSS/JS, no frameworks, no build step.

- `index.html` — structure, regions, terrain backdrops
- `style.css` — design system (nature palette, responsive, accessible)
- `script.js` — terrain generation, content data, interactions
- `certificates.json` — credentials & volunteering data (edit here)
- `images/images.json` — photo data (regenerate with the tool below)
- `certificates/` — credential documents (PDFs) + `thumbs/` (rendered previews)
- `images/` — photos (originals kept), `images/web/` (downscaled copies)
- `volunteering/` — volunteer certificates (PDF/PNG)
- `tools/gen-images.mjs` — regenerates `images/images.json` from `images/`
- `tools/gen-cert-thumbs.sh` — regenerates certificate PDF thumbnails

---

## Deploy to GitHub Pages

1. Create a repository on GitHub (e.g. `lia-schmid-site`) and push these files:
   ```
   git init
   git add .
   git commit -m "Living Terrain site"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → main / (root)** → Save.
3. Your site is live at `https://<you>.github.io/<repo>/` within a minute or two.

> If you already have a repo for a user/org page, push to `main` and it serves
> at `https://<you>.github.io/`.

---

## Editing general content

### Text inside detail notes (the "camps")

All detail-panel text lives in the `DATA` object in `script.js` (search for
`var DATA =`). Each landmark has `title`, `sub`, `body`, `bullets`, `stacks`,
`meta`. Edit those strings directly — no layout code to touch.

To add a **new landmark/camp**:

1. Add a button in `index.html` inside the region you want, e.g.
   ```html
   <button class="node" data-open="my_new_note">
     <span class="node-dot" aria-hidden="true"></span>
     <span class="node-title">My new note</span>
     <span class="node-tag">a short label</span>
   </button>
   ```
2. Add a matching key in `DATA` in `script.js`:
   ```js
   DATA.my_new_note = { kicker: "Region name", title: "…", sub: "…",
                        body: "<p>…</p>", meta: H.meta([H.pill("tag")]) };
   ```

### Contact details

Edit the `CONTACT` object near the top of `script.js` (email, phone, and the
`socials` array). Set `url: ""` for a handle you don't have a link for yet —
it will render as a plain chip.

### Region names / navigation labels

The compass buttons in the masthead (`index.html`) and the `compassMap` array in
`script.js` must stay in sync if you rename a region. The final region is the
personal gallery (`#personal`) — it must remain the last region on the page.

---

## Adding / updating a certificate

Everything renders from `certificates.json` — you never touch layout code.
Credentials are grouped as **courses**; a course either has a flat list of
`certs[]` (simple case) or an `overall` certificate plus `modules[]`, where
each module has its own `certs[]`.

```json
{
  "id": "my-course",
  "title": "Course title",
  "sub": "One-line subtitle shown under the landmark",
  "issuer": "Issuing body (optional)",
  "overall": {
    "title": "Course certificate",
    "qualification": "Instructor · Nutrition",
    "issuer": "…", "date": "2026-08-11", "credentialId": "…",
    "doc": "certificates/my-file.pdf", "category": "…", "note": "…"
  },
  "modules": [
    {
      "id": "m1", "title": "Module 1",
      "certs": [ { "title": "AIF Diploma", "doc": "docs/nutrition/…/file.pdf", "note": "…" } ]
    }
  ]
}
```

Required per cert: `title`, `doc`. Everything else is optional. A course with
**no modules** just uses `certs[]` directly (the ESWA Fitness Teacher is an
example). After adding/removing any `doc`, regenerate the PDF previews:

```sh
./tools/gen-cert-thumbs.sh
```

### Add a new certificate to a module

1. Drop the PDF in `certificates/` (or `docs/…`, keep names simple, no spaces).
2. Add an entry to the module's `certs[]` array.
3. Re-run `./tools/gen-cert-thumbs.sh` so the carousel tile gets a preview.
4. Push. The module row, carousel and preview all pick it up.

### Volunteering

Same pattern in the `"volunteering"` array — fields are `role`, `detail`,
`location`, `period`, plus optional `doc` / `docLabel`. A doc opens in the
shared media viewer with a "View … →" link as well.

A volunteering role can hold **multiple** certificates: add an optional
`docs[]` array (entries each with `doc` / `docLabel`, and optional `role` /
`detail`). They render as extra tiles in the role's panel and open together in
one viewer carousel. This is how the I-HELP course certificate lives under the
Wizz Air Milano Marathon role instead of as its own landmark. An optional `bg`
field sets a faint background photo on the landmark tile (see "bg-box" below).

---

## Adding photos (image gallery)

Photos render from `images/images.json`, which is **generated** — see the
naming convention in `LESSONS.md`. The short version:

1. Drop the file into `images/` named `category_subjectN.ext`
   (e.g. `work_lab3.JPG`, `volunteer_milanocortina5.JPG`).
   Categories: `work` → Research, `hobby` / `personal` → the personal gallery
   at the end of the page, `volunteer` → Community, `graduation` → a faint,
   masked **background** photo inside the Education section ("The course of the
   river"), not a foreground figure. Files named `profile*` become the hero
   portrait.
2. Regenerate the data and previews:
   ```sh
   node tools/gen-images.mjs
   ```
3. If it's a new large photo, also drop a downscaled copy in `images/web/`
   (the generator prefers it when present):
   ```sh
   sips -s format jpeg -Z 1600 -s formatOptions 82 images/my_photo.JPG --out images/web/my_photo.jpg
   ```
4. Push. The photo lands in the right section/group automatically.

Some groups are pinned to a panel instead of a section gallery via `attachTo`
in the generator (`ATTACH` map): the "In the Lab" group shows inside the PHuSe
Lab note, and the Milano Cortina / Wizz Air groups show inside their volunteer
panels. See `LESSONS.md` → "Images — attachTo" for the full list.

The gallery renders as compact strips (personal photos are one flat strip);
tapping any shot opens the shared media viewer (arrows, keyboard `←`/`→`,
`Esc` to close, touch swipe, click to zoom photos).

---

## Downloadables (CV, thesis)

- The **"Show CV"** link sits as a quiet text link directly under the portrait,
  inside the `.hero-profile` block (right column, `index.html`), and opens
  `docs/CV_2026_Research.pdf` in a **new tab** (a second CV,
  `docs/CV_2026_TeamLead_DataOps.pdf`, also exists). To swap the
  offered CV, point the `.cv-link` anchor in `index.html` at a different file.
- The **thesis PDF** is linked from both the Choroid Plexus research note and
  the M.Sc. panel — both point to `docs/Schmid_Lia_Phuse_Thesis_2024.pdf`,
  wired via a `docLink` field in the `DATA` entry in `script.js`.
- To replace either PDF, drop a new file under `docs/` with the same name (or
  update the href / `docLink.url`).

## bg-box — faint backdrop photo on a landmark

A landmark node can carry a low-opacity background photo. For a static
`[data-open]` node in `index.html`, add `class="bg-box"` and
`style="background-image:url('images/web/….jpg')"`. For a JS-rendered
`.vol-node`, set a `bg` field in that volunteer's `certificates.json` entry
(e.g. `"bg": "images/web/volunteer_wizzair.jpg"`). Keep photos muted — the
site adds a translucent overlay so the title stays readable. Drop the web copy
of the image in `images/web/` first (see "Adding photos").

## Notes

- The topographic terrain is generated procedurally in `script.js` — no image
  assets needed for the backdrop itself.
- The only external dependency is the Google Fonts stylesheet (Fraunces + Inter)
  in `index.html`.
- The **"Pit-lane note"** landmark in the summit section is a deliberate,
  small motorsport easter egg — keep it understated to preserve the tone.
- The "Terrain discovered" counter and node bubbles are **session-only**: they
  reset to zero on every page reload (no localStorage). This is intentional.
- A small **pulsing first-visit guide** (`.guide`) is a **fixed, corner-anchored
  chip (bottom-left)** that stays put during scroll and disappears on the first
  click — session-only, no tracking.
- A faint decorative **background river** runs behind the whole page: two
  parallel smooth curves (a "railway") generated by `drawRiver()` in
  `script.js` that start from the hero portrait and meander past the section
  headings. Only one tree silhouette is used — a slim tall **conifer** drawn as
  stacked tiers — and trees are plucked **directly off the rail paths themselves**:
  `drawRiver()` walks each rendered `.river-rail` `<path>` by arc length with
  `getPointAtLength()` and parks a conifer at the sampled point, so every tree
  sits ON the line and follows its left-right drift (verified avg ≈ 10px from the
  rendered rail). Only samples that fall inside a whitespace gap between content
  blocks are kept, forming small "mini-forest" clusters in inter-section gaps —
  never behind/over text (0 overlaps). Keep it low-opacity and behind content.
  Tuning knobs: `.river-rail` / `.river-tree` opacity and stroke in `style.css`;
  gap margin (`MARGIN`), the arc-length sample step / cluster size / inter-tree
  step / sideways nudge (`SAMPLE_ARC`, `MAX_PER_RUN`, `MIN_TREE_STEP`, `NUDGE`) in
  `drawRiver()`. Note `getPointAtLength()` returns viewBox coords, so tree `y`
  must stay raw (not minus `svgTop`) to match where the rail renders.
- The education region shows a soft **graduation backdrop** (`div.edu-bg`).
  Self-adjust: `background-size` (`contain` = full photo, no crop),
  `background-position` (`right center` seats it right), and `opacity` in
  `style.css`; `#education{min-height}` gives the photo room to read.
- The **hero name** (`#summit-title`, "Lia Schmid") sits in the **left column**
  (`.hero-copy` above the lede); the **right column** (`.hero-profile`) holds the
  portrait, a **contact-icon row** (Email / Phone / LinkedIn, monochrome stroke
  SVGs, dests from `CONTACT` in `script.js`), and the **resume link** (`Show CV ↗`,
  `docs/CV_2026_Research.pdf`) — a quiet underlined text link directly under the
  portrait, not a button.
- Node/bubble colour comes ONLY from the `is-done` dynamic logic (neutral
  `--clay` default → `--moss` when completed); never hard-code a green bubble.
- Section headers show a **large right-side icon anchor** (`.section-icon`,
  `position:absolute` top-right); the small nav companion stays in the masthead.
- Re-run `git status` before pushing to avoid accidentally committing PDFs or
  original photos you didn't intend to publish.
