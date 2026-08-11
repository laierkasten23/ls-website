/* =========================================================================
   Lia Schmid — Living Terrain
   Plain DOM JS. No build, no framework.
   ========================================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- */
  /*  Procedural topographic terrain                                   */
  /* ---------------------------------------------------------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function ringPoints(cx, cy, baseR, mod, n, aspect) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var th = (2 * Math.PI * i) / n;
      var r = baseR * (1 + mod(th));
      pts.push({ x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) * aspect });
    }
    return pts;
  }

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

  function makeMod(modePhases) {
    return function (th) {
      var m = 0;
      for (var k = 0; k < modePhases.length; k++) {
        m += modePhases[k].a * Math.sin(modePhases[k].m * th + modePhases[k].p);
      }
      return m;
    };
  }

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
  /*  Contact (edit socials/URLs here)                                 */
  /* ---------------------------------------------------------------- */
  var CONTACT = {
    email: "lia.schmid98@gmx.de",
    phone: "+49 176 245 992 71",
    phoneTel: "+4917624599271",
    socials: [
      { label: "laierkasten23", glyph: "instagram", url: "https://instagram.com/laierkasten23" },
      { label: "Lia Schmid", glyph: "linkedin", url: "" }
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
        { label: "Languages", items: ["German · native", "Portuguese · native", "English · fluent", "Italian · fluent"] },
        { label: "Programming", items: ["Python", "R", "MATLAB", "bash", "Java"] },
        { label: "Data & tooling", items: ["MySQL", "git", "VS Code", "Singularity"] }
      ]
    },
    about_interests: {
      kicker: "Off the clock",
      title: "The pause between sessions",
      sub: "Languages, cultures, the outdoors",
      body:
        "<p>To disconnect I hike in nature and spend time with family and loved ones. I love learning new languages and exploring different cultures — a habit that started with semesters abroad in Lisbon and Milan and never really stopped.</p>",
      meta: H.meta([H.pill("Hiking"), H.pill("Languages"), H.pill("Travel"), H.pill("Family")]),
    },
    about_easter: {
      kicker: "A small confession",
      title: "Pit-lane note",
      sub: "A discovery for the curious",
      body:
        "<p>Every now and then, when the EEG streams are quiet and the models are training, I switch channels to the pit lane. There's something I love about races within races — the fast, precise micro-decisions, the choreography of a tyre change, a team perfectly in tempo. A little motorsport heart hiding in an otherwise organic terrain.</p>" +
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
    work_tutor: {
      kicker: "Research range",
      title: "Tutor — Computer Programming & Database Systems",
      sub: "Catholic University of the Sacred Heart, Milan",
      body:
        "<p>Delivering the Python and database-systems practicum for the M.Sc. Data Science & AI for Business — designed so the whole pipeline, from code to a well-shaped query, lands quickly.</p>",
      stacks: [{ label: "Topics", items: ["Python programming", "DBMS — MySQL, DBeaver", "Structured curricula"] }],
      meta: H.meta([H.pill("Since 02/2026", true), H.pill("current")])
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
      meta: H.meta([H.pill("01–11/2024", true), H.pill("M.Sc. thesis", true), H.pill("final grade 1,1")])
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
      sub: "Five records in the journal log",
      prologue: "<p>Peer-reviewed and submitted work — most recently around subject-independent EEG learning and explainable stress detection.</p>",
      pubs: [
        { authors: "Schmid, L., Burger, J., D'Amelio, Lanzarotti, R.", title: "Investigating Foundation Models, Disentanglement and Latent Alignment for Subject-Independent EEG Learning", venue: "ICMI 2026" },
        { authors: "Schmid, L., Facchi, G., Agnelli, F., Bocca, G., Sacchi, L., Lanzarotti, R.", title: "Choroid Plexus Segmentation in MRI Using the Novel T1×FLAIR Modality and PSU-Mamba: Projective Scan U-Mamba Approach", venue: "Pattern Recognition Letters, Elsevier (2025)" },
        { authors: "Sacchi, L., Arcaro, M., Bocca, G., Schmid, L., et al.", title: "Klotho levels in the cerebrospinal fluid are associated with choroid plexus enlargement in neurodegeneration: a preliminary study", venue: "Frontiers in Aging Neuroscience" },
        { authors: "Agnelli, F., Ghezzi, O., Blandano, G., Burger, J., Facchi, G., Schmid, L.", title: "Enhancing 3D Face Analysis Using Graph Convolutional Networks with Kernel-Attentive Filters", venue: "submitted, ACM/SIGAPP SAC 2025" },
        { authors: "Agnelli, F., Blandano, G., Burger, J., D'Amelio, A., Facchi, G., Ghezzi, O., ... & Schmid, L.", title: "EEG-Based Mental Stress Detection: A Comparative and Explainable Study Across Tasks and Subjects", venue: "ICIAP 2025" }
      ],
      meta: H.meta([H.pill("5 records")])
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
    meta: H.meta([H.pill("04/2021 – 11/2024", true), H.pill("grade 1,1")])
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
    return html;
  }

  /* ---------------------------------------------------------------- */
  /*  Discovered / visited tracking (real persistent state)            */
  /* ---------------------------------------------------------------- */
  var STORE_KEY = "lia_terrain_discovered_v1";
  var discovered = {};
  try { discovered = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { discovered = {}; }

  var foundCount = document.getElementById("foundCount");
  var foundTotal = document.getElementById("foundTotal");

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(discovered)); } catch (e) {}
  }
  function markDiscovered(key) {
    discovered[key] = true; save(); updateCounter();
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
    document.querySelectorAll(".cert-node").forEach(function (el) {
      if (discovered[el.getAttribute("data-key")]) el.classList.add("is-done");
    });
    var vols = document.querySelectorAll(".vol-node");
    vols.forEach(function (el, i) {
      if (discovered["vol_" + i]) el.classList.add("is-done");
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Open / close panel                                               */
  /* ---------------------------------------------------------------- */
  function openPanel(html, focusEl) {
    panelBody.innerHTML = html;
    panelBackdrop.hidden = false;
    panelBackdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
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
    document.body.style.overflow = "";
    try { panelBody.innerHTML = ""; } catch (e) {}
    if (focusBack && lastFocused && lastFocused.focus) { lastFocused.focus(); lastFocused.classList.add("is-new"); }
  }

  document.querySelectorAll("[data-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-open");
      markDiscovered(key);
      btn.classList.add("is-done");
      openPanel(buildPanel(DATA[key]), btn);
    });
  });
  panelClose.addEventListener("click", function () { closePanel(true); });
  panelBackdrop.addEventListener("click", function (e) {
    if (e.target === panelBackdrop) closePanel(true);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panelBackdrop.hidden) closePanel(true);
  });

  /* ---------------------------------------------------------------- */
  /*  Certificates + volunteering (rendered from certificates.json)    */
  /* ---------------------------------------------------------------- */
  function certNode(c) {
    return '<button class="node cert-node" data-key="cert_' + esc(c.title) + '" ' +
      'data-title="' + esc(c.title) + '" data-qual="' + esc(c.qualification || "") + '" ' +
      'data-issuer="' + esc(c.issuer || "") + '" data-date="' + esc(c.date || "") + '" ' +
      'data-id="' + esc(c.credentialId || "") + '" data-doc="' + esc(c.doc || "") + '" ' +
      'data-cat="' + esc(c.category || "") + '" data-note="' + esc(c.note || "") + '">' +
      '<span class="node-dot" aria-hidden="true"></span>' +
      '<span class="node-title">' + esc(c.title) + "</span>" +
      '<span class="node-tag">' + esc(c.qualification || c.date || "") + "</span></button>";
  }

  function fmtDate(d) {
    if (!d) return "";
    var p = String(d).split("-");
    if (p.length !== 3) return d;
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[parseInt(p[1], 10) - 1] + " " + parseInt(p[2], 10) + ", " + p[0];
  }

  function openCert(el) {
    var html =
      '<p class="panel-kicker">Credential · ' + esc(el.getAttribute("data-cat")) + "</p>" +
      "<h3>" + esc(el.getAttribute("data-title")) + "</h3>" +
      (el.getAttribute("data-qual") ? '<p class="panel-sub">' + esc(el.getAttribute("data-qual")) + "</p>" : "") +
      H.meta([
        H.pill(esc(fmtDate(el.getAttribute("data-date"))), true),
        H.pill(esc(el.getAttribute("data-issuer"))),
        el.getAttribute("data-id") ? H.pill(esc(el.getAttribute("data-id"))) : ""
      ]) +
      (el.getAttribute("data-note") ? "<p>" + esc(el.getAttribute("data-note")) + "</p>" : "") +
      (el.getAttribute("data-doc") ? '<a class="cert-link" href="' + esc(el.getAttribute("data-doc")) + '" target="_blank" rel="noopener">View credential document →</a>' : "");
    openPanel(html, el);
  }

  function volNode(v, i) {
    var doc = v.doc ? '<span class="node-tag">· ' + esc(v.docLabel || "certificate") + "</span>" : "";
    return '<button class="node vol-node" data-volidx="' + i + '">' +
      '<span class="node-dot" aria-hidden="true"></span>' +
      '<span class="node-title">' + esc(v.role) + "</span>" +
      '<span class="node-tag">' + esc(v.period) + doc + "</span></button>";
  }
  function openVol(el) {
    var idx = parseInt(el.getAttribute("data-volidx"), 10);
    if (window.__vols && window.__vols[idx]) {
      var v = window.__vols[idx];
      var html =
        '<p class="panel-kicker">Community grove</p>' +
        "<h3>" + esc(v.role) + "</h3>" +
        (v.detail ? '<p class="panel-sub">' + esc(v.detail) + "</p>" : "") +
        H.meta([H.pill(esc(v.period), true), v.location ? H.pill(esc(v.location)) : ""]) +
        (v.doc ? '<div class="panel-actions"><a class="cta cta-quiet" href="' + esc(v.doc) + '" target="_blank" rel="noopener">View ' + esc(v.docLabel || "certificate") + " →</a></div>" : "");
      openPanel(html, el);
    }
  }

  function loadJson() {
    fetch("certificates.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        window.__vols = data.volunteering || [];
        var certs = data.nutrition || [];
        var box = document.getElementById("nutritionNodes");
        if (box) {
          if (!certs.length) {
            box.innerHTML = '<p class="cert-note">No credentials listed.</p>';
          } else {
            box.innerHTML = certs.map(certNode).join("");
            box.querySelectorAll(".cert-node").forEach(function (el) {
              el.addEventListener("click", function () {
                var key = el.getAttribute("data-key");
                markDiscovered(key); el.classList.add("is-done");
                openCert(el);
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
      })
      .catch(function (err) {
        console.error("Could not load certificates.json:", err);
        var box = document.getElementById("nutritionNodes");
        if (box) box.innerHTML = '<p class="cert-note">Credentials file not reachable.</p>';
      });
  }

  /* ---------------------------------------------------------------- */
  /*  Compass + counter totals                                         */
  /* ---------------------------------------------------------------- */
  function updateTotals() {
    var total = document.querySelectorAll("[data-open]").length +
      document.querySelectorAll(".cert-node").length +
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

  var compassMap = ["summit", "research", "education", "nutrition", "community"];
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
})();
