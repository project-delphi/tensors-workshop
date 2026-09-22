# The factorisation stage's scenes

One file per scene of `../factor-stage.html`, loaded in order by plain
`<script src>` lines after `factor-core.js` and `factor-kit.js`. Each file
calls `FactorScenes.register({...})` once. The page reads the registry back
in that order, so a new scene is: one file here, one `<script src>` line, one
`<section class="step" id="step-<id>">` in the page, one
`<span class="anchor" id="<id>"></span>` at the top of that section, and one
`repo.widgets` line in `_variables.yml` (the only thing that notices the file
failing to reach `docs/`). The page throws at boot if a registered scene has
no section.

The order is a story in two parts, one per workshop section. **Section 10,
Tucker**: one hour's real counts as a picture, the three ways to flatten that
picture into a matrix, the SVD each flattening gives up, and the core and
three factors that put it back together smaller. **Section 11, CP**: a rank-1
term as three vectors and an outer product, the alternating least squares
that finds several of them on a tensor built from exactly three, and the
trade CP and Tucker each make for the same parameter budget. Each picture
introduces exactly one word the next ones use -- "unfolding", then "rank" as
a triple, then "core", then "outer product", then "term" -- and nothing says
a word before the picture that defines it.

Scenes are sections down a scroller with a sticky stage, the shape
`voice-stage.html` and `linalg-stage.html` keep, and the reader's place in it
is whichever section crosses a band through the middle of the viewport
(`LC.pickActive`, from `linalg-core.js`, which this stage loads for that and
for `tweenStart`/`retarget`).

## What a scene provides

```js
FactorScenes.register({
  id: "tucker",          // scene key; the section, the URL fragment (#tucker)
                         // and the dot in the bar -- link to that name, never
                         // to a step number, which moves on a reorder
  section: "10",         // the workshop section this belongs to, for the kicker
  part: {en, es},        // optional: the heading of the group this scene opens
  controls: [             // the frame builds these into this scene's section
    {id: "r2", type: "range", min: 1, max: 20, step: 1, fmt: (v, ctx) => "..."}
  ],
  copy: {en, es},         // tab, k, h, claim, concept, b, predict, controls: {id: label},
                          // options: {id: {value: label}}, readout(...), aria(ctx)
  init(ctx),              // seed ctx.state; called once for every scene at boot
  sync(ctx),              // optional: derive from the controls. Called before
                          // readout() and before draw(), so both see the same state
  draw(ctx),              // paint into ctx.svg (an <svg>, cleared first by the frame)
  readout(ctx),           // -> {html, data, claim?}; data becomes #stage data-*
                          // for the check, and claim replaces the copy's claim
                          // on the title card when the scene can say it in numbers
  reset(ctx)               // optional: back to the opening state
});
```

`ctx` is built once per scene by the page:
`{FC, K, lang, embed, taxi, standIn, names, state, cache, svg, W, H, copy,
colour(token), changed(), setControls(vals), control(id)}`. `FC` is
`factor-core.js`, `K` is `factor-kit.js`. `taxi` is the tensor built from
`data/taxi.json` on a successful fetch, or the tensor `FC.synthetic()` builds
instead -- a scene reads `ctx.standIn` to know which, and every scene must
draw something true either way. `names` is `{pickup: [...4 names], dropoff:
[...5 names]}`, the real borough names on a fetch, or generic `P0..P3` /
`D0..D4` on the stand-in, since the synthetic tensor has no boroughs of its
own. `control(id)` is this scene's own control element, because the frame
prefixes every control with the scene it belongs to (`c-tucker-r2`): several
scenes share a control name.

## The rules every scene keeps

- **Nothing on screen is typed.** Every number in a readout and every
  highlighted cell is computed from the tensor being shown, through
  `factor-core.js`, which `npm test` pins. A scene that needs new arithmetic
  adds it there, with a test.
- **No three.js.** Every picture here is SVG with real `<text>` -- a number
  grid, a bar chart, a slab -- because axe can measure text over a filled
  rectangle and cannot measure it over a canvas.
- **A picture a slider can grow gets a box.** Nothing clips an SVG child
  laid out past the `820 x 420` viewBox and nothing reports one -- it is
  simply not painted, while `readout()` goes on quoting its numbers and
  every `data-*` assertion still passes. Three scenes draw a grid whose
  shape a control moves: `hosvd`'s factor is 24 x r, `tucker`'s core is
  r2 x (r0*r1), and `cp` draws all three factors at R columns each. Each
  hands `maxW`/`maxH` to `K.numGrid`, which shrinks the cell to fit and,
  below the size at which a number is still a number, shades each cell by
  |value| instead of printing it. `check_navigation.cjs` measures the union
  of every SVG child's box, through the CTM, against the viewBox -- at each
  scene's opening values **and at the corners of the sliders that resize
  it**.
- **A bar's value has to be inside its own scale.** `K.bars` draws
  `value / max` of its height from a shared zero, so a negative value is
  drawn *downwards*, straight off the bottom of the stage, where again
  nothing clips it. `FC.matchTerms` returns a score of 0 for a planted term
  with no fitted column left to match -- at R below the number of planted
  terms -- rather than the -1 its search starts from.
- **Derive before you write.** Anything a control implies goes in `sync()`.
  `readout()` and `draw()` are both called after it, so the readout and the
  `data-*` attributes never describe the state the last frame left behind.
- **The readout is written from the controls, never from an animation.** It
  is rewritten when something changes, not per frame.
- **This stage snaps, and that is a decision rather than an omission.**
  Every scene redraws synchronously on a control change; there is no
  animation clock on the page at all, and nothing moves on its own. The
  other two stages ease, and the reason this one does not is what it draws:
  grids of integers. A digit sliding through every value between 102 and 93
  is noise, not a picture, and the numbers here *are* the lesson -- `4.71`
  and `6.7%` are figures the handbook publishes, and a reader has to be able
  to read them off the stage mid-drag. The bar heights (`rank1`'s three
  factors, `hosvd`'s singular values, `budget`'s cloud) are the one place
  easing would earn its keep, and they are not eased today because
  `factor-kit.js` rebuilds its SVG on every paint, so a CSS transition has
  no previous element to run from. Adding one means keeping the rects and
  interpolating, not a one-line change.

  If that is ever done, the rule the other stages keep applies: ease a
  bar's height or a highlight's opacity, **never** a `<text>`, and write the
  readout and every `data-*` from the slider's *target* rather than from the
  eased frame, so the browser check reads the truth while the picture is
  still moving.
- **A claim card in numbers is the readout's, not the copy's.** `copy.claim`
  is the scene's formula and is what the card shows until the scene can say
  it in numbers. A scene whose shape a control moves -- `tucker`'s ranks,
  `cp`'s rank and data source, `budget`'s toggle -- returns a `claim` from
  `readout()` instead.
- **A slider seeds the scene, so its own default has to sit on its grid.** A
  default value not reachable from `min` by a whole number of `step`s snaps
  on the first drag.
- **Both languages** in `copy`, in the same commit, and `aria(ctx)` names
  every fact the picture draws, because `#stage` is `role="img"`.
- **Colours are tokens** (`--fa-t`, `--fa-fac`, `--fa-core`, `--fa-r`,
  `--fa-err`, `--stage-ink`, `--stage-mute`) through `K.css`, never hex.
  Every label sits on an opaque chip (`K.label`), because axe cannot resolve
  contrast against a picture behind translucent text and reports
  "incomplete" instead of pass or fail.
- **On fetch failure the page draws `FC.synthetic()`** and publishes
  `data-standin="1"`. A scene that only makes sense on the real tensor (none
  currently do) would have to say so in its own readout; none may go blank.

## What the copy says

- `k` is the kicker: the concept and its section ("Unfolding · section 10"),
  never a number.
- `h` names the scene's one concept as a sentence a reader could repeat.
- `concept` states it in the register of *Deep Learning* chapter 2, in one or
  two sentences, and is drawn in a box before anything about the picture.
- `claim` is the title card on the stage: one line, in the notation the scene
  is about (`T ≈ G ×₁ A ×₂ B ×₃ C`).
- `predict` is the question the reader answers *before* touching a control,
  the way the notebooks' predict-first cells work. The readout is then the
  answer, as a sentence with the numbers in it.
- `b` is one or two short paragraphs of HTML, and it opens with the concrete
  thing on the stage, with one number a reader can check.

**Every `readout().data` key is lowercase.** `stage.dataset.fN` writes
`data-f-n`, so a camel-case key becomes a selector nobody will guess and the
browser check will not find.
