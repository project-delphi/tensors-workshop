# The voice stage's scenes

One file per scene of `../voice-stage.html`, loaded in order by plain
`<script src>` lines after `audio-core.js` and `voice-kit.js`. Each file calls
`VoiceScenes.register({...})` once. The page reads the registry back in that
order, so a new scene is: one file here, one `<script src>` line, one
`<section class="step" id="step-<id>">` in the page, and one `repo.widgets`
line in `_variables.yml` (the only thing that notices the file failing to
reach `docs/`). The page throws at boot if a registered scene has no section.

The order is a story in four parts, and the part headings are on the scene
that opens each one (`part: {en, es}`). **From air to numbers**: how a
pressure wave becomes a list (sampled, rounded, written down with a shape and
a dtype). **From numbers to a matrix**: one window cut out of that list, the
transform that asks which frequencies are in it, then the window hopping along
so that each stop is a column. **What a layout does to it**: the reshape you
can hear go wrong. **What factoring it costs**: the truncated SVD's denoising
curve, measured rung by rung while the reader waits for the factorisation, and
the NMF that gives up the best error to get parts you can name.
Each picture introduces exactly one word the next ones use
-- "sample" and "rate", then "bit depth", then "frame" and "window", then
"bin", then "hop" and "column" -- and nothing says a word before the picture
that defines it.

Scenes are sections down a scroller with a sticky stage, the shape
`linalg-stage.html` keeps, and the reader's place in it is whichever section
crosses a band through the middle of the viewport (`LC.pickActive`). The
transport is in the sticky column beside the stage rather than in the section,
because it has to stay under the reader's hand while they scroll.

## What a scene provides

```js
VoiceScenes.register({
  id: "scramble",       // scene key; the section, the URL fragment (#scramble)
                        // and the dot in the bar -- link to that name, never
                        // to an index, which moves on a reorder
  section: "04",        // the workshop section this belongs to, for the kicker
  part: {en, es},       // optional: the heading of the group this scene opens
  posControl: "pos",    // optional: the control the timeline strip drags,
                        // mapped onto that input's own min and max
  gl: true,             // optional: draws in three.js. Then pose, build and
                        // render are required, and draw() is the 2-D twin
  pose: {content, fov, target, home: {az, el}, limits},   // gl only: how the
                        // frame's orbit camera frames the scene (linalg-core)
  build(ctx) -> gl,     // gl only, once: three.js objects, {scene, cam, ...};
                        // the frame keeps it as ctx.gl
  render(ctx, gl),      // gl only, per frame: move what the state says moves
  arrive(ctx),          // optional: the entrance, played once when the reader
                        // first reaches this picture, on either surface
                        // (never under reduced motion)
  resignal(ctx),        // optional: the recording changed under a built scene
  controls: [           // the frame builds these into this scene's section
    {id: "layout", type: "select", options: ["none", "transpose", "patches"]},
    {id: "pos", type: "range", min: 0, max: 1000, step: 1, fmt: (v, ctx) => "..."}
  ],
  copy: {en, es},       // tab, k, h, claim, concept, b, predict, controls: {id: label},
                        // options: {id: {value: label}}, readout(...), aria(ctx)
  init(ctx),            // seed ctx.state; called once for every scene at boot
  sync(ctx),            // optional: derive from the controls. Called before
                        // readout() and before draw(), so both see the same state
  draw(ctx),            // paint the 2-D canvas
  readout(ctx),         // -> {html, data, claim?}; data becomes #stage data-*
                        // for the check, and claim replaces the copy's claim
                        // on the title card when the scene can say it in numbers
  region(ctx),          // optional: -> {i0, i1}, the samples this picture is
                        // looking at, banded on the timeline strip
  audio(ctx),           // optional: -> {samples, what}; what the play button plays
  playLabel(ctx),       // optional: what the play button *says* it will play.
                        // Cheap: it is rewritten on every control change
  reset(ctx),           // optional: back to the opening state
  animates(ctx)         // optional: true while the scene needs a frame clock.
                        // Every scene with a playhead returns ctx.head() >= 0
});
```

`ctx` is built once per scene by the page:
`{AC, K, LC, lang, embed, reduceMotion, rate, state, cache, stage, canvas, g,
W, H, aspect, copy, signal, standIn, source, colour(token), now(), instant,
play(samples, what), stop(), head(), changed(), setControls(vals), control(id),
THREE, AD, glReady, gl, shownView(), label(text, cls)}`. `AC` is `audio-core.js`, `K` is
`voice-kit.js` and `LC` is `linalg-core.js` (the tweens and the orbit). Keep
everything a control touches on `ctx.state`. `control(id)` is this scene's own control element, because the frame prefixes
every control with the scene it belongs to (`c-spectrum-size`): the same name
lives in nine sections now. `source` names the recording on the stage
(`voice`, `beat`, `tone`, `file` or `standin`); a scene that caches
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
- **A claim card in numbers is the readout's, not the copy's.** `copy.claim` is
  the scene's formula and is what the card shows until the recording has
  loaded. A scene whose shape is a control's to move — the frame's `(N,)`, the
  hop scene's `(237568,) → (513, 465)` — returns a `claim` from `readout()`
  instead, so the card cannot sit there contradicting the readout under it.
- **Sound is never automatic, and never stale.** An `AudioContext` is built on
  the first press of a transport button and never before, which is both the
  autoplay policy and the reason the hero embed can exist at all. Nothing plays
  on load, on a scroll or on a slider. But a slider moved *while* something is
  playing swaps the sound in place, from the same moment in the clip -- so
  `audio()` must stay cheap enough to re-render mid-play (the frame scenes
  rebuild one window; the hop scene inverts a whole spectrogram, which is the
  ceiling), and `playLabel()` must always name what `audio()` would return.
- **The embed is silent, still, and cheap.** `?embed=1` draws from
  `K.demoSignal` rather than fetching the recording; `data-standin` says which
  signal is on screen, and `check_navigation.cjs` asserts it is the stand-in on
  the front door and the recording on the full page.
- **Both languages** in `copy`, in the same commit, and `aria(ctx)` names every
  fact the picture draws, because `#stage` is `role="img"`.
- **Colours are tokens** (`--v-sig`, `--v-out`, `--v-res`, `--v-axis`,
  `--v-comp`, `--stage-ink`, `--stage-mute`) through `K.css`, never hex.
  `--v-res` means the thing on screen has gone wrong; do not spend it on a
  fourth of something being counted -- that is what `--v-comp` is for. Every label is
  drawn on an opaque chip -- `K.label` on the canvas, `K.label2d` (a CSS2D
  `.lab`) over three.js -- because axe cannot resolve contrast over a canvas
  and reports "incomplete" instead.

## What the copy says

- `tab` is two or three words. It is no longer drawn -- the sections are the
  navigation -- but the dots in the bar and any future index still read it.
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
- `b` is one or two short paragraphs of HTML, and it **opens with the concrete
  thing**: the failure you can hear, or the picture in front of you, with one
  number a reader can check on the stage. The definition is `concept`'s job and
  the formula is `claim`'s; a body that starts with either is the version this
  page was rewritten to stop being.
