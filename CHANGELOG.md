# Changelog

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
