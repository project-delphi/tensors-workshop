# Changelog

## 2026-09-19

- The projection & SVD stage turns. Step 1's plane, vectors and right angle now stand on a grid floor that recedes into the dark, and the whole scene sways gently until you reach for it: drag to orbit, arrow keys if you would rather, `+` and `-` to move closer, `Home` to put it back. The wheel is left alone, so scrolling over the stage still scrolls the page and still zooms the browser. The SVD portal is tipped in space too, both panes on a polar floor and turning together so `A v = σ u` still lines up, with the unit disc and the ellipse filled in -- the ratio of those two areas is `|det A| = σ₁σ₂`, which the readout could only ever state as numbers. A reader without WebGL gets the same view from the same angles, and turns it with the same drag; the homepage hero stays the still frame it was.
- The stage was also clearing to the wrong colour. Step 1's scene goes through a post-processing chain and the SVD portal does not, and the colour each of them needs is different: with one value for both, step 1 cleared to a washed-out `#47566c` where the stylesheet says `#101826`. Each path takes its own now, and both land on the dark the page says the stage is -- which is what the glow was designed for.

## 2026-09-18

- A third interactive widget: the **projection & SVD stage**, for sections 07 and 09. Least squares is drawn as what it is -- a target vector, the plane its predictors span, and the closest point on that plane with the residual meeting it at a right angle -- on three real California districts, and sliding `y` off the plane shows `β` refusing to move. The SVD portal puts the unit circle and the ellipse it maps to side by side, and scrubbing `x` onto a right singular vector lands `A x` exactly on `σ u`. Every number is computed in the browser from the matrices shown: the arithmetic is `interactive/linalg-core.js`, pinned by `tests/linalg_core.test.cjs` under `npm test`. Both steps also draw flat, which is what embed mode and a reader without WebGL get.
- Check 13 now requires every fenced code block in the two handbooks to be byte-identical, since code stays English on both sides; eight images nothing referenced are gone from `images/`; the repo carries a `CITATION.cff`, and Dependabot watches the pinned GitHub actions and Playwright.
- The reshape & transpose visualizer moves on its own until you reach for it. The tensor sways slowly and the view breathes in and out, so the stage shows that it is a 3-D view instead of saying so in a caption; put the pointer anywhere on it and the motion stops and the view is yours, and it picks up again a second and a half after the pointer leaves. It never moves while the view is snapped face on, while the keyboard is on the stage, or for a reader whose system asks for reduced motion.
- The browser check now runs an accessibility audit (axe) over every page and both widgets. Two things it found are fixed: axis letters and formula indices in the reshape & transpose visualizer, and the operand labels in the broadcasting simulator, are drawn in darker shades that read at small sizes, and the file names in the notebooks table are a step darker. The visualizer's code log can be reached with the keyboard.

## 2026-09-17

- The visualizer gives the tensor the room: the page runs to 110rem, the stage is about twice as wide and grows to 72vh, and the image strip and the buffer share a row beneath it. The sidebar's operations are four tabs -- *Reshape*, *Transpose*, *Slice*, *Memory* -- over one shared buffer, with the strides and the code log always in view; `#transpose` (or any tab's id) in the URL opens the page on that tab. Counting numbers now open arranged *by position*, so a reshape visibly re-lays the cubes: by meaning, `(24,)` kept drawing as the 2×3×4 block it came from while the readout said otherwise. The arrangement switch moved onto the stage, next to *Snap to 2-D*. The site calls it the reshape & transpose visualizer now, on the hero tab, the resource card and every link -- "layout" was the framing #129 replaced.
- The layout visualizer is now built around the two operations rather than around the layout. Underneath it is what NumPy is -- a buffer, a shape and a stride per axis -- so *Reshape* offers every shape the buffer can be poured into and takes it as a view, leaving every byte where it was; *Transpose* permutes the shape and the strides; and `.contiguous()` is the one control that rewrites memory, which the buffer strip now animates. Counting-numbers mode is a tensor of any rank from 1 to 4: pick 12, 24, 48 or 120 elements and every factorisation of them is a reshape you can take, `(24,)` through `(2, 2, 2, 3)`. Axes keep their letters and colours while they still mean something and fall back to their positions once a reshape has merged them away.
- The visualizer's cubes animate between shapes, and it reads photographs as photographs. *Snap to 2-D* -- or letting go of the drag near face on, or pressing `F` -- closes the gaps, swaps in an orthographic camera and composites the three channel planes back into the photograph; rotating away returns the cubes. The viewport gained a controls legend, an orientation gizmo you can click to look down an axis, panning with Shift-drag or the right button, and a click-a-cube readout of the index, the stride sum and the offset it lands on. The panel is three numbered sections now: *Data & shape*, *Operations*, *Memory & strides*.
- The homepage hero showed *Open the full widget* twice under each demo, once inside the embedded widget and once in the caption beneath it. The caption's copy is gone; the widget's own link stays.
- The layout visualizer gained a 32×32 size, prints each value on its cube whenever the cubes are wide enough to read (4×4, or zoomed in), and has an *Arrange the cubes* switch: *by meaning* keeps every cube in place under a transpose, as before; *by position* lays the cubes out as the shape says, so a transpose visibly rearranges them the way notebook 04's animations draw it. Also fixed: the counting-numbers size sliders were showing in photo mode, where they do nothing.
- The handbook's four figures are boxed and sit on the prose column instead of spilling into the page margin beside the table of contents; click one for the full-size image.
- The slide art in both decks is WebP now, 11 MB where the PNGs were 94 MB, so the decks load faster and a clone is smaller. Nothing changes on screen.

- Rebuilt the layout visualizer around real data: the histology slide, the astronaut and the coffee cup notebook 04 stacks are now the cubes, one per byte, with the three colour channels as planes. Transpose (NHWC, NCHW, swap, reverse, or click two letters) permutes the shape, the sliders and the strides and leaves every cube in place; the memory layout (C, Fortran, PyTorch `channels_last`) rewrites a new buffer ribbon and leaves the shape alone; a reshape comparison shows the same bytes poured into the shape and, under it, the picture it breaks. The code panel is now a running log — one NumPy and one PyTorch line per click, with a copy button. The old counting-numbers mode is still there as a second data source. The photos ship as `interactive/data/photos.json`, written by `gen_figures.py widget`.
- Both widgets gained an embed mode (`?embed=1&theme=navy`), and the homepage hero now shows them live behind two tabs where the static diagram was. The diagram stays as the fallback with scripting off, under reduced motion and on a phone.
- The handbook's four figures render at page width and centred again. `lightbox: true` had wrapped every image on the site in an anchor, which defeated the figure rules in `custom.scss` and left each figure 766 px wide against the left margin; it is `match: manual` now, as the comment always claimed.
- Both interactive widgets are now on the homepage, in both languages, under *Try one in the browser* — until now the only way to find them was a sentence partway down the notebooks page or the handbook.

- The notebook normalizer now sorts the keys inside every cell, so a notebook edited in a different tool no longer comes back with all 51 cells rewritten around one real change.

- Added a bilingual broadcasting simulator for section 03: two shapes lined up from the right, the padding NumPy adds made visible, and every axis of size 1 stretched out in dashed cells that say what they are — repeats in the picture, one copy in the buffer. Presets are the workshop's own cases, including the `(4,)` against `(4, 1)` trap from the section 03 checkpoint. Every verdict and result shape was checked against `np.broadcast_shapes`.
- The layout visualizer's 3-D renderer now runs. It never had: it asked for a three.js UMD build deleted at r160, so the request 404'd and every reader got the isometric canvas under a message blaming their WebGL. three.js is vendored in the repo now, and the browser check asserts it loaded. Fixing it exposed three bugs in code nobody had executed — a camera that clipped any shape past the default and rendered an 8×8×8×8 tensor as nothing at all, a material allocated per element per frame, and four leaked arrow materials per render.
- The visualizer's stage takes the keyboard, a phone can scroll past it, pinch-to-zoom works where the caption had always promised it, and the panel prints NumPy and PyTorch you can run instead of pseudo-code — which also settles which of its stride columns is bytes and which is elements.
- Moved the agent guidance to `AGENTS.md`; `CLAUDE.md` now points there.

## 2026-09-16

- Published a bilingual layout visualizer for section 04: a 4D tensor you can rotate, with live strides in NumPy bytes and PyTorch elements, C-contiguous / F-contiguous / channels-last, and an isometric canvas fallback. (The fallback was in fact the only thing that rendered, for the reason corrected on 2026-09-17.) Cell fill is the fastest-varying axis (Okabe–Ito, same hue on the arrows, sliders and formula); lightness runs along that axis so a layout change recolors the direction the numbers run.
- Aligned Kahoot 3's coverage note and the cutting-order copy with extra 13 (Appendix F), and corrected the Kahoot README's duration from 195 to 210 minutes.
- The handbook video-stack GIF and notebook 16's PCA animations now loop continuously, matching the cube GIFs.

## 2026-09-15

- Added take-home labs 17 and 18 for 4D multi-head attention and SVD feature compression, with NumPy/PyTorch checks, synthetic data, inline tests, rank comparisons, pausable widgets and local GIF exports.

- Removed stale notebook and deep-dive totals from English and Spanish documentation; the generated tables remain the notebook inventory.

## PCA from a tensors perspective

- Added take-home notebook 16: Plato’s cave, three animations, covariance and correlation PCA, eigendecomposition and SVD on real Landsat patches.
- Compare classification and clustering, fit multilinear PCA, and explore synthetic spiked-tensor recovery. Includes training-only preprocessing and bilingual learning prompts.

## 2026-09-14

- Matched “Practise today” and “Explore later” outcomes across notebook headers, slides and handbook in English and Spanish.
- Grouped each live practice block in notebooks 01–11 at the top, with examples, attempts, feedback, checkpoints and a clear stop before extensions.
- Rebuilt the pseudoinverse core around duplicate columns, identical predictions and the minimum-norm choice; kept the four Moore–Penrose identities as follow-up.
- Added an optional, unlisted 10-minute prerequisite diagnostic, separate instructor key and targeted refresher exercises in both languages.

- Added brief retrieval prompts, graduated hints, and independent numerical feedback to notebook core activities, with matching English and Spanish instructions.
- Put convolution predictions before their explanations, added a required SVD-to-Tucker bridge, and supplied partial-code support for the CP/Tucker comparison.
- Added individual broadcasting and contraction checkpoints and facilitator keys within the existing 210-minute agenda.
- The animations in each notebook now loop continuously instead of stopping after a few passes, and run at half speed; a folded cell beneath them steps through the frames one at a time.
- Every notebook carries a second animation. Broadcasting is now drawn as a matrix and a vector, with the repeated rows shown as the copies NumPy never stores, and the einsum animations give each index its own colour.
- Equations appear as typeset mathematics beside the code that implements them, each with a plain-English reading.
- Colour images show each RGB channel in its own colour rather than in grey, and notebooks 03 and 10 show the table the data came from before it becomes an array.
- The predict-first questions list their options one per line and set the revealed answer in readable type.
- Notebook 03 now states the broadcasting rule itself — line the shapes up from the right, each facing pair equal or one, a missing leading axis counts as one — instead of leaving it to be inferred from a single worked case.
- Notebook 11 defines the rank of a tensor where it already animates one: the smallest number of rank-1 terms that sum to it, which is the CP rank spent as a budget. It also notes that, unlike a matrix's, it can exceed every axis length.
- Notebook 11's dye-mixing comparison is now presented as what it demonstrates — uniqueness — explaining why a CP component can be named and a Tucker or SVD column cannot.

## 2026-09-11

- The home page opens on a full-width hero: the tensor diagram now runs from a scalar through a vector, a matrix and a 3D tensor to a neural network, with each stage labelled by its NumPy shape.
- Running the notebooks off Colab is now one command, `uv run --group notebooks jupyter lab`; the package list it used to spell out is derived from what the notebooks import.
- The browser navigation check runs on every pull request, so a broken language switch or a page that overflows on a phone is caught before it reaches the site.

## 2026-09-10

- Language switches keep the matching page and preserve corresponding sections in English and Spanish, including slide section links.
- Wide tables scroll within the page on phones and can be reached with the keyboard.
- Replaced the exit reflection with a Tucker reconstruction question and a separate transfer score, within the existing five-minute check.
- Added a contributor editing guide and removed the obsolete setup-code source; notebook bodies remain directly editable.

- Added English and Spanish teaching-kit pages and published the facilitator guide, assessments, group tasks, worked mistakes, and feedback form on the website.
- Corrected the website duration to 210 minutes and clarified the README's deliberate use of synthetic teaching examples in both languages.
- Licensed teaching materials under CC BY 4.0 and software under MIT.
- Added a Spanish Kahoot how-to page. Live quiz questions on kahoot.it stay in English.

## 2026-09-09

- Linked the NotebookLM overview from the home and companion pages using the supplied video poster.

- Short core routes and two observable outcomes in every notebook.
- Specific predict–run–explain–check prompts beside the core activities.
- Bilingual entry/exit checks, worked mistakes, facilitator guide and feedback form.
- Content, notebook and translation issue forms; release checklist and teaching checks.
- Removed repeated language-preference boxes. The top language switch remains.
