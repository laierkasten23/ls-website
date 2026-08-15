/* =========================================================================
   Lia Schmid — Living Terrain
   Plain DOM JS. No build, no framework.
   ========================================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- */
  /*  Procedural topographic terrain                                   */
  /* ---------------------------------------------------------------- */

  /* A simple PRNG for deterministic terrain generation */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Generate points around a ring with a modulated radius */
  function ringPoints(cx, cy, baseR, mod, n, aspect) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var th = (2 * Math.PI * i) / n;
      var r = baseR * (1 + mod(th));
      pts.push({ x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) * aspect });
    }
    return pts;
  }

  /* Catmull–Rom spline through a closed set of points */
  function catmullClosed(pts) {
    var n = pts.length, d = "", i;
    for (i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i];
      var p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += (i === 0 ? "M" + p1.x + "," + p1.y : "") +
        "C" + c1x + "," + c1y + " " + c2x + "," + c2y + " " + p2.x + "," + p2.y;
    }
    return d + "Z";
  }

  /* Create a modulation function from a set of modes */
  function makeMod(modePhases) {
    return function (th) {
      var m = 0;
      for (var k = 0; k < modePhases.length; k++) {
        m += modePhases[k].a * Math.sin(modePhases[k].m * th + modePhases[k].p);
      }
      return m;
    };
  }

  /* Draw the terrain into a given element */
  function drawTerrain(el, seed) {
    if (!el) return;
    var W = 1200, H = 620, rng = mulberry32(seed || 1);
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.setAttribute("aria-hidden", "true");

    function hill(cx, cy, aspect, rings, classCycle) {
      var modes = [
        { a: 0.09 + rng() * 0.05, m: 2 + Math.floor(rng() * 2), p: rng() * 6.28 },
        { a: 0.06 + rng() * 0.04, m: 3 + Math.floor(rng() * 3), p: rng() * 6.28 },
        { a: 0.03 + rng() * 0.03, m: 7, p: rng() * 6.28 }
      ];
      var mod = makeMod(modes);
      rings.forEach(function (baseR, idx) {
        var pts = ringPoints(cx, cy, baseR, mod, 54, aspect);
        var path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", catmullClosed(pts));
        path.setAttribute("class", "cont " + classCycle[idx % classCycle.length]);
        svg.appendChild(path);
      });
    }

    hill(560, 300, 1.05, [150, 210, 280, 360, 450, 560, 680], ["t2", "t1", "t3", "t1", "t3", "t2", "t4"]);
    hill(960, 420, 0.9, [80, 150, 230, 320], ["t3", "t2", "t1", "t4"]);
    hill(180, 480, 0.8, [90, 160, 240], ["t3", "t2", "t4"]);

    var trace = document.createElementNS(svgNS, "path");
    trace.setAttribute("d", "M0,540 C240,500 520,590 800,540 S1120,500 1200,545");
    trace.setAttribute("class", "trace");
    svg.appendChild(trace);

    el.appendChild(svg);
  }

  document.querySelectorAll(".terrain[data-seed]").forEach(function (el) {
    drawTerrain(el, parseInt(el.getAttribute("data-seed"), 10));
  });

  /* ---------------------------------------------------------------- */
  /*  Background river — pass 4                                        */
  /*  A double "railway" line of smooth bezier curves that meanders     */
  /*  down the full page height, passing the section headings, with     */
  /*  conifer "mini-forest" clusters whose positions are sampled        */
  /*  directly OFF the rail <path> elements via getPointAtLength() so   */
  /*  they sit on the curve and follow its drift. Trees are kept only   */
  /*  where the rail passes through a whitespace gap between blocks,    */
  /*  never behind text. Generated from the live page height so they    */
  /*  always span the whole document.                                   */
  /* ---------------------------------------------------------------- */
  function drawRiver() {
    var river = document.querySelector(".river");
    var svg = river && river.querySelector(".river-svg");
    if (!river || !svg) return;
    var main = document.getElementById("main");
    var W = river.clientWidth || main.clientWidth;
    var H = river.clientHeight || main.scrollHeight;
    if (!W || !H) return;

    var svgNS = "http://www.w3.org/2000/svg";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.textContent = "";

    function round(v) { return Math.round(v * 10) / 10; }

    /* --- control points: meander to alternate sides at each heading ---
       The trail starts from the hero profile halo (bottom-centre of the
       portrait figure), so the railway visibly emerges from the portrait. */
    var haloEl = document.getElementById("heroFigure");
    var startX = W * 0.5, startY = 0;
    if (haloEl) {
      var hb = haloEl.getBoundingClientRect();
      startX = hb.left + hb.width / 2;
      startY = Math.max(0, hb.top + window.scrollY + hb.height * 0.92);
    }
    var pts = [{ x: startX, y: startY }];
    var left = W * 0.12, right = W * 0.88, side = 1;
    Array.prototype.forEach.call(main.querySelectorAll(".region-head"), function (h) {
      var r = h.getBoundingClientRect();
      var y = r.top + window.scrollY;
      if (y <= 0 || y >= H) return;
      pts.push({ x: side === 1 ? right : left, y: y });
      side = -side;
    });
    if (pts[pts.length - 1].y < H - 40) pts.push({ x: W * 0.5, y: H });

    /* --- Catmull-Rom path string for the centreline (rails are ±offset
       copies of these control points) --- */
    function pathString(points) {
      var d = "M" + round(points[0].x) + "," + round(points[0].y);
      for (var i = 0; i < points.length - 1; i++) {
        var p0 = points[i - 1] || points[0], p1 = points[i],
            p2 = points[i + 1], p3 = points[i + 2] || p2;
        var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
        var c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        d += " C" + round(c1x) + "," + round(c1y) + " " + round(c2x) + "," + round(c2y) +
          " " + round(p2.x) + "," + round(p2.y);
      }
      return d;
    }
    var gap = Math.max(10, Math.min(16, W * 0.012));

    /* --- two parallel rails (offset copies of the control points) --- */
    var railEls = [];
    [gap, -gap].forEach(function (o, i) {
      var off = pts.map(function (p) { return { x: p.x + o, y: p.y }; });
      var p = document.createElementNS(svgNS, "path");
      p.setAttribute("class", "river-rail");
      p.setAttribute("d", pathString(off));
      svg.appendChild(p);
      railEls.push(p);
    });

    /* --- conifer "mini-forests" sampled directly ON the rail paths ---
       ONE silhouette — a slim tall conifer (stacked tiers). Positions are NOT
       hand-set X/Y or per-gap centreline constants: each tree's (x,y) is a point
       sampled straight off one of the rendered rail <path> elements via
       getPointAtLength() (equally along the path's arc length), so trees track
       the curve's own left-right drift and sit right on / immediately beside it.
       We step down each rail and keep consecutive samples whose y falls inside a
       free whitespace gap (measured from every content block's y-range, expanded
       by a safety margin, aligned to SVG-local space) → clusters form only in
       inter-section gaps, never behind text. A small perpendicular nudge widens
       the "forest" so the line runs through/beside the trunks. An inter-cluster
       min gap stops the page being one continuous tree line. Deterministic PRNG
       keeps positions stable across redraws. */
    function prng(i, salt) {
      var x = Math.sin(i * 127.1 + (salt || 0) * 311.7) * 43758.5453;
      return x - Math.floor(x);
    }
    function coniferPath(x, y, s) {
      var w = s * 0.3, tiers = 3, d = "";
      for (var t = 0; t < tiers; t++) {
        var base = y - t * s * 0.26, tip = y - (t + 0.8) * s * 0.34;
        var half = w * (1 - t * 0.24);
        d += " M" + round(x - half) + "," + round(base) +
             " L" + round(x) + "," + round(tip) +
             " L" + round(x + half) + "," + round(base);
      }
      return d;
    }
    /* invert: is a given y (SVG-local) inside any free gap? gaps sorted asc. */
    function inGap(gaps, y) {
      for (var i = 0; i < gaps.length; i++) {
        if (y < gaps[i].top) return false;         /* gaps are sorted: no later one can contain it */
        if (y <= gaps[i].bot) return true;
      }
      return false;
    }

    /* Build the list of vertical bands that are FREE of text content.
       Occupied = every content block's [top, bottom] (absolute), expanded by a
       margin so trees keep clear of text. The gaps are the complement of those
       occupied intervals across the page. Coordinates are converted to the
       SAME local space as the SVG (the river's top) so they line up with the
       tree positions. */
    var svgTop = river.getBoundingClientRect().top + window.scrollY;
    function freeGaps() {
      var occ = [];
      var SELECTORS = ".region-head,.region-intro,.nodes,.node,.gallery," +
        ".gallery-group,.hero-copy,.hero-profile,.cert-note,.foot,.eyebrow," +
        ".hero-title,.hero-lede,.hero-actions,.hero-hint,.name-cv,.contact-row";
      var MARGIN = 40;
      Array.prototype.forEach.call(main.querySelectorAll(SELECTORS), function (el) {
        var r = el.getBoundingClientRect();
        if (!r.height) return;
        var top = r.top + window.scrollY - svgTop - MARGIN;
        var bot = r.bottom + window.scrollY - svgTop + MARGIN;
        occ.push({ top: Math.max(0, top), bot: bot });
      });
      occ.sort(function (a, b) { return a.top - b.top; });
      /* merge overlapping intervals */
      var merged = [];
      occ.forEach(function (o) {
        if (!merged.length || o.top > merged[merged.length - 1].bot) {
          merged.push({ top: o.top, bot: o.bot });
        } else if (o.bot > merged[merged.length - 1].bot) {
          merged[merged.length - 1].bot = o.bot;
        }
      });
      /* complement → free bands */
      var last = 0, gaps = [];
      merged.forEach(function (m) {
        if (m.top > last) gaps.push({ top: last, bot: m.top });
        last = Math.max(last, m.bot);
      });
      if (last < H) gaps.push({ top: last, bot: H });
      return gaps;
    }

    var gaps = freeGaps();

    /* Walk each rail's actual <path> and place trees ON it. Sampling by arc
       length (getPointAtLength) means tree (x,y) follows the curve's own
       drift. getPointAtLength() returns the path's viewBox coords, which
       match the space freeGaps() produced (doc − svgTop) — keep y raw, do NOT
       subtract svgTop again, or trees sit ~svgTop px off the rendered line.
       Only samples whose y falls inside a free gap become trees: up to a small
       max per run, with an inter-tree step so they read as a "mini forest"
       cluster rather than one continuous line. */
    var SAMPLE_ARC = 10;          /* arc-length steps while walking the rail (px) */
    var MAX_PER_RUN = 5;          /* trees per cluster before forcing a break */
    var MIN_TREE_STEP = 18;       /* min y gap between consecutive trees in a run */
    var NUDGE = 9;                /* sideways spread so the line runs through/beside */

    function treeLocationsOn(el) {
      var out = [], L = el.getTotalLength();
      var n = Math.max(2, Math.ceil(L / SAMPLE_ARC));
      var lastY = -1e9, runCount = 0;
      for (var i = 0; i <= n; i++) {
        var p = el.getPointAtLength(L * (i / n));
        var y = p.y, x = p.x;                 /* rail's own (viewBox) coordinate */
        if (!inGap(gaps, y)) { lastY = -1e9; runCount = 0; continue; }
        if (y - lastY < MIN_TREE_STEP) continue;
        if (runCount >= MAX_PER_RUN) { runCount = 0; lastY = -1e9; continue; }
        out.push({ x: x, y: y });
        lastY = y; runCount++;
      }
      return out;
    }

    var allTrees = [];
    for (var ri = 0; ri < railEls.length; ri++) {
      allTrees = allTrees.concat(treeLocationsOn(railEls[ri]).map(function (t) {
        t.rail = ri; return t;
      }));
    }
    /* deterministic ordering + sideways nudge off the rail so trunks sit
       immediately beside/touching the line instead of dead-centre on it */
    for (var ti = 0; ti < allTrees.length; ti++) {
      var t = allTrees[ti];
      var side = prng(ti, 2) > 0.5 ? 1 : -1;
      var s = 13 + prng(ti, 4) * 9;                       /* size 13–22 */
      /* keep the whole tree (tip rises ~s above base) inside the gap it landed in */
      var g = null;
      for (var k = 0; k < gaps.length; k++) if (t.y >= gaps[k].top && t.y <= gaps[k].bot) { g = gaps[k]; break; }
      var treeY = t.y;
      if (g) {
        var minTop = g.top + s;                           /* top of canopy ≥ gap top */
        var maxBot = g.bot;
        if (maxBot < minTop) continue;                    /* gap too short for this size */
        treeY = Math.max(minTop, Math.min(maxBot, t.y));
      }
      var treeX = t.x + side * NUDGE + side * prng(ti, 6) * 4;
      var tree = document.createElementNS(svgNS, "path");
      tree.setAttribute("class", "river-tree");
      tree.setAttribute("d", coniferPath(treeX, treeY, s));
      svg.appendChild(tree);
    }
  }
  drawRiver();
  var riverRaf = null;
  function redrawRiver() {
    if (riverRaf) return;
    riverRaf = requestAnimationFrame(function () { riverRaf = null; drawRiver(); });
  }
  window.addEventListener("resize", redrawRiver);

  /* ---------------------------------------------------------------- */
  /*  Contact (edit socials/URLs here)                                 */
  /* ---------------------------------------------------------------- */
  var CONTACT = {
    email: "lia.schmid98@gmx.de",
    phone: "+49 176 245 992 71",
    phoneTel: "+4917624599271",
    socials: [
      { label: "Lia Schmid", glyph: "linkedin", url: "https://www.linkedin.com/in/lia-schmid-54bb4723a/" }
    ]
  };

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */
  var H = {
    pill: function (t, strong) { return '<span class="pill' + (strong ? " strong" : "") + '">' + t + "</span>"; },
    bullets: function (arr) {
      return "<ul>" + arr.map(function (b) { return "<li>" + b + "</li>"; }).join("") + "</ul>";
    },
    chips: function (arr) { return '<div class="skills">' + arr.map(function (c) { return '<span class="chip">' + c + "</span>"; }).join("") + "</div>"; },
    meta: function (arr) { return '<div class="panel-meta">' + arr.join("") + "</div>"; },
    stacks: function (arr) {
      return arr.map(function (s) {
        return '<p class="stk-label"><b>' + s.label + "</b></p>" + H.chips(s.items);
      }).join("");
    }
  };

  var DATA = {
    /* ---------- ABOUT ---------- */
    about_bio: {
      kicker: "The summit",
      title: "How I think",
      sub: "Technology with a human return address",
      body:
        "<p>I'm a researcher and builder driven by a simple question: can technology quietly raise the quality of everyday life? I work where two worlds meet — decoding brain activity with machine learning, and supporting performance through nutrition.</p>" +
        "<p>An interdisciplinary path taught me to borrow ideas across fields. I thrive in enthusiastic teams where people learn from each other, keeping social impact at the centre of technical work.</p>",
      meta: H.meta([H.pill("BCI / EEG research"), H.pill("Sports nutrition"), H.pill("Science communication")]),
      stacks: [
        { label: "Languages", items: ["German · native", "Portuguese · native", "English · fluent", "Italian · fluent", "Spanish · basics", "French · basics"] },
        { label: "Programming", items: ["Python", "R", "MATLAB", "bash", "Java"] },
        { label: "Data & tooling", items: ["MySQL", "git", "VS Code", "Singularity"] }
      ]
    },
    about_interests: {
      kicker: "Off the clock",
      title: "The pause between sessions",
      sub: "Languages, cultures, the outdoors",
      body:
        "<p>To disconnect I hike in nature and spend time with family and loved ones. I love learning new languages and exploring different cultures. A habit that started with semesters abroad in Lisbon and Milan and never really stopped.</p>",
      meta: H.meta([H.pill("Hiking"), H.pill("Languages"), H.pill("Travel"), H.pill("Family")]),
    },
    about_contact: {
      kicker: "Reach out",
      title: "Let's get in touch",
      sub: "I'm happy to hear from you",
      body:
        "<p>Whether you want to discuss a research idea, a collaboration, or just say hi — I'm happy to hear from you.</p>",
      contact: true
    },

    about_easter: {
      kicker: "Roots",
      title: "Two tongues, one home",
      sub: "Why adapting feels natural",
      body:
        "<p>Home is the Pfalz — vineyards on one side, and on the other, a childhood spent between two languages. I grew up bilingual, which meant switching between worlds was never a big event, just something you did. I've carried that with me, and it's part of why relocating or traveling for work doesn't faze me.</p>" +
        "<p>(You found a hidden note. That's the kind of detail I hope a careful visitor notices — in a site as in code.)</p>",
      meta: H.meta([H.pill("easter egg", true)])
    },

    /* ---------- RESEARCH ---------- */
    work_phuse: {
      kicker: "Research range",
      title: "Research Fellow — Brain–Computer Interfaces (EEG)",
      sub: "PHuSe Lab · Perceptual Computing & Human Sensing Lab, University of Milan",
      body:
        "<p>Conducting research on EEG-based brain–computer interfaces and building machine-learning models that decode brain signals and user intent.</p>",
      stacks: [{ label: "Workstreams", items: ["EEG BCI research", "Brain-signal decoding", "ML model evaluation", "Cross-lab coordination"] }],
      meta: H.meta([H.pill("Since 04/2025", true), H.pill("Milan, Italy"), H.pill("current")])
    },
    proj_brain: {
      kicker: "Research range",
      title: "BrainCapNet — an EEG brain–computer interface",
      sub: "From raw signal to user intent",
      body:
        "<p>A BCI solution built around acquisition and analysis of EEG signals, developed with a team in Milan.</p>",
      bullets: [
        "Developed the DVAE model, integrating CBRAMOD as a feature extractor with a multi-branch U-Net-like bottleneck cascade for spatial and temporal dimensions.",
        "Running ongoing data collection for a new P300 dataset in healthy adults.",
        "Engineered an online streaming analyser for real-time EEG buffering, filtering and predictive classification.",
        "Co-developed and field-tested three neuro-rehabilitative games via PsychoPy with dotdotdot and Fondazione TOG — giving locked-in and neurodegenerative children a channel to communicate."
      ],
      meta: H.meta([H.pill("01–11/2024", true), H.pill("Milan, Italy")])
    },
    work_tutor: {
      kicker: "Research range",
      title: "Tutor — Computer Programming & Database Systems",
      sub: "Catholic University of the Sacred Heart, Milan",
      body:
        "<p>Delivering the Python and database-systems practicum for the M.Sc. Data Science & AI for Business — designed so the whole pipeline, from code to a well-shaped query, lands quickly.</p>",
      stacks: [{ label: "Topics", items: ["Python programming", "DBMS — MySQL, DBeaver"] }],
      meta: H.meta([H.pill("02-03/2026", true)])
    },
    proj_thesis: {
      kicker: "Research range",
      title: "Automatic segmentation of the choroid plexus",
      sub: "Master's thesis — a novel T1×FLAIR ground truth",
      body:
        "<p>Working with 3D MRI of patients with neurodegenerative conditions to segment the choroid plexus, introducing the T1×FLAIR product as a ground-truth modality when contrast-enhanced T1w imaging isn't available.</p>",
      bullets: [
        "Created and validated the T1×FLAIR modality as a new segmentation ground truth.",
        "Designed and trained ML models tuned for clinical applicability.",
        "Cross-institutional collaboration — Heidelberg, University of Milan and Policlinico di Milano.",
        "Skills: MRI preprocessing, manual segmentation, neuroimaging, PyTorch & MONAI."
      ],
      meta: H.meta([H.pill("01–11/2024", true), H.pill("M.Sc. thesis", true), H.pill("final grade 1,1")]),
      docLink: { url: "docs/Schmid_Lia_Phuse_Thesis_2024.pdf", label: "Read the thesis PDF" }
    },
    earlier: {
      kicker: "Research range",
      title: "Earlier terrain",
      sub: "Labs, teaching and first signals",
      body:
        "<p>A thread of earlier posts along the way — from marine morphology to the human visual cortex.</p>",
      records: [
        { where: "Engineering Math & Computing Lab — Univ. of Heidelberg", what: "Research Assistant", when: "05/2023 – 02/2024", note: "Co-organised an analysis project on morphological structures (e.g. fish), set up Singularity containers on the university server." },
        { where: "Vision & Cognition Lab, Werner Reichardt CIN — Tübingen", what: "Research Internship / Assistant", when: "03–12/2020", note: "Compared hierarchical processing in the human visual cortex to layers of CNNs using an fMRI experiment with neural style transfer." },
        { where: "University project — Tübingen", what: "Selective Temporal Attention (EEG)", when: "05–09/2019", note: "Measured event-related potentials with a cap-based EEG system (Hillyard paradigm); found spatial and temporal attention modulate the N1 component." },
        { where: "Eberhard Karls University", what: "Tutor in Mathematics for Computer Science", when: "10–12/2020", note: "Covered calculus, linear algebra, optimisation and discrete mathematics for freshmen." }
      ],
      meta: H.meta([H.pill("earlier research"), H.pill("teaching")])
    },
    publications: {
      kicker: "Research range",
      title: "Publications",
      sub: "Six records in the journal log",
      prologue: "<p>Peer-reviewed and submitted work — most recently around subject-independent EEG learning and explainable stress detection.</p>",
      pubs: [
        { authors: "Ghezzi, O., Schmid, L., D'Amelio, A., Boccignone, G., Lanzarotti, R.", title: "Where the Eyes Move, the Brain Flows: Brain Decoding During Active Reading from Travelling-Wave Geometry", venue: "IEEE TCDS 2026" },
        { authors: "Schmid, L., Burger, J., D'Amelio, Lanzarotti, R.", title: "Investigating Foundation Models, Disentanglement and Latent Alignment for Subject-Independent EEG Learning", venue: "ICMI 2026" },
        { authors: "Schmid, L., Facchi, G., Agnelli, F., Bocca, G., Sacchi, L., Lanzarotti, R.", title: "Choroid Plexus Segmentation in MRI Using the Novel T1×FLAIR Modality and PSU-Mamba: Projective Scan U-Mamba Approach", venue: "Pattern Recognition Letters, Elsevier (2025)" },
        { authors: "Sacchi, L., Arcaro, M., Bocca, G., Schmid, L., et al.", title: "Klotho levels in the cerebrospinal fluid are associated with choroid plexus enlargement in neurodegeneration: a preliminary study", venue: "Frontiers in Aging Neuroscience" },
        { authors: "Agnelli, F., Ghezzi, O., Blandano, G., Burger, J., Facchi, G., Schmid, L.", title: "Enhancing 3D Face Analysis Using Graph Convolutional Networks with Kernel-Attentive Filters", venue: "submitted, ACM/SIGAPP SAC 2025" },
        { authors: "Agnelli, F., Blandano, G., Burger, J., D'Amelio, A., Facchi, G., Ghezzi, O., ... & Schmid, L.", title: "EEG-Based Mental Stress Detection: A Comparative and Explainable Study Across Tasks and Subjects", venue: "ICIAP 2025" }
      ],
      meta: H.meta([H.pill("6 records")])
    }
  };

  /* ---------- EDUCATION ---------- */
  DATA.edu_msc = {
    kicker: "Education valley",
    title: "M.Sc. Scientific Computing",
    sub: "Ruprecht-Karls-Universität Heidelberg · Germany",
    body:
      "<p>Final grade <b>1,1</b>. Focus on the boundary between numerical methods, machine learning and application-driven research.</p>",
    bullets: [
      "Thesis: Automatic Segmentation of Choroid Plexus in Neurodegenerative Diseases (collaboration with University of Milan, Policlinico di Milano and Heidelberg).",
      "Year abroad at Università degli Studi di Milano within the 4EU+ Erasmus programme (09/2022 – 09/2023)."
    ],
    stacks: [{ label: "Skills", items: ["Machine learning", "Neuroimaging", "PyTorch", "MONAI", "Python"] }],
    meta: H.meta([H.pill("04/2021 – 11/2024", true), H.pill("grade 1,1")]),
    docLink: { url: "docs/Schmid_Lia_Phuse_Thesis_2024.pdf", label: "Read the thesis PDF" }
  };
  DATA.edu_bsc = {
    kicker: "Education valley",
    title: "B.Sc. Cognitive Science",
    sub: "Eberhard Karls Universität Tübingen · Germany",
    body:
      "<p>Final grade <b>1,47</b>. An interdisciplinary degree where computer science, neuroscience and psychology first met.</p>",
    bullets: [
      "Semester abroad at Universidade Nova de Lisboa, Portugal (Erasmus, 09/2019 – 01/2020).",
      "Deep dives into EEG methods, statistics and computational modelling."
    ],
    stacks: [{ label: "Skills", items: ["Neuroscience", "Statistics", "Python", "MATLAB", "Experimental design"] }],
    meta: H.meta([H.pill("10/2017 – 04/2021", true), H.pill("grade 1,47")])
  };
  DATA.edu_abroad = {
    kicker: "Education valley",
    title: "Study abroad",
    sub: "Two Erasmus years, two languages added",
    body:
      "<p>Learning is easiest when the environment changes. Both stays taught me more than the courses did.</p>",
    bullets: [
      "4EU+ Erasmus — Università degli Studi di Milano, a full year (09/2022 – 09/2023) that became home.",
      "Erasmus — Universidade Nova de Lisboa, Portugal (09/2019 – 01/2020)."
    ],
    meta: H.meta([H.pill("Milan"), H.pill("Lisbon"), H.pill("Erasmus / 4EU+")])
  };
  DATA.edu_teaching = {
    kicker: "Education valley",
    title: "Teaching & counselling",
    sub: "Tutoring and student support along the way",
    body:
      "<p>I like making technical things feel reachable for others — it sharpens how I explain my own work too.</p>",
    bullets: [
      "Tutor in Mathematics for Computer Science — preparation course for freshmen, building both foundations and connections (10–12/2020).",
      "Student counselling for Cognitive Science — peer-to-peer guidance on course selection, schedules, exams, housing and funding (10/2018 – 03/2021)."
    ],
    meta: H.meta([H.pill("Tübingen")])
  };

  /* ---------------------------------------------------------------- */
  /*  Panel render                                                     */
  /* ---------------------------------------------------------------- */
  var panelBackdrop = document.getElementById("panelBackdrop");
  var panelBody = document.getElementById("panelBody");
  var panelClose = document.getElementById("panelClose");
  var lastFocused = null;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderContact() {
    var socials = CONTACT.socials.map(function (s) {
      var inner = '<span class="glyph" aria-hidden="true">' +
        (s.glyph === "instagram"
          ? '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5.5-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M6.5 8.5v11h-3v-11h3zm8.8-3.5c2.6 0 4.7 1.9 4.7 4.4V19.5h-3v-7.4c0-1.2-.8-2-2-2-1 0-1.7.6-1.7 1.6v7.8h-3V8.5h3v1c.5-.9 1.4-1.5 2-1.5zM6.5 4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>') +
        "</span><span>" + esc(s.label) + "</span>";
      if (s.url) return '<a class="chip social-link" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + inner + "</a>";
      return '<span class="chip" title="Profile URL not set yet">' + inner + "</span>";
    }).join("");

    return "<div class='panel-actions'>" +
      '<a class="cta" href="mailto:' + esc(CONTACT.email) + '">Write an email</a>' +
      '<a class="cta cta-quiet" href="tel:' + esc(CONTACT.phoneTel) + '">' + esc(CONTACT.phone) + "</a>" +
      "</div><div class='skills' style='margin-top:.9rem'>" + socials + "</div>";
  }

  function buildPanel(item) {
    var html = "";
    if (item.kicker) html += '<p class="panel-kicker">' + esc(item.kicker) + "</p>";
    html += "<h3>" + esc(item.title) + "</h3>";
    if (item.sub) html += '<p class="panel-sub">' + esc(item.sub) + "</p>";
    if (item.meta) html += item.meta;
    if (item.body) html += item.body;
    if (item.bullets) html += H.bullets(item.bullets);
    if (item.prologue) html += item.prologue;
    if (item.pubs) {
      html += item.pubs.map(function (p) {
        return '<div class="lead-record"><p class="pub">"' + esc(p.title) + '"</p>' +
          '<p class="pub-authors">' + esc(p.authors) + "</p>" +
          '<p class="pub-venue">' + esc(p.venue) + "</p></div>";
      }).join("");
    }
    if (item.records) {
      html += item.records.map(function (r) {
        return '<div class="lead-record"><p class="pub"><b>' + esc(r.what) + "</b> · " + esc(r.where) + "</p>" +
          '<p class="pub-authors">' + esc(r.when) + "</p>" +
          '<p class="pub-venue">' + esc(r.note) + "</p></div>";
      }).join("");
    }
    if (item.stacks) html += H.stacks(item.stacks);
    if (item.contact) html += renderContact();
    if (item.docLink) html += '<div class="panel-actions"><a class="cta" href="' + esc(item.docLink.url) + '" target="_blank" rel="noopener">' + esc(item.docLink.label) + ' ↗</a></div>';
    return html;
  }

  /* ---------------------------------------------------------------- */
  /*  Discovered / visited tracking (real persistent state)            */
  /* ---------------------------------------------------------------- */
  var discovered = {};

  var foundCount = document.getElementById("foundCount");
  var foundTotal = document.getElementById("foundTotal");

  function markDiscovered(key) {
    discovered[key] = true; updateCounter();
  }
  function updateCounter() {
    if (foundCount) foundCount.textContent = Object.keys(discovered).length;
  }
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._h); t._h = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function applyVisited() {
    document.querySelectorAll("[data-open]").forEach(function (el) {
      if (discovered[el.getAttribute("data-open")]) el.classList.add("is-done");
    });
    document.querySelectorAll(".course-node").forEach(function (el) {
      if (discovered["course_" + el.getAttribute("data-cid")]) el.classList.add("is-done");
    });
    var vols = document.querySelectorAll(".vol-node");
    vols.forEach(function (el, i) {
      if (discovered["vol_" + i]) el.classList.add("is-done");
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Open / close panel                                               */
  /* ---------------------------------------------------------------- */
  /* ---- scroll lock (shared by panel + viewer) ---- */
  var scrollLock = 0;
  function lockScroll() {
    scrollLock++;
    document.body.style.overflow = "hidden";
  }
  function unlockScroll() {
    scrollLock = Math.max(0, scrollLock - 1);
    if (!scrollLock) document.body.style.overflow = "";
  }

  function openPanel(html, focusEl) {
    panelBody.innerHTML = html;
    panelBackdrop.hidden = false;
    panelBackdrop.setAttribute("aria-hidden", "false");
    lockScroll();
    lastFocused = focusEl || document.activeElement;
    setTimeout(function () {
      var closeBtn = panelClose;
      closeBtn.focus();
      closeBtn.setAttribute("aria-label", "Close details");
    }, 40);
  }
  function closePanel(focusBack) {
    panelBackdrop.hidden = true;
    panelBackdrop.setAttribute("aria-hidden", "true");
    unlockScroll();
    try { panelBody.innerHTML = ""; } catch (e) {}
    if (focusBack && lastFocused && lastFocused.focus) { lastFocused.focus(); lastFocused.classList.add("is-new"); }
  }

  document.querySelectorAll("[data-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-open");
      markDiscovered(key);
      btn.classList.add("is-done");
      openPanel(buildPanel(DATA[key]) + attachedGalleryHTML(key), btn);
    });
  });
  panelClose.addEventListener("click", function () { closePanel(true); });
  panelBackdrop.addEventListener("click", function (e) {
    if (e.target === panelBackdrop) closePanel(true);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!viewerEl.hidden) { closeViewer(true); return; }
      if (!panelBackdrop.hidden) { closePanel(true); return; }
    }
    if (!viewerEl.hidden && viewer.items.length > 1) {
      if (e.key === "ArrowLeft") { viewerGoto(viewer.index - 1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { viewerGoto(viewer.index + 1); e.preventDefault(); }
    }
  });

  /* ---------------------------------------------------------------- */
  /*  Shared media viewer — photo lightbox + certificate carousel      */
  /* ---------------------------------------------------------------- */
  var viewerEl = document.getElementById("viewer");
  var viewerStage = document.getElementById("viewerStage");
  var viewerClose = document.getElementById("viewerClose");
  var viewerPrev = document.getElementById("viewerPrev");
  var viewerNext = document.getElementById("viewerNext");
  var viewerZoom = document.getElementById("viewerZoom");
  var viewerOpen = document.getElementById("viewerOpen");
  var viewerTitle = document.getElementById("viewerTitle");
  var viewerCounter = document.getElementById("viewerCounter");
  var viewerMeta = document.getElementById("viewerMeta");

  var viewer = { items: [], index: 0, open: false, zoom: false, focusEl: null };

  function kindOf(src) { return /\.pdf($|\?)/i.test(src) ? "pdf" : "img"; }
  function thumbFor(doc) {
    var base = String(doc).split("/").pop().replace(/\.pdf$/i, "");
    return "certificates/thumbs/" + encodeURIComponent(base) + ".png";
  }
  function docThumb(doc) { return kindOf(doc) === "pdf" ? thumbFor(doc) : doc; }
  function certItem(ct) {
    return { src: ct.doc, title: ct.title || "Certificate", caption: ct.note || "", kind: "pdf" };
  }

  function viewerRender() {
    var item = viewer.items[viewer.index];
    if (!item) return;
    viewer.zoom = false;
    viewerStage.classList.remove("zoomed");
    viewerZoom.textContent = "＋";
    if (item.kind === "pdf") {
      viewerStage.innerHTML = '<iframe src="' + esc(item.src) + '" title="' + esc(item.title) + '" loading="lazy"></iframe>';
      viewerZoom.hidden = true;
      viewerOpen.hidden = false;
      viewerOpen.href = item.src;
    } else {
      viewerStage.innerHTML = '<img src="' + esc(item.src) + '" alt="' + esc(item.caption || item.title) + '" draggable="false">';
      viewerZoom.hidden = false;
      viewerOpen.hidden = true;
    }
    viewerTitle.textContent = item.title;
    if (item.caption) viewerTitle.textContent += " — " + item.caption;
    viewerMeta.hidden = false;
    if (viewer.items.length > 1) {
      viewerCounter.textContent = (viewer.index + 1) + " / " + viewer.items.length;
      viewerPrev.hidden = false;
      viewerNext.hidden = false;
      viewerPrev.disabled = viewer.index === 0;
      viewerNext.disabled = viewer.index === viewer.items.length - 1;
    } else {
      viewerCounter.textContent = "";
      viewerPrev.hidden = true;
      viewerNext.hidden = true;
    }
  }

  function viewerGoto(i) {
    if (!viewer.items.length) return;
    var n = viewer.items.length;
    viewer.index = ((i % n) + n) % n;
    viewerRender();
    viewerStage.focus({ preventScroll: true });
  }

  function openViewer(items, index, focusEl) {
    if (!items || !items.length) return;
    viewer.items = items;
    viewer.index = Math.max(0, Math.min(index || 0, items.length - 1));
    viewer.focusEl = focusEl || document.activeElement;
    viewer.open = true;
    viewerEl.hidden = false;
    viewerEl.setAttribute("aria-hidden", "false");
    lockScroll();
    viewerRender();
    setTimeout(function () { viewerClose.focus(); }, 30);
  }
  function closeViewer(focusBack) {
    if (!viewer.open) return;
    viewer.open = false;
    viewerEl.hidden = true;
    viewerEl.setAttribute("aria-hidden", "true");
    viewerStage.innerHTML = "";
    viewerStage.classList.remove("zoomed");
    unlockScroll();
    if (focusBack && viewer.focusEl && viewer.focusEl.focus) {
      viewer.focusEl.focus();
      viewer.focusEl.classList.add("is-new");
    }
  }

  viewerClose.addEventListener("click", function () { closeViewer(true); });
  viewerPrev.addEventListener("click", function () { viewerGoto(viewer.index - 1); });
  viewerNext.addEventListener("click", function () { viewerGoto(viewer.index + 1); });
  viewerZoom.addEventListener("click", function () { toggleZoom(); });
  viewerEl.addEventListener("click", function (e) {
    if (e.target === viewerEl) closeViewer(true);
  });
  viewerStage.addEventListener("click", function (e) {
    if (e.target && e.target.tagName === "IMG") toggleZoom();
  });
  function toggleZoom() {
    if (viewer.items[viewer.index] && viewer.items[viewer.index].kind === "pdf") return;
    viewer.zoom = !viewer.zoom;
    viewerStage.classList.toggle("zoomed", viewer.zoom);
    viewerZoom.textContent = viewer.zoom ? "−" : "＋";
  }
  var touchX = null;
  viewerStage.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  viewerStage.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 40 && viewer.items.length > 1) viewerGoto(viewer.index + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------------------------------------------------------------- */
  /*  Certificates + volunteering (rendered from certificates.json)    */
  /* ---------------------------------------------------------------- */
  function fmtDate(d) {
    if (!d) return "";
    var p = String(d).split("-");
    if (p.length !== 3) return d;
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[parseInt(p[1], 10) - 1] + " " + parseInt(p[2], 10) + ", " + p[0];
  }

  function countCerts(c) {
    var n = 0;
    if (c.overall) n++;
    if (c.modules) c.modules.forEach(function (m) { n += m.certs ? m.certs.length : 0; });
    if (c.certs) n += c.certs.length;
    return n;
  }

  function courseNode(c) {
    return '<button class="node course-node" data-key="course_' + esc(c.id) + '" data-cid="' + esc(c.id) + '">' +
      '<span class="node-dot" aria-hidden="true"></span>' +
      '<span class="node-title">' + esc(c.title) + "</span>" +
      '<span class="node-tag">' + esc(c.sub || "") + "</span></button>";
  }

  function certTileHTML(ct, listName, cid, i) {
    return '<button class="cert-tile" data-cert="1" data-list="' + esc(listName) + '" data-cid="' + esc(cid) + '" data-idx="' + i + '">' +
      '<span class="cert-thumb"><img src="' + esc(docThumb(ct.doc)) + '" alt="" loading="lazy" onerror="this.closest(\'.cert-thumb\').classList.add(\'no-thumb\')"></span>' +
      '<span class="cert-tile-title">' + esc(ct.title || "Certificate") + "</span></button>";
  }

  function openCoursePanel(c, el) {
    var html =
      '<p class="panel-kicker">Credential · course</p>' +
      "<h3>" + esc(c.title) + "</h3>" +
      (c.sub ? '<p class="panel-sub">' + esc(c.sub) + "</p>" : "") +
      H.meta([c.issuer ? H.pill(esc(c.issuer)) : "", H.pill(String(countCerts(c)) + " documents", true)]);

    if (c.overall) {
      var o = c.overall;
      html += '<div class="overall-cert">' +
        '<p class="overall-kicker">Course certificate</p>' +
        H.meta([
          o.qualification ? H.pill(esc(o.qualification)) : "",
          o.date ? H.pill(esc(fmtDate(o.date)), true) : "",
          o.credentialId ? H.pill(esc(o.credentialId)) : ""
        ]) +
        certTileHTML(o, "overall", c.id, 0) +
        "</div>";
    }

    if (c.modules && c.modules.length) {
      html += '<div class="module-list"><p class="module-kicker">Modules</p>' +
        c.modules.map(function (m, mi) {
          return '<button class="module-row" data-module="' + esc(c.id) + '" data-idx="' + mi + '">' +
            '<span class="module-name">' + esc(m.title) + "</span>" +
            '<span class="module-count">' + (m.certs ? m.certs.length : 0) + " doc" + ((m.certs && m.certs.length === 1) ? "" : "s") + "</span>" +
            "</button>";
        }).join("") +
        "</div>";
    }

    if (c.certs && c.certs.length) {
      html += '<div class="module-list"><p class="module-kicker">Documents</p>' +
        '<div class="cert-grid">' +
        c.certs.map(function (ct, i) { return certTileHTML(ct, "certs", c.id, i); }).join("") +
        "</div></div>";
    }

    openPanel(html, el);

    panelBody.querySelectorAll("[data-cert]").forEach(function (tile) {
      tile.addEventListener("click", function () {
        var list = tile.getAttribute("data-list") === "overall" ? [c.overall] : (c.certs || []);
        var i = parseInt(tile.getAttribute("data-idx"), 10);
        openViewer(list.map(certItem), i, tile);
      });
    });
    panelBody.querySelectorAll("[data-module]").forEach(function (row) {
      row.addEventListener("click", function () {
        var mi = parseInt(row.getAttribute("data-idx"), 10);
        var m = c.modules[mi];
        markDiscovered("module_" + c.id + "_" + m.id);
        row.classList.add("is-done");
        openViewer((m.certs || []).map(certItem), 0, row);
      });
    });
  }

  function volNode(v, i) {
    var doc = v.doc ? '<span class="node-tag">· ' + esc(v.docLabel || "certificate") + "</span>" : "";
    var bg = v.bg ? ' style="background-image:url(\'' + esc(v.bg) + '\')"' : "";
    return '<button class="node vol-node' + (v.bg ? " bg-box" : "") + '" data-volidx="' + i + '"' + bg + '>' +
      '<span class="node-dot" aria-hidden="true"></span>' +
      '<span class="node-title">' + esc(v.role) + "</span>" +
      '<span class="node-tag">' + esc(v.period) + doc + "</span></button>";
  }

  function volDocs(v) {
    var items = [];
    if (v.doc) items.push({ src: v.doc, title: v.docLabel || "Certificate", caption: v.role, kind: kindOf(v.doc) });
    (v.docs || []).forEach(function (d) {
      if (d.doc) items.push({ src: d.doc, title: d.docLabel || "Certificate", caption: d.role || v.role, kind: kindOf(d.doc) });
    });
    return items;
  }

  function openVol(el) {
    var idx = parseInt(el.getAttribute("data-volidx"), 10);
    if (window.__vols && window.__vols[idx]) {
      var v = window.__vols[idx];
      var docs = volDocs(v);
      var html =
        '<p class="panel-kicker">Community grove</p>' +
        "<h3>" + esc(v.role) + "</h3>" +
        (v.detail ? '<p class="panel-sub">' + esc(v.detail) + "</p>" : "") +
        H.meta([H.pill(esc(v.period), true), v.location ? H.pill(esc(v.location)) : ""]) +
        (docs.length ? '<div class="vol-preview"><div class="cert-grid">' +
          docs.map(function (d, di) {
            return '<button class="cert-tile" data-volpreview="' + di + '">' +
              '<span class="cert-thumb"><img src="' + esc(docThumb(d.src)) + '" alt="" loading="lazy" onerror="this.closest(\'.cert-thumb\').classList.add(\'no-thumb\')"></span>' +
              '<span class="cert-tile-title">' + esc(d.title) + "</span></button>";
          }).join("") +
          "</div></div>" : "") +
        (docs.length ? '<div class="panel-actions"><a class="cta cta-quiet" href="' + esc(docs[0].src) + '" target="_blank" rel="noopener">View ' + esc(docs[0].title) + " →</a></div>" : "") +
        attachedGalleryHTML("vol_" + idx);
      openPanel(html, el);
      panelBody.querySelectorAll("[data-volpreview]").forEach(function (pv) {
        pv.addEventListener("click", function () {
          openViewer(docs, parseInt(pv.getAttribute("data-volpreview"), 10), pv);
        });
      });
    }
  }

  function loadJson() {
    fetch("certificates.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        window.__vols = data.volunteering || [];
        window.__courses = data.courses || [];
        var box = document.getElementById("nutritionNodes");
        if (box) {
          if (!window.__courses.length) {
            box.innerHTML = '<p class="cert-note">No credentials listed.</p>';
          } else {
            box.innerHTML = window.__courses.map(courseNode).join("");
            box.querySelectorAll(".course-node").forEach(function (el) {
              el.addEventListener("click", function () {
                var cid = el.getAttribute("data-cid");
                var course = (window.__courses || []).filter(function (c) { return c.id === cid; })[0];
                if (!course) return;
                markDiscovered("course_" + cid);
                el.classList.add("is-done");
                openCoursePanel(course, el);
              });
            });
          }
        }
        var vbox = document.getElementById("volunteerNodes");
        if (vbox) {
          vbox.innerHTML = window.__vols.map(volNode).join("");
          vbox.querySelectorAll(".vol-node").forEach(function (el) {
            el.addEventListener("click", function () {
              markDiscovered("vol_" + el.getAttribute("data-volidx")); el.classList.add("is-done");
              openVol(el);
            });
          });
        }
        updateTotals(); applyVisited();
        redrawRiver();
      })
      .catch(function (err) {
        console.error("Could not load certificates.json:", err);
        var box = document.getElementById("nutritionNodes");
        if (box) box.innerHTML = '<p class="cert-note">Credentials file not reachable.</p>';
      });
  }

  /* ---------------------------------------------------------------- */
  /*  Image galleries (rendered from images/images.json)               */
  /* ---------------------------------------------------------------- */
  var imageGroups = {};
  var attachedGroups = {};

  function renderHeroImage(hero) {
    var fig = document.getElementById("heroFigure");
    if (!fig || !hero || !hero.src) return;
    fig.innerHTML =
      '<img src="' + esc(hero.src) + '" alt="' + esc(hero.caption || "Portrait of Lia Schmid") + '" fetchpriority="high">' +
      "<figcaption>" + esc(hero.caption || "Lia Schmid") + "</figcaption>";
  }

  function galleryGroupHTML(g) {
    var title = esc(g.title);
    var n = g.images.length;
    var thumbs = g.images.map(function (im, i) {
      var alt = im.caption || g.title + " — " + (i + 1);
      return '<button class="g-thumb" data-gallery="' + esc(g.id) + '" data-idx="' + i + '" aria-label="' + esc(alt) + '">' +
        '<img src="' + esc(im.src) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async"></button>';
    }).join("");
    var caption = g.caption ? '<p class="gg-caption">' + esc(g.caption) + "</p>" : "";
    return '<section class="gallery-group" aria-label="' + title + '">' +
      '<div class="gg-head"><h3 class="gg-title">' + title + ' <span class="gg-count">' + n + " " + (n === 1 ? "photo" : "photos") + "</span></h3>" + caption + "</div>" +
      '<div class="gg-strip">' + thumbs + "</div></section>";
  }

  /* Flat personal gallery: all "personal" groups merged into one strip,
     no sub-grouping by hobby type. */
  function flatPersonalHTML(groups) {
    var thumbs = [];
    var total = 0;
    groups.forEach(function (g) {
      g.images.forEach(function (im, i) {
        total++;
        var alt = im.caption || g.title + " — " + (i + 1);
        thumbs.push('<button class="g-thumb" data-gallery="' + esc(g.id) + '" data-idx="' + i + '" aria-label="' + esc(alt) + '">' +
          '<img src="' + esc(im.src) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async"></button>');
      });
    });
    return '<section class="gallery-group" aria-label="Personal">' +
      '<div class="gg-head"><h3 class="gg-title">Personal <span class="gg-count">' + total + " " + (total === 1 ? "photo" : "photos") + "</span></h3></div>" +
      '<div class="gg-strip">' + thumbs.join("") + "</div></section>";
  }

  function renderGalleries(data) {
    var boxes = {
      about: document.getElementById("galleryAbout"),
      research: document.getElementById("galleryResearch"),
      community: document.getElementById("galleryCommunity"),
      personal: document.getElementById("galleryPersonal")
    };
    var groups = (data.groups || []).filter(function (g) { return g.images && g.images.length; });
    var personal = [];
    groups.forEach(function (g) {
      imageGroups[g.id] = g;
      if (g.attachTo) {
        attachedGroups[g.attachTo] = g;
        return;
      }
      if (g.section === "personal") {
        personal.push(g);
        return;
      }
      var box = boxes[g.section];
      if (!box) return;
      box.classList.add("has-groups");
      box.innerHTML += galleryGroupHTML(g);
    });
    if (personal.length) {
      var pbox = boxes.personal;
      if (pbox) {
        pbox.classList.add("has-groups");
        pbox.innerHTML += flatPersonalHTML(personal);
      }
    }
    Object.keys(boxes).forEach(function (key) {
      var box = boxes[key];
      if (!box || !box.classList.contains("has-groups")) return;
      var label = document.createElement("p");
      label.className = "gallery-label";
      label.textContent = "Field photos — tap a shot to open it";
      box.insertBefore(label, box.firstChild);
    });
  }

  /* An attached group renders inside its target anchor instead of a section
     gallery. Returns "" when the target has no attached group. */
  function attachedGalleryHTML(attachTo) {
    var g = attachedGroups[attachTo];
    if (!g || !g.images || !g.images.length) return "";
    return '<div class="panel-gallery">' + galleryGroupHTML(g) + "</div>";
  }

  /* "The course of the river" region gets the graduation shot as a masked
     background treatment (behind the section content, not a foreground figure). */
  function renderInlineGraduation() {
    var g = attachedGroups["edu_graduation"];
    var region = document.getElementById("education");
    if (!g || !g.images || !g.images.length || !region) return;
    var im = g.images[0];
    var bg = document.createElement("div");
    bg.className = "edu-bg";
    bg.setAttribute("aria-hidden", "true");
    bg.style.backgroundImage = "url('" + esc(im.src) + "')";
    region.appendChild(bg);
  }

  function loadImages() {
    fetch("images/images.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        renderHeroImage(data.hero);
        renderGalleries(data);
        renderInlineGraduation();
      })
      .catch(function (err) {
        console.error("Could not load images/images.json:", err);
      });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-gallery]");
    if (!btn) return;
    var g = imageGroups[btn.getAttribute("data-gallery")];
    if (!g) return;
    var idx = parseInt(btn.getAttribute("data-idx"), 10);
    var items = g.images.map(function (im) {
      return { src: im.src, title: g.title, caption: im.caption, kind: kindOf(im.src) };
    });
    openViewer(items, idx, btn);
  });

  /* ---------------------------------------------------------------- */
  /*  Compass + counter totals                                         */
  /* ---------------------------------------------------------------- */
  function updateTotals() {
    var total = document.querySelectorAll("[data-open]").length +
      document.querySelectorAll(".course-node").length +
      document.querySelectorAll(".vol-node").length;
    if (foundTotal) foundTotal.textContent = total;
    updateCounter();
  }
  updateTotals();

  document.querySelectorAll("[data-jump]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = document.getElementById(b.getAttribute("data-jump"));
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  document.querySelectorAll("[data-descend]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = document.getElementById(b.getAttribute("data-descend"));
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  var compassMap = ["summit", "research", "education", "nutrition", "community", "personal"];
  var compassBtns = document.querySelectorAll(".cp[data-jump]");
  function spy() {
    var cur = "summit", y = window.scrollY + 180;
    compassMap.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top + window.scrollY <= y) cur = id;
    });
    compassBtns.forEach(function (b) {
      b.setAttribute("data-state", b.getAttribute("data-jump") === cur ? "active" : "");
    });
  }
  window.addEventListener("scroll", spy, { passive: true });
  spy();

  /* ---- terrain parallax (subtle living feel) ---- */
  var pxRaf = null;
  function parallax() {
    var vh = window.innerHeight;
    document.querySelectorAll(".region").forEach(function (reg) {
      var t = reg.querySelector(".terrain svg");
      if (!t) return;
      var r = reg.getBoundingClientRect();
      var mid = r.top + r.height / 2 - vh / 2;
      var f = Math.max(-1, Math.min(1, -mid / (vh * 0.7)));
      t.style.transform = "translateY(" + (f * 22).toFixed(1) + "px)";
    });
  }
  function requestParallax() {
    if (pxRaf) return;
    pxRaf = requestAnimationFrame(function () { pxRaf = null; parallax(); });
  }
  window.addEventListener("scroll", requestParallax, { passive: true });
  window.addEventListener("resize", requestParallax, { passive: true });
  parallax();

  /* ---- scroll reveal (progressive enhancement) ---- */
  document.querySelectorAll(".region-head, .nodes").forEach(function (el) {
    el.classList.add("reveal");
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

applyVisited();
  loadJson();
  loadImages();
  setupGuide();

  /* ---------------------------------------------------------------- */
  /*  First-visit guide — a pulsing cue on the first interactive         */
  /*  element (the hero "Descend" CTA, visible on every fresh load).     */
  /*  Session-only: appears each page load, dismissed forever for the    */
  /*  session once the user interacts. No persistent storage.            */
  /* ---------------------------------------------------------------- */
  function setupGuide() {
    if (!document.querySelector(".cta[data-descend]")) return;

    // A page refresh otherwise restores the old scroll offset, which would
    // leave things mid-page. Reset to the top so the cue reliably appears on
    // every fresh load.
    try { history.scrollRestoration = "manual"; } catch (e) {}

    // Fixed-position corner chip (bottom-left). It stays put during scroll, so
    // we don't track the hero or content at all — no lag, no collision.
    var guide = document.createElement("div");
    guide.className = "guide";
    guide.hidden = true;
    guide.innerHTML =
      '<span class="guide-dot" aria-hidden="true"></span>' +
      '<span>Everything is clickable — start here</span>' +
      '<button class="guide-close" aria-label="Dismiss hint">×</button>';
    document.body.appendChild(guide);

    var done = false;
    function dismiss() {
      if (done) return;
      done = true;
      guide.remove();
      clearTimeout(appear);
      document.removeEventListener("pointerdown", onInteract);
      document.removeEventListener("click", onInteract);
    }
    function onInteract() { dismiss(); }
    document.addEventListener("pointerdown", onInteract);
    document.addEventListener("click", onInteract);

    // Appear shortly after load (session-only, no storage).
    var appear = setTimeout(function () {
      if (!done) guide.hidden = false;
    }, 900);
  }
})();
