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
| `_includes/*.md` (both notebook tables, the agenda both decks show, the companion's video, shorts, audio, infographic, self-check and mind-map blocks, the brainstorm diagram's inline SVG, the notebooks page's dependency table, the day sheet's timing strip, and the whole body of both references pages) | `scripts/gen_tables.py` |
| The marker-delimited regions inside `README.md`, `notebooks/README.md`, each language's handbook schedule and the `notebooks` dependency group in `pyproject.toml` -- the rest of all five files is hand-maintained | `scripts/gen_tables.py` |
| `notebooks/*.ipynb` -- header (cell 0) and footer (final cell) only | `scripts/gen_notebooks.py` using `_variables.yml` |
| `notebooks/*.ipynb` -- every cell between the header and footer, including Setup | the notebook itself; editable directly in Colab/Gemini |
| `images/ds-*` (dataset cards) | `scripts/gen_thumbnails.py` |
| `images/hero-band.png`, `images/fig-*` (the handbook's figures) | `scripts/gen_figures.py` |
| `images/og-card.png` (the link preview, 1200×630, in the vendored faces) | `scripts/gen_figures.py og` |
| `images/hero-*-{en,es}.webp` (the homepage hero's widget stills) | `scripts/gen_hero_stills.cjs` (`npm run gen:hero`) |
| `interactive/data/photos.json` (the visualizer's photos at 4, 8, 16, 32, 64 and 128 px) | `scripts/gen_figures.py widget` |
| `interactive/data/taxi.json` (the factorisation stage's own copy of the Block 6 taxi tensor) | `scripts/gen_figures.py taxi` (network: the taxi CSV) |
| `images/cube-00-*.gif` … `images/cube-15-*.gif` (at least three per notebook; `SCENES` stops at 15) | `scripts/gen_cube_gifs.py` |
| `images/cube-16-*.gif` (notebook 16's PCA animations) | `scripts/gen_pca_gifs.py` |
| `images/cube-17-*.gif`, `images/cube-18-*.gif` (attention and compression) | `scripts/gen_tensor_module_gifs.py` |
| `images/cube-19-*.gif` (the core, the fold, CP's cancelling terms) | `scripts/gen_cp_tucker_gifs.py` |
| `slides/{en,es}/images/slides-final/slide-NNa.webp` (art added since #45) | `scripts/gen_slide_art.py` |
| `data/*` (the datasets' fallback copies; network, not in the CI gate) | `scripts/fetch_mirrors.py` |
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
dirty `git status` is an input change or a matplotlib release. The others
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
- `gen_cp_tucker_gifs.py` draws notebook 19's three: CP's superdiagonal core
  against Tucker's dense one, the 8 × 8 block fold, and two rank-one terms
  growing as 1/ε while their sum converges -- the cancellation Part 3 of the
  notebook measures on a real kernel. Captions are expressions, `loop=0`.
- `gen_slide_art.py` draws the `slide-NNa` insertions from HTML and CSS,
  screenshotted by headless Chrome at 1920×1080 and encoded as WebP with
  Pillow, so it runs under `--group figures`. The thirty-one pre-existing slides
  have no source and are redrawn by hand -- touching one moves its equations,
  numbers and teaching text into editable Quarto content instead, per the rule
  and inventory in `slides/README.md`. Copy for both languages lives in one
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

**All three files are in `repo.widgets`.** `fonts/fonts.css` is a
`<link href>` on every page, which check 3's harvest sees; the two `.woff2`
files are named only by a `@font-face url()`, which is CSS content the harvest
cannot see, so their `repo.widgets` lines are what makes `check_links.py` look
for them -- the `cmu-serif` entries are the precedent. `check_navigation.cjs`
also asserts `document.fonts.check` for both faces on `index` in both
languages, which is what catches a corrupt woff2, or a URL that resolves to the
wrong depth on one language's pages.

## The widgets

**`interactive/` is hand-written**, and the one asset class with neither a
generator nor a byte-exact gate -- which is why it has a section of its own
rather than a corner of the one above. Nothing regenerates these files, so
nothing catches a mistake in them by comparing bytes; what guards them
instead is `npm test` over the core modules and scene registries and
`check_navigation.cjs` over the rendered pages, both under `## Commands`. The HTML widgets -- the
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

**Each stage keeps its own rules in a contract README** beside its scene
files: the `register({...})` shape, what each copy key is for, the scene
order, the equation's letters and `data-hl` tokens, the arithmetic its core
holds, and what the browser check measures. Read the one for the stage you
are touching before you write a scene; this section keeps only what they
share.

- **Projection and the SVD** (`linalg-stage.html`, sections 07–09): eight
  steps from a projection to a float32 failure, in three.js with a flat SVG
  fallback. Scenes `#projection`, `#wide`, `#collapse`, `#portal`,
  `#ellipsoid`, `#eigen`, `#collinear`, `#precision`; core `linalg-core.js`
  (`tests/linalg_core.test.cjs`). The contract is
  `interactive/linalg-scenes/README.md`.
- **The audio tensor** (`voice-stage.html`, sections 00/02/04/09): ten
  sections in five parts from a sampled wave to a rank-4 batch, with a
  transport and a whole-recording timeline. Scenes `#sample`, `#quantize`,
  `#array`, `#frame`, `#spectrum`, `#window`, `#scramble`, `#lowrank`, `#nmf`,
  `#batch`; core `audio-core.js` (`tests/audio_core.test.cjs`). The contract
  is `interactive/voice-scenes/README.md`.
- **Attention, from words to weights** (`attention-stage.html`, sections
  04/06/Appendix B): ten sections that follow "I know you know" to
  attention's output, all inline SVG. Scenes `#words`, `#ids`, `#embed`,
  `#project`, `#scores`, `#scale`, `#softmax`, `#output`, `#heads`, `#batch`;
  core `attention-core.js` (`tests/attention_core.test.cjs`). The contract is
  `interactive/attention-scenes/README.md`.
- **Tucker and CP** (`factor-stage.html`, sections 10/11/Appendix C): eight
  sections on the real 4 × 5 × 24 taxi tensor, four in three.js with SVG
  twins. Scenes `#tensor`, `#unfold`, `#hosvd`, `#tucker`, `#rank1`, `#cp`,
  `#als`, `#budget`; core `factor-core.js` (`tests/factor_core.test.cjs`).
  The contract is `interactive/factor-scenes/README.md`.

**What the stages share.** Each is a scroller: one `<section class="step">`
per scene down the left and a sticky stage on the right. A new scene is at
least a scene file, a section, a `<script src>` line and a `repo.widgets`
line; its stage's contract lists the rest.

**A step's controls sit under the stage, not in its prose.** On a wide
screen `interactive/step-dock.js` moves each step's controls and readout
(`.ctl` and `.readout` on the projection stage, `.controls` and `.readout` on
the other three) into a `#dock` between the stage and the step bar, and
shows the panel of the step in view; the predict-first line stays in the
prose, where it is read before anything is touched. The nodes are moved, not
copied, so ids, listeners and `data-*` are unchanged -- but a lookup that
searched *the step* for its controls no longer finds them: use the handle's
`controlsOf(step)`, and in `check_navigation.cjs` the panel,
`.dock-panel[data-step="step-…"]`. Below the page's stacking width the nodes
go back to their steps and the dock is hidden. The sticky column is one
viewport tall and only the dock scrolls, so a stage that grows taller takes
its height from the dock. **Link to a scene by its name**
(`#portal`, `#heads`), never `#step-N`: the number moves on a reorder, the
name does not, and the notebooks and both handbooks use the names. Every scene
opens with a predict-first line and a claim on the stage's title card, and its
readout and every `data-*` are written from the controls, never from an eased
frame, so the browser check reads the truth while a picture is still moving.
Outside the projection stage a control is `#c-<scene>-<control>` and a readout
`#read-<scene>`, because one control name lives in several sections. The three
stages that draw in three.js boot it lazily on the first three.js scene shown,
through `vendor/linalg-boot.js` and the import map, take their camera from
`linalg-core`'s orbit, and keep a flat twin for a reader without WebGL.

**A display equation is hand-written MathML, with no library.** The claim
cards are Unicode `textContent` that `check_navigation.cjs` compares
byte-exact, so a renderer would break them, and this repo vendors every asset
with a SHA-256 anyway. The `<math>` is static in its section, because it is
the same in both languages and `check_links.py` reads the static HTML; only
the `eqcap` caption under it is translated. A letter a reader can point at
carries a `data-hl` token from its stage's closed set, and pointing at it
repaints the stage without ever calling `changed()`, because a hover must not
rewrite the readout. **Every readout key is lowercase** --
`stage.dataset.fN` writes `data-f-n`, so a camel-case key is a selector
nobody will guess.

**The audio, attention and factorisation stages show the NumPy for every
picture**, in a static `<pre id="np-<scene>">` under the equation that the
frame fills from the scene's `code(ctx)`. That is built from the same
`ctx.state` as `readout(ctx)`, so the shapes in the code cannot disagree with
the shapes on the stage. The code is one copy for both languages; only its
trailing `#` comments are translated, through the copy's `np` key, and no
line passes **82 characters**, which `check_navigation.cjs` measures live on
every block.

**An SVG child laid out past the viewBox is not clipped and not reported --
it is simply not drawn**, while the readout goes on quoting its numbers and
every `data-*` assertion still passes. So `check_navigation.cjs` measures
what the SVG pictures drew -- the union of every child's box through the CTM,
against the viewBox -- at a scene's opening values and at the corners of the
controls that resize it. Each stage's contract says which scenes and which
corners.

**Arithmetic goes in a core module, and only arithmetic.** Each is a plain
script the page loads first, pinned by its `tests/*_core.test.cjs` under
`npm test`. The visualizer's -- strides, contiguity, the memory orders and
NumPy's view-or-copy rule for a reshape -- is `interactive/tensor-core.js`;
each stage's is the core named above, and its contract lists what it holds.
`factor-core.js` calls into `linalg-core.js` for its SVD rather than carrying
a second one, so it loads after it. Three kinds of state machine live in
`tensor-core.js` and `linalg-core.js` too, and they are the exception that
says what the rule is for: where a stretch of idle drift takes its origin,
where an *interrupted* tween takes its origin, and where an orbit's clamps
sit, are all invisible in a screenshot and survive an end-state assertion, so
each is written as a state in and a state out and pinned like the arithmetic.
A widget that drifts while idle hands the view over the moment a reader
reaches for it.

**Every widget is moving within seconds of opening**, with nothing asked of
the reader: the four that drift start drifting, the broadcasting simulator
plays its stretch once, and the attention stage draws its first picture in
(opacity only, once, for the scene the page opens on). A *moving* pointer is
what holds a drift -- `pointermove`, never `pointerenter`, which Chromium
fires with no movement when the element under a still cursor changes. Under
`prefers-reduced-motion` none of it plays. `check_navigation.cjs`'s
`movesOnLoad()` loads each widget with the pointer resting on its stage and
fails unless the stage changes; a load animation publishes a `data-*` flag
(`data-playing`, `data-arriving`) so the drive waits for it before axe runs. Everything else that touches a widget's state -- anything a
screenshot or `check_navigation.cjs` would catch -- stays in the HTML.

`photos.json` is the visualizer's one generated input; if it fails to load the
widget counts instead, which `check_navigation.cjs` treats as a regression.
Every widget takes `?embed=1&theme=navy`, and none of them fetches
three.js there: the projection stage's embed is the portal's still frame,
drawn flat, with the scroller and its steps gone. **The hero does not load the embeds;
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
about fifteen `waitForTimeout` calls are still in there, and every one of them
is the thing under test rather than a stand-in for polling it -- a bounded
retry loop's own interval, the visualizer's and the projection stage's drift
resume, hover freezing a tween, a manual pause, or a reduced-motion check that
the camera does not move on its own. Leave a fixed wait only there; anywhere
else, poll the value the next assertion needs, with a timeout as the ceiling.

## Which document owns what

These documents describe the same workshop to different readers. Each fact has
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
`checkpoint`; the runtime runner executes every code cell in that sequence
except the predict-first cell, which it knows by its counterexample marker and
leaves to `tests/test_teaching_materials.py`. Shared `practice_en/es` and
`explore_en/es` in `_variables.yml` own the visible outcome labels in notebook
headers, slides and handbook. Visible **Core prep** labels and
`workshop-core-prep` / `workshop-core-activity` tags identify the route. Do not
make a core route depend on an optional exercise or an unopened solution.
`scripts/check_teaching_materials.py` checks these references and the kit's
local links statically; `tests/test_teaching_materials.py` tests the checker
and the tiny worked examples.

**A live core opens on a hook, not a table.** The first cell after the last
prep cell is something that surprises -- an output, a prediction, one number a
reader can check -- said in plain words, with the formula second and the
vocabulary or axis-letter table after it. Number a list only when it is a
sequence. Notebooks 02, 04 and 05 open on their predict-first cell; the rest
open on a small worked example. `test_live_cores_do_not_open_on_a_table`
refuses a table in that position.

`scripts/test_notebooks.py` runs the route: one fresh kernel per notebook
executes the declared route and then the **paired solution**, the
`solution`-tagged cell immediately after the activity, because many activity
cells are the student's blank `# TODO` block. A route with no executable code
(notebooks 00, 12, 16, 17, 18 and 19) names what CI executes in `ci_cells` on the
same scaffold cell; `run_set()` refuses an entry that is not a unique code cell
or that is a predict-first cell, and check 2's `EXPECTED` guard refuses one
that drops an asserted cell. Keep the blanket fallback for a notebook with no
route. The runner asserts that a blank
activity stayed blank, that each route prints its `EXPECTED` numbers, and that
no widget callback failed -- a sweep of controls bounded by
`WORKSHOP_PROBE_CHANGES` (8) and `WORKSHOP_PROBE_BUDGET` (20 s), with pyplot
and the display publisher silenced while it runs. Nothing is stripped or
mocked: `%pip install` runs verbatim and datasets are fetched for real, because
Colab is the runtime this defends. `check_colab_parity()` guards guarded
`google.colab` imports, no absolute paths, quiet `%pip`, no hardcoded device.
`--artifacts DIR` keeps what CI ran: each route's executed notebook, its
plots, `environment.txt` and a `coverage.json`/`coverage.md` table, uploaded
by `publish.yml`'s `notebooks` job and by `health.yml`.

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

**Every download a notebook makes has a copy in `data/`**, served from the
site at `https://project-delphi.github.io/tensors-workshop/data/<name>`, and
the fetch falls back to it when the upstream host does not answer. The helper
is `fetch()`, pasted into each setup cell that downloads: it retries each
source, checks the notebook's SHA-256 against whichever source answered, prints
`using the workshop's copy of` when it fell back, and fails in one bilingual
sentence chained to the transport error, so `UNREACHABLE` still sees the cause.
A fallback passes, so `test_notebooks.py` lists each one under `FELL BACK:`,
which is now the only place a dead upstream shows. Add a download and add its
copy: an entry in `scripts/fetch_mirrors.py` and `data/README.md`, then
`python3 scripts/fetch_mirrors.py <name>`; check 1 fails the build until the
file is there. Until the first live run, `.github/workflows/health.yml` runs every route
daily with `--strict`, which fails on any `UNCHECKED` or `FELL BACK`, so a
host that dies between pushes is reported by e-mail rather than by the room. A dataset whose licence does not permit redistribution gets no
copy -- notebook 14's monkey tensor has none -- and keeps its retries.
Deep dive 19 keeps its own `fetch()`, with a `copy=` for the blog post's
kernel and sweeps; its FB15k-237 split has no stated licence, so, like the
monkey tensor, it has no copy.

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
npm run check:navigation                                # the browser check and the axe pass, after a render (3 shards, concurrently)
node scripts/check_navigation.cjs --shard 1/3           # one shard alone, for debugging; 0 is the site pages and the hero
node scripts/check_navigation.cjs                       # the whole thing, unsharded and serial
npm test                                                # every tests/*.test.cjs: the cores and scene registries, no browser

# Runs the notebooks. A kernel per notebook, the network, and the scientific
# stack — so it is its own CI job, not part of the render gate.
uv run --group execute python scripts/test_notebooks.py
uv run --group execute python scripts/test_notebooks.py --list       # no kernel
uv run --group execute python scripts/test_notebooks.py --only 10
uv run --group execute python scripts/test_notebooks.py --offline
uv run --group execute python scripts/test_notebooks.py --strict   # fail on UNCHECKED or FELL BACK (health.yml)
uv run --group execute python scripts/test_notebooks.py --artifacts DIR  # keep the route copy, plots, environment.txt, coverage

# The image generators. Network, heavy deps, not run by CI — see above.
uv run --group figures python scripts/gen_thumbnails.py
uv run --group figures python scripts/gen_figures.py
uv run --group figures python scripts/gen_figures.py widget   # just the visualizer's photos.json; no network
uv run --group figures python scripts/gen_figures.py taxi     # the factorisation stage's taxi.json; needs the network
uv run --group figures python scripts/gen_cube_gifs.py        # notebooks 00–15
uv run --group figures python scripts/gen_cube_gifs.py 04 10  # just these two
uv run --group figures python scripts/gen_pca_gifs.py         # notebook 16
uv run --group figures python scripts/gen_tensor_module_gifs.py  # notebooks 17–18
uv run --group figures python scripts/gen_cp_tucker_gifs.py       # notebook 19
uv run --group figures python scripts/gen_slide_art.py        # needs Chrome and the network
npm run gen:hero                                              # the hero's widget stills, from each embed
```

`check_links.py` is the site test suite -- there is no pytest here. It prints
fourteen numbered checks; the numbers are a contract this file refers to, so a
new check is appended, never inserted. Thirteen can fail the build:

1. Notebooks are valid, with no outputs or execution counts, and each header
   badge points at its own file. Inside every notebook, too, since nothing else
   reads one: every notebook-to-notebook link names an `.ipynb` that exists;
   every image embedded from the site names a file in `images/`, with alt
   text, and is one of that notebook's own `cube-NN-*` animations (URLs
   absolute, because Colab has no checkout to resolve against); every dataset
   copy it falls back to is a file in `data/`; and display maths is balanced
   and outside any blockquote or raw HTML block.
2. Every notebook `docs/` serves is byte-identical to the one in `notebooks/`.
3. Internal links resolve, including the `#fragment`; every `thumb` file exists;
   every `repo.widgets` file reached `docs/`.
4. Every Colab URL on the rendered site is well-formed and names a notebook
   that exists, and every notebook is linked from some page.
5. Both decks carry every section anchor.
6. The EN and ES notebooks pages list the same thirteen sections.
7. The two references pages cite the same works; every ml-blog URL is declared
   under `reading:`; every `references:` group anchor is on both pages.
8. Each section's written `start`/`end` matches the running clock, and the
   `agenda` rows account for every segment exactly once, in order.
9. The deck timer's total matches `workshop.minutes`.
10. No visible notebook cell depends on a name bound only in a folded solution.
11. Kahoot join URLs -- **prints a TODO, never fails**: pasted in after the page exists.
12. Companion artifact links and exports -- a TODO for anything unset, with one
    exception that fails: a `companion.shorts` entry missing one of `url`,
    `title_en`, `title_es`, `length`, `lang` or `covers`, whose `covers` names
    no section, or whose `lang` is neither `en` nor `es`.
13. The two handbooks have the same shape (heading counts, table rows, notebooks
    linked) and byte-identical fenced code. It cannot catch wording, which is
    the half that drifts.
14. Both Kahoot pages carry `#quiz-1`, `#quiz-2` and `#quiz-3`.

`--notebooks-only` runs checks 1 and 10 alone, numbered 1 and 2 in its output;
run it after any content change. It needs no render, so it skips everything
that reads `docs/`, check 2 included, and the Colab URLs of check 4 with it --
the badge and link checks inside the notebooks are check 1's and still run.
Quarto never executes the notebooks, so building needs Quarto only; to run
them locally, `uv run --group notebooks jupyter lab`. `matplotlib` and
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
both languages. It also means giving the page a check: a place in `pages` in
`check_navigation.cjs`, or an `EXEMPT` entry there saying why it has none.
Shard 0 reads `render:` before it starts a browser and fails on a rendered
page with neither.

**Every `resources:` glob starts with `/`.** Quarto matches a bare glob at any
depth: `data/**` also matched scipy's test data under CI's `.venv/`, and 9.5 MB
of it was on Pages until 2026-09-28. `upload-pages-artifact` has left dotfiles
out since v4, which is a second wall, not the first.

## Working on WSL2 (Windows)

- Clone into the Linux filesystem (`~/code/...`), **not** `/mnt/c/...`. Quarto
  renders far slower across the 9p mount and `quarto preview`'s file watching is
  unreliable there. `localhost:4200` is reachable from the Windows browser.
- Line endings need no setup: `.gitattributes` pins `eol=lf`, which overrides
  `core.autocrlf` however a clone has it. Don't "fix" it with
  `core.autocrlf=false` — that's the setting that lets CRLF reach the index.
- `python` may not exist; use `python3`, or `uv run` as above.
- Install Quarto with the Linux `.deb` inside WSL, not the Windows build.
