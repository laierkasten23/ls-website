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
`script.js` must stay in sync if you rename a region.

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

---

## Adding photos (image gallery)

Photos render from `images/images.json`, which is **generated** — see the
naming convention in `LESSONS.md`. The short version:

1. Drop the file into `images/` named `category_subjectN.ext`
   (e.g. `work_lab3.JPG`, `volunteer_milanocortina5.JPG`).
   Categories: `work` → Research, `hobby` / `personal` / `graduation` →
   The summit, `volunteer` → Community. Files named `profile*` become the
   hero portrait.
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

The gallery renders as compact per-subject strips; tapping any shot opens the
shared media viewer (arrows, keyboard `←`/`→`, `Esc` to close, touch swipe,
click to zoom photos).

---

## Notes

- The topographic terrain is generated procedurally in `script.js` — no image
  assets needed for the backdrop itself.
- The only external dependency is the Google Fonts stylesheet (Fraunces + Inter)
  in `index.html`.
- The **"Pit-lane note"** landmark in the summit section is a deliberate,
  small motorsport easter egg — keep it understated to preserve the tone.
- Re-run `git status` before pushing to avoid accidentally committing PDFs or
  original photos you didn't intend to publish.
