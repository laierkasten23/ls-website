# LESSONS — standing conventions & decisions

Log of conventions established in this project so future prompts can rely on
them instead of re-discovering.

## Images — naming convention

Filename: `images/<category>_<subject><N>.<ext>`

- `category` is the FIRST token (letters only, an index like `hobby1_` is OK):
  - `work` → Research range section
  - `hobby`, `graduation`, `personal` → The summit (about) section
  - `volunteer` → Community grove section
  - `profile` → hero portrait (any file literally named `profile<N>` becomes
    the hero; extra profile shots fold into an "On the Road" gallery group)
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

## Images — data file

`images/images.json` is GENERATED (do not hand-maintain):

```json
{ "hero": { "file": "profile1.png", "src": "images/web/profile1.jpg", "caption": "" },
  "groups": [ { "id": "work__lab", "category": "work", "section": "research",
                "title": "In the Lab", "caption": "", "count": 2,
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

## Non-obvious quirks

- `updateTotals()` runs before and after `loadJson()`; `loadImages()` is
  independent and fires at the end of `script.js`.
- Panel + viewer Escape handling shares one keydown listener; viewer takes
  priority (it can sit on top of an open panel).
- `certificates/thumbs/*` and `images/web/*` are generated assets — safe to
  regenerate; keep originals in place.
