# Vendored typefaces

Both faces are variable fonts from the `google/fonts` repository (the
canonical unmodified source Google Fonts itself serves from), subset here to
the characters this site actually sets and re-packaged as woff2. SIL Open Font License 1.1, copied unmodified from the
same commit as each source file.

**Why `fonts.css` and not `custom.scss`.** The `@font-face` rules were in the
theme first, with `url("../../fonts/x.woff2")` -- correct for a browser, since
the theme compiles to `docs/site_libs/bootstrap/` and `../../` is the docs root
from there. Quarto does not leave a Sass `url()` alone: it treats it as a
dependency, resolves it against the *project* directory rather than against
where the stylesheet lands, and copies the file next to the compiled CSS. So
that path sent it looking two levels above the repo for `fonts/` and failed the
render outright. A plain stylesheet is copied verbatim and keeps its own URLs,
and this one sits in the directory it names, so both `url()`s are bare siblings
no output layout can move. `_quarto.yml` links it under `format.html.css`,
which Quarto rewrites per page depth -- `fonts/fonts.css` on an English page,
`../fonts/fonts.css` on a Spanish one -- while the font URLs inside resolve
against the stylesheet either way.

**Why vendored and not a CDN stylesheet.** The same reason three.js and the
stage's CMU Serif are (see `interactive/vendor/README.md`):
`check_navigation.cjs` aborts every off-origin request, so a `<link>` to
`fonts.googleapis.com` would load on a reader's machine and test as the
system font on the runner, and nothing would say so. A file in the repo
cannot 404, and `repo.widgets` in `_variables.yml` lists both `.woff2` files
so `check_links.py` fails the build if either stops reaching `docs/` — the
only guard a `@font-face url()` gets, because it is CSS content the link
harvest does not read.

**Why not system fonts.** A system-font stack (`-apple-system`, `Segoe UI`,
Roboto, …) is what the site carried before this vendoring: free, but a
different page on Windows, macOS, Android and Linux, and the one thing this
site draws that must look identical everywhere it is captured is
`images/og-card.png` — a link preview rendered once, offline, by
`scripts/gen_figures.py`, with no browser and no system font list to fall
back to. `og_card()` loads the two vendored files directly through
matplotlib's `font_manager.addfont`, so the card it draws is pixel-identical
to what a reader's own browser renders from the same two files.

## Inter

`inter-latin.woff2` is Inter (variable, `wght` axis instanced to its 400–800
range, `opsz` pinned to 14 — the UI/body optical size, since only `wght` is
meant to vary here), used for UI and body text.

```
source   https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf
sha256   29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031  (as fetched, full font)
fetched  2026-09-22

vendored as  fonts/inter-latin.woff2
sha256       a7011f8369ba7d032805f89080c9677746a9dc115e9d457f4c8bdac2e8ef006f
bytes        97252

licence      fonts/OFL-Inter.txt
source       https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt
sha256       5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57
```

Subset with fontTools (`uv run --with brotli --group figures` — woff2 output
needs the `brotli` extra) in two passes: first `varLib.instancer` restricts
the axes, then `fontTools.subset` restricts the character set and repackages
as woff2. Both faces take the same ranges:

```bash
RANGES="U+0000-00FF,U+0100-017F,U+0180-024F,U+02B0-02FF,U+0370-03FF,U+1D00-1D7F,U+1E00-1EFF,U+2000-206F,U+2070-209F,U+20AC,U+2100-214F,U+2190-21FF,U+2200-22FF,U+2500-257F,U+25A0-25FF,U+2600-26FF"
```

```bash
uv run --group figures python -m fontTools.varLib.instancer \
  "Inter[opsz,wght].ttf" opsz=14 wght=400:800 -o inter-instanced.ttf

uv run --with brotli --group figures python -m fontTools.subset \
  inter-instanced.ttf --output-file=fonts/inter-latin.woff2 --flavor=woff2 \
  --layout-features='*' --name-IDs='*' --recalc-average-width \
  --unicodes="$RANGES"
```

## Source Serif 4

`source-serif-4-latin.woff2` is Source Serif 4 (variable, `opsz` 8–60 and
`wght` 200–900, both left variable — display headings use both axes), used
for headings.

```
source   https://raw.githubusercontent.com/google/fonts/main/ofl/sourceserif4/SourceSerif4%5Bopsz,wght%5D.ttf
sha256   97b2d4da6e3cb494b5a1e66ae176914d852ccabef49e0c02c0df25f3e39aca0b  (as fetched, full font)
fetched  2026-09-22

vendored as  fonts/source-serif-4-latin.woff2
sha256       c2a5c004a5e5fd24d54169e3f9a544ea84584dcf0d66c6c2bcac6db0219c70ef
bytes        290004

licence      fonts/OFL-SourceSerif4.txt
source       https://raw.githubusercontent.com/google/fonts/main/ofl/sourceserif4/OFL.txt
sha256       5f94c3fd3a23131a417ab5a0c8452de57e70c3cfb9f604d88241f7065ebf9fd9
```

Subset the same way, minus the instancing pass — both axes stay their full
range:

```bash
uv run --with brotli --group figures python -m fontTools.subset \
  "SourceSerif4[opsz,wght].ttf" --output-file=fonts/source-serif-4-latin.woff2 \
  --flavor=woff2 --layout-features='*' --name-IDs='*' --recalc-average-width \
  --unicodes="$RANGES"
```

## What the ranges are, and what still falls back

The ranges are not a guess. They were chosen by taking every non-ASCII
character the *rendered* pages set outside `<code>`, `<pre>` and `<math>` —
which take the monospace and math stacks instead — and widening to the blocks
those characters sit in:

| Block | Why |
|---|---|
| Latin-1, Extended-A/B, Extended Additional | the alphabet, Spanish's diacritics, `¿¡«»` |
| Spacing Modifiers, Phonetic Extensions | modifier letters in the notation |
| Greek | `σ κ β λ ε Σ`, which the linear-algebra pages set in prose |
| General Punctuation, Super/Subscripts | the dashes, the quotes, `…`, `₁ ₂ ₃ ⁺ ⁻` |
| Letterlike Symbols | `ℝ ℱ` |
| Arrows | `→` alone appears over a hundred times |
| Mathematical Operators | `≈ ≤ ≥ ∈ ∑ ∏ ∘` |
| Box Drawing, Geometric Shapes, Miscellaneous Symbols | the table rules and markers |

The first subset was Latin-only, and `→` was not in it. A browser falls back
per glyph rather than per run, so that would not have broken anything
visibly — it would have set one arrow in the system font in the middle of an
Inter sentence, a hundred times over, which is exactly the sort of thing
nothing in CI can see.

What still falls back, deliberately: **emoji**, which no text face carries and
which the operating system's emoji font supplies, and six symbols neither face
ships (`⊞ ▦ ⇄ ⚠ ↔ ᵀ`, twenty occurrences between them). Re-check both with:

```bash
uv run --with brotli --group figures python - <<'EOF'
from fontTools.ttLib import TTFont
for p in ("fonts/inter-latin.woff2", "fonts/source-serif-4-latin.woff2"):
    f = TTFont(p)
    print(p, len(f.getBestCmap()), "glyphs",
          [(a.axisTag, a.minValue, a.maxValue) for a in f["fvar"].axes])
EOF
```

Verify either file with:

```bash
shasum -a 256 fonts/inter-latin.woff2 fonts/source-serif-4-latin.woff2 fonts/OFL-*.txt
```

**Why the two-pass subset.** `fontTools.subset` restricts glyphs and can trim
`fvar` axis *ranges* with `--variations`, but pinning `opsz` to a single value
so it stops being an axis at all is `varLib.instancer`'s job, not
`fontTools.subset`'s — instancing removes an axis outright, subsetting only
ever narrows or drops glyphs and tables. Running instancer first, then subset
on its output, is why Inter's ledger above shows two source lines and Source
Serif 4's shows one.

**Why `--layout-features='*'` and not the default.** `fontTools.subset`'s
default keeps only a fixed feature list tuned for Latin body text (`kern`,
`liga`, …) and drops the rest silently. Both faces carry small-caps and
tabular-figure features this site's own tables and code blocks could
reasonably want later; keeping every feature costs a few hundred bytes and
avoids re-subsetting the day something reaches for `font-variant-numeric:
tabular-nums` on a heading.

**Upgrading either face** means re-fetching from the same `google/fonts`
path, re-running the same commands, and updating this file's hash lines,
`_variables.yml`'s `repo.widgets`, and the `@font-face` `src` comment in
`custom.scss` and `interactive/widget-chrome.css` if the byte counts moved
enough to be worth a note.
