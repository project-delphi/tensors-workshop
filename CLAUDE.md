# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A bilingual (EN/ES) Quarto website for a 3-hour tensors workshop. No application
code — the deliverables are the rendered site, fourteen Colab notebooks
(thirteen sections plus one take-home extra), two revealjs decks and three
Kahoot spreadsheets.

## The one rule that matters

`_variables.yml` is the single source of truth (repo coordinates, the thirteen
sections, the extra, the three quizzes, the agenda). Three things read it:
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

Change `_variables.yml` for shared facts, objectives and the bilingual header
text, then run the appropriate generator:

| Generated | Owned by |
|---|---|
| `_includes/*.md` (every section table, and the agenda both decks show) | `scripts/gen_tables.py` |
| The marker-delimited table regions inside `README.md`, `notebooks/README.md` and the handbook's schedule — the rest of all three files is hand-maintained | `scripts/gen_tables.py` |
| `notebooks/*.ipynb` — header (cell 0) and footer (final cell) only | `scripts/gen_notebooks.py` using `_variables.yml` |
| `notebooks/*.ipynb` — every cell between the header and footer, including the Setup section | the notebook itself; editable directly in Colab/Gemini |
| `images/ds-*` (dataset cards) | `scripts/gen_thumbnails.py` |
| `images/hero-band.png`, `images/fig-*` (the handbook's figures) | `scripts/gen_figures.py` |
| `slides/{en,es}/images/slides-final/slide-NNa.png` (art added since #45) | `scripts/gen_slide_art.py` |
| `docs/` | `quarto render` |

CI reruns `gen_tables.py` and `gen_notebooks.py` and fails if the working tree
changes. This gate *is* byte-exact — both are deterministic pure Python —
unlike the render gate under Publishing, which cannot be. A hand-edit is
caught, but only once you push.

**The three image generators are not in that gate**, deliberately: they need
the network, and a scientific stack or a browser the workflow does not install.
So nothing will tell you an image is stale — rerun them by hand when their
inputs change. All three are still deterministic, and all three record where
every pixel came from, which is the actual point:

- `gen_thumbnails.py` builds the nine dataset cards from SHA-256-pinned CC0
  sources. Pinning matters: a Commons file can be overwritten under the same
  name, and a card silently regenerated from a different photograph is not
  something a binary diff will show you.
- `gen_figures.py` builds the banner and the handbook's four figures, and
  imports the pin, the palette and the fetcher from `gen_thumbnails.py` rather
  than repeating them. Every figure is drawn from an array the workshop
  actually uses — `camera()`, `load_digits()`, the storm clip, the taxi CSV —
  so the numbers printed on a figure are the numbers the exercise prints, and
  they stay that way.
- `gen_slide_art.py` draws slide art from HTML and CSS, screenshotted by
  headless Chrome at the deck's own 1920×1080. It owns only the `slide-NNa`
  insertions: the thirty-one PNGs the #45 redesign left have no source and are
  still redrawn by hand in the tool that made them. Copy for both languages
  lives in one `SLIDES` table, so EN and ES cannot be edited apart. Rerunning it
  rewrites the same bytes, which is what makes `git status` a staleness check.

## Which document owns what

Five documents describe the same workshop to different readers. They drifted
once — five copies of the prerequisites, three different local-run commands, two
incompatible vocabularies — so each fact now has exactly one home. Before adding
a paragraph, find whose job it is:

| Document | Owns | Never contains |
|---|---|---|
| `_variables.yml` | Every shared fact: repo coordinates, section titles and minutes, the running clock, quiz metadata, prerequisite URLs. | — |
| `index.qmd` / `es/index.qmd` | The student's entry point: what this is, who it is for, **what each resource is for**, prerequisites in full, how to run the notebooks, the section table. | Teaching content or exercises. |
| The handbook | The session text: theory, exercises, worked solutions, further reading, the appendices, facilitator notes. The only document that owns Part/Block. | Prerequisites, setup instructions, "how we work" — it links to the homepage for those. |
| `notebooks.qmd` | How the notebooks are built, what each one needs, how to run them off Colab. | The workshop's content or its schedule. |
| `kahoot.qmd` | The three quizzes and how to run them. | — |
| `README.md` | The GitHub shopfront: what this is, who it is for, prerequisites **in brief**, and links out. | Anything the site already owns. |

**One canonical identifier.** A segment is a **section, `00`–`11`**, everywhere.
Part I–IV and Block 1–6 are the handbook's own secondary labels, live in
`_variables.yml` as `part:` and `block:`, and appear in exactly two places: the
handbook's six exercise headings, and its generated schedule table — which
carries the section number beside them and is therefore the only key a reader
needs. Prose that says "Block 4" where it means section 07 is the bug.

**The local-run command** appears in five places — `README.md` twice, once per
language; `notebooks.qmd`; `notebooks/README.md`; and the Commands section below
— and nothing checks that they agree. Change one, change all five, and derive it
from what the notebooks actually import rather than from memory:

```bash
python3 -c "
import json, glob, re, os
for f in sorted(glob.glob('notebooks/*.ipynb')):
    src = chr(10).join(''.join(c['source']) for c in json.load(open(f))['cells']
                       if c['cell_type'] == 'code')
    print(os.path.basename(f), re.findall(r'^\s*(?:import|from)\s+(\w+)', src, re.M))
"
```

## Extras: notebooks that are not sections

`extras:` in `_variables.yml` declares a notebook that is not a section — a
take-home deep dive. The mapping is `sections:` minus `minutes`, `start`, `end`
and `part`, and that absence *is* the mechanism: `scripts/timeline.py` only ever
walks `sections`, so nothing under `extras:` can move a start time, the agenda
or `workshop.minutes`. An extra also gets no `#sec-NN` slide anchor and no
Kahoot.

Everywhere a **notebook** is handled, extras are included — `gen_notebooks.py`
normalizes them, and checks 1, 3 and 8 in `check_links.py` cover them.
Everywhere a **section** is handled, they are not: checks 4 (deck anchors), 5
(landing-page parity) and 6 (the clock) stay on `SECTIONS` alone, and adding an
extra to any of them would be the bug. Their tables are separate and narrower —
`_includes/notebooks-extra-en.md` and `_includes/extras-{en,es}.md`, `# | Deep
dive | Colab`, no Slides and no Quiz column.

## No commits on main

Work goes on a branch and reaches `main` through a pull request. Two guards
enforce this, and both need to be enabled per clone:

```bash
git config core.hooksPath .githooks    # required once per clone
```

`.githooks/pre-commit` is the one that actually holds the line: it runs inside
git, knows the branch exactly, and refuses any commit made while HEAD is
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

Which guard covers what:

| | `pre-commit` | Claude hook |
|---|---|---|
| `git commit` | yes | yes |
| `git cherry-pick`, `revert`, `am` | **no** — git runs no `pre-commit` for these | yes |
| `git merge`, `rebase`, force-push | no | no |
| Your own terminal | yes | no |
| A fresh clone before `core.hooksPath` | no | yes |

Closing the remaining gaps needs a GitHub ruleset on `origin`; that is
deliberately not part of this setup. Deciding which repo a shell command will
commit into is not decidable in general, so treat the Claude hook as an early,
explanatory failure rather than the boundary.

## Commands

```bash
quarto preview          # live site at http://localhost:4200
quarto render           # writes docs/

uv run --with pyyaml python scripts/gen_tables.py
uv run --with pyyaml,nbformat python scripts/gen_notebooks.py
uv run --with pyyaml,nbformat python scripts/check_links.py     # verifies docs/
uv run --with pyyaml,nbformat python scripts/check_links.py --notebooks-only

# The image generators. Network, heavy deps, not run by CI — see above.
uv run --with numpy,pillow,scipy,matplotlib,imageio,imageio-ffmpeg,\
scikit-learn,scikit-image python scripts/gen_thumbnails.py
uv run --with numpy,pandas,pillow,scipy,matplotlib,imageio,imageio-ffmpeg,\
scikit-learn,scikit-image python scripts/gen_figures.py
uv run python scripts/gen_slide_art.py     # needs Chrome and the network
```

`check_links.py` is the test suite — there is no pytest here. It prints ten
numbered checks, in the order they run. Nine can fail, and any failure exits
non-zero: notebooks are valid with no outputs or execution counts; every
notebook `docs/` serves is byte-identical to the one committed in
`notebooks/`; internal links resolve *including the `#fragment`*; every Colab badge points at its own
existing notebook; both decks carry every section anchor; EN and ES list the
same thirteen sections (extras appear in neither, by design); each section's
written `start`/`end` still matches the
running clock derived from `minutes` plus the quizzes and breaks between them,
and the `agenda` rows still account for every segment of that clock exactly
once and in order; the deck timer's total still matches `workshop.minutes`;
and no visible notebook cell depends on a name bound only inside a folded
solution cell (easy to introduce, invisible when you run the notebook top to
bottom). The tenth, Kahoot join URLs, only prints a TODO — that output is
**not** a failure. `--notebooks-only` runs the notebook and
solution-independence checks alone. Run it after any content change.

Quarto never executes the notebooks, so building needs Quarto only. To run them
locally: `uv run --with numpy,pandas,matplotlib,scikit-learn,scikit-image,scipy,jupyterlab,ipywidgets jupyter lab`.

`matplotlib` and `ipywidgets` both ship with Colab but not with a local
`jupyterlab` install. Every notebook plots something, and every one except 00
uses `ipywidgets` sliders on top of that. Notebook
cells that need `tensorly` install it themselves with `%pip install -q
tensorly`, so it is not in this list.

## Publishing

Pages serves `docs/` on `main`, so **`docs/` is committed** — render and commit
it with every content change. `.github/workflows/publish.yml` is a guard, not
the publisher: it re-renders and runs `scripts/compare_render.py`, which
compares committed vs fresh HTML with Quarto's content-hashed asset names
normalized away (a byte-exact gate is impossible — SCSS compilation differs
between macOS and ubuntu-latest at the same version).

**That gate only walks `*.html`.** `notebooks/*.ipynb` are `resources:` in
`_quarto.yml`, not `render:` targets — Quarto copies them into
`docs/notebooks/` verbatim. So a notebook change committed without a re-render
leaves `docs/notebooks/` serving the old copy, and neither the regenerate gate
nor `compare_render.py` would say so: the first reruns
`scripts/gen_notebooks.py` and only fails if the tracked `notebooks/` drift
from the normalizer's output, never looking in `docs/`, while the second skips
non-HTML entirely. That is what let it happen twice, once to nine notebooks at
a stroke.

Check 2 in `check_links.py` closes it, and it *is* byte-exact — Quarto copies
these files instead of transforming them, so there is no SCSS-style difference
to normalize away. CI runs the checker against `docs/` as committed before it
re-renders, which is the copy Pages is serving. Re-render after *any* notebook
change, not only after a prose or `_variables.yml` change.

Quarto is pinned to **1.6.40** in the workflow. Use that version locally; a
different one changes markup and the staleness gate goes red. Bump the pin and
re-render together.

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
a page. Adding a page means adding it there.

## Working on WSL2 (Windows)

- Clone into the Linux filesystem (`~/code/...`), **not** `/mnt/c/...`. Quarto
  renders far slower across the 9p mount and `quarto preview`'s file watching is
  unreliable there. `localhost:4200` is reachable from the Windows browser.
- Line endings need no setup: `.gitattributes` pins `eol=lf`, which overrides
  `core.autocrlf` however a clone has it. Don't "fix" it with
  `core.autocrlf=false` — that's the setting that lets CRLF reach the index.
- `python` may not exist; use `python3`, or `uv run` as above.
- Install Quarto with the Linux `.deb` inside WSL, not the Windows build.
