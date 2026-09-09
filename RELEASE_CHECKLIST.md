# Workshop release checklist

- [ ] Work on a feature branch. Review the diff; preserve unrelated edits.
- [ ] Keep shared facts in `_variables.yml`; edit notebook bodies directly.
- [ ] Review English and Spanish together. Keep learner copy short.
- [ ] Test each changed core route in a fresh runtime, with optional cells skipped.
- [ ] Attempt exercises before revealing solutions. Check widgets and downloads.
- [ ] Check folding, spacing and headings in Colab; test the top language switch.
- [ ] Run the checks below. Review and commit generated changes, including `docs/`.
- [ ] Add a brief learner-facing note to [CHANGELOG.md](CHANGELOG.md).
- [ ] Open a PR, wait for CI, then merge with approval. Verify the published site.
- [ ] Record the commit/tag on the [feedback form](workshop-feedback.md).

```bash
uv run --with pyyaml python scripts/gen_tables.py
uv run --with pyyaml,nbformat python scripts/gen_notebooks.py
python3 scripts/check_teaching_materials.py
uv run --with numpy python -m unittest discover -s tests -v
quarto render
uv run --with pyyaml,nbformat python scripts/check_links.py
git diff --check
```

Use the Quarto version pinned in the workflow. Regenerating a second time must
not change files. These checks do not execute the full notebooks; record manual
runtime checks and anything untested in the PR.
