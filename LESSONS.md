# LESSONS — standing conventions & decisions

Log of conventions established in this project so future prompts can rely on
them instead of re-discovering.

## Images — naming convention

Filename: `images/<category>_<subject><N>.<ext>`

- `category` is the FIRST token (letters only, an index like `hobby1_` is OK):
  - `work` → Research range section
  - `hobby`, `personal` → the personal gallery at the very end of the page
    (rendered as ONE flat strip — no per-hobby sub-grouping)
  - `graduation` → faint masked background photo inside the education region
  - `volunteer` → Community grove section
  - `profile` → hero portrait (any file literally named `profile<N>` becomes
    the hero; extra profile shots fold into an "On the Road" gallery group in
    the personal gallery)
- `subject` = everything after the first `_`, lowercase, underscores for
  spaces (`milanocortina`, `halfmarathon`). A trailing number groups shots of
  one subject: `work_lab1.JPG` + `work_lab2.JPG` → one "lab" group.
- `f1` is a known digit-subject (its `1` is NOT an index). Add other such
  subjects to `DIGIT_SUBJECTS` in `tools/gen-images.mjs`.
- Supported extensions: `.jpg .jpeg .png .gif .webp`. `.mp4` / `.heic` are
  ignored — convert them first (see below).
- Group titles are auto-derived via the `TITLES` map in the generator; edit
  the map to rename a group. Per-image / per-group captions can be hand-edited
  in `images/images.json` afterwards (regenerating overwrites them).

Known exceptions (in `OVERRIDES` of the generator):
- `hobby_profile_travel1` → category `profile`, subject `travel`
- `work_hobby_halfmarathon` → category `work`, subject `halfmarathon`

## Images — attachTo (groups that render inside a panel/inline)

A group can be pinned to a specific anchor instead of a section gallery via
`attachTo` (in the `ATTACH` map of the generator). Values:

- `work_phuse` → the "In the Lab" group renders inside the "BCI Researcher ·
  PHuSe Lab" note panel (research).
- `vol_0` / `vol_1` → the group renders inside the matching volunteer panel
  (`data-volidx` in the volunteering array).
- `edu_graduation` → rendered as a faint, masked background treatment inside
  the education region (`div.edu-bg`, absolutely positioned behind content —
  see the "Graduation backdrop" section for current opacity/sizing) — NOT an
  inline/cropped figure.
- `null` → normal section gallery.

`attachTo` is backward compatible: any group without it renders into its
section as before. Panel galleries are wrapped in `.panel-gallery`.

## Images — data file

`images/images.json` is GENERATED (do not hand-maintain):

```json
{ "hero": { "file": "profile1.png", "src": "images/web/profile1.jpg", "caption": "" },
  "groups": [ { "id": "work__lab", "category": "work", "section": "research",
                "title": "In the Lab", "caption": "", "attachTo": "work_phuse", "count": 2,
                "images": [ { "file": "work_lab1.JPG", "src": "images/web/work_lab1.jpg", "caption": "" } ] } ] }
```

Regenerate: `node tools/gen-images.mjs`. The generator prefers a downscaled
copy in `images/web/<base>.jpg` when present (original files stay untouched).
For new large photos also drop a web copy:
`sips -s format jpeg -Z 1600 -s formatOptions 82 <img> --out images/web/<base>.jpg`

Conversion commands (assets already converted):
- HEIC → JPEG: `sips -s format jpeg -Z 1600 -s formatOptions 82 x.HEIC --out web/x.jpg`
- MP4 → looping GIF (keep under ~3 MB):
  `ffmpeg -y -i x.MP4 -t 7 -vf "fps=5,scale=300:-1,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse" -loop 0 x.gif`
  (bayer dither needed no; default worked. Tune fps/scale/duration to size.)

## Certificates — data file

`certificates.json` schema — a course either has modules (with an overall
cert) or a flat certs list (simple case):

```json
{ "courses": [ { "id": "aif-sports-nutrition", "title": "…", "sub": "…",
    "overall": { "title": "…", "qualification": "…", "issuer": "…", "date": "…",
                 "credentialId": "…", "doc": "…pdf", "category": "…", "note": "…" },
    "modules": [ { "id": "m1", "title": "…",
                   "certs": [ { "title": "…", "doc": "…pdf", "note": "…" } ] } ] },
  { "id": "eswa-fitness-teacher", "title": "…", "certs": [ { "title": "…", "doc": "…pdf" } ] } ],
  "volunteering": [ …unchanged… ] }
```

- Required per cert: `title`, `doc`. Others optional.
- Click course → panel shows overall cert + module list; click module → the
  shared media viewer carousels that module's certs (PDFs side-by-side).
- Cert PDF previews are thumbnails in `certificates/thumbs/<basename>.png`,
  regenerated with `./tools/gen-cert-thumbs.sh` (uses macOS `qlmanage`).
  Missing thumb → tile shows a plain "PDF" badge, no breakage.
- Volunteering entries may carry `adjacentTo` (a shared group key): when two
  entries share it, opening either one's cert opens BOTH docs in one viewer
  carousel, adjacent. Example: "Wizz Air Milano Marathon" + "I-HELP" share
  `"adjacentTo": "milano-marathon-2026"`.

Decisions locked in:
- AIF sports nutrition = one course, overall cert = the top-level tesserino
  (`certificates/nutrition-04-tesserino.pdf`, AIF n. 202279552) — no distinct
  course-completion diploma exists yet; swap `overall.doc` if one appears.
- 4 modules = the 4 AIF levels; each module's carousel includes ALL diplomas
  from `docs/nutrition/certificati_01..04` (AIF + LibertAS + MSP + tesserino/ERC).
- ESWA Fitness Teacher = a SEPARATE simple course (its `certs[]` includes the
  ESWA certificate + full ESWA diploma from `docs/nutrition/Diploma_ESWA_LIA_SCHMID.pdf`).
- Not wired yet (available if wanted): the Milano Cortina volunteer docs in
  `docs/volunteering/OlympiaCertificates/` and `certificates/Certificato Team26.pdf`.

## Shared media viewer

One viewer drives both photo lightboxes and certificate carousels:
- Prev/next arrows, `←`/`→` keys, `Esc` closes, touch swipe on mobile.
- Click a photo to zoom (toggle), `.pdf` renders inline in an iframe with an
  "Open original ↗" link.
- Body scroll is lock-counted (panel + viewer can stack without unlocking).

## Discovered / counter

- "Terrain discovered" now counts: `[data-open]` nodes + `.course-node` +
  `.vol-node`. Individual photos and certs are NOT counted (would bloat the
  total). Keys: `course_<id>`, `module_<course>_<module>`, `vol_<i>`.
- State is **session-only**: `discovered` is an in-memory object that resets on
  reload (no `localStorage`/`sessionStorage`). The terrain counter and the
  node "bubbles" (`.is-done`) therefore always start fresh. Do not re-introduce
  persistence without being asked — reset-on-refresh is intentional.

## Design system — type scale

Font sizes are consolidated into a ~6-step scale defined as custom properties
in `:root` of `style.css`:

- `--fs-2xs` (meters/counters) · `--fs-xs` (kickers, tags, pills, captions) ·
  `--fs-sm` (nav, muted body, footer) · `--fs-md` (body) · `--fs-lg` (node /
  group titles) · `--fs-xl` (region heading) · `--fs-hero` (hero name).

New styles must reuse a `--fs-*` variable instead of adding a raw rem value, so
the scale stays consolidated. Vertical rhythm between numbered blocks is
controlled by `--region-pad` (region padding) and the small `.region` top
margin.

## Icons — nav ↔ section header pairing (anchor pattern)

Each of the six regions has ONE stroke-icon that appears twice: a small version
in its compass button (`.cp-icon` inside `.cp`, 15px) and a LARGE right-side
anchor in the section header (`.section-icon`, ~4rem). Keep the two SVGs
identical; both are colored `--forest` (the nav icon colour), styled with the
shared `fill:none;stroke:currentColor` rules.

Positioning rule (do not move the icon back next to the title):
- `.region-head` is `position:relative` and gets `padding-right` so the title
  never collides with the anchor.
- `.section-icon` is `position:absolute;top:0;right:0;pointer-events:none`.
- `.region-head h2` and `.region-intro` are `position:relative` so they paint
  above the anchor's stacking position.

Add a new region by copying one icon block; keep nav + header SVGs identical.

## Background river motif

A decorative full-page river runs behind all content. `index.html` holds a
`<div class="river">` containing only an empty `.river-svg`, and
`drawRiver()` in `script.js` **generates the whole thing from the live page
height** — so it always spans the document no matter how long the content
grows.

- `main` is `position:relative`; `.river` is `position:absolute;inset:0`,
  `z-index:0`, `pointer-events:none`. Regions paint above it via DOM order.
- `drawRiver()` builds control points that **meander to alternate sides at
  each `.region-head`** (so the path weaves across the page, passing the
  section headings), then emits two parallel smooth bezier paths
  (`.river-rail`, offset ±`gap` px).
- The trail **starts from the hero profile halo**: `pts[0]` is set to the
  bottom-centre of `#heroFigure`, so the railway visibly emerges from the
  portrait. (Do not relocate the start elsewhere; this is the deliberate
  anchor.)
- **Conifer "mini-forests" sampled ON the rail paths (pass 4)** replace the old
  tick marks / mixed silhouettes / grid rows / per-gap centreline columns: ONE
  silhouette only — a slim tall conifer (`.river-tree`, `fill:none` stroked path
  of three stacked tiers). The rounded deciduous and low bushy forms were
  **removed in pass 2** (not recognisable at 12–22px).
- **Positions come from sampling the rail itself, NOT fixed X/Y or a per-gap
  centreline offset.** `treeLocationsOn()` steps along each rendered `.river-rail`
  `<path>` by arc length using `getPointAtLength()` (every `SAMPLE_ARC` px) and
  adopts that point's (x, y) verbatim — so every tree sits ON the curve and
  follows its left-right drift (verified vs the rendered rail in screen space:
  avg ≈ 10px, max ≈ 22px). Gaps between tree runs come from only keeping samples
  whose y falls inside a free whitespace gap (max `MAX_PER_RUN` per run, min
  `MIN_TREE_STEP` between trees) → clusters form in inter-section gaps, never
  behind text (still 0 text overlaps).
- **Coordinate-space gotcha (important):** `getPointAtLength()` returns the
  path's **viewBox** coordinates; the `.river-svg` viewBox matches the river box
  but the river is offset by `svgTop` (the page header) from the document. The
  rail `d` is authored in viewBox space, so use the raw returned `y` as the tree's
  local `y` and compare it against the gap bands **in the same viewBox space —
  do NOT subtract `svgTop`.** (Earlier passes subtracted `svgTop` to get
  "document-local" coords, which parked trees ~`svgTop` px off the rendered
  line; the dend `getPointAtLength` coords already live in the space the path is
  drawn in.)
- Because `drawRiver()` runs once on load but node bubbles/cert content inject
  asynchronously via `fetch`, gap coordinates are stale the first time; `loadJson`
  must call `redrawRiver()` after injecting content or trees land on the old
  (pre-content) layout and overlap text.
- Deterministic PRNG (`prng(i,salt)`) sizes trees and picks which side of the
  rail (left/right) each sits on, via a small `NUDGE` so trunks are immediately
  beside/touching the line rather than dead-centre on it.
- `vector-effect:non-scaling-stroke` keeps the 1.4px/1px strokes crisp.
- Low opacity (.34 rails, .3-.32 trees) keeps it behind content.
- **No line-art markers** are drawn on the path, and none should be re-added:
  the vineyard, Duomo, Ferris wheel, horse and tram glyphs (and later the
  grape bunch, bottle+glass, Milan dome and Lisbon boat) were all tried and
  removed — recognizability at 26px was the recurring failure mode. Travel
  icons are intentionally absent from the river.
- Resizing re-runs `drawRiver()` (rAF-debounced).
- To re-tune: gap margin (`MARGIN` in `freeGaps`), arc-length sample step /
  cluster size / inter-tree step / sideways nudge (`SAMPLE_ARC`, `MAX_PER_RUN`,
  `MIN_TREE_STEP`, `NUDGE` in `drawRiver()`) and the `.river-rail` / `.river-tree`
  rules (style.css).

## Graduation backdrop — full-image + gentle opacity

`renderInlineGraduation()` injects `div.edu-bg` into `#education` from the
`graduation__graduation` attached group. To tune (style.css):
- `background-size:contain` shows the ENTIRE `graduation1.jpg` photo with no
  cropping; `background-position:right center` seats it on the RIGHT side of
  the region; `opacity:.4` keeps it a soft wash (was `cover`+`center 32%`+`.6`
  — showed only the top band).
- `#education{min-height:70vh}` guarantees vertical room so the contained
  photo has space to read and shows up clearly (raised from 46vh for more
  presence).
- The `:after` linear-gradient keeps header (top) and tail (bottom) legible
  while revealing the picture in the middle band.

## First-visit guide (pulsing hint, session-only)

`setupGuide()` in `script.js` adds a `.guide` element to `body` as a
**fixed-position, corner-anchored chip (bottom-left)** — `position:fixed;
left/bottom:clamp(.8rem,3vw,1.6rem); z-index:95`. Because it is truly fixed it
stays put during scroll: **no IntersectionObserver, no scroll/resize
tracking**, so it can never lag or collide with content. It appears ~900ms
after a fresh load (`history.scrollRestoration="manual"` so a refresh lands at
the top) and is **removed forever for the current session** on the first
pointerdown/click anywhere (including keyboard-triggered clicks). No
`localStorage` — a reload (new session) may show it again. This matches the
"session-only" rule for the discovered counter.

## Profile block — name (left), contact icons + "Show CV" (right column)

The `.hero-grid` is two columns, and the name and the portrait stack are kept
**independent on opposite sides** so the name reads as hero copy, not as a
caption:

- **Name** (`#summit-title`, the `hero-line` / `hero-sub` "Lia Schmid") sits in
  the **left column** (`.hero-copy`), above the lead paragraph — exactly where
  it was before it was briefly moved under the portrait. The right column does
  NOT duplicate it.
- **Right column** (`.hero-profile`) holds the portrait, then the **contact-icon
  row**, then the "Show CV" link — i.e. everything under the portrait, NOT above
  the lede text.

- `.hero-profile` is a centered column (`text-align:center`) under the `.hero-figure`.
- **Contact icons** (`.contact-row`): a row of three circular links — Email
  (`mailto:`), Phone (`tel:`), LinkedIn — built from the `CONTACT` object in
  `script.js` (edit the URLs/handles there). They are simple monochrome stroke
  SVGs (`fill:none;stroke:currentColor`), matching the site's section-icon
  style. Each link has a matching `aria-label`.
- **"Show CV"** stays a quiet underlined text link (`<a class="cv-link">Show CV ↗</a>`,
  `docs/CV_2026_Research.pdf`, `target="_blank" rel="noopener"`) directly
  under the portrait (where the name used to be). It is NOT a button/pill
  (`padding` was removed) and is not
  placed above the lede — the portrait anchor keeps it as an implicit part of the
  identity block rather than a call-to-action.
- On mobile (`.hero-grid` single column) `.hero-profile{order:-1}` so the
  portrait block stacks on top.

## Landmark bubble colour — done-state only

Notes/bubbles pick up colour from the shared `is-done` dynamic logic. Do NOT
hard-code a per-node colour (e.g. a green `.node-dot` for a "rare" class forced
the bubble green even before completion). The neutral default (`--clay`) +
the existing `.is-done` (`--moss`) transition is the single source of truth.

## Region rhythm

Inter-block spacing is tightened: `--region-pad` is `3.4rem …` and `.region`
top margin is 0. Sections stay visually distinct via a hairline
`border-top:1px solid var(--line)` on every region except the first (hero).

## bg-box — low-opacity backdrop photo on a landmark

A landmark node can carry a faint background photo: add class `bg-box` and an
inline `style="background-image:url('…')"` (for static `[data-open]` nodes in
`index.html`), or set a `bg` field in `certificates.json` (for JS-rendered
`.vol-node`). CSS layers a translucent paper-colour overlay (`::after`) over
the image so text stays readable. Used on: PHuSe Lab (`work_lab2.jpg`),
BrainCapNet (`work_eeg1.jpg`), Olympic volunteer (`volunteer_milanocortina3.jpg`),
Wizz Air volunteer (`volunteer_wizzair.jpg`).

## Volunteering — multiple docs under one role

A `volunteering[]` entry may now carry an optional `docs[]` array of extra certs
(each `{ role, detail, doc, docLabel }`). They render as extra tiles in the
role's panel and open together in one viewer carousel. This is how **I-HELP for
Milano Marathon 2026** was folded under the **Wizz Air Milano Marathon** entry
(no longer a standalone landmark) — a single `adjacentTo`-paired entry. It
replaces the older `adjacentTo` mechanism (removed from use).

## Education / certificates — ESWA dedup

The ESWA Fitness Teacher course keeps a single document
(`certificates/eswa-fitness-teacher.pdf`). The former second cert
(`docs/nutrition/Diploma_ESWA_LIA_SCHMID.pdf`) was a byte-different re-encode of
the SAME certificate (same ID `ESWA-IT-2026-01251`, same date) — removed from
`certificates.json` (the PDF file may stay on disk as an orphan).

## Non-obvious quirks

- `updateTotals()` runs before and after `loadJson()`; `loadImages()` is
  independent and fires at the end of `script.js`.
- Panel + viewer Escape handling shares one keydown listener; viewer takes
  priority (it can sit on top of an open panel).
- `certificates/thumbs/*` and `images/web/*` are generated assets — safe to
  regenerate; keep originals in place.
- The hero portrait is a plain rounded rectangle (no circle / dashed frame):
  `.hero-figure img` uses `border-radius:14px` and the `:before` halo frame
  was removed. Keep the `.hero-inner{flex:none;width:100%;max-width:1080px}`
  rule intact — it stops the hero collapsing (it previously shrank to 563px).
- The personal region (`#personal`) is the LAST region on the page; it has a
  compass entry ("Personal") and must stay last so the personal gallery closes
  the page.

## CV & contact — under the portrait

The hero no longer offers a forced `download` of the CV. Inside `.hero-profile`
on the right, directly under the portrait (the `Lia Schmid` name now lives in
the left `.hero-copy` column), there is a quiet underlined text link
(`.cv-link`) that opens `docs/CV_2026_Research.pdf` in a **new tab**
(`target="_blank" rel="noopener"`), mirroring the thesis `docLink` pattern,
followed by the contact-icon row. The portrait/contact/CV block is static HTML
(outside the JS-injected figure content) so it never gets overwritten by
`renderHeroImage()`. No pill/button styling on the CV link — it reads as an
implicit part of the identity block, not a call-to-action. Contact destinations
come from the `CONTACT` object in `script.js`.
