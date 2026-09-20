# AGENTS.md

This file is the working guidance for any coding agent in this repository --
Claude Code, Cursor, Codex, or whatever comes next. `CLAUDE.md` is a pointer to
it, so there is one copy of these rules rather than one per tool. A human
contributor wants [CONTRIBUTING.md](CONTRIBUTING.md) first; this file is the
technical layer under it.

It holds rules and commands. The reasoning behind them -- what went wrong, when,
and what the fix was -- lives in [DECISIONS.md](DECISIONS.md), one entry per
rule, so this file stays short enough to read at the start of every session.
When a rule here surprises you, look it up there before changing it.

## What this is

A bilingual (EN/ES) Quarto website for a 210-minute tensors workshop. No application
code — the deliverables are the rendered site, Colab notebooks for the workshop
sections and take-home extras, two revealjs decks, three standalone interactive
widgets and three Kahoot spreadsheets.

**Desktops and laptops are the target, and phones are not.** The session is
delivered on them and the site is read on them, so anything here may assume a
mouse, a hover state, a keyboard and a wide viewport; a touch affordance is
not worth building or maintaining for its own sake. Two things that look like
mobile support are kept anyway, for reasons that are not phones:

- `check_navigation.cjs` asserts no horizontal overflow at **390px** on every
  page. Keep it. An element that overflows at 390 is usually one with no width
  constraint at all, which is a bug at any size — the check is a canary, not a
  promise that a phone is supported.
- `homepage.scss` swaps the hero's live widgets for the static diagram under
  `@media (prefers-reduced-motion: reduce), (max-width: 540px)`. **Both halves
  are load-bearing.** The reduced-motion half is an accessibility fallback; the
  width half is what `check_navigation.cjs` asserts at 390px, where it requires
  `.hero-fallback` to be visible and `.hero-demos` hidden, in both languages.
  Dropping either half means changing that check in the same commit.

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
| `interactive/data/photos.json` (the visualizer's photos at 4, 8, 16, 32 and 64 px) | `scripts/gen_figures.py widget` |
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
- `gen_figures.py` builds the banner, the handbook's four figures and the
  visualizer's `photos.json`, importing the pin, palette and fetcher from
  `gen_thumbnails.py`. Every figure is drawn from an array the workshop actually
  uses, so the numbers printed on a figure are the numbers the exercise prints.
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

**`interactive/` is hand-written**, and the one asset class with neither a
generator nor a byte-exact gate. Three self-contained HTML widgets -- the
section 03 broadcasting simulator, the section 04 reshape & transpose
visualizer, and the sections 07/09 projection & SVD stage -- each with its own
`:root` palette, EN/ES copy tables, `?lang=`, and its section's accent adjusted
per theme to clear 4.5:1. They are resources, not render targets:
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

**Arithmetic goes in a core module, and only arithmetic.** The visualizer's --
strides, contiguity, the memory orders and NumPy's view-or-copy rule for a
reshape -- is `interactive/tensor-core.js`; the stage's -- least squares two
ways, a one-sided-Jacobi SVD, the condition number, the pseudoinverse -- is
`interactive/linalg-core.js` -- with the null space, a 3 x 3 eigen-solver,
float32 rounding and an unguarded Cramer solve for the steps that need them.
Both are plain scripts the page loads first, and
`tests/{tensor,linalg}_core.test.cjs` pin them under `npm test`. Three kinds of
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
widget counts instead, which `check_navigation.cjs` treats as a regression. All
three hero widgets take `?embed=1&theme=navy`, and neither the visualizer nor
the stage fetches three.js there: the stage's embed is the portal's still
frame, drawn flat, with the scroller and its steps gone. The hero is three
tabs and the check pins that at three. Only the open tab's widget is
fetched, and none at all where the static diagram replaces the demos -- a
hidden iframe is never lazy-loaded, so every panel keeps its URL in
`data-src` until the tab script hands it over, once.

three.js is **vendored** at `interactive/vendor/`, core build and eleven
`examples/jsm` addons (the composer, the bloom pass, CSS2D labels and their
transitive imports), each with its URL, SHA-256 and date in a README. The
addons say `from 'three'`, and a **static import map** in the stage's `<head>`
resolves that -- rewriting the specifier in eleven files would make the README's
hashes describe something other than what upstream ships. The map is inert
until a module import resolves, so the lazy `bootGL()` still holds. Upgrading
means both builds, both hash tables, both boot modules, the import map, and
every `repo.widgets` line.

`check_links.py` fails the build if any file in `repo.widgets` is missing from
`docs/` -- for the addons that is the *only* guard, since an import map is
element content and the link harvest reads attributes. `check_navigation.cjs`
drives all three widgets in both languages, from a per-widget `drive` callback
rather than a flag, and runs axe over them. The stage's callback opens every one
of its eight steps and asserts each step's claim off `data-*`. Every colour a widget puts on text
clears 4.5:1 per theme -- the four axis hues have `--axN-ink` text variants,
and the stage's dark-in-every-theme canvas has one `--stage*` set measured
against the label chip -- so a contrast finding in a widget is real, never
something to allowlist.

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

## Which document owns what

Seven documents describe the same workshop to different readers. Each fact has
exactly one home; before adding a paragraph, find whose job it is:

| Document | Owns | Never contains |
|---|---|---|
| `_variables.yml` | Every shared fact: repo coordinates, section titles and minutes, the running clock, quiz metadata, prerequisite URLs. | — |
| `index.qmd` / `es/index.qmd` | The student's entry point: what this is, who it is for, **what each resource is for**, prerequisites in full, and how we work. | Teaching content or exercises. A section table, Colab instructions, or a tour of the datasets — the homepage is a front door, and all three were cut from it. |
| The handbook (`tensors_workshop_plan_with_quizzes.md`, and `es/` beside it) | The session text: theory, exercises, worked solutions, the appendices, facilitator notes. The only document that owns Part/Block. | Prerequisites, setup instructions, "how we work" — it links to the homepage for those. The bibliography — it links to `references.qmd`, and its `## Further Reading` section is now only that pointer. |
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
uv run --group figures python scripts/gen_cube_gifs.py        # notebooks 00–15
uv run --group figures python scripts/gen_cube_gifs.py 04 10  # just these two
uv run --group figures python scripts/gen_pca_gifs.py         # notebook 16
uv run --group figures python scripts/gen_tensor_module_gifs.py  # notebooks 17–18
uv run --group figures python scripts/gen_slide_art.py        # needs Chrome and the network
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
