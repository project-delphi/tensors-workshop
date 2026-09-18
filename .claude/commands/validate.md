---
description: Run the full release checklist — regenerate, render, check, test — and report which PR-template boxes can honestly be ticked.
allowed-tools: Bash, Read, Grep, Glob
argument-hint: "[--fast to skip the notebook kernels]"
---

Run this repo's validation sequence and report the result. Do not fix anything
you find unless the user asks — report it.

Arguments: $ARGUMENTS. `--fast` skips the last step (the notebook kernels),
which is the slow one; say in the report that you skipped it.

## Run these in order, and do not stop at the first failure

Run them all, so one report covers everything:

```bash
uv run --group site python scripts/gen_tables.py
uv run --group site python scripts/gen_notebooks.py
git status --porcelain -- notebooks _includes README.md pyproject.toml \
    tensors_workshop_plan_with_quizzes.md es/tensors_workshop_plan_with_quizzes.md
```

That third command is CI's gate, verbatim. On a clean checkout, non-empty
output means a generated file was hand-edited — name the files.

On a dirty one it does not, and this command is meant for a dirty one. Those
paths hold hand-edited content too: every teaching body cell lives under
`notebooks/`, and most of both handbooks is outside the marker region. So
separate the two before reporting. `git stash list` and `git diff` will tell
you whether a listed file was already modified before you ran anything; if it
was, say which files you could not attribute rather than calling them
scaffolding.

Then prove the generators are idempotent, which the release checklist requires.
The question is whether a *second* run moves anything the first did not, so
compare against the tree as the first run left it, not against HEAD:

```bash
before=$(git status --porcelain -- notebooks _includes README.md pyproject.toml \
    tensors_workshop_plan_with_quizzes.md es/tensors_workshop_plan_with_quizzes.md)
uv run --group site python scripts/gen_tables.py
uv run --group site python scripts/gen_notebooks.py
after=$(git status --porcelain -- notebooks _includes README.md pyproject.toml \
    tensors_workshop_plan_with_quizzes.md es/tensors_workshop_plan_with_quizzes.md)
[ "$before" = "$after" ] && echo "idempotent" || { echo "SECOND RUN MOVED:"; \
    diff <(echo "$before") <(echo "$after"); }
```

That matters twice over. Scoped to the gate's own paths, because a bare
`git status --porcelain` reports every unrelated edit in the working tree -- a
half-written page, a scratch file, an image someone reran. And compared against
the snapshot rather than HEAD, because a file the first gate already flagged as
hand-edited is still dirty afterwards, and diffing against HEAD would report it
again here.

Two things about that snippet are deliberate, and both were found by running it
rather than by reading it. The paths are repeated instead of held in a variable:
unquoted `$paths` word-splits in bash but **not** in zsh, where it becomes one
pathspec matching nothing -- the check then passes on everything, silently. And
the two states are compared as strings rather than diffed directly: `$(...)`
strips trailing newlines, so a clean tree gives `""` on both sides and matches,
where piping an empty `before` through `printf`/`diff` reports a phantom blank
line and fails the commonest case of all.

`idempotent` is the pass. Anything else is a determinism bug in the generator,
not a content problem. Say so explicitly if it happens.

Then:

```bash
uv run --group lint ruff check scripts tests
uv run --group lint ruff format --check scripts tests
uv run --group test python scripts/check_teaching_materials.py
uv run --group test python -m unittest discover -s tests
quarto render
uv run --group site python scripts/check_links.py
npm run check:navigation
npm test
git diff --check
```

`npm run check:navigation` needs `npm ci` once and drives a real browser over
`docs/`, so it runs after the render too. It is in CI's `render` job and it has
a box on the PR template, which is why it is here rather than in *Not covered*:
a box that is never run and never declared is the omission the template's own
preamble calls the one wrong answer. If Playwright is not installed, say the box
is unchecked rather than dropping it.

`quarto render` must be Quarto **1.6.40** — the version CI pins. Check with
`quarto --version` and say in the report if it differs, because what you
checked locally is then not what deploys. `check_links.py` reads the site from
`docs/`, so it has to run after the render. `docs/` is gitignored: it must
never appear in `git status`.

Unless `--fast` was passed, finish with the kernels:

```bash
uv run --group execute python scripts/test_notebooks.py
```

One fresh kernel per notebook, real `%pip install`, real dataset fetches. A
failure here can be an upstream outage rather than this repo's fault — say
which you think it is, and do not suggest merging around it.

## Then report

Four short sections:

1. **Result** — pass or fail, and for a fail, the command and the part of its
   output that names the problem. Not the whole log.
2. **The gate** — whether the regenerate check and the second-run check were
   both clean.
3. **PR template boxes** — go through `.github/pull_request_template.md` and say
   which boxes this run earns. Only boxes whose command actually ran and
   passed. A box you skipped is unchecked, which is information; a box ticked
   without the run is the one wrong answer.
4. **Not covered** — what this sequence never checks: Spanish *wording* (check
   13 compares shape only), anything in Colab, the image generators (outside the
   gate, and a rerun can differ purely from a matplotlib release), the frame
   stepper in each notebook, and any cell outside a declared route.
