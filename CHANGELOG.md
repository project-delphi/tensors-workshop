# Changelog

## 2026-09-17

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
