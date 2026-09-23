# AGENTS.md

This file is the working guidance for any coding agent in this repository --
Claude Code, Cursor, Codex, or whatever comes next. All three read this name,
so there is one copy of these rules rather than one per tool, and no pointer
file forwarding to it. A human contributor wants
[CONTRIBUTING.md](CONTRIBUTING.md) first; this file is the technical layer
under it.

It holds rules and commands. The reasoning behind them -- what went wrong, when,
and what the fix was -- lives in [DECISIONS.md](DECISIONS.md), one entry per
rule, so this file stays short enough to read at the start of every session.
When a rule here surprises you, look it up there before changing it.

## What this is

A bilingual (EN/ES) Quarto website for a 210-minute tensors workshop. No application
code — the deliverables are the rendered site, Colab notebooks for the workshop
sections and take-home extras, two revealjs decks, the standalone interactive
widgets listed under `repo.widgets` in `_variables.yml`, and three Kahoot
spreadsheets.

**Desktops and laptops are the target, and phones are not.** The session is
delivered on them and the site is read on them, so anything here may assume a
mouse, a hover state, a keyboard and a wide viewport; a touch affordance is
not worth building or maintaining for its own sake. Two things that look like
mobile support are kept anyway, for reasons that are not phones:

- `check_navigation.cjs` asserts no horizontal overflow at **390px** on every
  page. Keep it. An element that overflows at 390 is usually one with no width
  constraint at all, which is a bug at any size — the check is a canary, not a
  promise that a phone is supported.
- `homepage.scss` swaps the hero's widget stills for the static diagram under
  `@media (max-width: 540px)`, which is what `check_navigation.cjs` asserts at
  390px, where it requires `.hero-fallback` to be visible and `.hero-demos`
  hidden, in both languages. There is no reduced-motion half any more: the
  stills do not move. Dropping the width rule means changing that check in the
  same commit.

## Generated files: the one rule that matters

[CONTRIBUTING.md](CONTRIBUTING.md#where-to-edit) owns the contributor-facing
editing boundaries. Keep this technical guidance consistent with it.

`_variables.yml` is the single source of truth (repo coordinates, the
sections, extras, quizzes and agenda). Three things read it: `{{< var >}}`
shortcodes in the `.qmd` pages and both decks, the two generator scripts, and
the checker. The generators and the checker both take the running clock --
when each section starts once quizzes and breaks are counted -- from
`scripts/timeline.py` rather than walking it twice.

**Never hand-edit generated scaffolding.** For notebooks that means only the
centrally owned header (cell 0) and footer (final cell). Every cell between
them -- the whole Setup section included -- is a teaching body cell, edited
directly in the `.ipynb`, including in Colab with Gemini, and the normalizer
preserves them. What the normalizer does own across *every* cell is the key
order inside it: it sorts them, which is nbformat's own order, so a round-trip
through any editor converges instead of rewriting every cell around one edit.

Change `_variables.yml` for shared facts, objectives and the bilingual header
text, then run the appropriate generator:

| Generated | Owned by |
|---|---|
| `_includes/*.md` (both notebook tables, the agenda both decks show, the companion's video, shorts, audio, infographic, self-check and mind-map blocks, the brainstorm diagram's inline SVG, the notebooks page's dependency table, and the whole body of both references pages) | `scripts/gen_tables.py` |
| The marker-delimited regions inside `README.md`, `notebooks/README.md`, each language's handbook schedule and the `notebooks` dependency group in `pyproject.toml` -- the rest of all five files is hand-maintained | `scripts/gen_tables.py` |
| `notebooks/*.ipynb` -- header (cell 0) and footer (final cell) only | `scripts/gen_notebooks.py` using `_variables.yml` |
| `notebooks/*.ipynb` -- every cell between the header and footer, including Setup | the notebook itself; editable directly in Colab/Gemini |
| `images/ds-*` (dataset cards) | `scripts/gen_thumbnails.py` |
| `images/hero-band.png`, `images/fig-*` (the handbook's figures) | `scripts/gen_figures.py` |
| `images/og-card.png` (the link preview, 1200×630, in the vendored faces) | `scripts/gen_figures.py og` |
| `images/hero-*-{en,es}.webp` (the homepage hero's widget stills) | `scripts/gen_hero_stills.cjs` (`npm run gen:hero`) |
| `interactive/data/photos.json` (the visualizer's photos at 4, 8, 16, 32 and 64 px) | `scripts/gen_figures.py widget` |
| `interactive/data/taxi.json` (the factorisation stage's own copy of the Block 6 taxi tensor) | `scripts/gen_figures.py taxi` (network: the taxi CSV) |
| `images/cube-00-*.gif` … `images/cube-15-*.gif` (at least three per notebook; `SCENES` stops at 15) | `scripts/gen_cube_gifs.py` |
| `images/cube-16-*.gif` (notebook 16's PCA animations) | `scripts/gen_pca_gifs.py` |
| `images/cube-17-*.gif`, `images/cube-18-*.gif` (attention and compression) | `scripts/gen_tensor_module_gifs.py` |
| `slides/{en,es}/images/slides-final/slide-NNa.webp` (art added since #45) | `scripts/gen_slide_art.py` |
| `docs/` (build output, gitignored -- never committed) | `quarto render` |

**The CI gate.** `publish.yml` reruns `gen_tables.py` and `gen_notebooks.py`
and fails if any of these paths change: `notebooks/`, `_includes/`,
`README.md`, `pyproject.toml` and both handbooks. It is byte-exact, because
both generators are deterministic pure Python. That path list **is the whole
gate**: the regenerate step rewrites the source before `quarto render` sees
it, so a hand-edit to a generated path left off the list is silently
overwritten and ships. Add the path when you add the file.

**The image generators are not in that gate**, deliberately: they need the
network, and a scientific stack or a browser the workflow does not install.
Nothing will tell you an image is stale -- rerun them by hand when their inputs
change. They are deterministic only *for a given stack*: `figures` carries
floors, not pins, so matplotlib drift alone can rewrite every figure with no
input changed. `gen_thumbnails.py`, `gen_figures.py` and `gen_cube_gifs.py`
print a `Stack:` line naming the versions that drew the files; compare it with
the line in the commit that last drew the image before deciding whether a
dirty `git status` is an input change or a matplotlib release. The other three
print nothing, so there you check the inputs by hand.

What each generator draws, and the rules each one keeps:

- `gen_thumbnails.py` builds the nine dataset cards from SHA-256-pinned CC0
  sources; the pin is what stops a card silently regenerating from a different
  photograph. Nothing on the site displays `images/ds-*` today. Keep them and
  the generator: `gen_figures.py` imports its pin, palette and fetcher, and the
  handbook's *The Data We Use* section is where they would return. Do not
  re-add a dataset strip to the homepage.
- `gen_figures.py` builds the banner, the handbook's four figures, the link
  preview and the visualizer's `photos.json`, importing the pin, palette and
  fetcher from `gen_thumbnails.py`. Every figure is drawn from an array the
  workshop actually uses, so the numbers printed on a figure are the numbers
  the exercise prints. `og` draws `images/og-card.png` from the same ladder
  the banner uses, on the navbar's navy, in the two vendored faces loaded off
  disk through `font_manager.addfont` -- there is no browser and no system
  font list here, which is the whole reason those files are in the repo.
- `gen_cube_gifs.py` draws the cube animations the notebooks embed, **at least
  three per notebook** (the move the section is named after, a move it needs,
  and the section's own subject), each in its notebook's accent from
  `gen_notebooks.ACCENTS`. `check_table()` enforces the count, a duplicate stem,
  and a stem filed under the wrong notebook. Every stem keeps the `cube-NN-`
  prefix, which is what check 1 uses for ownership. Its arrays are `np.arange`,
  not data, because the lesson is index arithmetic and `T[1, 2, 3] == 33` must
  be checkable by eye; the one colour scene, `cube-04-rgb`, uses only 0, 128
  and 255 for the same reason. Nothing on a frame is prose -- captions are
  expressions or shapes, so one GIF serves both languages. Every frame is a
  complete picture. Frames are `duration=4050`, one global value; GIFs loop
  forever (`loop=0`); `render` quantizes with `palette_from="all"`. One accent
  per notebook is the default; a second colour appears only where the picture
  claims *identity* (which axis, index or operand), from `INDEX`, via
  `lit_tint`, and never as the only carrier of a meaning. `_check_layout`
  refuses a frame whose captions collide or whose pile grows into its label; it
  cannot catch occlusion, so light plane 0 or `hide` what is in front.
- `gen_pca_gifs.py` and `gen_tensor_module_gifs.py` draw notebooks 16 and
  17–18; both use `loop=0` for the same reason.
- `gen_slide_art.py` draws the `slide-NNa` insertions from HTML and CSS,
  screenshotted by headless Chrome at 1920×1080 and encoded as WebP with
  Pillow, so it runs under `--group figures`. The thirty-one pre-existing slides
  have no source and are redrawn by hand. Copy for both languages lives in one
  `SLIDES` table.

**The companion's assets have no generator.** The infographic PNGs and the
Audio Overview under `media/` are exported by hand from NotebookLM; the
`companion:` block in `_variables.yml` is their provenance -- notebook URL,
each artifact's `/artifact/<uuid>` URL, and an `exported` date. Re-export an
asset and update `exported`. `media/**` is in `resources:` so it reaches
`docs/`. `companion.shorts:` lists the eight one-minute videos apart from
`video:`, each with a hand-made `covers` (check 12 verifies the section exists,
not the reading) and a `lang`. Every artifact has a `thumb:` screenshot with
`thumb_alt_{en,es}`, and a caption on the three unexportable ones saying it is
a still of something live; check 3 fails on a missing thumb file. Companion
copy names the destination briefly ("Opens in NotebookLM") and omits login
reminders.

**The brainstorm diagram** is generated: `brainstorm:` in `_variables.yml`
holds four ideas and the sections under each; `brainstorm_svg()` in
`gen_tables.py` draws inline SVG into `_includes/brainstorm-{en,es}.md`,
reading titles from `sections:`. The generator refuses a section under no idea
or two. It is emitted twice (two columns and one) and `custom.scss` switches at
44rem; colours and type live in `custom.scss` under `.brainstorm`.

## The typefaces

**Both faces are vendored**, under `fonts/`: Inter (variable, `wght` 400–800,
`opsz` instanced out) for UI and body, Source Serif 4 (variable, both axes)
for display headings, each subset to latin + latin-ext so Spanish keeps its
diacritics and `¿¡`. `fonts/README.md` is the ledger -- URL, SHA-256, date
and the exact subset command per face -- in the shape of
`interactive/vendor/README.md`. Both are SIL OFL with the licence committed.

**Off-origin fonts are not an option here**: `check_navigation.cjs` aborts
every external request, so a Google Fonts `<link>` would load for a reader
and test as the fallback stack on the runner, and nothing would say so.

**The `@font-face` rules are in `fonts/fonts.css`, not `custom.scss`.**
Quarto does not leave a Sass `url()` alone -- it resolves it against the
*project* directory rather than against where the theme compiles to, and
copies the file next to the compiled CSS. A plain stylesheet keeps its own
URLs, and this one sits beside the files it names, so both `url()`s are bare
siblings. `_quarto.yml` links it under `format.html.css`, which Quarto
rewrites per page depth. `interactive/widget-chrome.css` declares Inter
separately at `../fonts/`, because a widget is a page with no navbar and no
site stylesheet; the stages' vendored CMU Serif is untouched, being the Manim
look on a black canvas rather than the page's type.

**All three files are in `repo.widgets`.** A `@font-face url()` is CSS
content, which the link harvest cannot see, so `check_links.py` failing on a
missing file is their only guard -- the `cmu-serif` entries are the
precedent. `check_navigation.cjs` also asserts `document.fonts.check` for
both faces on `index` in both languages, which is what catches a corrupt
woff2 or a URL that resolves to the wrong depth on one language's pages.

## The widgets

**`interactive/` is hand-written**, and the one asset class with neither a
generator nor a byte-exact gate -- which is why it has a section of its own
rather than a corner of the one above. Nothing regenerates these files, so
nothing catches a mistake in them by comparing bytes; what guards them
instead is `npm test` over the core modules and `check_navigation.cjs` over
the rendered pages, both under `## Commands`. The HTML widgets -- the
section 03 broadcasting simulator, the section 04 image tensor
visualizer, the sections 07/09 projection & SVD stage, the sections
00/02/04/09 audio tensor stage, the sections 04/06/Appendix B attention
stage, and the sections 10/11/Appendix C factorisation stage -- each carry
EN/ES copy tables, `?lang=`, and
their section's accent adjusted per theme to clear 4.5:1. `repo.widgets` in
`_variables.yml` is the list of them; prose here does not count them. **The frame is shared**:
`interactive/widget-chrome.css`, linked first by every page, owns the
surfaces (`--bg`, `--ink`, `--ink-mute`, `--panel`, `--sunk`, `--line`, the
site's own palette from `custom.scss`, on light, dark and the hero's navy),
the two font stacks, `.wrap` (width from `--wrap`), the `.site-nav` home,
interactive and notebooks links every page opens with -- three pills, in the
page's own language, wired from each page's own copy table because the widgets
share the stylesheet and not a script -- the header, the `.card` and `.about`
panels, the default button, field, select and slider, `.concept`, `.predict`,
`.sr`, `[hidden]` and the chrome embed mode strips. A page's own `<style>`
comes second and owns its `--accent`, everything on its stage, and the shape
it gives a shared control (a pill for a tab or a preset). A colour that goes
on text in more than one widget belongs in the shared file; a page never
redeclares a surface token. They are resources, not render targets:
`interactive/**` is in `resources:` and deliberately absent from `render:`.

The stage is eight steps, one file each under `interactive/linalg-scenes/`,
registered in load order through `LinalgScenes.register()`; the page
(`linalg-stage.html`) is the frame -- layout, step machine, camera, boot --
and `linalg-kit.js` is the drawing every scene shares, once for three.js and
once for the flat SVG. The order is projection, wide, collapse, portal,
ellipsoid, eigen, collinear, precision -- sections 07, 07, 07, 09, 09, 08,
09, 09 -- and the portal sits before every step that says "singular value"
because it is where the word is defined. A new step is one scene file, one
`<section>`, one `<script src>` line and one `repo.widgets` line; the contract
a scene keeps is `linalg-scenes/README.md`. **Link to a step by its scene
name** (`#portal`, `#eigen`), never `#step-N`: the number moves on a reorder,
the name does not, and the notebooks and both handbooks use the names. Every
step opens with a predict-first line and a claim on the stage's title card,
every slider is bound through `ctx.bindSlider` (tinted with the token of what
it moves, value in the label, the object lit while dragging) and eases its
geometry, and each step plays an entrance once (`arrive()`, never under
reduced motion). The stage is black in every theme and its labels are the
vendored CMU Serif (`interactive/vendor/cmu-serif/`), because the look it
takes is a Manim frame; the label chip stays opaque, and black, so axe has two
colours to measure.

The audio stage (`voice-stage.html`, titled *The audio tensor*) is the same
registry shape as the projection stage and now the same scroller: **ten
sections down the left, a sticky stage on the right**, one `<section
class="step">` per scene, grouped under five part headings, each declared by
the scene that opens it in its own `part:` -- from air to numbers (sampling,
quantization, the array), from numbers to a matrix (one window, the transform
of it, the hop), what a layout does to it (the reshape you can hear go wrong),
what factoring it costs (the best rank-k there is, and the parts you can
name), and what a model is handed (the three recordings stacked into a rank-4
batch). It was five tabs; the tabs hid the order the ideas have to be met in,
and "window and hop" and the transform itself were words in control labels
rather than pictures. `voice-kit.js` holds the registry and the drawing;
`audio-core.js` holds the arithmetic and `npm test` pins it, including one
frame and its window, the transform of all N bins, the rebuild from the k
strongest components, the reorderings (whose claim on screen is that they are
permutations), the rounding (whose claim is that 16 bits changes nothing), and
both factorizations -- the complex QR and the Hermitian eigendecomposition
underneath them, that the chunked factorisation is the same arithmetic as the
drained one, that rank k keeps k singular values, and that NMF drives its
error down with both factors non-negative. That NMF never beats the truncated
SVD at the same rank is asserted on the rendered page instead, by
`check_navigation.cjs` off the two scenes' `data-*`.
`tests/voice_scenes.test.cjs` pins the registry contract beside it: every
scene registers, carries the same copy keys and control labels in both
languages, and opens each slider on a value its own min/step grid contains.
Two kinds of scene: the three that open the page draw in three.js -- a wave
that dissolves into beads on a ruler needs depth -- and keep a 2-D twin
(`draw`) for a reader without WebGL, both from one slice the scene computes;
the other six draw only into the 2-D canvas, because a spectrum, a
spectrogram and a pair of factors are pictures. three.js is booted lazily
on the first three.js scene shown, through the projection stage's
`vendor/linalg-boot.js` and the same import map, and its camera is
`linalg-core`'s orbit.

**The frame owns the sound and the whole recording.** A transport sits in the
sticky column, and a control moved while something is playing swaps the sound
in place from the same moment in the clip -- debounced, generation-tagged, so
a stale source ending cannot stop its own replacement -- which is what makes
the sampling rate and the bit depth audible as you drag them. Under the stage
is one timeline canvas the frame draws, not a scene: the whole recording as a
waveform, a band for the samples the active picture is looking at
(`region(ctx)`), and a playhead while the sound runs. Dragging it moves that
scene's position control (`posControl`), mapped onto the control's own range.
Because the strip carries the global view, a picture is free to zoom: the hop
scene shows five windows' worth of samples, which is the only scale at which
overlapping windows can be seen at all.

Three recordings, all exactly 237 568 samples at 48 kHz so every shape on
every scene is the same for any of them (`vendor/README.md`): the voice, the
beat, and a 440 Hz tone synthesised in the page, which fetches nothing and
makes one peak, one line and one stripe of every picture. A file the reader
drops is decoded in the page at that rate, capped at 8 s, and never leaves the
tab. The embed never fetches a recording -- it draws the spectrogram scene
from a synthesised stand-in of the same length, and `data-standin` says which
is on screen. Link by scene name (`#sample`, `#quantize`, `#array`, `#frame`,
`#spectrum`, `#window`, `#scramble`, `#lowrank`, `#nmf`, `#batch`); controls
are `#c-<scene>-<control>` and readouts `#read-<scene>`, because the same
control name now lives in ten sections. The contract is
`voice-scenes/README.md`.

**Five sections carry a display equation** (`array`, `frame`, `spectrum`,
`window`, `batch`), and it is hand-written **MathML** with no library: the
claim cards are Unicode `textContent` that `check_navigation.cjs` compares
byte-exact, so a renderer would break them, and this repo vendors every asset
with a SHA-256 anyway. The `<math>` is static in the section because it is the
same in both languages and `check_links.py` reads the static HTML; only the
`eqcap` caption under it is translated, and `tests/voice_scenes.test.cjs`
pairs the two -- a caption with no element, or an element with no caption, is
silent in the page. Together the five say the spectrogram is one matrix
product: `X = ℱ · diag(w) · 𝒳`, costed both ways in multiply-adds rather than
in milliseconds, which would be the reader's machine rather than the claim.
The indices are the page's own -- `f` for a frequency bin, `t` for a frame,
`n` for a sample within one, `H` for the hop, `N` for the window -- and
**never `k`, which is the rank** on three other scenes; the two new objects
are script capitals, like the batch scene's `𝒯`: **`𝒳`** the frames matrix
`ℝ^{N×T}` and **`ℱ`** the transform as a matrix, never `F`, which counts
bins. An `<mi>` the reader can point at carries `data-hl`, one of
`{freq, time, samp, hop, batch, chan}`; the frame publishes it as `data-hl`
on `#stage` and the scene bands that axis in `draw()`, without ever calling
`changed()`, because a hover must not rewrite the readout. Only the 2-D
scenes honour it: the three opening scenes draw through one shared three.js
rig, and a vector has no second axis to band. **Every readout key is
lowercase** -- `stage.dataset.fN` writes `data-f-n`, so a camel-case key is a
selector nobody will guess. The shape badge on the stage takes a scene's `shape(ctx)` when it has
one and its readout's `data.shape` otherwise, and publishes `data-tensorshape`.

**And every section carries the NumPy for its picture**, in a static
`<pre id="np-<scene>">` right under the equation -- the notation, then the line
you would type. A scene supplies `code(ctx)`, beside `readout(ctx)` and built
from the same `ctx.state`, so the shapes in the code cannot disagree with the
shapes on the stage: drop an eight-second file and both follow it. The frame
writes it in `changed()`, not `fillText()`, for that reason, and hides the
block of a scene with no `code()`. The lines are **one copy for both
languages**, like the `<math>`; only the trailing `#` comments are translated,
through a `np` key in the copy table, and `K.code(rows)` lays them out from
`[code, comment]` pairs with the hashes aligned. Three things a new block must
keep: `contain: inline-size` on the `<pre>` (the `.eqscroll` lesson -- a long
line otherwise takes the layout past 390px), `tabindex="0"` with
`aria-labelledby` on it (axe requires a scrollable region to be reachable and
named), and **82 characters**, which `check_navigation.cjs` measures live on
every one of the ten. `npm test` measures it too, but only at the opening
state: the three heavy scenes have not finished factorising there, so their
short form is what it sees -- which is how three blocks once shipped at 85, 86
and 94.

The attention stage (`attention-stage.html`, titled *Attention, from words
to weights*) is the same scroller shape as the audio stage, minus the
transport and the timeline: **ten sections in three parts** down the left, a
sticky stage on the right, one `<section class="step">` per scene, each
opening with a predict-first line. It follows one sentence, "I know you
know", from words to attention's output -- from words to numbers (`words`,
`ids`, `embed`), one attention head (`project`, `scores`, `scale`,
`softmax`, `output`), and beyond one head (`heads`, `batch`). **No three.js
and no canvas anywhere on it**: every picture is inline SVG with real
`<text>`, drawn by `attention-kit.js`'s `numGrid`, `bars`, `arrowRow` and
`chips` from arrays `attention-core.js` computed. A scene's `draw()` runs
only on a control change or a scene switch, never on a per-frame clock, which
is what makes "never re-tween `<text>`" trivially true here -- there is no
frame loop to tween inside. `attention-core.js` seeds everything from
`SEED = 17`: a six-row embedding table in `{0, 1}`, three projection matrices
with at most three non-zero `{-1, 0, 1}` entries per column, and a six-word
vocabulary chosen so the sentence encodes to the fixed ids (`[3, 1, 4, 1]`,
"know" repeated on purpose) -- so every Q, K and V entry a reader sees is an
integer with `|value| <= 3`, a legibility contract
`tests/attention_core.test.cjs` pins. The one-head part uses
`headProjections(0)`, the first four columns of those matrices, so its
numbers are head 0's in `heads`; the test pins that too. Its honest ending is
that the two "know" rows come out of attention identical: without position,
the same word is the same query, key and value. `scale` is the one scene
that does not draw the stage's own Q and K; it samples ±1 vectors through
`scaleSpread` and draws the *typical* query, not the first, because the
first at d_k = 256 was a two-way tie that told the opposite story. The
`heads` scene carries the same reshape bug the audio stage's `scramble`
warns about in general: its "flat" option is a *direct* reshape with no
transpose, same shape as the honest one, wrong tokens in every row after the
first, and `traceCell` says exactly which token a cell actually came from.
Five scenes (`scores`, `scale`, `softmax`, `output`, `batch`) carry a display
equation in notebook 17's own letters (`b`, `h`, `s`, `t`, `d`), with
`data-hl` tokens exactly `{batch, head, query, key, feat}` -- the one-head
ones use only `s`, `t` and `d`, and `batch` carries the four-index form --
never `k` as an index, which is the rank on three of the projection stage's
own scenes. **Every section carries its NumPy**, numpy only, in a
`<pre id="np-<scene>">` the frame writes from the scene's `code(ctx)`, on
the audio stage's rules (one copy of the code, translated `#` comments, 82
characters, measured by `npm test` at every setting of a scene's controls and
by `check_navigation.cjs` after the drive). Link a scene by its name
(`#words`, `#ids`, `#embed`, `#project`, `#scores`, `#scale`, `#softmax`,
`#output`, `#heads`, `#batch`), never a step number. Its embed is stricter
than every other widget's: nothing on the stage fetches anything beyond its
own scripts, its CSS and the one vendored face that CSS names, so the check
counts resource entries rather than checking `window.THREE` alone. **An SVG child laid out past the viewBox is
not clipped and not reported -- it is simply not drawn**, while the readout
goes on quoting its numbers, so the check measures every scene as it opens:
the union of its children's boxes, through the CTM, against the `640 × 400`,
and `words` and `scale` at the far end of their controls, and `batch` --
whose picture is sized from its sliders -- at both corners of them. A scene
starts 44 units down to clear the claim chip, and `fitClaim()` grows the
viewBox upward when the chip measures taller than that, so no scene has to
know how tall the claim came out. The contract is
`attention-scenes/README.md`.

The factorisation stage (`factor-stage.html`, titled *Tucker and CP*) is the
same scroller shape again: **eight sections in four parts**, one `<section
class="step">` per scene, on the real taxi tensor -- 4 pickup boroughs by 5
dropoff boroughs by 24 hours, `interactive/data/taxi.json`, generated with the
network by `scripts/gen_figures.py taxi` and committed rather than fetched
live from the CSV. Section 10 is the cube (`tensor`), the cube laid flat
three ways (`unfold`), the SVD of one unfolding (`hosvd`) and the core and
three factors that rebuild it (`tucker`); section 11 is one rank-1 term
(`rank1`), several (`cp`), the alternating least squares that finds them
(`als`), and the same parameter budget spent both ways (`budget`). **Four of
them draw in three.js** -- `tensor`, `unfold`, `tucker`, `rank1`, the
pictures of a cube -- on the audio stage's frame (lazy boot through
`vendor/linalg-boot.js`, the import map, `linalg-core`'s orbit, drift and
glide), and each draws an **SVG twin** from the same model projected through
the same orbit, which is the no-WebGL path, the hero embed and what the
browser check measures; the twin takes a board the shape of the stage. The
other four are SVG only. A voxel's *volume* is its count, because one route
holds 76% of the trips. Geometry eases by piece (`K.follow`) and text never
does; the unfold's move is `FC.morphStep`, a state machine in the core that
folds back through the cube to change mode, and its turn-deal-press morph is
tested for no two voxels ever overlapping. Every section carries a MathML
equation with `data-hl` tokens exactly `{pickup, dropoff, hour, core,
rank}` -- which on this stage light the piece in the **three.js scenes
too** -- in notebook 10's letters (i, j, k; a, b, c for the kept patterns;
modes from 0, `G ×₀ A ×₁ B ×₂ C`), and a `<pre id="np-<scene>">` of NumPy on
the audio stage's rules. Every gesture -- a voxel, a scree bar, a core
entry, a seed, a budget point -- sets controls a keyboard also reaches.
`factor-core.js` calls into `linalg-core.js` for its SVD, its matrix product
and its pseudoinverse, so it loads after it; two things the core's comments
explain are `linalg-core.svd`'s **thin `U`**, which caps the hour rank at 20
rather than 24, and its **sign convention**, which differs between a tall
unfolding and a wide one and so is renormalised to positive-largest inside
`hosvd()` rather than trusted from whichever branch produced it. On a fetch
failure the page draws `FC.synthetic()` and publishes `data-standin="1"`; the
embed (`?embed=1&theme=navy`) fetches the real, ~2 kB tensor even so, opens on
the `tucker` twin, and fetches no three.js. Link by scene name (`#tensor`,
`#unfold`, `#hosvd`, `#tucker`, `#rank1`, `#cp`, `#als`, `#budget`); controls
are `#c-<scene>-<control>` and readouts `#read-<scene>`. The check measures
each 2-D scene against its 820 x 420 at its opening values *and at the
corners of the sliders that resize it*, each twin at home, after a turn and at
its largest slider corner on a forced-flat pass, and on the three.js path the
label chips against the stage. The contract is `factor-scenes/README.md`.

**Arithmetic goes in a core module, and only arithmetic.** The visualizer's --
strides, contiguity, the memory orders and NumPy's view-or-copy rule for a
reshape -- is `interactive/tensor-core.js`; the stage's -- least squares two
ways, a one-sided-Jacobi SVD, the condition number, the pseudoinverse -- is
`interactive/linalg-core.js` -- with the null space, a 3 x 3 eigen-solver,
float32 rounding and an unguarded Cramer solve for the steps that need them.
Both are plain scripts the page loads first, and
`tests/{tensor,linalg}_core.test.cjs` pin them under `npm test`; the attention
stage's own arithmetic -- the gather, the three projections, splitting heads
by reshape-then-transpose and the two contractions -- is
`interactive/attention-core.js`, pinned the same way by
`tests/attention_core.test.cjs`, and carries none of the three state machines
below because the stage has no camera and no idle drift to keep one for.
The factorisation stage's -- unfold/fold and an entry's unfolding address,
mode products, HOSVD and one core entry's share, CP-ALS solve by solve and a
fit normalised into weights, the budget search and its frontier, and the
unfold's `morphStep` -- is `interactive/factor-core.js`, pinned by
`tests/factor_core.test.cjs`, and calls into `linalg-core.js` for its SVD
rather than carrying a second one, so it loads after it.
Three kinds of
state machine live there too, and they are the exception that says what the rule
is for: where a stretch of idle drift takes its origin, where an *interrupted*
tween takes its origin, and where an orbit's clamps sit, are all invisible in a
screenshot and survive an end-state assertion, so each is written as a state in
and a state out and pinned like the arithmetic. Both widgets drift while idle
and hand the view over the moment a reader reaches for it; the stage orbits
from one frame -- azimuth about world +Y, up always +Y, so nothing it draws ever
rolls -- and both its scenes and both its render paths take the camera from
`orbitEye`. Everything else that touches a widget's state -- anything a
screenshot or `check_navigation.cjs` would catch -- stays in the HTML.

`photos.json` is the visualizer's one generated input; if it fails to load the
widget counts instead, which `check_navigation.cjs` treats as a regression.
Every widget takes `?embed=1&theme=navy`, and none of them fetches
three.js there: the stage's embed is the portal's still frame, drawn flat,
with the scroller and its steps gone. **The hero does not load the embeds;
it shows pictures of them.** One tab per widget, and each panel is a
screenshot of that widget's embed in the page's language
(`images/hero-<widget>-<lang>.webp`, drawn by `scripts/gen_hero_stills.cjs`),
wrapped in a link to the full widget -- the picture is the way in, and there is
no separate open button. The check pins one still per widget, the link and the
picture per tab, and no iframe in the hero. An embed's `#embedcap` still
carries a caption and never a link. Rerun the generator when an embed's
picture changes; nothing will tell you a still is stale.

three.js is **vendored** at `interactive/vendor/`, core build and eleven
`examples/jsm` addons (the composer, the bloom pass, CSS2D labels and their
transitive imports), each with its URL, SHA-256 and date in a README. The
addons say `from 'three'`, and a **static import map** in the `<head>` of each
page that draws in three.js (the projection, audio and factorisation stages)
resolves that -- rewriting the specifier in eleven files would make the README's
hashes describe something other than what upstream ships. The map is inert
until a module import resolves, so the lazy `bootGL()` still holds. Upgrading
means both builds, both hash tables, both boot modules, the import map, and
every `repo.widgets` line.

`check_links.py` fails the build if any file in `repo.widgets` is missing from
`docs/` -- for the addons that is the *only* guard, since an import map is
element content and the link harvest reads attributes. `check_navigation.cjs`
drives every widget in both languages, from a per-widget `drive` callback
rather than a flag, and runs axe over them; its `widgets` table is the order
the `drive*` functions are written in. The stage's callback opens every one
of its eight steps and asserts each step's claim off `data-*`. Every colour a widget puts on text
clears 4.5:1 per theme -- the four axis hues have `--axN-ink` text variants,
and the stages' dark-in-every-theme canvas has one `--stage*` set in
`widget-chrome.css`, measured against the label chip -- so a contrast finding in a widget is real, never
something to allowlist.

**A long line does not get clipped, it disappears.** three.js frustum-culls a
`Line` by its bounding sphere, as one object: a line whose ends run 100-odd
world units past the frame has a sphere the camera never intersects, so the
whole line is dropped rather than drawn to the edge and cut. Clipping planes
do not help -- they cut what is already being drawn, and this is culled before
that. Keep an axis, a grid or any other piece of frame furniture in world
units close to what the camera actually holds; reach for
`geometry.computeBoundingSphere()` or `line.frustumCulled = false` only when a
long line is genuinely the picture.

**Assert a browser state by polling it, never after a fixed wait.** A
`waitForTimeout` long enough on this Mac is short on the GitHub Linux runner,
where the whole check runs slower and a wheel or drag settles later; the
assertion then reads the pre-gesture value and fails only in CI. So a new or
changed assertion in `check_navigation.cjs` goes through `page.waitForFunction`
on the `data-*` the widget publishes, with a timeout as the ceiling rather than
the schedule. This is a rule for what you write, not a description of the file:
about twenty `waitForTimeout` calls are still in there, some of them feeding an
assertion rather than being the thing under test. Leave a fixed wait only where
the wait *is* the subject, such as the visualizer's 0.3 s drift resume or the
reduced-motion check.

## Which document owns what

Seven documents describe the same workshop to different readers. Each fact has
exactly one home; before adding a paragraph, find whose job it is:

| Document | Owns | Never contains |
|---|---|---|
| `_variables.yml` | Every shared fact: repo coordinates, section titles and minutes, the running clock, quiz metadata, prerequisite URLs. | — |
| `index.qmd` / `es/index.qmd` | The student's entry point: what this is, who it is for, **what each resource is for**, prerequisites in full, and how we work. The hero carries one live tab per widget. | Teaching content or exercises. A section table, Colab instructions, or a tour of the datasets — the homepage is a front door, and all three were cut from it. A card per widget: that is `interactive.qmd`'s, and the homepage keeps one sentence and a link. |
| The handbook (`tensors_workshop_plan_with_quizzes.md`, and `es/` beside it) | The session text: theory, exercises, worked solutions, the appendices, facilitator notes. The only document that owns Part/Block. | Prerequisites, setup instructions, "how we work" — it links to the homepage for those. The bibliography — it links to `references.qmd`, and its `## Further Reading` section is now only that pointer. |
| `interactive.qmd` / `es/interactive.qmd` | One card per widget in `repo.widgets`: what it answers, which sections it belongs to, and the named scenes worth linking straight to. The only page that gathers them. | The workshop's content. A count of the widgets — say what they are, not how many. |
| `notebooks.qmd` / `es/notebooks.qmd` | The list of every notebook, how they are built, what each one needs, and how to run them off Colab. The only page left that enumerates all thirteen sections in both languages, which is what check 6 watches. Its *What each notebook needs* table is generated — do not hand-edit it. | The workshop's content or its schedule. |
| `kahoot.qmd` / `es/kahoot.qmd` | The three quizzes and how to run them. The live questions on kahoot.it stay in English; this page is the how-to. | — |
| `references.qmd` / `es/references.qmd` | Every citation, with DOIs and author pages. | Prerequisites — it links to the homepage. Teaching content: it says what a work is *for*, never what it says. |
| `companion.qmd` / `es/companion.qmd` | The machine-generated companion: the NotebookLM notebook and every artifact out of it, and the standing note that none of it was written or checked by a person. It owns those links, so nothing else carries one. It also carries the brainstorm diagram, the one thing on the page a person drew, and says so. | The workshop's own content. It explains material, it never defines it. |
| `README.md` | The GitHub shopfront: what this is, who it is for, prerequisites **in brief**, and links out. | Anything the site already owns. |

**The Spanish handbook is machine-translated** from the English one, which is
the source of truth, and says so in a callout. Code, identifiers and `# TODO`
comments stay in English. Nothing generates or checks the Spanish prose beyond
check 13, which compares the two handbooks' shape and requires their fenced
code to be byte-identical: change both handbooks in the same commit.

**One canonical identifier.** A segment is a **section, `00`–`12`**,
everywhere. Part I–IV and Block 1–7 are the handbook's secondary labels, live in
`_variables.yml` as `part:` and `block:`, and appear only in the handbook's
exercise headings and its generated schedule table. Prose that says "Block 4"
where it means section 07 is the bug.

**The local-run command** is `uv run --group notebooks jupyter lab`, in six
places (`README.md` twice, `notebooks.qmd` in both languages,
`notebooks/README.md`, and Commands below). The package list it used to spell
out is the generated `notebooks` group in `pyproject.toml`: add an import to a
notebook and rerun `gen_tables.py`; never edit the group.

## How a notebook looks

Core routes and learning prompts are notebook-owned body cells. The route
cell's `metadata.workshop` lists preparation IDs and the activity ID. Live
notebooks 01–11 also declare the complete contiguous `sequence` and its
`checkpoint`; the runtime runner executes every code cell in that sequence.
Shared `practice_en/es` and `explore_en/es` in `_variables.yml` own the visible
outcome labels in notebook headers, slides and handbook. Visible **Core prep**
labels and `workshop-core-prep` / `workshop-core-activity` tags identify the
route. Do not make a core route depend on an optional exercise or an unopened
solution. `scripts/check_teaching_materials.py` checks these references and the
kit's local links statically; `tests/test_teaching_materials.py` tests the
checker and the tiny worked examples.

`scripts/test_notebooks.py` runs the route: one fresh kernel per notebook
executes the declared route and then the **paired solution**, the
`solution`-tagged cell immediately after the activity, because many activity
cells are the student's blank `# TODO` block. A route with no executable code
(notebooks 00, 12, 16, 17 and 18) names what CI executes in `ci_cells` on the
same scaffold cell; `run_set()` refuses an entry that is not a unique code cell, and
check 2's `EXPECTED` guard refuses one that drops an asserted cell. Keep the
blanket fallback for a notebook with no route. The runner asserts that a blank
activity stayed blank, that each route prints its `EXPECTED` numbers, and that
no widget callback failed -- a sweep of controls bounded by
`WORKSHOP_PROBE_CHANGES` (8) and `WORKSHOP_PROBE_BUDGET` (20 s), with pyplot
and the display publisher silenced while it runs. Nothing is stripped or
mocked: `%pip install` runs verbatim and datasets are fetched for real, because
Colab is the runtime this defends. `check_colab_parity()` guards guarded
`google.colab` imports, no absolute paths, quiet `%pip`, no hardcoded device.

**A route whose remote could not be reached is skipped, not failed.** A 502,
503 or 504, a 429, a refused connection, a DNS miss or a timeout says nothing
about the notebook, and Chicago's portal answers 503 for minutes at a time. A
404, 403, 410 or 500 still fails: the host answered -- a 500 is usually a bad
query, which is a notebook bug -- and a dead dataset URL is what this gate
exists to catch. `UNREACHABLE` in `test_notebooks.py` draws that line, matching
the shape of an exception *summary* line so that a token echoed from a frame's
source cannot pass for a cause. A skipped route is named in the summary under
`UNCHECKED:`, so a run that reports less than usual never reads like a clean
one.

The facilitator guide, assessments, worked mistakes and feedback form are
hand-maintained Markdown with matching files in `es/`. Keep both languages
aligned. **`worked-mistakes.md` pairs one-to-one with the predict-first
cells**: each entry is its notebook's delimited counterexample with the `pred_`
prefixes dropped, byte-identical code in both languages;
`tests/test_teaching_materials.py` reads the expected section numbers off
`notebooks/`. Change a predict cell's arithmetic and change the entry in the
same commit.

Two conventions carry the look of a notebook, both forced by where notebooks
are read:

**Inline styles only.** Colab strips a `<style>` block from a markdown cell;
GitHub strips the `style` attribute. So: every styled block must still read as
plain prose with the styling gone, and colour is never the only carrier of a
meaning (the Spanish box says `ESPAÑOL` in words); tints are `rgba` over the
theme, never opaque fills or hard-coded text colours; headings stay real
markdown headings. A styled `<div>` is raw HTML, so use `<b>`, `<code>` and
`<ul>` inside it, never `**bold**`.

**Equations are display maths in plain markdown, never inside a box** --
GitHub will not typeset `$$` inside a `<div>`. One copy serves both languages;
the plain-English sentence under it is what gets translated, and there should
always be one. Multi-letter names are `\mathrm{ndim}`, not `\texttt`; a code
identifier belongs in backticks in the prose, not in maths.

`gen_notebooks.py` owns the vocabulary -- `rule()`, `eyebrow()`, `es_box()`
and one accent per notebook from `ACCENTS` -- for the header and footer. Body
cells repeat the same inline styles by hand.

**Two kinds of cell are folded**, and `hide-input` is the tag they share;
`_normalize_cell` keys on it to keep a cell folded after a Colab round-trip:

| Tag | Hides | Check 10 |
|---|---|---|
| `solution` | an answer the reader should not see yet | **applies** — no visible cell may depend on a name only a solution binds |
| `plumbing` | widget and plotting scaffolding whose output is the lesson | **does not quarantine it** — a plumbing cell counts as visible on both sides |

**The predict-first cells are the one place a `<style>` block is allowed**,
because it ships in the cell's *output*, which Colab does not strip; it is
scoped to a class the cell adds itself, and the options work without it. They
present the answer through `pred_panel`, which lays out what `check_prediction`
prints; `EN` and `ES` stay written out as tags.

**The frame stepper is `plumbing`, and no route runs it.** It renders into a
`widgets.Image`, never a `widgets.Output`, and is in no `ci_cells` -- so check
it in Colab by hand when you touch it. It catches its own network failure and
says so in both languages.

## Extras: notebooks that are not sections

`extras:` in `_variables.yml` declares a take-home notebook. The mapping is
`sections:` minus `minutes`, `start`, `end` and `part`, and that absence *is*
the mechanism: `scripts/timeline.py` only walks `sections`, so an extra cannot
move the clock, the agenda or `workshop.minutes`, and gets no `#sec-NN` slide
anchor and no Kahoot. Everywhere a **notebook** is handled, extras are
included: `gen_notebooks.py` and checks 1, 2, 4 and 10. Everywhere a
**section** is handled, they are not: checks 5, 6 and 8 stay on `SECTIONS`.
Their tables are `_includes/notebooks-extra-{en,es}.md` and
`_includes/extras-{en,es}.md`, `# | Deep dive | Colab`, no Slides and no Quiz.

## No commits on main

Work goes on a branch and reaches `main` through a pull request. Three guards:

```bash
git config core.hooksPath .githooks    # required once per clone
```

- `.githooks/pre-commit` refuses a commit while HEAD is `main`;
  `ALLOW_MAIN_COMMIT=1` overrides it for one commit at your own terminal.
- `.claude/settings.json` adds a PreToolUse hook, `.claude/hooks/no_commit_on_main.py`,
  so an agent's commit-creating commands on `main` are denied before they run.
  It does **not** honour `ALLOW_MAIN_COMMIT`: an agent must not self-authorize a
  bypass -- ask for a branch. Without `python3` it blocks any command mentioning
  "commit".
- The [protect-main ruleset](https://github.com/project-delphi/tensors-workshop/rules/21154813)
  blocks deletion and force-push, requires a pull request, and requires both
  `render` and `notebooks` to pass on a branch up to date with `main`. Nobody
  is in the bypass list. No approving review is required. When something
  upstream is genuinely down, fix it or take the check out of the ruleset for
  the day; do not merge around it.

| | `pre-commit` | Claude hook | GitHub ruleset |
|---|---|---|---|
| `git commit` | yes | yes | no — the commit is local |
| `git cherry-pick`, `revert`, `am` | **no** | yes | no |
| `git push` to `main` | no | no | yes — rejected; open a PR |
| `git merge`, `rebase`, force-push of `main` on `origin` | no | no | yes |

Treat the Claude hook as an early, explanatory failure. The ruleset is the
boundary.

## Commands

```bash
quarto preview          # live site at http://localhost:4200
quarto render           # writes docs/

uv run --group site python scripts/gen_tables.py
uv run --group site python scripts/gen_notebooks.py
uv run --group site python scripts/check_links.py     # verifies docs/
uv run --group site python scripts/check_links.py --notebooks-only
uv run --group site python scripts/nb_cells.py index 09   # a cell index, `show 09 ID`, or `diff main`: read a notebook by cell, not by file

uv run --group lint ruff check scripts tests            # CI runs both of these
uv run --group lint ruff format scripts tests           # (format --check in CI)
uv run --group test python scripts/check_teaching_materials.py
uv run --group test python -m unittest discover -s tests -v
npm run check:navigation                                # the browser check and the axe pass, after a render
npm test                                                # the visualizer's arithmetic, no browser

# Runs the notebooks. A kernel per notebook, the network, and the scientific
# stack — so it is its own CI job, not part of the render gate.
uv run --group execute python scripts/test_notebooks.py
uv run --group execute python scripts/test_notebooks.py --list       # no kernel
uv run --group execute python scripts/test_notebooks.py --only 10
uv run --group execute python scripts/test_notebooks.py --offline

# The image generators. Network, heavy deps, not run by CI — see above.
uv run --group figures python scripts/gen_thumbnails.py
uv run --group figures python scripts/gen_figures.py
uv run --group figures python scripts/gen_figures.py widget   # just the visualizer's photos.json; no network
uv run --group figures python scripts/gen_figures.py taxi     # the factorisation stage's taxi.json; needs the network
uv run --group figures python scripts/gen_cube_gifs.py        # notebooks 00–15
uv run --group figures python scripts/gen_cube_gifs.py 04 10  # just these two
uv run --group figures python scripts/gen_pca_gifs.py         # notebook 16
uv run --group figures python scripts/gen_tensor_module_gifs.py  # notebooks 17–18
uv run --group figures python scripts/gen_slide_art.py        # needs Chrome and the network
npm run gen:hero                                              # the hero's widget stills, from each embed
```

`check_links.py` is the site test suite -- there is no pytest here. It prints
fourteen numbered checks; the numbers are a contract this file refers to, so a
new check is appended, never inserted. Twelve can fail the build:

1. Notebooks are valid, with no outputs or execution counts.
2. Every notebook `docs/` serves is byte-identical to the one in `notebooks/`.
3. Internal links resolve, including the `#fragment`; every `thumb` file exists.
4. Every Colab badge points at its own existing notebook; every notebook-to-
   notebook link names an `.ipynb` that exists; every image a notebook embeds
   from the site names a file in `images/`, with alt text, and is one of that
   notebook's own `cube-NN-*` animations (URLs absolute, because Colab has no
   checkout to resolve against).
5. Both decks carry every section anchor.
6. The EN and ES notebooks pages list the same thirteen sections.
7. The two references pages cite the same works; every ml-blog URL is declared
   under `reading:`; every `references:` group anchor is on both pages.
8. Each section's written `start`/`end` matches the running clock, and the
   `agenda` rows account for every segment exactly once, in order.
9. The deck timer's total matches `workshop.minutes`.
10. No visible notebook cell depends on a name bound only in a folded solution.
11. Kahoot join URLs -- **prints a TODO, never fails**: pasted in after the page exists.
12. Companion artifact links and exports -- the same.
13. The two handbooks have the same shape (heading counts, table rows, notebooks
    linked) and byte-identical fenced code. It cannot catch wording, which is
    the half that drifts.
14. Both Kahoot pages carry `#quiz-1`, `#quiz-2` and `#quiz-3`.

`--notebooks-only` runs checks 1, 2, 4 and 10 alone; run it after any content
change. Quarto never executes the notebooks, so building needs Quarto only;
to run them locally, `uv run --group notebooks jupyter lab`. `matplotlib` and
`ipywidgets` ship with Colab but not with a local `jupyterlab`, which is why
the generated group carries them; `tensorly` is `%pip`-installed by the cells
that need it, so the generator drops it.

## Publishing

**`.github/workflows/publish.yml` is the publisher.** `render` regenerates the
derived files, lints, renders the site, and runs `check_links.py` and the
browser check over the result; `actions/upload-pages-artifact` hands that exact
`docs/` to `deploy`, the only job holding `pages: write`, guarded by
`github.event_name == 'push' && github.ref == 'refs/heads/main'` because
`render` is a required check on every PR. The live site is the render that
passed.

**`docs/` is gitignored build output and is never committed.** `quarto render`
still writes it locally and both checkers read it from there, so render first
and expect `git status` to stay empty afterwards. Check 2 still byte-compares
`docs/notebooks/` against `notebooks/`; what it now catches is the
`notebooks/*.ipynb` line disappearing from `resources:`, or an orphan left in
a `docs/` you did not clean.

Quarto is pinned to **1.6.40** in the workflow. Nothing compares your local
render against CI's, so use the pinned version or what you check is not what
deploys.

`slides/deck-pace.html` is pulled into both decks with `include-after-body`
and owns `TOTAL_SECONDS` (`total-time:` in a deck header silently does
nothing). Two traps: Quarto runs its shortcode parser over included HTML, so a
bare `var` shortcode in a comment there crashes the render; and reveal wraps
each section into a `.stack` at init, so level-1 slides are not top-level
children by the time scripts run. A section's part number reaches the
breadcrumb through a hidden `::: {.sec-part}` div on each title slide -- a
`var` shortcode inside a heading's `{...}` is folded into the heading text and
destroys the `#sec-NN` anchor.

`_quarto.yml` has an explicit `render:` list on purpose. Adding a page means
adding it there and, if it has a counterpart in the other language, tagging
both navbar items `rel: lang-en` / `rel: lang-es`; an untagged item shows in
both languages.

## Working on WSL2 (Windows)

- Clone into the Linux filesystem (`~/code/...`), **not** `/mnt/c/...`. Quarto
  renders far slower across the 9p mount and `quarto preview`'s file watching is
  unreliable there. `localhost:4200` is reachable from the Windows browser.
- Line endings need no setup: `.gitattributes` pins `eol=lf`, which overrides
  `core.autocrlf` however a clone has it. Don't "fix" it with
  `core.autocrlf=false` — that's the setting that lets CRLF reach the index.
- `python` may not exist; use `python3`, or `uv run` as above.
- Install Quarto with the Linux `.deb` inside WSL, not the Windows build.
