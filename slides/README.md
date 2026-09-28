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

## Moving art into editable content

**The rule:** when you touch one of `slide-01`–`slide-31`, do not just redraw
it — move its equations, numbers and teaching text into editable Quarto
content in **both** decks, in the pattern the agenda and the three computing
slides before section 02 already use (`#numpy-memory`, `#hardware-acceleration`
and `#numerical-software-stack` in [`en/index.qmd`](en/index.qmd), styled by
`.computing-slide` in [`slides.scss`](slides.scss)). A number comes from the
notebook the slide is filed under below, not from the picture; edit both
languages in the same commit, same as everywhere else in this file. Do this
gradually, whenever a slide is touched for another reason — this is not a plan
to migrate all thirty-one at once, and nothing here does.

**The inventory.** Ordered by risk: slides whose numbers can drift first,
since those are what the paragraph above warns about; then slides whose
equations or teaching text a translator would have to redraw by hand; then
pictures that carry neither.

Numbers that can drift:

| Slide | Section | What it shows | Notebook numbers | Note |
|---|---|---|---|---|
| 21 | 07 (extension) | California Housing least-squares fit: `X.shape`, predicted-vs-true scatter, residual histogram | nb 07: `X.shape = (20433, 7)`, 20,433 equations | **Found stale:** the EN headline reads "20.433 equations" (a period, the Spanish thousands separator) — it disagrees with its own body text ("20,433 equations, 7 variables") three lines below and with the EN notebook. The ES slide correctly reads "20.433"; the EN headline looks like it was drawn from the ES asset. The EN formula card also reads "A⁺b minimizea", Spanish *minimiza* half-translated. |
| 30 | 07 / 09 / 10 (recap, no anchor) | "One idea connects the workshop": pseudoinverse, deconvolution and Tucker panels side by side | nb 07: same California Housing numbers as slide 21 | **Found stale:** the EN slide's pseudoinverse panel is untranslated — it reads "Pseudoinversa" and "20.433 equations = an underdetermined least squares solution", the ES panel dropped into the EN deck rather than redrawn in English. **"Underdetermined" is also wrong in any language:** 20,433 equations in 7 unknowns is *overdetermined*, which is why there is no exact solution. The Tucker panel's first title reads "Tensor real", Spanish too. |
| 26a | 09 | Factor once, solve many: normal equations, QR and SVD, cost compared | nb 09: "flop table predicts / la tabla predice 39x" (the `sweep_times` cell) | Matches the notebook's own printed line today. It is exactly the kind of number a rerun of the timing sweep can move, which is why it is filed here rather than lower down. |
| 28 | 10 | Table → tensor → HOSVD → reconstruction | nb 10's rank explorer opens at `(2, 2, 3)`; the golf activity's winning entry is `(3, 3, 1)` at 4.69% error | The slide's own reconstruction uses `ranks=(4, 4, 6)`, which appears in neither place in the notebook — it reads as a one-off illustration rather than a printed result. The same panel repeats on slide 30. |

Equations and teaching text a translator would have to redraw:

| Slide | Section | What it shows | Note |
|---|---|---|---|
| 02a | — | Four ideas, one object — the whole day in four cards | The longest teaching text of any slide, and on the critical path: it's the map section 01's slides open onto |
| 06 | 01 | Map of factorizations: LU → Cholesky → QR → SVD → Tucker → CP | Text only, no equations |
| 07 | 01 | What a factorization gives you: number → polynomial → matrix → tensor | Carries `A = UΣVᵀ` and `X ≈ G ×₁ U₁ ×₂ U₂ ×₃ U₃` |
| 09 | 02 | Batch is not time | Text-heavy, no equations |
| 11 | 03 | Indexing in action: rows/columns, masks, an image crop, broadcasting | Its "Daily mean temperature" table and `lat[120:220], lon[250:350]` crop are invented examples, not notebook output — check they still read cleanly before reusing them as the migrated copy |
| 13 | 04 | Transpose ≠ reshape, plus a real NHWC → NCHW batch | Code snippets, `np.transpose(...)` and `.reshape(...)` |
| 16 | 05 | File → frames → tensor → model, with the validity-mask formula | `mask[b, t] = 1 if real else 0` |
| 18 | 06 | Anatomy of einsum | `np.einsum('ij,jk->ik', A, B)` |
| 19 | 06 | NumPy ↔ einsum equivalence table | Eight code pairs |
| 21a | 07 (extension) | Tensor inverses: unfold → `pinv` → fold back | `T (4, 3, 5) → M (4, 15)` is a made-up worked example, not a shape notebook 07 prints, so no rerun can contradict it |
| 24 | 08 | Gradient descent is also recursion: scalar, vector, matrix forms | `x_{k+1} = x_k − η∇f(x_k)` and two more equations |
| 29b | 11 (extension) | Four decompositions, four bargains: CP, Tucker, Tensor Train, t-SVD | Parameter-count formulas, e.g. `R(I + J + K)` |

Pure pictures:

| Slide | Section | What it shows |
|---|---|---|
| 01 | — | Title |
| 02 | — | The workshop idea, four cards |
| 03 | — | The four datasets, one phrase each |
| 14 | Kahoot 1 | Divider — its full text already lives in the qmd as `sr-only` |
| 22 | Kahoot 2 | Divider, same as above |
| 29 | Kahoot 3 | Divider, same as above |

`slide-25`, `slide-26` and `slide-31` are not in any of the three tables above:
see *Unused art* below — no anchor links them, so they are the lowest priority
of all thirty-one.

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
3. Copy an existing section's opening slide in **both** decks —
   `## {{</* var sections.sNN.n */>}} · {{</* var sections.sNN.title_en */>}} {#sec-NN-slug .outcomes-slide}`
   with its `.sec-part` and `.outcome-time` blocks, *Practise today* and
   *Explore later* from `_variables.yml`, its `.colab-tab` link and its notes —
   and change the number. Everything on it comes from `_variables.yml`, so
   nothing needs drawing.
4. `quarto render && uv run --group site python scripts/check_links.py`

Step 3 is the one nothing can do for you. Steps 1, 2 and 4 will tell you if you
forget it.

## Structure of each deck

The title and the cold open → three opening slides → the agenda (generated into
`_includes/agenda-{en,es}.md` by `scripts/gen_tables.py`) → then per section an
`.outcomes-slide` carrying the `{#sec-NN-slug}` anchor, built from
`_variables.yml`, and its follow-on slides, with a full-bleed **Kahoot pause**
slide after sections 04, 07 and 10. The slide map below lists every one.

The follow-on slides are either background art (WebP) or HTML slides written in
the qmd — the predict-first, myth-or-fact, golf and computing slides. What is
*not* in an image and must stay in the qmd:

- `<p class="sr-only">` — the slide's summary, this redesign's `fig-alt`.
- The section's name, which the breadcrumb in `deck-pace.html` reads: the
  `##` heading of each `.outcomes-slide`, and an `<h1 class="sr-only">` on each
  of the three Kahoot slides, whose heading is an image.
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
