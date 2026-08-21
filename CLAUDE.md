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

`.githooks/pre-commit` then refuses any commit made while HEAD is `main`
(`ALLOW_MAIN_COMMIT=1` overrides it for one commit; `--no-verify` skips it
entirely). `.claude/settings.json` adds a PreToolUse hook that denies Claude's
`git commit` calls on `main` before they run — that one is automatic, but a
session started before the file existed needs `/hooks` opened once, or a
restart, to load it.

Neither guard covers `git merge`, `git rebase`, or a force-push, so still do
integration on GitHub.

## Commands

```bash
quarto preview          # live site at http://localhost:4200
quarto render           # writes docs/

uv run --with pyyaml python scripts/gen_tables.py
uv run --with pyyaml,nbformat python scripts/gen_notebooks.py
uv run --with pyyaml,nbformat python scripts/check_links.py     # verifies docs/
uv run --with pyyaml,nbformat python scripts/check_links.py --notebooks-only
```

`check_links.py` is the test suite — there is no pytest here. It prints seven
numbered checks, in the order they run. Six can fail, and any failure exits
non-zero: notebooks are valid with no outputs or execution counts; internal
links resolve *including the `#fragment`*; every Colab badge points at its own
existing notebook; both decks carry every section anchor; EN and ES list the
same twelve sections; and no visible notebook cell depends on a name bound only
inside a folded solution cell (easy to introduce, invisible when you run the
notebook top to bottom). The seventh, Kahoot join URLs, only prints a TODO —
that output is **not** a failure. `--notebooks-only` runs the notebook and
solution-independence checks alone. Run it after any content change.

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
- Line endings need no setup: `.gitattributes` pins `eol=lf`, which overrides
  `core.autocrlf` however a clone has it. Don't "fix" it with
  `core.autocrlf=false` — that's the setting that lets CRLF reach the index.
- `python` may not exist; use `python3`, or `uv run` as above.
- Install Quarto with the Linux `.deb` inside WSL, not the Windows build.
