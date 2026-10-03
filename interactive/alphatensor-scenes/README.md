# The AlphaTensor stage's scenes

One file per scene of `interactive/alphatensor-stage.html`, loaded by plain
`<script src>` lines so the page still works from `file://`. Each calls
`window.AlphaTensorScenes.register({...})`; the page reads the registry back
in load order. The stage is the workshop's eighth widget and the companion to
section 06 (a matrix product is one contraction), section 11 (the fewest
blocks is a CP rank) and deep dive 20.

**It plays the game; it is not AlphaTensor.** No network runs on the page and
nothing is trained. The greedy player in part three is a baseline that loses,
not a model of what DeepMind built. What the page shows is the problem
AlphaTensor was built for and why it is hard, and AlphaTensor's own results
are quoted from the paper. That boundary is stated on the page itself, in the
About panel, in both languages, and in the Interactive card.

Twelve scenes in three parts, one part per post of the series the page
follows. Link to a scene by its name, never by a number.

| Part | Scene | Draws | What it shows |
|---|---|---|---|
| The rule is a cube | `#rule` | flat | the eight products of `[[1,2],[3,4]] · [[5,6],[7,8]] = [[19,22],[43,50]]`, each a triple |
| | `#cube` | three.js | a 1 at each triple: 64 cells, eight 1s, in four trays |
| | `#read` | flat | `c = einsum("abc,a,b->c", T, a, b)`: 16 terms a tray, 14 vanish |
| | `#bigger` | three.js | n = 2…5: side n², n³ ones, 12.5% → 0.8% full |
| A factorization is an algorithm | `#block` | three.js | `u ∘ v ∘ w`: 8 cells, 2 wanted, 6 damage, one multiplication |
| | `#strassen` | three.js | seven blocks added: 8, 12, 12, 12, 10, 8, 4, 0 cells differ |
| | `#run` | flat | the seven products on numbers: 65, 35, −2, 8, 24, 22, −30 → 19, 22, 43, 50 |
| | `#recurse` | flat | 7ᵏ against 8ᵏ: 73.7% saved at 1,024; exponent 2.807 |
| The game | `#game` | three.js | TensorGame: subtract blocks until the cube is empty |
| | `#space` | flat | `f^(3n²)` choices a move: 5¹² = 244,140,625; 1,644 digits |
| | `#greedy` | flat | of 128,000 first moves, 8 lower the count; greedy finds 8, never 7 |
| | `#learn` | flat | the record board, and what a rank-R split of 3 × 3 would buy |

## Where the numbers come from

Nothing is fetched. Every figure a picture quotes is computed in the browser
by `interactive/alphatensor-core.js` and pinned by
`tests/alphatensor_core.test.cjs`, except the records in `#learn`, which are
published results held as a small table (`RECORDS`).

| What | Source | Checked against |
|---|---|---|
| The core's arithmetic | A port of `posts/alphatensor-matmul-cube/model.js` in [project-delphi/ml-blog](https://github.com/project-delphi/ml-blog) at commit `6e34eef` (2026-10-02), whose three `src/check_model.js` scripts assert every number the posts quote | the test ports all three scripts |
| Strassen's `U`, `V`, `W` | Strassen (1969), *Gaussian elimination is not optimal* | the arrays in the handbook's `#still-open` code block, element for element; and their sum, which must be the tensor |
| 2 × 2 needs exactly 7 | Winograd (1971) | — |
| 3 × 3 is at least 19 | Bläser (2003) | the handbook note's own sentence |
| 3 × 3 is at most 23 | Laderman (1976) | the handbook note's own sentence |
| 4 × 4 in 49 | Strassen's seven, applied twice; AlphaTensor matched it in ordinary arithmetic. Shown as what the mod-2 result is measured against, not as the shortest known | `recursion(2).strassen` |
| 4 × 4 over the complex numbers in 48 | Novikov et al. (2025), *AlphaEvolve*, arXiv:2506.13131: "a procedure to multiply two 4 × 4 complex-valued matrices using 48 scalar multiplications" | the abstract, read 2026-10-03 |
| 4 × 4 mod 2 in 47 (was 49); 4 × 5 by 5 × 5 in 76 (was 80) | Fawzi et al. (2022), *Discovering faster matrix multiplication algorithms with reinforcement learning*, Nature 610 | deep dive 20 loads DeepMind's published factorizations and verifies both |

Every paper is on the references page under *An open problem*, with a
catalogue of the best known count for every small size. Records move — the
4 × 4 row did in 2025 — so when one does, change `RECORDS`, the handbook
note and this table together: the test reads the note and fails on a
mismatch.

Two things in the core are not the blog's. `survey(R, N)` looks at all
128,000 moves from a position once — how many lower the count of nonzero
cells, keep it or raise it, the histogram by cells left, and the move a
greedy player takes — and remembers the answer per position, because a
readout asks for it several times and is written from the controls, not from
whichever frame got there first. `play(T, blocks)` returns what a list of
blocks adds up to, what is still owed, and the cells either has ever held;
the frame draws the strip from it.

## Conventions

- A matrix is flat and row-major: entries `11, 12, 21, 22`. The tensor's cell
  `(a, b, c)` is entry `a` of A, entry `b` of B, entry `c` of C = AB.
- **Prose and labels count from one** (`a₁₂`, "tray c₂₁"); **code brackets
  count from zero** (`T[1, 2, 0]`).
- A block is `{u, v, w}`: three vectors of four weights. A factorization is
  `{U, V, W}`, lists of rows; `AC.blocksOf(F, k)` is its first `k` blocks.
- The einsum strings are the handbook's: `"abc,a,b->c"` reads the product off
  the tensor and `"ra,rb,rc->abc"` sums the blocks.
- The worked example is `AC.A0 = [1, 2, 3, 4]`, `AC.B0 = [5, 6, 7, 8]`,
  product `19, 22, 43, 50`. Scenes that show numbers show these.

## What a scene provides

```js
window.AlphaTensorScenes.register({
  id: "x", section: "06",                  // REQUIRED. section is "06" or "11"
  part: {en, es},                          // only rule, block and game: opens a group
  hl: ["a", "b", "c"],                     // exactly the data-hl tokens its <math> carries
  gl: true,                                // three.js scenes only
  copy: {en: EN, es: ES},                  // REQUIRED
  pose: {fov, home: {az, el}, margin, inset?: {right: .36},
         limits: {azMin, azMax, elMin, elMax, dollyMin, dollyMax}},      // gl
  controls: [{id, type: "range", min, max, step, fmt: (v, ctx) => …},
             {id, type: "select", options: [...]},
             {id: "play", type: "play", target: "k", rate: 0.9},
             {id, type: "button", enabled?: (ctx) => bool}],
  init(ctx) {},                            // REQUIRED: seed ctx.state
  sync(ctx) {},                            // clamp or derive after any change
  press(ctx, id) {},                       // REQUIRED if it has buttons
  arrive(ctx) { ctx.cache.arrive = ctx.now(); },  animates(ctx) {},
  pick(ctx, key) {}, tip(ctx, key) {}, seek(ctx, cellIndex) {},
  hud(ctx, svg) {}, bounds(ctx) {}, build(ctx) {}, render(ctx, gl) {},   // gl
  draw(ctx) {},                            // REQUIRED: the flat picture, or the gl twin
  readout(ctx) { return {html, claim, caption?, strip, data}; },         // REQUIRED
  code(ctx) { return K.code([...]); }      // REQUIRED
});
```

`ctx` carries `AC` (the core), `K` (the kit), `LC`, `lang`, `embed`, `state`,
`cache`, `svg`, `copy`, `hl`, `hover`, `now()`, `instant`,
`setControls(vals)`, `control(id)`, and for a three.js scene `basis()`,
`projector(points, box)`, `box()` and `board()`.

**The copy** is two objects, `EN` and `ES`, with the same keys: `tab` (the
one-word name on the rail), `k` (kicker), `h` (heading), `predict`, `concept`,
`b` (body, HTML), `eqcap`, `claim` (a function), `aria(ctx)`,
`controls{id: label}`, `options{controlId: {value: label}}` and `np{…}`, plus
whatever strings the scene draws. Keys must match exactly between the two
languages, `np` included; the test compares them.

**Every readout key is lowercase and every value a string**, because
`stage.dataset.fN` writes `data-f-n`. A readout never writes one of the
frame's keys: `scene`, `ready`, `gl`, `cam`, `easing`, `playing`, `paused`,
`hl`, `hover`, `grab`, `turns`, `tensorshape`, `stripmode`, `stripoff`,
`stripcount`.

**A claim is rebuilt from the controls**, never left as a static string: the
test fails a scene whose claim card says the same thing at every setting.

**No NumPy line passes 74 characters** at any setting in either language.
`K.code` aligns the `#` comments after the longest commented line, so keep a
long line bare and put the comments on short ones.

**The four `data-hl` tokens are a closed set**: `a`, `b` and `c` are the
cube's three axes — an entry of A, of B, of C — and `r` is the index over
blocks, products or moves. A scene's `hl` lists exactly the tokens its own
section's `<math>` carries, and lights that thing when `ctx.hl` names it:
`K.cubeModel` brightens an axis's names given `{hl: ctx.hl}`. Pointing at a
letter repaints the stage and never calls `changed()`.

**A button is an action, not a value.** `{type: "button"}` calls
`scene.press(ctx, id)` and the frame then rewrites the readout. Use one where
a click changes what the picture is *of* — play this move, start over, load a
preset. State a button builds up (the moves played) lives in `ctx.state`, and
`init` resets it.

**A weight vector is one control, not four.** `u`, `v` and `w` are each a
`range` over `0 … AC.WEIGHTS − 1`, an index into the 81 vectors of
`{−1, 0, 1}⁴` (`AC.weightAt`, `AC.weightIndex`; `AC.ZERO_WEIGHT` is all
zeros). A reader sets them by clicking the weights drawn on the stage, which
goes through `ctx.setControls`. Twelve separate controls would make the
test's sweep 4,096 corners and never visit zero.

## The strip is the thread

Under the stage, in every scene, is the 2 × 2 cube laid flat: four trays of
sixteen cells, a ring on each of the eight 1s of the rule. It is what makes
twelve pictures one page. A scene's `readout()` returns

```js
strip: {mode: "built" | "owed", terms: [{u, v, w}, …], count, lit?: [cell, …], tray?: c, note?}
```

and **the frame works the 64 cells out from the core**: in `built` mode the
filled cells are what `terms` add up to (parts one and two); in `owed` mode
they are what is left of the cube once `terms` are subtracted (part three,
where the sum has been moved to the other side of the equation). No scene
writes 64 numbers. `count` is the multiplications, or moves, that those
blocks cost — the strip's own, so 8 under `bigger` and 7 under `recurse`
whatever size or depth the picture above is showing, or the caption would
say "27 multiplications" beside a cube built from eight; `lit` is the flat
indices of the cells it is pointing at (`AC.cell(4, a, b, c)`); `tray` is the
one tray it is reading; `note` replaces the caption's second line, for the one
scene (`block`) whose default line would answer the next scene's question.

A press on a cell of the strip calls `scene.seek(ctx, cellIndex)`, which goes
through `ctx.setControls` like any other hand on a control. Every scene has
one except `recurse`, `space` and `learn`, which are about a count rather
than about the cube's cells; the test holds that list closed.

## The cube is one picture

Five scenes show the cube, and they must look like the same object, so the
picture lives in the kit and a scene only describes a state:

```js
const m = K.cubeModel({n, values, ever, preview, rings, slice, cell, lit},
                      {lift, zeros, hl});       // what to draw
m.items = K.follow(ctx.cache.ease, m.items, ctx.now(), 0.16, ctx.instant);   // ease by piece
K.cubeRender(gl, m);                            // three.js, from K.cubeBuild(ctx, pose, max)
K.cubeDraw(ctx.svg, m, ctx.basis(), ctx.projector(K.corners(b.min, b.max), ctx.box()));  // the twin
```

Trays are stacked top to bottom `c₁₁ … c₂₂`; inside a tray rows are entries
of A (back to front) and columns entries of B (left to right). `values` is
the tensor to draw; `ever` marks cells drawn hollow once back at zero;
`preview` is a ghost over the first; `rings` is the target; `slice` is a
picked tray (ease it with `K.trayLift` and ask `K.cubeBounds(n, true)`);
`cell` is a picked `{a, b, c}`; `lit` is a flat mask to brighten. Pick keys
are `x:a,b,c` for a cell and `t:c` for a tray's name. `K.trays2` draws the
same state flat, one grid per tray. `K.weights2` draws a block's `u`, `v` and
`w` as three rows of four chips, pickable as `w:<u|v|w>:<entry>`; a scene that
lets a reader build a block cycles that weight `0 → +1 → −1 → 0` on the pick.

**Colour is never the only carrier.** `+1` is violet and `−1` is amber, and
every value that is not a plain 1 is printed on its cell; a cancelled cell
is a hollow dashed outline; a wanted cell has a ring. `--at-a`, `--at-b` and
`--at-c` are the three axes everywhere; `--at-good` and `--at-bad` are a
count going down and up.

## How a scene looks, moves and reads

**Something happens.** Every scene has an entrance that performs its idea
once (`arrive` stamps `ctx.cache.arrive`; `K.arrival(ctx, ms)` is its
progress) and a `play` control, or buttons, that perform it again on
request. `rule` opens the page and is flat, so its entrance is what moves
when the page loads: it defines `animates` and runs for 2.6 s. The readout is
written from the controls on the first frame; the entrance is only how the
picture gets to what it already says. Under reduced motion or the pause
button `ctx.instant` is true and the picture is simply there.

**A flat scene is laid out on an 820 × 500 board**, the shape of the stage,
so it fills it. Keep clear of the claim chip (top left, above y = 46) and the
shape badge (top right). Nothing may be placed off the board, and **no text
is set under 11 units** on either surface. A three.js scene's twin is fitted
to `ctx.box()`, and its inset is drawn by `hud(ctx, svg)` on `ctx.board()`,
with `pose.inset` keeping that share of the stage clear.

**Text is never dimmed by opacity**, because half-opacity text is
half-contrast text: a thing standing back is drawn in `--stage-mute`.

**The copy asks before it tells.** The predict-first question comes straight
after the heading, ends in a question mark, and neither it nor the heading,
the concept box or the body gives the answer: the readout under the stage
does, opening on the answer in bold. Where a scene can open *before* its
answer, it does — `strassen` with nothing added, `bigger` at 2 × 2, `recurse`
at one level, `game` with no move played — so the reader's first move is
what answers the question. A question may rest on what an earlier scene
showed; it may not repeat one an earlier scene answered. Lead with the
concrete thing and one number a reader can check; the formula and the NumPy
follow. Nothing is called a step, and the three groups are named, not
numbered: "Part" is the handbook's word.

**One noun for one thing.** The *cube* is the 4 × 4 × 4 tensor, a *cell* one
of its entries, a *tray* one slice. A *block* is a rank-one term `u ∘ v ∘ w`
and nothing else — not the cube, not a filled cell, not a sub-matrix, which
is a *quarter*. In the third group a block subtracted from the cube is a
*move*. A split of the cube into blocks is a *split*; in Spanish it is a
*descomposición*, never a *partición*, because the blocks overlap and cancel.
Spanish is written, not transliterated: *bloque*, *celda*, *jugada*,
*bandeja*, *cinta*, *regla escolar*.

**`space` and `greedy` count moves differently**, and say so: 5¹² is every
triple with five coefficients, zero vectors and duplicates included; 128,000
is the distinct blocks with three. The chain is 3¹² = 531,441 triples, 80³ =
512,000 with no zero vector, and 128,000 once the sign duplicates are gone.

## What the browser check measures

`scripts/navigation/widgets/alphatensor-stage.cjs` opens each scene **by
name** through a helper that waits for the scroll to stop and for a key only
that scene publishes, then for `data-easing="0"`. It asserts the teaching
numbers off `data-*`, measures what the SVG pictures drew through
`getScreenCTM().inverse()` against the viewBox at each scene's opening values
and at the corners of every control that resizes a picture (`bigger` at
n = 5, `recurse` at k = 10, `space` at 49 moves), plays the game through to a
win, presses a cell on the strip and requires the picture to follow, runs
every three.js scene's twin with `linalg-boot.js` aborted, and checks the
embed fetches nothing.

The key each scene publishes that no other does, which is what `open()` waits
on: `rule` `product`, `cube` `ones`, `read` `alive`, `bigger` `share`,
`block` `damage`, `strassen` `hollow`, `run` `ops`, `recurse` `saved`,
`game` `won`, `space` `digits`, `greedy` `raise`, `learn` `exponent`.
