#!/bin/bash
# =========================================================================
# gen-cert-thumbs.sh — regenerate PDF thumbnails for certificates.json.
#
# Reads every "doc" path in certificates.json, renders the first page of each
# PDF via macOS Quick Look (qlmanage) into certificates/thumbs/<name>.png.
#
# Usage: ./tools/gen-cert-thumbs.sh
# =========================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

THUMB_DIR="certificates/thumbs"
mkdir -p "$THUMB_DIR"

DOCS="$(node -e '
  const c = require("./certificates.json");
  const paths = [];
  (c.courses || []).forEach(function (co) {
    if (co.overall && co.overall.doc) paths.push(co.overall.doc);
    (co.certs || []).forEach(function (x) { if (x.doc) paths.push(x.doc); });
    (co.modules || []).forEach(function (m) {
      (m.certs || []).forEach(function (x) { if (x.doc) paths.push(x.doc); });
    });
  });
  (c.volunteering || []).forEach(function (v) { if (v.doc) paths.push(v.doc); });
  process.stdout.write(paths.join("\n"));
')"

for doc in $DOCS; do
  [ -f "$doc" ] || { echo "skip (missing): $doc"; continue; }
  name="$(basename "$doc")"
  base="${name%.pdf}"
  out="$THUMB_DIR/$base.png"
  qlmanage -t -s 500 -o "$THUMB_DIR" "$doc" >/dev/null 2>&1
  if [ -f "$THUMB_DIR/$name.png" ]; then
    mv -f "$THUMB_DIR/$name.png" "$out"
    echo "  thumb: $out"
  else
    echo "  FAILED: $doc"
  fi
done
