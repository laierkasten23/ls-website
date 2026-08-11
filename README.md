# Lia Schmid — Living Terrain

A small explorable personal site. Not a scrollable CV — a terrain of camps
(Research, Education, Nutrition, Community) where each landmark opens a detail
note. Plain HTML/CSS/JS, no frameworks, no build step.

- `index.html` — structure, regions, terrain backdrops
- `style.css` — design system (nature palette, responsive, accessible)
- `script.js` — terrain generation, content data, interactions
- `certificates.json` — credentials & volunteering data (edit here)
- `certificates/` — credential documents (PDFs)
- `volunteering/` — volunteer certificates (PDF/PNG)

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

### Add a new certificate

1. Drop the PDF into `certificates/` (keep names simple, no spaces).
2. Add an entry to the `"nutrition"` array:
   ```json
   {
     "title": "Title of the credential",
     "qualification": "Assistant Trainer · Nutrition",
     "issuer": "Accademia Italiana Fitness (AIF)",
     "date": "2026-08-11",
     "credentialId": "AIF n. 202279552",
     "doc": "certificates/my-file.pdf",
     "category": "Sports Nutrition",
     "note": "One-line description shown in the detail note."
   }
   ```

   Required: `title`, `date`, `doc`. The rest are optional.
3. Push. The new certificate appears as a landmark in the **Nutrition fields**
   region automatically.

### Update / remove

Edit the entry in `certificates.json` (dates, issuers, links) or delete the
whole entry. Remove the now-unused PDF from `certificates/` if you like.

### Volunteering

Same pattern in the `"volunteering"` array — fields are `role`, `detail`,
`location`, `period`, plus optional `doc` / `docLabel`.

---

## Notes

- The topographic terrain is generated procedurally in `script.js` — no image
  assets needed. If you ever drop images into `images/`, they are not used yet.
- The only external dependency is the Google Fonts stylesheet (Fraunces + Inter)
  in `index.html`.
- The **"Pit-lane note"** landmark in the summit section is a deliberate,
  small motorsport easter egg — keep it understated to preserve the tone.
- Re-run `git status` before pushing to avoid accidentally committing PDFs you
  didn't intend to publish.
