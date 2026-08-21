# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A bilingual (EN/ES) Quarto website for a 3-hour tensors workshop. No application
code — the deliverables are the rendered site, twelve Colab notebooks, two
revealjs decks and three Kahoot spreadsheets.

## The one rule that matters

`_variables.yml` is the single source of truth (repo coordinates, the twelve
sections, the three quizzes). Three things read it: `{{< var >}}` shortcodes in
the `.qmd` pages and both decks, the two generator scripts, and the checker.

**Never hand-edit generated output.** Change `_variables.yml` (or
`scripts/content.py` for notebook teaching content), then regenerate:

| Generated | Owned by |
|---|---|
| `_includes/*.md` (every section table) | `scripts/gen_tables.py` |
| The marker-delimited table regions inside `README.md` and `notebooks/README.md` — the rest of both files is hand-maintained | `scripts/gen_tables.py` |
| `notebooks/*.ipynb` — scaffolding: header, objectives, Colab badge, Kahoot footer | `scripts/gen_notebooks.py` |
| `notebooks/*.ipynb` — body cells | `scripts/content.py` |
| `docs/` | `quarto render` |

CI reruns both generators and fails if the working tree changes, so a hand-edit
is caught but only after you push.

## Commands

```bash
quarto preview          # live site at http://localhost:4200
quarto render           # writes docs/

uv run --with pyyaml python scripts/gen_tables.py
uv run --with pyyaml,nbformat python scripts/gen_notebooks.py
uv run --with pyyaml,nbformat python scripts/check_links.py     # verifies docs/
uv run --with pyyaml,nbformat python scripts/check_links.py --notebooks-only
```

`check_links.py` is the test suite — there is no pytest here. Six checks by
default, non-zero exit on any failure: internal links resolve *including the
`#fragment`*; every Colab badge points at its own existing notebook; both decks
carry every section anchor; notebooks are valid with no outputs or execution
counts; EN and ES list the same twelve sections; and no visible notebook cell
depends on a name bound only inside a folded solution cell (easy to introduce,
invisible when you run the notebook top to bottom). `--notebooks-only` runs the
notebook and solution-independence checks alone. A seventh, the Kahoot join
URLs, only prints a TODO — that output is not a failure. Run it after any
content change.

Quarto never executes the notebooks, so building needs Quarto only. To run them
locally: `uv run --with numpy,pandas,scikit-learn,scikit-image,scipy,jupyterlab jupyter lab`.

## Publishing

Pages serves `docs/` on `main`, so **`docs/` is committed** — render and commit
it with every content change. `.github/workflows/publish.yml` is a guard, not
the publisher: it re-renders and runs `scripts/compare_render.py`, which
compares committed vs fresh HTML with Quarto's content-hashed asset names
normalized away (a byte-exact gate is impossible — SCSS compilation differs
between macOS and ubuntu-latest at the same version).

Quarto is pinned to **1.6.40** in the workflow. Use that version locally; a
different one changes markup and the staleness gate goes red. Bump the pin and
re-render together.

`_quarto.yml` has an explicit `render:` list on purpose — without it Quarto
sweeps up every notebook and tries to execute them, and renders every README as
a page. Adding a page means adding it there.

## Working on WSL2 (Windows)

- Clone into the Linux filesystem (`~/code/...`), **not** `/mnt/c/...`. Quarto
  renders far slower across the 9p mount and `quarto preview`'s file watching is
  unreliable there. `localhost:4200` is reachable from the Windows browser.
- Keep LF line endings: `git config core.autocrlf false`. The generators emit
  LF and CI diffs the tree byte-for-byte, so CRLF makes every generated file
  look drifted.
- `python` may not exist; use `python3`, or `uv run` as above.
- Install Quarto with the Linux `.deb` inside WSL, not the Windows build.
