# AGENTS.md

This file is the working guidance for any coding agent in this repository --
Claude Code, Cursor, Codex, or whatever comes next. `CLAUDE.md` is a pointer to
it, so there is one copy of these rules rather than one per tool. A human
contributor wants [CONTRIBUTING.md](CONTRIBUTING.md) first; this file is the
technical layer under it.

## What this is

A bilingual (EN/ES) Quarto website for a 210-minute tensors workshop. No application
code — the deliverables are the rendered site, Colab notebooks for the workshop
sections and take-home extras, two revealjs decks and three Kahoot spreadsheets.

## The one rule that matters

[CONTRIBUTING.md](CONTRIBUTING.md#where-to-edit) owns the contributor-facing
editing boundaries. Keep this technical guidance consistent with it.

`_variables.yml` is the single source of truth (repo coordinates, the
sections, extras, quizzes and agenda). Three things read it:
`{{< var >}}`
shortcodes in the `.qmd` pages and both decks, the two generator scripts, and
the checker. The generator and the checker both need the running clock —
what time each section starts, once the quizzes and breaks between them are
counted — and both get it from `scripts/timeline.py` rather than walking it
twice.

**Never hand-edit generated scaffolding.** For notebooks, that rule applies
only to the centrally owned header (cell 0) and footer (final cell). Every
cell between them -- including the entire Setup section (its heading, its
prose and its code) -- is a teaching body cell, edited directly in the
`.ipynb` file, including in Colab with Gemini, and the notebook normalizer
preserves them.

What the normalizer *does* own, across every cell rather than just the two it
writes, is the **key order inside each cell**. It sorts them, which is
nbformat's own order, so a round-trip through Jupyter, Colab or nbformat
converges rather than fights. Nothing reads a notebook by key order; the reason
is the diff. Each editor writes its own order, so a notebook picked up by a
different tool came back with every cell rewritten -- notebook 04 once carried
245 lines of moved keys around a single real edit, which is how a genuine
change gets missed in review. No new check guards this: the byte-exact
regenerate gate already does, because a scrambled order is something
`gen_notebooks.py` rewrites and CI then sees as a dirty tree.

Change `_variables.yml` for shared facts, objectives and the bilingual header
text, then run the appropriate generator:

| Generated | Owned by |
|---|---|
| `_includes/*.md` (both notebook tables, the agenda both decks show, the companion's video, shorts, audio, infographic, self-check and mind-map blocks, the brainstorm diagram's inline SVG, **the notebooks page's dependency table**, and the whole body of both references pages) | `scripts/gen_tables.py` |
| The marker-delimited regions inside `README.md`, `notebooks/README.md`, each language's handbook schedule and **the `notebooks` dependency group in `pyproject.toml`** — the rest of all five files is hand-maintained | `scripts/gen_tables.py` |
| `notebooks/*.ipynb` — header (cell 0) and footer (final cell) only | `scripts/gen_notebooks.py` using `_variables.yml` |
| `notebooks/*.ipynb` — every cell between the header and footer, including the Setup section | the notebook itself; editable directly in Colab/Gemini |
| `images/ds-*` (dataset cards) | `scripts/gen_thumbnails.py` |
| `images/hero-band.png`, `images/fig-*` (the handbook's figures) | `scripts/gen_figures.py` |
| `images/cube-*.gif` (at least three per notebook) | `scripts/gen_cube_gifs.py` |
| `images/cube-16-*.gif` (notebook 16's PCA animations) | `scripts/gen_pca_gifs.py` |
| `images/cube-17-*.gif`, `images/cube-18-*.gif` (attention and compression) | `scripts/gen_tensor_module_gifs.py` |
| `slides/{en,es}/images/slides-final/slide-NNa.png` (art added since #45) | `scripts/gen_slide_art.py` |
| `docs/` (build output, gitignored — never committed) | `quarto render` |

CI reruns `gen_tables.py` and `gen_notebooks.py` and fails if the working tree
changes. The paths it watches are every file those two write into —
`notebooks/`, `_includes/`, `README.md`, `pyproject.toml` and both handbooks,
whose schedule tables are marker regions. This gate is byte-exact: both
generators are deterministic pure Python. A hand-edit is caught, but only once
you push.

That list is the whole of the gate. Leave a path off it and a hand-edit there
fails nowhere and ships: the regenerate step has already rewritten the source
by the time `quarto render` runs, and nothing downstream compares the render
against anything. Add the path when you add the file.

**The six image generators are not in that gate**, deliberately: they need
the network, and a scientific stack or a browser the workflow does not install.
So nothing will tell you an image is stale — rerun them by hand when their
inputs change. All six record where every pixel came from, which is the
actual point.

All six are deterministic **for a given stack**, and that is the whole of the
guarantee — weaker than it reads, and now confirmed rather than theoretical.
`figures` carries floors rather than pins and `uv.lock` is gitignored, both
deliberately, so every `uv run --group figures` resolves whatever matplotlib
and Pillow are newest that day; matplotlib is what decides glyph positions,
hairline placement and how an image is downsampled. Rerunning the generators on
2026-09-14, three weeks after the figures were drawn, rewrote all six of them
and `ds-audio.png` with no input changed anywhere. Nothing any of them *says*
moved: every printed number, every colour, every bar and every filled cell came
back pixel-identical, and the entire diff was text glyphs, a few hairlines, and
the resampling grain of the photographic panels. `ds-audio.png` was
pixel-identical outright — only the PNG encoder's bytes had shifted. The eight
photographic dataset cards and all the cube GIFs came back byte-identical,
because Pillow's crop-and-resize path and the GIF writer have not moved.
Matplotlib is the one that drifts.

So a dirty `git status` on these after a rerun is the expected consequence of a
matplotlib release, not evidence that an input changed — and the two are worth
telling apart before you either commit or panic. Each generator prints a
`Stack:` line naming the versions that drew the files, which is what tells them
apart: compare it against the line in the commit that last drew the image. Same
versions and a changed image means an input moved; different versions and the
diff is almost certainly rasterization, which a mask of the changed pixels will
confirm in a minute.

What each one draws, and from where:

- `gen_thumbnails.py` builds the nine dataset cards from SHA-256-pinned CC0
  sources. Pinning matters: a Commons file can be overwritten under the same
  name, and a card silently regenerated from a different photograph is not
  something a binary diff will show you. **Nothing on the site displays
  `images/ds-*` any more** — the dataset strip they were drawn for was cut from
  both landing pages. They are kept, and so is the generator, because
  `gen_figures.py` imports its pin, palette and fetcher, and because the
  handbook's *The Data We Use* section is the obvious place to bring them back.
  Do not treat their absence from every page as a bug to fix by re-adding a
  strip to the homepage.
- `gen_figures.py` builds the banner and the handbook's four figures, and
  imports the pin, the palette and the fetcher from `gen_thumbnails.py` rather
  than repeating them. Every figure is drawn from an array the workshop
  actually uses — `camera()`, `load_digits()`, the storm clip, the taxi CSV —
  so the numbers printed on a figure are the numbers the exercise prints, and
  they stay that way.
- `gen_cube_gifs.py` draws the cube animations the notebooks embed, **at
  least three per notebook**, in that notebook's own accent from
  `gen_notebooks.ACCENTS`. The first draws the move the section is named after;
  the second a move it needs and the first has no room for; the third the
  section's own subject — its data, or its trap. `SCENES` holds them as a list
  per notebook, and every stem keeps the `cube-NN-` prefix, which is what check
  1 reads to tell a notebook's own animation from another notebook's pasted
  into it.

  The floor was two until the pictures were read side by side, and what that
  showed was scene after scene opening on the identical `np.arange(60)` cube in
  a different accent: the video pipeline, the colour images and the Tucker
  unfoldings were all the same picture. Two slots went to the move and none to
  the material. Three is the count that makes room for it, and
  `check_table()` now **enforces** it — along with a duplicate stem and a stem
  filed under the wrong notebook, which would render in the wrong accent and
  then be rejected by check 1 two tools away from its cause. It was a printed
  advisory while twelve notebooks were still on two, because a generator that
  refused to draw until all of them were done would have been useless for the
  work that got them done. Nothing in CI checks any of this: check 1 tests
  ownership and never a number.

  Frames run at `duration=4050`, raised from 2700 for the scenes that now draw
  two piles side by side. And `render` overrides `write_gif`'s palette default
  to `palette_from="all"`: one palette is shared by every frame so colours
  cannot shift mid-animation, and reading it off frame 0 alone silently crushes
  any hue a later frame introduces. That is not a colour-scene problem —
  `cube-06-matmul` is drawn entirely in one accent and its green `lit_tint`
  highlight rendered grey.

  It is the one generator whose arrays are **not** real data, and it says so at
  the top: these cubes are `np.arange`, because the lesson is index arithmetic
  and `T[1, 2, 3] == 33` has to be checkable by eye. Two constraints shape
  every scene. Nothing on the images is prose — every caption is an expression
  or a shape, which reads the same in both languages, so one GIF serves EN and
  ES and there is no second asset to keep in step. And every frame is a
  complete picture, because `fig_hero` already recorded what a build animation
  does: Chrome parks on frame 0 at the end of a finite loop, which in a
  build-from-empty is the emptiest frame there is.

  **One scene paints real colour, and it is still not real data.** `cube-04-rgb`
  draws a 3x4 swatch through `planes(cell_colors=...)`, and the swatch is as
  synthetic as the cube: every channel value in it is 0, 128 or 255, so "the red
  plane says 255 wherever the pixel looks red" is checkable by eye in exactly
  the way `T[1, 2, 3] == 33` is. That is the test a colour scene has to pass,
  and a photograph fails it — it would put 87 there and there would be nothing
  to check. Real arrays stay in `gen_figures.py`.

  They **loop forever** (`loop=0`), which is a correction, not a preference.
  At `loop=3` a browser started the animation when the image loaded rather
  than when it scrolled into view, so it played out to an empty room and a
  reader arriving at the cell met a parked frame 0 — a still, indistinguishable
  from a broken image, which is exactly how it was reported. No finite loop
  count survives that; it is a race against how fast somebody scrolls. The
  video-stack GIF and notebook 16's PCA GIFs use `loop=0` for the same
  reason. The hero band is a still PNG: an earlier GIF build parked on
  empty frame 0, so the reveal moved to CSS.

  Two things about a scene are not decidable by reading its code, so
  `_check_layout` measures them after a draw and refuses the frame: the `sub`
  and `note` captions share one baseline at opposite ends of it and a long pair
  prints through itself, and a pile tall enough for its own shape grows up
  through the label, because `centred` centres on the caption band without
  asking how much band there is. Both were found by shipping them. A third trap
  it cannot catch is occlusion: the planes are painted front-last and cover
  exactly, so `lit` on a cell of plane 1 or 2 highlights something plane 0 is
  painted over, and the frame comes out with nothing visibly selected. Light
  plane 0, or `hide` what is in front.

  **One accent per notebook is the default, not the whole palette.** The rule
  exists so a reader can tell which notebook a screenshot came from, and that
  survives as long as the accent is what ordinary data is drawn in. A second
  colour appears only where the picture is making a claim about *identity* —
  which axis, which index, which operand — because that is a claim one tint
  cannot carry. `INDEX` holds those hues, from the Okabe–Ito colour-blind-safe
  set, and `lit_tint` on `planes` is how a highlight takes one. Today that is
  the three einsum scenes (`i` blue, `j` orange, `k` green, so "k is gone after
  the arrow" is something a reader watches rather than reads), `cube-00-axes`
  and `cube-10-unfold`, which agree with each other on what colour each axis
  is. `cube-06-matmul` is the third of those, and the one that showed why
  `render` had to stop reading its palette off frame 0: it is drawn entirely in
  one accent, so its green `lit_tint` had no green anywhere in frame 0 to
  quantize against and rendered grey. Colour is never the only carrier: every index is written out as a letter
  and every caption still says which axis in words, for the reason the Spanish
  box says `ESPAÑOL` rather than just being grey.

  The frame duration is one global value in `render` rather than a per-scene
  one, and its number is stated once, in the bullet above. A frame here is a
  whole labelled picture with a caption and a shape line, not a tween, and the
  stepper cell in each notebook is the other half of that answer — the GIF sets
  a pace for a reader watching, the stepper hands over frames for a reader
  studying. It has been raised three times, 900 → 1800 → 2700 → 4050, each time
  by watching one rather than by reasoning about it: a reader meeting a frame
  for the first time has to find the caption, find the pile it names, and then
  look for what moved, which is three passes and not one — and four once the
  frame holds two piles side by side. Raising it rewrites every cube GIF in
  `images/` and changes nothing else — frame delay is metadata, so `MAX_KB` is
  not at risk.
- `gen_slide_art.py` draws slide art from HTML and CSS, screenshotted by
  headless Chrome at the deck's own 1920×1080. It owns only the `slide-NNa`
  insertions: the thirty-one PNGs the #45 redesign left have no source and are
  still redrawn by hand in the tool that made them. Copy for both languages
  lives in one `SLIDES` table, so EN and ES cannot be edited apart. Rerunning it
  rewrites the same bytes, which is what makes `git status` a staleness check.

**`interactive/` is hand-written, and it is the one asset class with neither a
generator nor a byte-exact gate.** Two standalone widgets — the section 04
layout visualizer and the section 03 broadcasting simulator — each a single
self-contained HTML file with its own `:root` palette, its own EN/ES copy tables
and `?lang=`, and its section's accent from `gen_notebooks.ACCENTS` adjusted per
theme so it clears 4.5:1. They are **not** render targets: `interactive/**` is in
`resources:`, so Quarto copies them verbatim the way it copies the notebooks, and
`_quarto.yml`'s `render:` list deliberately leaves them out.

Two things watch them. `repo.widgets` in `_variables.yml` lists every file that
has to reach `docs/`, and `check_links.py` fails the build on any one missing —
which is what would happen if `interactive/**` fell out of `resources:`, with no
other symptom than every link to them 404ing. `check_navigation.cjs` loads both
in both languages and asserts no horizontal overflow at 1440 and 390.

three.js is **vendored**, at `interactive/vendor/`, with its source URL, SHA-256
and fetch date in a README beside it. Not a preference: the widget shipped
pointing at `three@0.169.0/build/three.min.js`, which has not existed since r160,
and because `check_navigation.cjs` aborts every off-origin request that check
could never have caught it. Same-origin, it loads, and the check asserts
`THREE.REVISION`. Upgrading means replacing both files and updating the README,
the import in `three-boot.js` and the path in `_variables.yml`.

**The companion's assets are the one class with no generator at all.** The
infographic PNGs and the Audio Overview under `media/` are exported by hand out
of NotebookLM, so there is no script to rerun and no SHA-256 pin to compare
against. What stands in for both is the `companion:` block in `_variables.yml`:
the notebook URL, each artifact's own `/artifact/<uuid>` URL, and an `exported`
date. Re-export an asset and update `exported`, or the provenance is a lie.
`media/**` is in `_quarto.yml`'s `resources:` for the same reason
`notebooks/*.ipynb` is — nothing renders it, so without that line it never
reaches `docs/`.

Every artifact in that notebook has an `/artifact/<uuid>` URL, the quiz and
flashcards and Audio Overview included — the Studio row's ⋮ menu hides Copy link
for those three, which is what made them look unshareable. What none of them
has is an export, so they only work while the notebook is shared as "anyone
with the link". Companion copy names the destination briefly ("Opens in
NotebookLM"); assume readers have a Google account and omit login reminders.

`companion.shorts:` is the eight one-minute video overviews, kept apart from
`video:` because that one is *the* overview — the one both landing pages embed
and the one a YouTube id is waiting on. Each short carries a `covers` naming the
section it lines up with, and that is **a hand-made reading of the title**:
nothing in NotebookLM knows this workshop has sections. Check 12 verifies the
number names a section that exists, which catches a typo and cannot catch a bad
call. Each also carries `lang`, the language the video is actually in — seven
English and one Spanish — and `gen_tables.py` marks any card whose language is
not the page's, so a reader is told before the click.

What stands in for the export is a **screenshot**: `thumb:` on each of those
three, and on `video:` and `audio:` while they are still NotebookLM links,
naming a PNG under `images/` that the site serves itself. A visitor then sees
what is behind the link before spending an account on it. Every one carries
`thumb_alt_{en,es}` and, on the three unexportable ones, a caption saying it is
a still of something live — the artifact is interactive and the PNG is not, and
a page that lets a reader miss that has mis-sold the click. Check 12 names
every `thumb` and alt still unset; check 3 fails the build on a `thumb` whose
PNG is not there.

**The brainstorm diagram is the one thing on the companion page a person made,
and the page says so.** `brainstorm:` in `_variables.yml` holds four ideas and,
under each, the sections that serve it; `brainstorm_svg()` in `gen_tables.py`
draws it as inline SVG into `_includes/brainstorm-{en,es}.md`. Section titles
are *not* repeated in that block — the generator reads `title_{lang}` out of
`sections:` and wraps it — so a retitled section redraws the picture with no
edit there.

The idea-to-section mapping is **a hand-made reading**, the same kind of call
`companion.shorts`' `covers` is. The generator refuses to run if a section in
`sections:` or `extras:` is placed under no idea or under two, which catches
one added twice or forgotten, and cannot catch one filed under the wrong idea.
That check lives in the generator rather than in `check_links.py` because the
generator is what CI reruns, so a bad mapping fails at the point that names it,
without spending a numbered check on it.

Being generated by `gen_tables.py` puts the diagram **inside** the byte-exact
regenerate gate, unlike every other picture on the site. It is also the only
one whose text is real text: selectable, scalable, and read out by a screen
reader from the `<desc>` the generator writes. An SVG with a fixed `viewBox`
does not reflow, so the layout is emitted twice — two columns and one — and
`custom.scss` shows one of them at a 44rem breakpoint. Colours and type sizes
are in `custom.scss` under `.brainstorm`, not in the Python: the diagram draws
itself from the site's own SCSS variables.

## Which document owns what

Seven documents describe the same workshop to different readers. They drifted
once — five copies of the prerequisites, three different local-run commands, two
incompatible vocabularies — so each fact now has exactly one home. Before adding
a paragraph, find whose job it is:

| Document | Owns | Never contains |
|---|---|---|
| `_variables.yml` | Every shared fact: repo coordinates, section titles and minutes, the running clock, quiz metadata, prerequisite URLs. | — |
| `index.qmd` / `es/index.qmd` | The student's entry point: what this is, who it is for, **what each resource is for**, prerequisites in full, and how we work. | Teaching content or exercises. A section table, Colab instructions, or a tour of the datasets — the homepage is a front door, and all three were cut from it. |
| The handbook (`tensors_workshop_plan_with_quizzes.md`, and `es/` beside it) | The session text: theory, exercises, worked solutions, the appendices, facilitator notes. The only document that owns Part/Block. | Prerequisites, setup instructions, "how we work" — it links to the homepage for those. The bibliography — it links to `references.qmd`, and its `## Further Reading` section is now only that pointer. |
| `notebooks.qmd` / `es/notebooks.qmd` | The list of every notebook, how they are built, what each one needs, and how to run them off Colab. The only page left that enumerates all thirteen sections in both languages, which is what check 6 now watches. Its *What each notebook needs* table is generated from the notebooks themselves — do not hand-edit it. | The workshop's content or its schedule. |
| `kahoot.qmd` / `es/kahoot.qmd` | The three quizzes and how to run them. The live questions on kahoot.it stay in English; this page is the how-to. | — |
| `references.qmd` / `es/references.qmd` | Every citation: the linear algebra books, the Tucker/CP/Eckart–Young papers, the `tensorly` docs, and the ML blog posts. With DOIs and author pages. | Prerequisites — it links to the homepage. Teaching content: it says what a work is *for*, never what it says. |
| `companion.qmd` / `es/companion.qmd` | The machine-generated companion: the NotebookLM notebook and every artifact out of it — video, infographics, audio, quiz, flashcards, mind map — and the standing note that none of it was written or checked by a person. It owns those links, so nothing else carries one. It also carries the **brainstorm diagram**, which is the one thing on the page a person drew, and says so. | The workshop's own content. It explains material, it never defines it. |
| `README.md` | The GitHub shopfront: what this is, who it is for, prerequisites **in brief**, and links out. | Anything the site already owns. |

**The Spanish handbook is machine-translated.** `es/tensors_workshop_plan_with_quizzes.md`
is a translation of the English handbook, which stays the source of truth; the
page says so in a callout at the top, the way the companion pages say what they
are. Code, identifiers and every `# TODO` comment are deliberately left in
English, because they are what a student types into the notebook. Change the
English handbook and the Spanish one does **not** follow — nothing generates it
and nothing checks it. Change both in the same commit, or the callout stops
being true.

**One canonical identifier.** A segment is a **section, `00`–`12`**, everywhere.
Part I–IV and Block 1–7 are the handbook's own secondary labels, live in
`_variables.yml` as `part:` and `block:`, and appear in exactly two places: the
handbook's exercise headings, and its generated schedule table — which carries
the section number beside them and is therefore the only key a reader needs.
Prose that says "Block 4" where it means section 07 is the bug.

**The local-run command** still appears in six places — `README.md` twice, once
per language; `notebooks.qmd` and `es/notebooks.qmd`; `notebooks/README.md`; and
the Commands section below — but they no longer carry anything that can drift.
All six are `uv run --group notebooks jupyter lab`, and the package list they
used to spell out is the `notebooks` group in `pyproject.toml`, generated by
`gen_tables.py` from the notebooks' own imports.

So do **not** hand-derive that list and do not edit the group: add the import to
a notebook and rerun the generator. The marker region is inside the byte-exact
regenerate gate, so a hand-edit is rejected on the first push. What the six
copies still share is the prose around them, which is hand-written and does have
to be kept honest in both languages.

## How a notebook looks

Core routes and learning prompts are notebook-owned body cells. The route cell's
`metadata.workshop` lists preparation IDs and the activity ID. Live notebooks 01–11 also declare the complete contiguous `sequence` and its `checkpoint`; the runtime runner executes every code cell in that sequence. Shared `practice_en/es` and `explore_en/es` in `_variables.yml` own the visible outcome labels in notebook headers, slides and handbook. Visible **Core prep**
labels and `workshop-core-prep` / `workshop-core-activity` tags identify that route.
Do not make a core route depend on an optional exercise or an unopened solution.
`scripts/check_teaching_materials.py` checks these references and the teaching
kit's local links; `tests/test_teaching_materials.py` tests the checker and tiny
worked examples. Those two are static: they read the route, they do not run it.

`scripts/test_notebooks.py` is what runs it. One fresh kernel per notebook
executes the declared route and then the **paired solution** — the
`solution`-tagged cell immediately after the activity. That extension is not
optional decoration: many activity cells are the student's
blank `# TODO` block and hold no executable code at all, so prep plus activity
would execute the setup and then a comment. The answer is where the lesson
runs.

**A route with no executable code is answered separately.** Notebook 12's core
path tells the student "Exit check (5 min). No code required ... Other
exercises and explorers are optional", and that is the real lesson, so the
route is not the thing to bend to suit CI. What CI executes is a different
question, and `ci_cells` on the same scaffold cell answers it explicitly: for
12, the setup and the five take-home TODO/solution pairs, and **not** the
explorer widgets. Those explorers are what a facilitator demonstrates, they are
the notebook's slowest cells, and one renders a base64 WAV big enough to stall
the kernel; the answers a student works through alone are worth more.
`run_set()` refuses a `ci_cells` entry that is not a unique code cell, and
check 2's `EXPECTED` guard refuses one that drops an asserted cell -- narrow
the list too far and CI names the cell you stopped asserting.

Notebook 00 declares one too, for the same reason at smaller scale. Its route
is a written exit answer, so the blanket fallback used to stand -- it is short
and every code cell was setup. Then it gained a predict-first cell, and with a
live `Dropdown` and `Checkbox` in the kernel the widget sweep began stalling
for the whole `PROBE_CELL_TIMEOUT`: reproducible on two runs in three, with the
probe's own loop reporting nothing over budget, so the wait is not in the
driving. It is the payload-through-an-`Output` pathology this file already
describes, reached with nothing but text. `ci_cells` names the six cells the
fallback used to pick, which leaves the predict cell outside every route --
where the other thirteen already sit, and where the delimited counterexample in
it is gated by `tests/test_teaching_materials.py` rather than by a kernel.

So the blanket fallback is now the path nothing takes. Keep it: a new notebook
with no route gets a sensible default rather than silently executing nothing.

It asserts three things beyond "nothing raised": that a blank activity stayed
blank, that each route still prints the numbers in its `EXPECTED` table, and
that no widget callback failed. That last one needs its own machinery —
`widgets.interactive_output` runs its callback inside an `Output` widget, whose
`__exit__` hands the traceback to the frontend and returns `True`, so a broken
callback leaves a clean cell and total silence. The runner patches that
`__exit__` before the route runs, then drives controls to the far end of their
range and reports what was swallowed. It is a **sweep, not a proof**: it stops
after `WORKSHOP_PROBE_CHANGES` changes (8) or `WORKSHOP_PROBE_BUDGET` seconds
(20), whichever comes first, and prints how many controls it skipped. A
notebook with four explorers is sampled, not covered.

The sweep silences rendering while it runs — pyplot, and the **display
publisher** underneath it. That second one is not tidiness. A large payload
leaving an `Output` widget makes nbclient wait out the whole cell timeout:
display the same bytes straight from a cell and 1MB is instant, but route them
through `interactive_output` and anything past roughly 200KB stalls. Notebook
12's audio explorer is exactly that — a base64 WAV per change, small at the
default `k` and much bigger further along the dropdown, which is why only the
sweep tripped it and why the job once went red there. Silencing the publisher
rather than the name `display` is what works: a callback resolves `display`
from the namespace it was defined in, not the probe's.

Nothing is stripped or mocked — `%pip install` runs verbatim and the remote
datasets are fetched for real, because Colab is the runtime this defends.
`check_colab_parity()` is the standing guard on that: guarded `google.colab`
imports, no absolute paths, quiet `%pip`, no hardcoded device string.

The facilitator guide, assessments, worked mistakes and feedback form are
hand-maintained Markdown with matching files in `es/`. Keep both languages aligned.

**`worked-mistakes.md` pairs one-to-one with the predict-first cells.** Each
entry is its notebook's delimited counterexample, lifted out of
the widget with the `pred_` prefixes dropped, so a reader can run it without
ipywidgets and a facilitator can put the claim on a screen. Both languages
carry byte-identical code — prose is translated, the counterexample is what the
reader types — and `tests/test_teaching_materials.py` reads the expected
section numbers off `notebooks/` rather than spelling them out, so a notebook
added without its entry fails there. What that test cannot check is that the
page's copy still *matches* the notebook's: the prefix strip makes them
deliberately different text. Change a predict cell's arithmetic and change the
entry in the same commit, the way the two handbooks go together.

Two conventions carry the look of a notebook, and both are forced by *where*
notebooks are read rather than chosen for taste.

**Inline styles only.** A styled block is HTML in a markdown cell with an
inline `style=` attribute. Colab strips a `<style>` block, so a stylesheet
would silently do nothing; GitHub renders `.ipynb` but strips the `style`
attribute itself. Three rules follow:

- Every styled block must still read as plain prose with the styling gone, so
  colour may never be the only thing carrying a meaning — that is why the
  Spanish box says `ESPAÑOL` in words.
- Tints are `rgba` over whatever the theme is painting, never opaque fills and
  never a hard-coded text colour, so one palette reads in Colab light and Colab
  dark without a second set of values.
- Headings stay real markdown headings. Colab builds its outline from those,
  and a title inside a `<div>` would leave the notebook unnavigable.

A styled `<div>` is a raw HTML block, so nothing inside one is parsed as
markdown: `**bold**` written there reaches the reader as asterisks. Use
`<b>`, `<code>` and `<ul>` inside a box.

**Equations are display maths in plain markdown, and never inside a box.** That
same rule -- a raw HTML block is not parsed as markdown -- is why: GitHub will
not typeset `$$...$$` inside a `<div>`, so an equation written in the Spanish
box silently ships as dollar signs. Put it in the markdown body, on its own
lines, with a blank line either side.

One copy serves both languages, for the reason the cube animations give: an
equation reads the same in English and in Spanish. What gets translated is the
plain-English sentence under it, and there should always be one -- the maths
restates the code, it never replaces the explanation.

Two things about the notation are decided by the renderer rather than by taste.
Multi-letter names are `\mathrm{ndim}`, not `\texttt{ndim}`: MathJax spaces
`\texttt` as though each letter were a variable, so `ndim` comes out as
"ndi m", and `\text{\texttt{...}}` is worse -- text mode does not define
`\texttt` and the macro ships to the reader literally. A code identifier
belongs in backticks in the prose, not in maths at all.

`gen_notebooks.py` owns the vocabulary — `rule()`, `eyebrow()`, `es_box()` and
one accent per notebook from `ACCENTS` — and spends it on the header and footer
it generates. Body cells repeat the same inline styles by hand, because a body
cell is authored in the `.ipynb`, including in Colab.

**Two kinds of cell are folded**, and `hide-input` is the tag they share.
`_normalize_cell` keys on that tag to restore `cellView` and
`jupyter.source_hidden` after a Colab round-trip, which is what keeps a folded
cell folded:

| Tag | Hides | Check 10 |
|---|---|---|
| `solution` | an answer the reader should not see yet | **applies** — no visible cell may depend on a name only a solution binds, because a reader may never open one |
| `plumbing` | widget and plotting scaffolding whose output is the lesson and whose source is noise | **does not quarantine it** — `check_solution_independence()` keys on the `solution` tag alone, so a plumbing cell counts as visible on both sides: its bindings are not hidden from later cells, and it may not itself depend on a name only a solution binds |

**The predict-first cells are the one place a `<style>` block is allowed.** The
markdown rule above exists because Colab strips `<style>` from a markdown cell;
it does not strip it from a cell's *output*, which is the path pandas' own
`Styler` uses. ipywidgets exposes no way to set the space between radio options
from Python, so the predict cell ships a `<style>` scoped to a class it adds
itself, and the options still work if it is ever dropped. Do not copy this into
a markdown cell, where it would do nothing at all.

Those cells present the answer through `pred_panel`, which catches what
`check_prediction` prints and lays it out: readings in monospace rows, sentences
in prose type, and space between the two. The words are unchanged -- the check
still just prints -- so an edit to the reveal is an ordinary edit to a `print`.
`EN` and `ES` stay written out as tags rather than becoming a colour, for the
reason the Spanish box says `ESPAÑOL` in words.

**The frame stepper is `plumbing`, and it is the one cell no route runs.** Every
notebook carries one under its animations: a GIF cannot be paused, and at
the end of a finite loop the browser goes back to frame 0, so the stepper
fetches the same frames and hands them over one at a time. Two constraints are
not style. It renders into a `widgets.Image`, **never** a `widgets.Output` —
this file already records what a payload leaving an `Output` does to nbclient,
and the stepper's whole job is to move images. And it is in no route and no
`ci_cells`, so `test_notebooks.py` never executes it, deliberately: it is what
a reader reaches for rather than something the lesson depends on, and the
widget sweep has no business driving a control whose every change ships a PNG.
The cost is that a broken stepper would ship, so check it in Colab by hand when
you touch it. It catches its own network failure and says so in both languages,
because a reader offline should meet a sentence, not a traceback.

## Extras: notebooks that are not sections

`extras:` in `_variables.yml` declares a notebook that is not a section — a
take-home deep dive. The mapping is `sections:` minus `minutes`, `start`, `end`
and `part`, and that absence *is* the mechanism: `scripts/timeline.py` only ever
walks `sections`, so nothing under `extras:` can move a start time, the agenda
or `workshop.minutes`. An extra also gets no `#sec-NN` slide anchor and no
Kahoot.

Everywhere a **notebook** is handled, extras are included — `gen_notebooks.py`
normalizes them, and the four checks in `check_links.py` that read `NOTEBOOKS`
cover them: 1 (notebooks valid), 2 (`docs/notebooks` byte-compare), 4 (Colab
URLs) and 10 (solution independence).
Everywhere a **section** is handled, they are not: checks 5 (deck anchors), 6
(notebooks-page parity) and 8 (the clock) stay on `SECTIONS` alone, and adding
an extra to any of them would be the bug. Their tables are separate and narrower
— `_includes/notebooks-extra-{en,es}.md` and `_includes/extras-{en,es}.md`,
`# | Deep dive | Colab`, no Slides and no Quiz column.

## No commits on main

Work goes on a branch and reaches `main` through a pull request. Three guards
enforce this. The first two need to be enabled per clone; the third lives on
`origin` and does not:

```bash
git config core.hooksPath .githooks    # required once per clone
```

`.githooks/pre-commit` is the one that actually holds the line locally: it runs
inside git, knows the branch exactly, and refuses any commit made while HEAD is
`main`. At your own terminal, `ALLOW_MAIN_COMMIT=1` overrides it for one commit
and `--no-verify` skips it entirely.

`.claude/settings.json` adds a PreToolUse hook — `.claude/hooks/no_commit_on_main.py`
— so Claude's commit-creating commands on `main` are denied before they run,
rather than surfacing as a failed commit. It does **not** honor
`ALLOW_MAIN_COMMIT`: that hatch is for a human at a terminal, and an agent must
not self-authorize a bypass. Ask for a branch instead. The hook is automatic,
but a session started before the file existed needs `/hooks` opened once, or a
restart, to load it. Without `python3` it cannot check anything, so it blocks
any command mentioning "commit" rather than waving it through.

The [protect-main ruleset](https://github.com/project-delphi/tensors-workshop/rules/21154813)
is the boundary that does not depend on a clone. It targets the default branch,
blocks deletion and force-push, requires a pull request, and requires **both
checks** from `.github/workflows/publish.yml` — `render` and `notebooks` — to
pass on a branch that is up to date with `main`. Nobody is in the bypass list,
including admins. It does not require an approving review: a two-person
workshop would stall on that, and the PR itself is the gate.

Requiring `notebooks` is the deliberate half. It executes real kernels against
the live datasets, so a dead URL or a PyPI outage now blocks merging rather
than only reporting — which is the point, because a notebook that no longer
runs is the one failure a student meets first. When something upstream is
genuinely down, fix it or take the check out of the ruleset for the day; do
not merge around it.

Which guard covers what:

| | `pre-commit` | Claude hook | GitHub ruleset |
|---|---|---|---|
| `git commit` | yes | yes | no — the commit is local |
| `git cherry-pick`, `revert`, `am` | **no** — git runs no `pre-commit` for these | yes | no — still local |
| `git push` to `main` | no | no | yes — rejected; open a PR |
| `git merge`, `rebase`, force-push of `main` on `origin` | no | no | yes |
| Your own terminal | yes | no | yes, once you push |
| A fresh clone before `core.hooksPath` | no | yes | yes, once you push |

Deciding which repo a shell command will commit into is not decidable in
general, so treat the Claude hook as an early, explanatory failure rather than
the boundary. The ruleset is the boundary.

## Commands

```bash
quarto preview          # live site at http://localhost:4200
quarto render           # writes docs/

uv run --group site python scripts/gen_tables.py
uv run --group site python scripts/gen_notebooks.py
uv run --group site python scripts/check_links.py     # verifies docs/
uv run --group site python scripts/check_links.py --notebooks-only

# Runs the notebooks. A kernel per notebook, the network, and the scientific
# stack — so it is its own CI job, not part of the render gate.
uv run --group execute python scripts/test_notebooks.py
uv run --group execute python scripts/test_notebooks.py --list       # no kernel
uv run --group execute python scripts/test_notebooks.py --only 10
uv run --group execute python scripts/test_notebooks.py --offline

# The image generators. Network, heavy deps, not run by CI — see above.
uv run --group figures python scripts/gen_thumbnails.py
uv run --group figures python scripts/gen_figures.py
uv run --group figures python scripts/gen_cube_gifs.py        # notebooks 00–15
uv run --group figures python scripts/gen_cube_gifs.py 04 10  # just these two
uv run --group figures python scripts/gen_pca_gifs.py         # notebook 16
uv run --group figures python scripts/gen_tensor_module_gifs.py  # notebooks 17–18
uv run python scripts/gen_slide_art.py     # needs Chrome and the network
```

`check_links.py` is the site test suite — there is no pytest here. It prints
fourteen numbered checks, in the order they run. Twelve can fail, and any
failure exits non-zero: notebooks are valid with no outputs or execution
counts; every notebook the rendered `docs/` serves is byte-identical to the one
committed in `notebooks/`; internal links resolve *including the `#fragment`*; every Colab badge points at its own
existing notebook, **and every link from one notebook to another names an
`.ipynb` that exists** — nothing else looks at those, because a notebook
reaches `docs/` as a verbatim copy rather than a rendered page, which is how
notebook 01 spent months linking two files that had never existed; **and every
image a notebook embeds from the site names a file in `images/`, with alt text,
and is one of that notebook's own `cube-NN-*` animations** — ownership rather
than a count, because a count stopped being the useful question the moment a
notebook carried two, and because the likeliest mistake by far is a cube cell
copied between notebooks with the number left alone; out of reach of check 3
for the same copied-not-rendered reason, and doubly so because those URLs must be absolute (a notebook
on Colab has no checkout to resolve a relative path against) and check 3 skips
external URLs; both decks carry every section anchor; the EN and ES
notebooks pages list the same thirteen sections (extras appear in neither, by
design); the two
references pages cite the same external works, with every ml-blog URL among
them declared under `reading:` and every `references:` group anchor present on
both; each section's
written `start`/`end` still matches the
running clock derived from `minutes` plus the quizzes and breaks between them,
and the `agenda` rows still account for every segment of that clock exactly
once and in order; the deck timer's total still matches `workshop.minutes`;
and no visible notebook cell depends on a name bound only inside a folded
solution cell (easy to introduce, invisible when you run the notebook top to
bottom). Check 13 compares the **shape** of the two handbooks — heading counts, table
rows, the notebooks each links — because `AGENTS.md` requires them to change
together and nothing else verifies it. It is numbered 13 because the numbers
are a contract this file refers to, and inserting it where it reads best would
renumber three others. It catches a heading added to one side only; **it cannot
catch wording**, which is the half that actually drifts, and its docstring says
so. Check 14 is the same idea for the two Kahoot pages: both must carry
`#quiz-1`, `#quiz-2` and `#quiz-3`.

Checks 11 and 12 — Kahoot join URLs, and the companion's artifact links
and exports — only print a TODO. That output is **not** a failure: both cover
material that is pasted in after the page exists, and CI must not go red in
between. `--notebooks-only` runs the notebook and
solution-independence checks alone. Run it after any content change.

Quarto never executes the notebooks, so building needs Quarto only. To run them
locally: `uv run --group notebooks jupyter lab`.

That group is in `pyproject.toml`, and `gen_tables.py` generates it from the
same read of the notebooks that builds the *what each notebook needs* table —
so the environment and the table cannot disagree, and neither can drift from
the imports. `matplotlib` and `ipywidgets` both ship with Colab but not with a
local `jupyterlab` install. Every notebook plots something, and every one
except 00 uses `ipywidgets` sliders on top of that. Notebook cells that need
`tensorly` install it themselves with `%pip install -q tensorly`, so it is not
in the group — the generator drops anything a notebook `%pip`-installs.

## Publishing

**`.github/workflows/publish.yml` is the publisher.** Its `render` job
regenerates the derived files, renders the site, and runs `check_links.py` and
the browser check over the result; `actions/upload-pages-artifact` then hands
that exact `docs/` to the `deploy` job, which is the only thing in the repo
holding `pages: write`. `deploy` is a separate job guarded by
`github.event_name == 'push' && github.ref == 'refs/heads/main'`, because
`render` is a required status check and runs on every PR — a PR must not be
able to publish. So the live site is the render that passed, not a copy
somebody remembered to commit.

**`docs/` is gitignored build output and is never committed.** A content PR
carries source only. `quarto render` still writes it locally, and both
checkers read it from there — `check_links.py` resolves every link against it,
`check_navigation.cjs` serves it to a real browser — so render first and
expect `git status` to stay empty afterwards.

This retired a gate rather than replacing one. While `docs/` was committed, CI
had to prove the committed copy still matched a fresh render, and could not do
it byte-exactly: Quarto compiles the theme SCSS at render time and names it by
content hash, and that compilation differs between macOS and ubuntu-latest at
the same pinned version, so `scripts/compare_render.py` normalized the hashes
away and compared the rest. It walked `*.html` only, which left
`docs/notebooks/` — `resources:` in `_quarto.yml`, copied verbatim rather than
rendered — with no gate at all, and it went stale twice, once to nine
notebooks at a stroke. Both the script and that whole failure mode are gone:
there is no committed copy to drift, because the site is built from source on
every deploy.

Check 2 in `check_links.py` survives it, narrowed. It still byte-compares
`docs/notebooks/` against `notebooks/`, but a fresh render cannot produce a
stale copy, so what it now catches is the `notebooks/*.ipynb` line disappearing
from `resources:` — which would ship a site whose every Colab badge 404s — and
a rename leaving an orphan behind in a `docs/` you did not clean locally.

Quarto is pinned to **1.6.40** in the workflow, and CI renders what ships, so
the pin alone decides the markup a visitor gets. Nothing now compares your
local render against it — use the pinned version anyway, or what you check
locally is not what deploys.

`slides/deck-pace.html` is pulled into both decks with `include-after-body`.
It draws the audience-facing timer and the section breadcrumb, and it owns
`TOTAL_SECONDS` — Quarto has no passthrough for reveal's `totalTime`, so
setting `total-time:` in a deck header silently does nothing. Two traps live
in that file: Quarto runs its **shortcode parser over included HTML**, so a
bare `var` shortcode written out in a comment there crashes the render with
`Cannot get Attr from TypeNil`; and reveal wraps each section into a `.stack`
at init, so the level-1 slides are *not* top-level children by the time
scripts run.

A section's part number reaches the breadcrumb through a hidden
`::: {.sec-part}` div on each title slide. It cannot be a `data-` attribute on
the heading: a `var` shortcode inside a heading's `{...}` is not parsed as an
attribute at all — pandoc folds the whole brace into the heading text and
auto-generates an id from it, which silently destroys every `#sec-NN` anchor.

`_quarto.yml` has an explicit `render:` list on purpose — without it Quarto
sweeps up every notebook and tries to execute them, and renders every README as
a page. Adding a page means adding it there — and, if it has a counterpart in
the other language, tagging both navbar items `rel: lang-en` / `rel: lang-es`.
An untagged item would show in both languages.

## Working on WSL2 (Windows)

- Clone into the Linux filesystem (`~/code/...`), **not** `/mnt/c/...`. Quarto
  renders far slower across the 9p mount and `quarto preview`'s file watching is
  unreliable there. `localhost:4200` is reachable from the Windows browser.
- Line endings need no setup: `.gitattributes` pins `eol=lf`, which overrides
  `core.autocrlf` however a clone has it. Don't "fix" it with
  `core.autocrlf=false` — that's the setting that lets CRLF reach the index.
- `python` may not exist; use `python3`, or `uv run` as above.
- Install Quarto with the Linux `.deb` inside WSL, not the Windows build.
