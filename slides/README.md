# Slides

Two revealjs decks, [`en/`](en/index.qmd) and [`es/`](es/index.qmd), with
**identical structure** and the same 16 slide anchors — thirteen `#sec-NN-slug`
sections plus the three Kahoot dividers.

- 🇬🇧 [Slides (EN)](https://project-delphi.github.io/tensors-workshop/slides/en/)
- 🇪🇸 [Diapositivas (ES)](https://project-delphi.github.io/tensors-workshop/slides/es/)

## Render

```bash
quarto render slides/en/index.qmd      # one deck
quarto render                          # the whole site, both decks
quarto preview slides/es/index.qmd     # live reload while editing
```

No Python or Jupyter is needed: `execute: enabled: false` means Quarto never
runs code. Most slides use rendered images under `en|es/images/slides-final/`:
WebP, since the same art as PNG weighed 94 MB.
The agenda and the three computing slides before section 02 use editable
Quarto content. The computing slides cover NumPy memory, hardware acceleration,
and BLAS/LAPACK plus ML frameworks, using a shared-buffer example, an architecture
comparison and operation-to-library mappings. Code and tables stay selectable;
secondary detail is in speaker notes.
Their shared styling is scoped to `.computing-slide` in `slides.scss`, and
their sources appear in speaker notes. Edit both languages together.

The NumPy example shows expected output in comments, so it can be read without
execution. **Nothing checks that a number shown in slide art still matches the
notebook it came from**. When a notebook's output changes, redraw its slide art.

The thirty-one images numbered `slide-01` to `slide-31` were drawn by hand in a
tool that is not in this repository, so redrawing one means redrawing it there.
Anything added since — the `slide-NNa` insertions — has a source:
[`scripts/gen_slide_art.py`](../scripts/gen_slide_art.py), which holds the copy
in both languages, lays it out in CSS, and screenshots it with headless Chrome
at the deck's own 1920×1080. See *Drawing slide art* below.

## Present

| Key | What it does |
|---|---|
| `s` | **Speaker view** — notes, timer, next slide. Open this on your laptop. |
| `f` | Fullscreen |
| `o` | Overview of all slides — the section dividers make it skimmable |
| `e` | PDF export mode, then print to PDF |
| `?` | All shortcuts |

Every Kahoot slide and every difficult moment carries speaker notes, so run
speaker view rather than trusting memory. The notes hold Appendix G's facilitator
guidance where it is actually needed:

- the two meanings of **"rank"**, at the start of Part I
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
   rendered decks contain **all thirteen `sec-NN-slug` anchors** plus the three
   Kahoot slides — 16 in total, with no extras in either — and that both link
   the **same set of ML blog posts**, every one of them declared under
   `reading:`. Add a section or a reading chip to one deck and not the other
   and CI goes red. What it does *not* do is fetch those posts: the checker is
   offline by design, so a post that disappears from the blog is caught by a
   human, not by CI.

What is *not* automated is the prose. When you change a slide's wording,
**change both files in the same commit.** The Spanish is a real translation
using natural terminology — *eje*, *desplegado*, *contracción*, *pseudoinversa*,
*autovector* — not a word-for-word calque of the English. **Code and identifiers
stay in English** in both decks.

## Adding a section

1. Add it to `sections:` in [`_variables.yml`](../_variables.yml).
2. Regenerate the tables and the notebooks — two separate commands, since
   neither script reads its arguments:
   ```bash
   uv run --group site python scripts/gen_tables.py
   uv run --group site python scripts/gen_notebooks.py
   ```
3. Draw the section's slide art, save it as the next
   `en|es/images/slides-final/slide-NN.webp`, and add
   `## {#sec-NN-slug background-image="images/slides-final/slide-NN.webp" ...}`
   with its `.sec-part` marker, its `h1.sr-only` heading, its `sr-only`
   summary and its `.colab-tab` link to **both** decks.
4. `quarto render && uv run --group site python scripts/check_links.py`

Step 3 is the one nothing can do for you. Steps 1, 2 and 4 will tell you if you
forget it.

## Structure of each deck

Four opening slides → the agenda (generated into
`_includes/agenda-{en,es}.md` by `scripts/gen_tables.py`) → then per section a
`##` divider slide carrying the `{#sec-NN-slug}` anchor and one to three
follow-on slides, with a full-bleed **Kahoot pause** slide after sections 04,
07 and 10.

Apart from the agenda and the three computing slides, every slide is a background
PNG. What is *not* in the image and must stay in the qmd:

- `<p class="sr-only">` — the slide's summary, this redesign's `fig-alt`.
- `<h1 class="sr-only">` on the sixteen divider slides — the section name the
  breadcrumb in `deck-pace.html` reads.
- `::: {.sec-part}` — the part number, for the same breadcrumb. It cannot be a
  `data-` attribute on the heading; see AGENTS.md.
- `.colab-tab` links — the canonical notebook URLs `check_links.py` validates,
  which `deck-pace.html` promotes into the on-screen panel and which stay
  visible as the fallback if that script fails.
- `.reading-tab` chips — the companion ML blog post for the concept the slide
  introduces, on the slide that introduces it rather than in a bibliography at
  the end. Two per slide at most, from `reading:` in
  [`_variables.yml`](../_variables.yml) like every other shared URL. They work
  exactly like `.colab-tab`: `deck-pace.html` promotes them into the same
  panel — stacked under the amber buttons, outlined instead of filled, so they
  read as supplementary rather than as the thing to click during the exercise
  — and the inline copies are the fallback if that script fails. The posts are
  in English; the ES deck marks that with a "(EN)" suffix added by
  `slides.scss`, not retyped into each label.
- `::: {.notes}` — facilitator guidance, read in speaker view.

The `#sec-NN-slug` anchors are what the section tables on the site link to, so
**do not rename one** without updating `_variables.yml` — the link checker will
catch it if you do.

## Slide → notebook map

Nothing checks this table, which is exactly why it is written down: the deck and
the notebooks are the two halves of the same lesson and they drift silently
(#63). A `·` means the slide carries no notebook of its own and inherits its
section's.

| Slide | Anchor | Notebook | What it introduces |
|---|---|---|---|
| 01 | — | — | Title |
| predict | — | — | Cold open: same numbers — still a voice? |
| 02 | — | — | The workshop idea |
| **02a** | — | — | Four ideas, one object — the whole day in four cards |
| 03 | — | — | The four datasets |
| agenda | — | — | The running clock, from `_includes/agenda-{en,es}.md` |
| outcomes | `sec-00-setup-and-data` | 00 | Setup and welcome |
| outcomes | `sec-01-what-a-tensor-is` | 01 | What a tensor is |
| 06 | · | 01 | Map of factorizations — the map section 09 walks |
| 07 | · | 01 | What a factorization gives you: number → polynomial → matrix → tensor |
| computing primer | `numpy-memory`, `hardware-acceleration`, `numerical-software-stack` | 01 | NumPy memory, hardware and numerical software |
| outcomes | `sec-02-thinking-in-n-dimensions` | 02 | Thinking in N dimensions |
| 09 | · | 02 | Batch is not time |
| outcomes | `sec-03-indexing-and-broadcasting` | 03 | Indexing and broadcasting |
| 11 | · | 03 | Broadcasting on real images |
| predict | · | 03 | What shape comes out? |
| outcomes | `sec-04-reshape-and-transpose` | 04 | Reshape and transpose |
| 13 | · | 04 | Reshape vs. transpose |
| predict | · | 04 | Does a reshape survive this photo? |
| 14 | `sec-kahoot-1` | — | Quiz 1 |
| outcomes | `sec-05-video-pipeline-design` | 05 | Video pipeline design |
| myth or fact | · | 05 | Three claims from the block before the break |
| 16 | · | 05 | Pad or sample |
| outcomes | `sec-06-contraction-with-einsum` | 06 | Contraction with einsum |
| 18 | · | 06 | Reading an einsum expression |
| 19 | · | 06 | NumPy and einsum, side by side |
| outcomes | `sec-07-inverses-and-pseudoinverse` | 07 | Inverses and the pseudoinverse |
| myth or fact | · | 07 | Three claims from the block before the break |
| computing | · | 07 | Same predictions, different coefficients |
| predict | · | 07 | How far does the answer move? |
| 21 | · | 07 | California Housing, 20,433 equations (extension) |
| **21a** | · | 07 | Tensor inverses: unfold → `pinv` → fold, and the second half's through-line (extension) |
| 22 | `sec-kahoot-2` | — | Quiz 2 |
| outcomes | `sec-08-recursion-with-matrices` | 08 | Recursion with matrices |
| 24 | · | 08 | Eigenvectors and the dominant direction |
| outcomes | `sec-09-matrix-factorizations` | 09 | Matrix factorizations |
| **26a** | · | 09 | Factor once, solve many — three routes to the same least squares |
| outcomes | `sec-10-tucker-decomposition` | 10 | Tucker decomposition |
| myth or fact | · | 10 | Three claims from the block before the break |
| 28 | · | 10 | Table → tensor → HOSVD → reconstruction |
| golf | · | 10 | Compression golf, hole 1 |
| predict | · | 10 | Which hour does the hour factor pick? |
| 29 | `sec-kahoot-3` | — | Quiz 3 |
| outcomes | `sec-11-tensor-factorizations` | 11 | Tensor factorizations |
| **29b** | · | 11 | CP, Tucker, TT and t-SVD — what each stores and what it buys (extension) |
| golf | · | 11 | Compression golf, hole 2 |
| predict | · | 11 | Same budget — who wins? |
| 30 | · | 12 | One idea connects sections 07, 10 and take-home 13 |
| outcomes | `sec-12-wrap-up-and-take-homes` | 12 | Wrap-up and take-homes |

A numbered row is background art; a **bold** number has a source in
`scripts/gen_slide_art.py`. `outcomes` is a section's opening slide, built
from `_variables.yml` (its minutes, *Practise today* and *Explore later*) rather
than drawn, so it cannot disagree with the agenda. `predict`, `myth or fact`,
`golf` and `computing` are HTML slides written in the qmd.

**Unused art.** `slide-25.webp` and `slide-26.webp` (the old convolution slides)
and `slide-31.webp` (the old wrap-up, which read `11 ·`) are still in the
repository and referenced by nothing. They are kept because they cannot be
regenerated: the tool that drew them is not here. The section dividers that
#117 replaced with outcome slides (`slide-04` … `slide-27` and the generated
`25a`, `29a`, `31a`), and `slide-20a`, were deleted on 2026-09-28; they are in
git history before that date if a divider ever comes back.

**What the notebooks teach that no slide does**, and deliberately so — these are
take-home material, and the room's 210 minutes do not stretch to them:

- **Take-home 13** in full: correlation against true convolution, the Toeplitz
  view, transposed convolution as overlap-add, and Richardson-Lucy on a real
  photograph. Slides 21a, 30 and 31 all name it; none teaches it.
- **Take-homes A–E** in notebook 12 — PCA's scaling trap, attention as two
  contractions, Cholesky, audio denoising. Slide 31 lists them; none is taught.
- Parts of notebooks 09 and 11 that 15 minutes will not reach: NMF, the fitted
  cost exponent, t-SVD's exact-versus-truncated comparison. The slides frame the
  section; the notebook outruns it, which is the intent.

## Drawing slide art

`slide-NNa` is an **insertion**: `slide-02a` follows `slide-02`. The alternative
was renumbering every later file, and the page number on the old art is painted
into the image, so a rename would have made the numbering wrong in a second
place rather than right in the first. Two consequences, both deliberate:

- The baked corner number no longer matches the slide's true position. It is
  decoration — `slide-number: false` in both deck headers means reveal shows no
  number of its own — and since `slide-02a` it stops being authoritative from
  `slide-03` onward.
- New art carries **no corner number at all**, so it cannot be wrong.

To add or change one of the generated slides, edit `SLIDES` in
[`scripts/gen_slide_art.py`](../scripts/gen_slide_art.py) — copy for both
languages lives there, next to each other, which is the point — and run:

```bash
uv run --group figures python scripts/gen_slide_art.py
```

It needs Chrome or Chromium and the network (Google Fonts), so like
`gen_thumbnails.py` and `gen_figures.py` it is **not** in the CI regenerate
gate: nothing will tell you a slide is stale. It is deterministic — rerunning it
rewrites the same bytes — so `git status` after a rerun is the check.
