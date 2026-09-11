<!--
The PR is the gate. The protect-main ruleset requires a pull request and a
green `render` check, but deliberately does not require an approving review —
a two-person workshop would stall on that. So this description is where a
change explains itself.

Delete any section that does not apply. An empty checkbox is fine and useful:
it says "not done", which is information. A checked box that was not actually
run is the only wrong answer here.
-->

## What changes for a reader

<!-- One or two sentences, in the words a student or facilitator would use.
     If this is learner-facing, the same sentence belongs in CHANGELOG.md. -->

## Why

<!-- The problem, not the patch. Link the issue if there is one. -->

## Checks

- [ ] `uv run --group site python scripts/gen_tables.py` and `gen_notebooks.py`
      rerun, and a **second** run changed nothing
- [ ] `quarto render` at the pinned Quarto version (1.6.40), and `docs/` committed
- [ ] `uv run --group site python scripts/check_links.py` — all fourteen checks pass
- [ ] `uv run --group test python -m unittest discover -s tests` passes
- [ ] `uv run --group test python scripts/check_teaching_materials.py` passes
- [ ] `npm run check:navigation` — **navigation, layout or slide changes only**

## Both languages

- [ ] EN and ES changed in the same commit, or this touches neither
- [ ] Any paired heading kept its `data-language-key` on both sides
- [ ] The Spanish handbook still matches the English one in shape (check 13)

<!-- The Spanish handbook is machine-translated and nothing regenerates it.
     Check 13 compares structure only — it cannot see wording. If you edited
     English prose that has a Spanish counterpart, say here whether you
     updated it. -->

## Notebooks

- [ ] Body cells edited in the `.ipynb`; only the header and footer come from
      `_variables.yml`
- [ ] No committed outputs or execution counts
- [ ] Every changed core route run top to bottom in a **fresh** runtime, with
      optional cells skipped and solutions left folded
- [ ] New imports regenerated the `notebooks` group in `pyproject.toml`

## Not tested

<!-- Required if any box above is unchecked. Nothing here executes a full
     notebook, so say what you ran by hand and what you did not. "Ran 07 and 10
     in Colab; did not rerun 00-06" is a good answer. "N/A" is fine when the
     change is prose only. -->
