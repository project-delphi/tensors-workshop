# Contributing

Use a feature branch and open a pull request. In a fresh clone, enable the
local branch guard with `git config core.hooksPath .githooks`.

## Where to edit

| Change | Edit here | Regenerate with |
|---|---|---|
| Shared titles, practice/explore outcomes, objectives, durations, URLs and quiz metadata | `_variables.yml` | `scripts/gen_tables.py` and `scripts/gen_notebooks.py` |
| Notebook explanations, Setup, exercises, solutions and core routes | Body cells in `notebooks/*.ipynb`, directly or through Colab | `scripts/gen_notebooks.py` |
| Notebook header and footer | Their text in `_variables.yml`; layout in `scripts/gen_notebooks.py` | `scripts/gen_notebooks.py` |
| Generated tables and resource blocks in `_includes/`, or marker-delimited tables in READMEs and handbook schedules | `_variables.yml` or `scripts/gen_tables.py` | `scripts/gen_tables.py` |
| Website prose, teaching resources and handbook explanations | Their `.qmd` or `.md` sources, in both languages | `quarto render` |
| Slides | `slides/en/index.qmd` and `slides/es/index.qmd` | `quarto render` |

Only the first and final notebook cells are generated content. Every cell
between them belongs to the notebook, including Setup. The normalizer preserves
those body cells while clearing outputs, execution counts and transient metadata.
Keep core-route cell IDs and tags aligned with their visible labels. In live notebooks 01–11, `workshop.sequence` lists every cell in the contiguous core block after the route scaffold, including prose and folded solutions; `workshop.checkpoint` identifies its final learning check. Keep the extension boundary immediately after that sequence. The runtime check executes all code in the sequence. Keep the
`solution` and `hide-input` tags on folded solutions.

Feedback helpers live in visible code cells before the core activity. Tag them
`workshop-support` and list their IDs in the core scaffold's `workshop.support`.
Accept learner results as function arguments; do not read names created only
by a folded solution. Keep the core TODO comment-only and its paired solution
within the following two cells. Test that feedback accepts correct results
and rejects plausible mistakes; the paired solution should call it too.

Edit source files, then regenerate their outputs. Do not edit generated
`_includes/` blocks, marked table regions, or `docs/` directly. That includes
the `notebooks` dependency group in `pyproject.toml`: it is read off what the
notebooks import, so a new import reaches it through `scripts/gen_tables.py`.
`docs/` is gitignored build output — Actions renders it and deploys it to
Pages, so it is never part of a PR. Render it locally all the same: the link
checker and the browser check both read the site from there.

Paired website headings may have an invisible `data-language-key` span beneath
them. Keep the same key with the corresponding heading in both languages,
including when you rename or move it. These markers let the language switch
find translated sections while keeping existing heading URLs intact. Sections
with the same explicit ID in both languages need no marker.

## Validate and submit

Follow the [release checklist](RELEASE_CHECKLIST.md) for the complete commands,
runtime and browser checks, and PR process. Use the Quarto version pinned in
the workflow. Run the generators twice to check that the second run changes
nothing. Include regenerated notebooks and site files in the PR.

The [notebook guide](notebooks/README.md#colab-to-github-workflow) describes
editing through Colab. [CLAUDE.md](CLAUDE.md) documents the site internals and
asset generators.

The browser regression check runs in CI on every pull request, against the
fresh render. To run it yourself after rendering:

```bash
npm ci
npx playwright install chromium
npm run check:navigation          # or check:slides for the decks alone
```

Playwright is pinned in `package.json`; `npm ci` installs that version rather
than resolving a new one, so the check behaves the same for you as in CI. The
checker serves `docs/` locally, checks both languages and mobile/desktop
widths, and tests section links, keyboard activation and fallback navigation.
It saves assessment screenshots in the system temporary directory. To use an
existing Chrome installation, set `BROWSER_EXECUTABLE` to its executable path.

## Contribuir en español

Trabaja en una rama y abre un pull request. Edita directamente las celdas del
cuerpo de cada cuaderno, incluida la preparación; solo la primera y la última
celda se generan. Los datos compartidos y los textos de esas dos celdas viven
en `_variables.yml`. Mantén alineadas las versiones en inglés y español.

Coloca las funciones de comprobación antes de la actividad esencial, con la
etiqueta `workshop-support` y sus IDs en `workshop.support`. Reciben resultados
del estudiante como argumentos, sin depender de variables de una solución
plegada. Mantén el TODO como comentarios y su solución en una de las dos
celdas siguientes. Prueba tanto resultados correctos como errores plausibles;
la solución también debe llamar a la función.

Sigue la [lista de publicación](RELEASE_CHECKLIST.md) para regenerar, comprobar
y enviar los cambios. Incluye los archivos generados en el PR; `docs/` no, que
lo construye y lo publica Actions.
