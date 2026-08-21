# Slides

Two revealjs decks, [`en/`](en/index.qmd) and [`es/`](es/index.qmd), with
**identical structure** and the same 16 slide anchors.

- 🇬🇧 [Slides (EN)](https://project-delphi.github.io/tensors-workshop/slides/en/)
- 🇪🇸 [Diapositivas (ES)](https://project-delphi.github.io/tensors-workshop/slides/es/)

## Render

```bash
quarto render slides/en/index.qmd      # one deck
quarto render                          # the whole site, both decks
quarto preview slides/es/index.qmd     # live reload while editing
```

No Python or Jupyter is needed. Code chunks are `#| echo: true` under
`execute: enabled: false`, so they render syntax-highlighted **without being
run**. That keeps CI fast and means a deck can never break because a dependency
moved — but it also means **nothing checks the code on a slide still works**.
Keep slide code copied from the matching notebook, which *is* executed.

## Present

| Key | What it does |
|---|---|
| `s` | **Speaker view** — notes, timer, next slide. Open this on your laptop. |
| `f` | Fullscreen |
| `o` | Overview of all slides — the section dividers make it skimmable |
| `e` | PDF export mode, then print to PDF |
| `?` | All shortcuts |

Every Kahoot slide and every difficult moment carries speaker notes, so run
speaker view rather than trusting memory. The notes hold Appendix D's facilitator
guidance where it is actually needed:

- the two meanings of **"rank"**, at the start of Part I
- the **deliberate `LinAlgError`** in section 07, which students will think is
  their mistake
- the **25-pixel border crop** in section 09, which must be said *before* the
  exercise, not after
- on each Kahoot slide: import ahead of time, budget 5 minutes, and where that
  quiz sits in the cutting order

## Keeping EN and ES in sync

Three mechanisms, in order of strength:

1. **Shared data.** Every URL, Colab link, quiz title, quiz length and section
   number is a `{{< var >}}` reference into
   [`_variables.yml`](../_variables.yml). Neither deck hard-codes any of them,
   so they cannot disagree on a fact.
2. **Shared styling.** Both decks load [`slides.scss`](slides.scss), so a change
   to the look lands in both at once.
3. **A check that fails the build.** `scripts/check_links.py` asserts that both
   rendered decks contain **all twelve `sec-NN-slug` anchors** plus the three
   Kahoot slides. Add a section to one deck and not the other and CI goes red.

What is *not* automated is the prose. When you change a slide's wording,
**change both files in the same commit.** The Spanish is a real translation
using natural terminology — *eje*, *desplegado*, *contracción*, *pseudoinversa*,
*autovector* — not a word-for-word calque of the English. **Code and identifiers
stay in English** in both decks.

## Adding a section

1. Add it to `sections:` in [`_variables.yml`](../_variables.yml).
2. Regenerate the tables and notebooks:
   `uv run --with pyyaml,nbformat python scripts/gen_tables.py scripts/gen_notebooks.py`
3. Add `# NN · Title {#sec-NN-slug}` and its slides to **both** decks.
4. `quarto render && uv run --with pyyaml,nbformat python scripts/check_links.py`

Step 3 is the one nothing can do for you. Steps 1, 2 and 4 will tell you if you
forget it.

## Structure of each deck

Title → agenda → then per section: a `#` divider slide carrying the
`{#sec-NN-slug}` anchor, two to four `##` concept slides (short bullets, `. . .`
reveals, LaTeX where the handbook uses equations), a **"To the notebook"** slide
with the Colab link, and after sections 04, 07 and 10 a full-bleed **Kahoot
pause** slide.

The `#sec-NN-slug` anchors are what the section tables on the site link to, so
**do not rename one** without updating `_variables.yml` — the link checker will
catch it if you do.
