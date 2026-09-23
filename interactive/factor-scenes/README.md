# The factorisation stage's scenes

One file per scene of `../factor-stage.html`, loaded in order by plain
`<script src>` lines after `linalg-core.js`, `factor-core.js` and
`factor-kit.js`. Each file calls `FactorScenes.register({...})` once. The page
reads the registry back in that order, so a new scene is: one file here, one
`<script src>` line, one `<section class="step" id="step-<id>">` in the page
with its `<span class="anchor" id="<id>">`, its `.eq` block and its `.np`
block, one `repo.widgets` line in `_variables.yml` (the only thing that
notices the file failing to reach `docs/`), and one entry in
`tests/factor_scenes.test.cjs`'s `SCENES`. The page throws at boot if a
registered scene has no section.

The order is a story in four parts, each heading declared by the scene that
opens it (`part: {en, es}`). **A table with three indices**: the taxi tensor
as the cube it is, then that cube laid flat three ways. **Tucker: one basis
per axis**: the SVD of one unfolding and the patterns it finds, then the core
and three factors that rebuild the cube. **CP: a sum of rank-1 pieces**: one
term, several terms, and the alternating least squares that finds them. **A
fair comparison**: the same parameter budget spent both ways. Each picture
introduces one word the next ones use -- "fibre" and "slice", "unfolding",
"pattern", "core", "term", "solve" -- and nothing says a word before the
picture that defines it.

Scenes are sections down a scroller with a sticky stage, the shape
`voice-stage.html` and `linalg-stage.html` keep, and the reader's place in it
is whichever section crosses a band through the middle of the viewport
(`LC.pickActive`).

## Two surfaces

`tensor`, `unfold`, `tucker` and `rank1` draw in three.js (`gl: true`): they
are pictures of a cube, and a fibre, a slice, a slab being dealt out and a
factor against the side of a core are all things depth shows. Each of them
also draws an **SVG twin** in `draw()`, from the same model and projected
through the same orbit (`ctx.basis()`, `ctx.projector()`), which is what a
reader without WebGL, the hero embed and the browser check's layout
measurement all see. A twin is fitted to `ctx.box()`, a board the shape of the
stage, so it is on the board at every orbit and every slider corner by
construction. `hosvd`, `cp`, `als` and `budget` are SVG only, on a fixed
820 x 420 board: a scree, term cards, an error curve and a scatter are flat
pictures, and `<text>` draws their numbers better than a canvas can.

three.js is booted lazily by the frame on the first `gl` scene shown, through
the projection stage's `vendor/linalg-boot.js` and the page's import map; a
page opened on a flat scene, and the embed, never fetch it.

## What a scene provides

```js
FactorScenes.register({
  id: "tucker",          // scene key; the section, the URL fragment (#tucker)
                         // and the dot in the bar -- link to that name, never
                         // to a step number, which moves on a reorder
  section: "10",         // the workshop section this belongs to, for the kicker
  part: {en, es},        // optional: the heading of the group this scene opens
  hl: ["core", "hour"],  // the data-hl tokens its equation names; it must light
                         // each one (the test holds every token in its section
                         // to this list)
  controls: [            // the frame builds these into this scene's section
    {id: "r2", type: "range", min: 1, max: 20, step: 1, fmt: (v, ctx) => "..."},
    {id: "view", type: "select", options: ["parts", "rebuilt"]},
    {id: "entry", type: "select", options: ["0,0,0"], available: (ctx) => [...]},
    {id: "play", type: "play", target: "flatten", rate: 38}
                         // a button that walks `target` from its min to its max
                         // at `rate` per second, through setControls; it jumps
                         // to the end under reduced motion
  ],
  copy: {en, es},        // k, h, concept, claim, predict, b, eqcap, np, aria(ctx),
                         // controls: {id: label}, options: {id: {value: label} |
                         // (value, ctx) => label}, and the scene's own strings
  init(ctx),             // seed ctx.state; called once for every scene at boot
  sync(ctx),             // optional: derive from the controls, before readout
                         // and draw
  draw(ctx),             // paint into ctx.svg: the picture, or a gl scene's twin
  readout(ctx),          // -> {html, data, claim?, caption?}; data becomes
                         // #stage data-*, claim replaces the copy's claim,
                         // caption is the line under the picture
  code(ctx),             // -> the NumPy for this picture through K.code(rows),
                         // built from ctx.state like readout()
  shape(ctx),            // optional: the badge, where data.shape is not it
  arrive(ctx),           // optional: an entrance, once, never under reduced motion
  animates(ctx),         // optional: true while the picture is still easing,
                         // which is what keeps the flat path repainting
  pick(ctx, key),        // optional: a click on the stage that did not move;
                         // key is the data-pick (SVG) or gl.pick key (three.js)
                         // under it, and the scene turns it into setControls()
  tip(ctx, key),         // optional: the text of the hover chip for that key
  reset(ctx),            // optional: back to the opening state (default: init)

  // gl scenes only:
  gl: true,
  pose: {fov, home: {az, el}, limits, margin},   // how the orbit frames it
  bounds(ctx),           // -> {min, max}: what must be in frame, labels included;
                         // the camera looks at its middle and backs off to fit it
  framing(ctx, view),    // optional: reshape the view it is drawn from (the unfold
                         // levels out as the cube lies flat) without touching the
                         // reader's own orbit
  still(ctx),            // optional: true where the idle drift should hold off
  build(ctx) -> gl,      // once: {scene, cam, pick: [{mesh, key(id)}], ...}
  render(ctx, gl)        // per frame: move what the state says moves
});
```

`ctx` is built once per scene by the page: `{FC, K, LC, lang, embed,
reduceMotion, taxi, standIn, names, state, cache, svg, stage, copy,
colour(token), hl, hover, now(), instant, changed(), setControls(vals),
control(id), aspect, THREE, AD, glReady, gl, view(), basis(), projector(points,
box), box(), label(text, cls)}`. `taxi` is the tensor built from
`data/taxi.json`, or `FC.synthetic()` on a fetch failure (`standIn` says
which). `names` holds the borough names and their short forms (`Mn`, `Bk`);
the stand-in's are `P0..P3` and `D0..D4`. `hl` is the piece an equation
letter under the pointer names and `hover` the key under the pointer on the
stage: a scene lights both in `draw()` and `render()`, and nothing it writes
into a readout may depend on either.

## The rules every scene keeps

- **Nothing on screen is typed.** Every number in a readout, a label, a claim
  and a NumPy comment is computed from the tensor being shown, through
  `factor-core.js`, which `npm test` pins. A scene that needs new arithmetic
  adds it there, with a test.
- **Geometry eases; text never does.** No `<text>` and no chip is tweened, and
  every readout and `data-*` is written from `ctx.state`, never from the eased
  picture, so the browser check reads the truth while the picture is still
  moving. Geometry eases by identity through `K.follow`, keyed per piece, so a
  control moved mid-move is a new target rather than a restart. The unfold's
  move is `FC.morphStep`, which folds back through the cube to change mode.
- **A picture a slider can grow stays on its board.** Nothing clips an SVG
  child laid out past the viewBox and nothing reports one -- it is simply not
  painted, while `readout()` goes on quoting its numbers. A twin is fitted by
  `ctx.projector`; a 2-D picture a control resizes (`hosvd`'s scree, `cp`'s
  cards) lays itself out from what has to fit. `check_navigation.cjs`
  measures every scene at its opening values, at the corners of the sliders
  that resize it, and each twin after a turn.
- **A bar's value has to be inside its own scale.** `K.bars` draws signed
  values from a zero inside the box (`signed: true`), never downwards off the
  bottom of it.
- **Every gesture has a control.** A click on a voxel, a scree bar, a core
  entry, a seed or a budget point sets controls a keyboard can also reach, and
  a hover only shows a tip. The stage is `role="img"`, so `aria(ctx)` names
  every fact the picture draws.
- **Derive before you write.** Anything a control implies goes in `sync()`.
- **A slider seeds the scene, so its own default has to sit on its grid.**
- **Both languages** in `copy`, in the same commit, with the same keys. The
  NumPy is one copy for both; only its `#` comments come from `copy.np`, and no
  line may pass 82 characters at any setting of the scene's controls.
- **Colours are tokens** through `K.css` and `K.colour`, never hex: the three
  axes `--fa-m0` (pickup), `--fa-m1` (dropoff) and `--fa-m2` (hour), `--fa-t`
  for what the reader picked, `--fa-core` for the model's own (the core, a
  rebuild), `--fa-err` for a negative, a miss or a cancelling pair. Every
  label sits on an opaque chip (`K.label`, `K.label2d`), because axe cannot
  resolve contrast against a picture behind translucent text.
- **Frame-owned `data-*` are the frame's.** `gl`, `cam`, `hl`, `hover`, `easing`,
  `playing`, `paused`, `turns` and `ready` are written by the page; a readout
  that wrote one would have it pruned on the next change.

## What the copy says

- `k` is the kicker: the concept and its section, never a number.
- `h` names the scene's one idea as a sentence a reader could repeat.
- `concept` states it in one or two sentences, with its citation: *Deep
  Learning* for what a tensor and an SVD are, Kolda & Bader for Tucker, CP and
  ALS, which that book does not cover.
- `claim` is the title card: one line, in the notation the scene is about.
  A scene whose claim a control moves returns one from `readout()`.
- `predict` is the question to answer *before* touching a control, the way the
  notebooks' predict-first cells work -- and where there is a worked mistake
  for it (`worked-mistakes.md`: "hour rank 3 keeps three hours", "equal ranks
  mean equal budgets", "rescaling a factor changes the tensor"), it is that
  mistake. The readout is then the answer, with this tensor's numbers in it.
- `b` opens with the concrete thing on the stage and one number a reader can
  check, and the formula comes after.
- Modes count from 0 (T₍₀₎ to T₍₂₎, G ×₀ A ×₁ B ×₂ C), and the letters are
  notebook 10's: i, j, k for pickup, dropoff and hour, a, b, c for the kept
  patterns, r for a CP term.

**Every `readout().data` key is lowercase.** `stage.dataset.fN` writes
`data-f-n`, so a camel-case key becomes a selector nobody will guess and the
browser check will not find.
