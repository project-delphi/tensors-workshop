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

That third command is CI's gate, verbatim. Non-empty output means a generated
file was hand-edited — name the files.

Then prove the generators are idempotent, which the release checklist requires:

```bash
uv run --group site python scripts/gen_tables.py
uv run --group site python scripts/gen_notebooks.py
git status --porcelain
```

A second run that changes anything is a determinism bug in the generator, not a
content problem. Say so explicitly if it happens.

Then:

```bash
uv run --group test python scripts/check_teaching_materials.py
uv run --group test python -m unittest discover -s tests
quarto render
uv run --group site python scripts/check_links.py
git diff --check
```

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
