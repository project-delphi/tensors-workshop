# The stage's scenes

One file per step of `../linalg-stage.html`, loaded in step order by plain
`<script src>` lines after `linalg-core.js` and `linalg-kit.js`. Each file calls
`LinalgScenes.register({...})` once. The page reads the registry back in that
order, so a new step is: one file here, one `<section class="step">` in the
page, one `<script src>` line, and one `repo.widgets` line in `_variables.yml`
(the only thing that notices the file failing to reach `docs/`).

The order is a story, not a list: what least squares draws (projection, the
line of answers, a determinant reaching zero), then what the SVD says (the
portal, the ellipsoid, the eigenvectors), then the two ways the arithmetic
fails (near-collinear columns, float32). The portal comes before any step that
says "singular value", because it is where that word is defined.

## What a scene provides

```js
LinalgScenes.register({
  id: "eigen",          // scene key; the page keys views and poses on it, and
                        // #eigen in the URL opens the step -- link to that
                        // name, never to #step-N, which moves on a reorder
  step: "6",            // what the hash (#step-6) and data-step say; the bar counts "6 of 8"
  section: "step-6",    // the <section> id in the page
  part: {en, es},       // optional: the heading of the group this scene opens
                        // ("What the SVD says"), drawn above its kicker
  panes: 1,             // 2 for a split viewport (the portal); default 1
  pose: {               // where the scene is looked at from
    target, content, fov,          // content: radius the framing fits
    home: LC.orbitView(az, el),    // the pose a step opens on, and Home
    radius, minRadius,             // radius is refitted in resize(); minRadius is a floor
    limits                         // orbitClamp limits; azMin/azMax for a flat scene
  },
  copy: {en: {...}, es: {...}},   // k, h, claim, concept, predict, b, controls: {id: label},
                                  // buttons: {id: text}, readout(...), note(...),
                                  // aria, plus anything the scene needs
  init(ctx),            // bind this step's controls; keep state on ctx.state
  arrive(ctx),          // optional: seed the entrance tween, played once when
                        // the step becomes active (never under reduced motion)
  build(ctx) -> gl,     // three.js objects: {scene, cam, composer: true, ...}
                        // or {panes: [{scene, cam}, ...], composer: false, ...};
                        // set ctx.gl = gl so bindSlider's lit() can reach them
  render(ctx, gl),      // per frame: move what the state says moves
  zoom(ctx) -> number,  // optional: multiplier on the fitted radius, per frame
  flat(ctx),            // draw into ctx.flat (the SVG); labels via ctx.place(list)
  readout(ctx) -> {html, note, fault, data}   // data -> #stage data-* for the browser check
});
```

`ctx.now()` is the shared pausable animation clock. Use it for every tween; wall time would jump on resume. `ctx.instant` keeps manual controls responsive while paused. Optional `presets` name a scene-specific experiment in EN/ES and supply slider values through `ctx.setControls()`.

`ctx` is built once per scene by the page: `{THREE, AD, LC, K, T, lang, $,
css, reduceMotion, embed, state, flat, stage, stageColour(), shownView(),
viewBasis(), place(list), changed(), bindSlider(id, opts)}`. `changed()` is
what a control calls: it redraws the flat path or rewrites the readout,
whichever is live. `bindSlider` is `LinalgKit.bindSlider` with this ctx
bound: it tints the track with the token of the thing the slider moves, shows
the value in the label, brightens the object while dragging, and hands the
value to `onInput`, which is where the scene retargets its tween.

## What the copy says

- `k` is the kicker over the heading: the concept and its section
  ("Condition number · section 09"), never a number. The eight pictures are
  separate ideas that meet in one problem, not a procedure, and nothing a
  reader sees calls them steps; a body that needs another picture names it by
  its concept ("the determinant picture") or as the previous one.
- `h` names the step's one concept plainly, as a sentence a reader could
  repeat ("The determinant is a volume; zero means no inverse"), and
  `concept` states it the way the workshop's pre-work does: one or two
  sentences in the register of *Deep Learning* chapter 2, ending in a
  `<span class="cite">` with the section number. The page draws it as a
  labelled box under the heading, before anything about the picture.
- `claim` is the title card on the stage: the step's claim as one line of
  maths, in the frame's serif (`y = ŷ + r, Xᵀr = 0`; `A vᵢ = σᵢ uᵢ`).
- `predict` is the question the reader answers *before* touching a control.
  The page places it directly above the step's first control, after `b`, so
  the reader has the picture in mind when it is asked
  ("Before you slide: does β change when y moves straight away from the
  plane?"), the way the notebooks' predict-first cells work. The readout is
  then the answer, as a sentence with the numbers in it and the one the
  slider changed in `<b>` -- never a block of `key = value` lines.
- `b` is one or two short paragraphs, concrete: what is on the stage, with
  the example's own numbers, then what to do and what to watch. The concept
  line has already said what the terms mean, so `b` does not define them
  again. The stage is the explanation; the prose is what the picture cannot
  say.

## The rules every scene keeps

- **Nothing on screen is typed.** Every number and every highlighted object is
  computed from the matrix shown, through `linalg-core.js`, which `npm test`
  pins. A scene that needs new arithmetic adds it there, with a test.
- **Both paths, one truth.** `build`/`render` and `flat` draw the same facts
  from the same state, and both take the camera from `ctx.shownView()`.
- **Never snap.** A shape that changes with a slider eases there with the
  core's `tweenStart`/`retarget` or `tweenVec`/`retargetVec`, from wherever
  it is now; under `ctx.instant` the tween length is 0 (reduced motion, a paused clock, or the flat path). The readout and
  `data-*` are written from the slider's *target*, never from the eased
  frame, so the browser check reads the truth while the picture is still
  moving.
- **An entrance, once.** `arrive()` starts the step's own tween from a
  "before" state -- y rising off the plane, the circle inflating into the
  ellipse -- and hands over to the slider. It is skipped under reduced
  motion, and it never changes the target.
- **Both languages** in `copy`, in the same commit, and the `aria` names every
  fact the stage draws, because the stage is `role="img"`.
- **Colours are tokens** (`--v-y`, `--v-out`, `--v-yhat`, `--v-res`,
  `--v-basis`, `--stage-ink`, `--stage-mute`) through `K.colour`/`K.css`,
  never hex: the palette has one home, in the page's CSS, where every colour
  is measured against the label chip.
