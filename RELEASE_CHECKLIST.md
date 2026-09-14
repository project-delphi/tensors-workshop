# Workshop release checklist

Start with the [editing ownership guide](CONTRIBUTING.md#where-to-edit).

- [ ] Work on a feature branch. Review the diff; preserve unrelated edits.
- [ ] Keep shared facts in `_variables.yml`; edit notebook bodies directly.
- [ ] Review English and Spanish together. Keep learner copy short.
- [ ] Run `scripts/test_notebooks.py` (below). It covers the core routes and
      their solutions; open anything outside that in a fresh runtime yourself.
- [ ] Attempt exercises before revealing solutions. Check widgets and downloads.
- [ ] Check folding, spacing and headings in Colab; test the top language switch.
- [ ] For navigation changes, run the [browser regression check](CONTRIBUTING.md#validate-and-submit) — CI runs it too, on every PR.
- [ ] Run the checks below. Review and commit generated changes — but not
      `docs/`, which is gitignored and built by Actions.
- [ ] Add a brief learner-facing note to [CHANGELOG.md](CHANGELOG.md).
- [ ] Open a PR, wait for the `render` check, then merge. Direct pushes to `main` are rejected. Merging deploys; verify the published site.
- [ ] Record the commit/tag on the [feedback form](workshop-feedback.md).

```bash
uv run --group site python scripts/gen_tables.py
uv run --group site python scripts/gen_notebooks.py
uv run --group test python scripts/check_teaching_materials.py
uv run --group test python -m unittest discover -s tests -v
quarto render
uv run --group site python scripts/check_links.py
uv run --group execute python scripts/test_notebooks.py
git diff --check
```

Use the Quarto version pinned in the workflow. Regenerating a second time must
not change files. `test_notebooks.py` executes each notebook's core route and
the solution that answers it, in a fresh kernel — but not the cells outside
that route, and nothing anywhere opens Colab. Record what you checked by hand,
and anything left untested, in the PR.
