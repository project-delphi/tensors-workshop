# The voice stage's scenes

One file per scene of `../voice-stage.html`, loaded in order by plain
`<script src>` lines after `audio-core.js` and `voice-kit.js`. Each file calls
`VoiceScenes.register({...})` once. The page reads the registry back in that
order and builds one tab per scene, so a new scene is: one file here, one
`<script src>` line, and one `repo.widgets` line in `_variables.yml` (the only
thing that notices the file failing to reach `docs/`).

The order is a story: how a pressure wave becomes a list of numbers (sampled,
rounded, and written down with a shape), then what a window does to that
list, then what a reshape does to the matrix it produced. The sampling scene
comes first because it is where "sample" and "rate" are defined; the windowing
scene is where "column" and "frequency bin" are, and every scene after it says
those words.

Scenes are tabs over one recording, not steps down a scroller — the projection
stage's shape does not fit here, because a scene that plays sound needs a
transport under the reader's hand rather than under their scroll position.

## What a scene provides

```js
VoiceScenes.register({
  id: "scramble",       // scene key; the tab and the URL fragment (#scramble)
                        // -- link to that name, never to an index, which moves
                        // on a reorder
  section: "04",        // the workshop section this belongs to, for the kicker
  gl: true,             // optional: draws in three.js. Then pose, build and
                        // render are required, and draw() is the 2-D twin
  pose: {content, fov, target, home: {az, el}, limits},   // gl only: how the
                        // frame's orbit camera frames the scene (linalg-core)
  build(ctx) -> gl,     // gl only, once: three.js objects, {scene, cam, ...};
                        // the frame keeps it as ctx.gl
  render(ctx, gl),      // gl only, per frame: move what the state says moves
  arrive(ctx),          // optional: the scene's entrance, played once when it
                        // is first shown in three.js (never under reduced motion)
  resignal(ctx),        // optional: the recording changed under a built scene
  controls: [           // the frame builds these and labels them from copy
    {id: "layout", type: "select", options: ["none", "transpose", "patches"]},
    {id: "pos", type: "range", min: 0, max: 1000, step: 1, fmt: (v, ctx) => "..."}
  ],
  copy: {en, es},       // tab, k, h, claim, concept, b, predict, controls: {id: label},
                        // options: {id: {value: label}}, readout(...), aria(ctx)
  init(ctx),            // seed ctx.state; called once, before the first draw
  sync(ctx),            // optional: derive from the controls. Called before
                        // readout() and before draw(), so both see the same state
  draw(ctx),            // paint the 2-D canvas
  readout(ctx),         // -> {html, data}; data becomes #stage data-* for the check
  audio(ctx),           // optional: -> {samples, what}; what the play button plays
  reset(ctx),           // optional: back to the opening state
  animates(ctx)         // optional: true while the scene needs a frame clock
});
```

`ctx` is built once per scene by the page:
`{AC, K, LC, lang, embed, reduceMotion, rate, state, cache, stage, canvas, g,
W, H, aspect, copy, signal, standIn, source, colour(token), now(), instant,
play(samples, what), stop(), head(), changed(), setControls(vals), THREE, AD,
glReady, gl, shownView(), label(text, cls)}`. `AC` is `audio-core.js`, `K` is
`voice-kit.js` and `LC` is `linalg-core.js` (the tweens and the orbit). Keep
everything a control touches on `ctx.state`. `source` names the recording on
the stage (`voice`, `beat`, `file` or `standin`); a scene that caches
anything derived from the signal keys it on `source` too, and the frame
empties `state` and `cache` when the recording changes. `head()` is seconds
into the clip while it plays, or -1.

## The rules every scene keeps

- **Nothing on screen is typed.** Every number in a readout and every shape tag
  is computed from the recording being shown, through `audio-core.js`, which
  `npm test` pins. A scene that needs new arithmetic adds it there, with a
  test — including reorderings like the transpose and the patch shuffle, whose
  whole claim is that they are permutations, and the rounding, whose claim is
  that 16 bits changes nothing.
- **Both paths, one truth.** A three.js scene's `draw()` is its twin: the same
  facts, side-on, on the 2-D canvas, from the same slice its `sync()`
  computed. The three opening scenes share that slice's shape (`v` in
  `voice-kit.js`) and the kit draws it both ways, so a scene never has two
  descriptions of one picture to keep in step. The readout and `data-*` are
  written from the controls' targets, never from an eased frame.
- **Never snap.** What a control moves eases there, from wherever it is now
  (`LC.tweenStart` / `LC.retarget`); under `ctx.instant` the move is
  immediate. `arrive()` is the one entrance, played once, and never changes a
  target.
- **Derive before you write.** Anything a control implies goes in `sync()`.
  `readout()` and `draw()` are both called after it, so the readout and the
  `data-*` attributes can never describe the state the last frame left behind.
  This was wrong once: changing the hop reported the old hop until the next
  repaint.
- **The readout is written from the controls, never from an animation.** It is
  rewritten when something changes, not per frame — per frame destroys a
  reader's selection and makes the browser check race the picture.
- **Sound is never automatic.** An `AudioContext` is built on the first press
  of a transport button and never before, which is both the autoplay policy and
  the reason the hero embed can exist at all. Nothing plays on load, on a tab
  change or on a slider.
- **The embed is silent, still, and cheap.** `?embed=1` draws from
  `K.demoSignal` rather than fetching the recording; `data-standin` says which
  signal is on screen, and `check_navigation.cjs` asserts it is the stand-in on
  the front door and the recording on the full page.
- **Both languages** in `copy`, in the same commit, and `aria(ctx)` names every
  fact the picture draws, because `#stage` is `role="img"`.
- **Colours are tokens** (`--v-sig`, `--v-out`, `--v-res`, `--v-axis`,
  `--stage-ink`, `--stage-mute`) through `K.css`, never hex. Every label is
  drawn on an opaque chip -- `K.label` on the canvas, `K.label2d` (a CSS2D
  `.lab`) over three.js -- because axe cannot resolve contrast over a canvas
  and reports "incomplete" instead.

## What the copy says

- `tab` is two or three words, because it is a chip in a row of them.
- `k` is the kicker: the concept and its section ("Layout and contiguity ·
  section 04"), never a number.
- `h` names the scene's one concept as a sentence a reader could repeat.
- `concept` states it in the register of *Deep Learning* chapter 2, in one or
  two sentences, and is drawn in a box before anything about the picture.
- `claim` is the title card on the stage: one line, in the notation the scene
  is about (`x[n] → X[f, t]`, `[F, T] → [T, F]`).
- `predict` is the question the reader answers *before* touching a control, the
  way the notebooks' predict-first cells work. The readout is then the answer,
  as a sentence with the numbers in it.
- `b` is one or two short paragraphs: what is on the stage, with this
  recording's own numbers, then what to do and what to listen for.
