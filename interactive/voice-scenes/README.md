# The voice stage's scenes

One file per scene of `../voice-stage.html`, loaded in order by plain
`<script src>` lines after `audio-core.js` and `voice-kit.js`. Each file calls
`VoiceScenes.register({...})` once. The page reads the registry back in that
order and builds one tab per scene, so a new scene is: one file here, one
`<script src>` line, one `repo.widgets` line in `_variables.yml` (the only
thing that notices the file failing to reach `docs/`), and one `<span class="sr"
id="...">` anchor in the page. The tabs are built at runtime and
`check_links.py` reads the static HTML, so without that anchor every link to
the scene by name is a fragment that does not resolve -- and linking by name is
the rule.

The order is a story: what a window does to a signal, then what a reshape does
to the matrix it produced. The windowing scene comes first because it is where
"column" and "frequency bin" are defined, and every scene after it says those
words.

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
`{AC, K, lang, embed, reduceMotion, rate, state, cache, stage, canvas, g, W, H,
copy, signal, standIn, colour(token), now(), instant, play(samples, what),
stop(), changed(), setControls(vals)}`. `AC` is `audio-core.js` and `K` is
`voice-kit.js`. Keep everything a control touches on `ctx.state`.

## The rules every scene keeps

- **Nothing on screen is typed.** Every number in a readout and every shape tag
  is computed from the recording being shown, through `audio-core.js`, which
  `npm test` pins. A scene that needs new arithmetic adds it there, with a
  test — including reorderings like the transpose and the patch shuffle, whose
  whole claim is that they are permutations.
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
  drawn on an opaque chip, because axe cannot resolve contrast over a canvas
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
