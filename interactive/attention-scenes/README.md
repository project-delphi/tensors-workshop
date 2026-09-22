# The attention stage's scenes

One file per scene of `../attention-stage.html`, loaded in order by plain
`<script src>` lines after `attention-core.js`, `linalg-core.js` (for
`pickActive`, the scroller's own step machine) and `attention-kit.js`. Each
file calls `AttentionScenes.register({...})` once. The page reads the
registry back in that order, so a new scene is: one file here, one
`<script src>` line, one `<section class="step" id="step-<id>">` in the page,
one `<span class="anchor" id="<id>"></span>` at the top of that section, its
`<pre id="np-<id>">` NumPy block, and
one `repo.widgets` line in `_variables.yml` (the only thing that notices the
file failing to reach `docs/`). The page throws at boot if a registered scene
has no section.

The order is the journey from a sentence to attention's output, in three
parts, each opened by the scene that declares it in its own `part:`.
**From words to numbers**: "I know you know" cut into tokens, where the
tokenizer sets S (`words`); each token coded as its id in a six-word
vocabulary, `[3, 1, 4, 1]` (`ids`); the ids fetching rows of the embedding
table (`embed`). **One attention head**: X projected into Q, K and V by three
8 × 4 matrices (`project`); every query against every key (`scores`); why the
scores are divided by √d_k (`scale`); softmax turning a row of scores into
weights that sum to one, with a causal mask as the take-home's own idea
(`softmax`); and the weighted average of the values, where the two "know"
rows come out identical because attention alone cannot see position
(`output`). **Beyond one head**: the 8 × 8 projection split so every head gets
its own axis, a reshape that has to be a transpose too, and the bug when it
is not (`heads`); and the rank-4 tensor a real model is handed (`batch`).

The one-head scenes use `AC.headProjections(0)`, columns 0–3 of the full
projections, so every number in the middle part is head 0's number in
`heads`; `tests/attention_core.test.cjs` pins that the two agree. `scale` is
the one scene that does not draw the stage's own Q and K: it samples ±1
vectors from `AC.scaleSpread`, on its own seed, because its claim is about
d_k and the stage's d_k is fixed at 4.

**No three.js, and no canvas.** Every picture on this stage is inline SVG
with real `<text>` elements, so axe can measure contrast and a reader can
select a number the way they can on a page of prose. `attention-kit.js`'s
`numGrid`, `bars` and `arrowRow` build that SVG from arrays
`attention-core.js` computed; nothing in a scene file computes a number a
readout quotes.

Unlike the audio stage, there is no transport and no timeline: nothing here
plays a sound or runs on a per-frame clock, so a scene's `draw()` is called
only when something changes — a control, or the reader moving to a different
picture — the same rule the readout keeps everywhere else in this repo.

## What a scene provides

```js
AttentionScenes.register({
  id: "heads",          // scene key; the section, the URL fragment (#heads)
                        // and the dot in the bar -- link to that name, never
                        // to an index, which moves on a reorder
  section: "04",        // the workshop section this belongs to, for the kicker
  controls: [            // the frame builds these into this scene's section
    {id: "order", type: "select", options: ["split", "flat"]},
    {id: "head", type: "range", min: 0, max: 1, step: 1}
  ],
  copy: {en, es},       // tab, k, h, claim, concept, b, predict, controls: {id: label},
                        // options: {id: {value: label}}, aria(ctx), and eqcap
                        // on the three scenes with a display equation
  init(ctx),            // seed ctx.state; called once for every scene at boot
  sync(ctx),            // optional: derive from the controls before readout()/draw()
  draw(ctx),            // paint the SVG stage
  readout(ctx),         // -> {html, data, claim?}; data becomes #stage data-*
                        // for the check, and claim replaces the copy's claim
                        // on the title card when the scene can say it in numbers
  shape(ctx),           // optional: -> "[2, 4, 4]", the badge on the stage.
  code(ctx),            // -> lines of NumPy, through K.code(); see below
  part: {en, es},       // optional: the heading of the part this scene opens
  reset(ctx)            // optional: back to the opening state
});
```

`ctx` is built once per scene by the page:
`{AC, K, LC, lang, embed, reduceMotion, state, cache, stage, svg, W, H, copy,
hl, colour(token), changed(), setControls(vals), control(id)}`. `AC` is
`attention-core.js`, `K` is `attention-kit.js` and `LC` is `linalg-core.js`
(reused here only for `pickActive`, the scroller's step machine, and its
`mul`/`transpose`/`dot` for a scene that wants a quick check in-page — the
tweens and the orbit camera it also carries have nothing to draw on this
stage). `svg` is the `<svg id="picture">` element, a fixed `640 x 400`
viewBox: a scene clears its own children and rebuilds them on every `draw()`,
which is cheap at these sizes (at most a few dozen cells) and is what keeps
"never re-tween `<text>` per frame" trivially true — there is no per-frame
loop to tween inside. `hl` is the axis the reader is pointing at in this
section's display equation, or `null`; a scene reads it in `draw()` to band
that axis, and must never call `changed()` from inside its own hover
handling, because a hover that rewrote the readout would move the text under
the reader's cursor.

## The rules every scene keeps

- **Nothing on screen is typed.** Every number in a readout, every grid cell
  and every claim is computed from `attention-core.js`, seeded once (`SEED =
  17`) so every Q, K and V entry is a legible integer with `|value| <= 3`. A
  scene that needs new arithmetic adds it there, with a test.
- **Never snap.** This stage has no camera and no idle drift, so there is no
  tween state machine to keep here the way `linalg-core.js` keeps one for the
  projection stage's orbit — a control's new value is simply what the next
  `draw()` shows. Colour and opacity changes that want to ease do so through
  a CSS transition on the SVG, not a per-frame JS loop.
- **The readout is written from the controls, never from a hover.** `changed()`
  rewrites it on a control change or a scene switch; pointing at an
  `[data-hl]` letter in an equation only repaints the stage's own `draw()`.
- **A claim card in numbers is the readout's, not the copy's.** `copy.claim`
  is the scene's formula and is what the card shows at the opening controls.
  `heads`, `scores`, `softmax`, `output` and `batch` return a `claim` from
  `readout()` because their shapes move.
- **Both languages** in `copy`, in the same commit, and `aria(ctx)` names
  every fact the picture draws, because `#stage` is `role="img"`.
- **Colours are tokens** (`--at-q`, `--at-k`, `--at-v`, `--at-w`, `--at-res`,
  `--stage-ink`, `--stage-mute`) through `ctx.colour()`, never hex. `--at-res`
  means the thing on screen has gone wrong — the mismatched source token in
  `heads`' "flat" reshape, or a broken bound in `output`'s convexity check —
  and is not spent on a fourth of something being counted, which is what
  `--at-w` is for.
- **Every `readout().data` key is lowercase.** `stage.dataset.wparams` writes
  `data-wparams`; a camel-case key becomes a selector nobody will guess and
  the browser check will not find.
- **Everything a scene draws stays inside `640 × 400`, and nothing enforces
  that but the check.** An SVG child laid out past the viewBox is not
  clipped and not complained about — it is simply not drawn, while the
  readout still quotes its numbers and every `data-*` assertion still
  passes. The `softmax` scene shipped for a while with the last row of `A`
  and its whole bar chart off the bottom, green the entire time. So
  `check_navigation.cjs` measures each scene as it opens: the union of every
  child's box, mapped back into viewBox units through the CTM, against
  `640 × 400`. A scene whose picture is sized from its controls — `batch` is
  the only one — is measured at both corners of its sliders too, because
  fitting at the opening values proves nothing about the rest.
- **The top of the viewBox belongs to the claim chip**, and a scene starts
  its drawing 44 units down to clear it. That 44 is a floor, not the whole
  story: the chip is sized in px and the picture in user units, so on a
  small stage a claim wraps and needs more. The frame's `fitClaim()` grows
  the viewBox upward by whatever the chip actually measured, which moves
  every scene down together — a scene never has to know how tall the claim
  came out, and never draws above `y = 0` in its own coordinates.

## The display equations

Five sections carry one — `scores`, `scale`, `softmax`, `output` and `batch` —
using notebook 17's own letters: `b` batch, `h` head, `s` query, `t` key, `d`
feature. The one-head equations use only `s`, `t` and `d`; `batch` carries the
four-index form, which is where `b` and `h` appear. The
`<math>` is hand-written MathML and lives **statically in the section**, the
same reason the audio stage's five equations do: it is the same in both
languages and `check_links.py` reads the static HTML. Only the `eqcap`
caption under it is translated, and `tests/attention_scenes.test.cjs` pairs
the two the same way `tests/voice_scenes.test.cjs` does — a caption with no
element, or an element with no caption, is silent in the page. The `data-hl`
tokens are exactly `{batch, head, query, key, feat}`, and a test pins that
set. `k` is never one of them: it is the rank on three of the projection
stage's scenes and would be confusing here, where the key axis is `t`.

The `.eqscroll` around each `<math>` needs both `overflow-x: auto;` and
`contain: inline-size;` — the first alone gives a *block* box a scrollbar but
not a smaller intrinsic width, so a formula wider than the column still
pushes the page sideways at 390px. See `widget-chrome.css` and the audio
stage's own comment on the same trap.

## The NumPy blocks

Every section carries the NumPy for its picture in a static
`<pre id="np-<scene>">` under its equation, the audio stage's shape: a scene
supplies `code(ctx)`, built from the same `ctx.state` as `readout(ctx)`, and
the frame writes it in `changed()`. The lines are one copy for both
languages; only the trailing `#` comments are translated, through the copy's
`np` key, and `K.code(rows)` lines the hashes up. **NumPy only**, never a
framework: the brief the stage was rebuilt to is explicit, and
`tests/attention_scenes.test.cjs` fails on `torch`, `tensorflow` or `jax`. The
five lines the stage exists to teach are pinned verbatim there too
(`embeddings = vocab_matrix[token_ids]`, the three `np.dot` projections,
`scores = np.dot(Q, K.T) / np.sqrt(d_k)`, the softmax written out with
`np.exp` and `keepdims=True`, and `output = np.dot(attn_weights, V)`).

**82 characters**, measured in both places: `npm test` renders every scene's
`code()` in both languages at every setting of its controls, or at the
corners when there are too many, and `check_navigation.cjs` reads each block
off the page after the drive has moved it. The softmax line alone is 80, so
it carries no comment; put a note for it on its own `#` line.
