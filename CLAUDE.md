# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A bilingual (EN/ES) Quarto website for a 3-hour tensors workshop. No application
code — the deliverables are the rendered site, twelve Colab notebooks, two
revealjs decks and three Kahoot spreadsheets.

## The one rule that matters

`_variables.yml` is the single source of truth (repo coordinates, the twelve
sections, the three quizzes, the agenda). Three things read it: `{{< var >}}`
shortcodes in the `.qmd` pages and both decks, the two generator scripts, and
the checker. The generator and the checker both need the running clock —
what time each section starts, once the quizzes and breaks between them are
counted — and both get it from `scripts/timeline.py` rather than walking it
twice.

**Never hand-edit generated output.** Change `_variables.yml` (or
`scripts/content.py` for notebook teaching content), then regenerate:

| Generated | Owned by |
|---|---|
| `_includes/*.md` (every section table, and the agenda both decks show) | `scripts/gen_tables.py` |
| The marker-delimited table regions inside `README.md` and `notebooks/README.md` — the rest of both files is hand-maintained | `scripts/gen_tables.py` |
| `notebooks/*.ipynb` — scaffolding: header, objectives, Colab badge, Kahoot footer | `scripts/gen_notebooks.py` |
| `notebooks/*.ipynb` — body cells | `scripts/content.py` |
| `docs/` | `quarto render` |

CI reruns both generators and fails if the working tree changes. This gate *is*
byte-exact — the generators are deterministic pure Python — unlike the render
gate under Publishing, which cannot be. A hand-edit is caught, but only once
you push.

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
```

`check_links.py` is the test suite — there is no pytest here. It prints nine
numbered checks, in the order they run. Eight can fail, and any failure exits
non-zero: notebooks are valid with no outputs or execution counts; internal
links resolve *including the `#fragment`*; every Colab badge points at its own
existing notebook; both decks carry every section anchor; EN and ES list the
same twelve sections; each section's written `start`/`end` still matches the
running clock derived from `minutes` plus the quizzes and breaks between them,
and the `agenda` rows still account for every segment of that clock exactly
once and in order; the deck timer's total still matches `workshop.minutes`;
and no visible notebook cell depends on a name bound only inside a folded
solution cell (easy to introduce, invisible when you run the notebook top to
bottom). The ninth, Kahoot join URLs, only prints a TODO — that output is
**not** a failure. `--notebooks-only` runs the notebook and
solution-independence checks alone. Run it after any content change.

Quarto never executes the notebooks, so building needs Quarto only. To run them
locally: `uv run --with numpy,pandas,matplotlib,scikit-learn,scikit-image,scipy,jupyterlab,ipywidgets jupyter lab`.

`matplotlib` and `ipywidgets` both ship with Colab but not with a local
`jupyterlab` install. Nearly every section now plots something, and the sliders
in sections 01, 03, 09, 10 and 11 need `ipywidgets` on top of that. Notebook
cells that need `tensorly` install it themselves with `%pip install -q
tensorly`, so it is not in this list.

## Publishing

Pages serves `docs/` on `main`, so **`docs/` is committed** — render and commit
it with every content change. `.github/workflows/publish.yml` is a guard, not
the publisher: it re-renders and runs `scripts/compare_render.py`, which
compares committed vs fresh HTML with Quarto's content-hashed asset names
normalized away (a byte-exact gate is impossible — SCSS compilation differs
between macOS and ubuntu-latest at the same version).

**That gate only walks `*.html`, and it is the only staleness check there is.**
`notebooks/*.ipynb` are `resources:` in `_quarto.yml`, not `render:` targets —
Quarto copies them into `docs/notebooks/` verbatim. So a notebook change that
is committed without a re-render leaves `docs/notebooks/` serving the old copy,
and nothing fails: the regenerate gate compares `notebooks/` against
`content.py` and never looks in `docs/`, while `compare_render.py` skips
non-HTML entirely. This has already happened once, to nine of the twelve
notebooks at once. Re-render after *any* notebook change, not only after a
prose or `_variables.yml` change.

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
