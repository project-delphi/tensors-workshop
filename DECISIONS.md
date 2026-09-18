# Decisions and their history

[AGENTS.md](AGENTS.md) states the rules. This file keeps the reasons: what was
tried, what went wrong, and why the rule reads the way it does. Each entry is
headed by the rule it explains, in the order AGENTS.md gives them. Add an entry
when a rule earns one -- when the obvious change was made once and had to be
undone -- and keep AGENTS.md to the rule itself.

## Generated files

**The normalizer sorts the keys inside every cell.** Nothing reads a notebook
by key order; the reason is the diff. Each editor writes its own order, so a
notebook picked up by a different tool came back with every cell rewritten:
notebook 04 once carried 245 lines of moved keys around a single real edit,
which is how a genuine change gets missed in review. No new check guards this,
because the byte-exact regenerate gate already does: a scrambled order is
something `gen_notebooks.py` rewrites, and CI then sees a dirty tree.

**The image generators are deterministic only for a given stack.** `figures`
carries floors rather than pins and `uv.lock` is gitignored, both deliberately,
so every `uv run --group figures` resolves whatever matplotlib and Pillow are
newest that day; matplotlib is what decides glyph positions, hairline placement
and how an image is downsampled. Rerunning the generators on 2026-09-14, three
weeks after the figures were drawn, rewrote all six of them and `ds-audio.png`
with no input changed anywhere. Nothing any of them *said* moved: every printed
number, colour, bar and filled cell came back pixel-identical, and the entire
diff was text glyphs, a few hairlines, and the resampling grain of the
photographic panels. `ds-audio.png` was pixel-identical outright -- only the
PNG encoder's bytes had shifted. The eight photographic dataset cards and all
the cube GIFs came back byte-identical, because Pillow's crop-and-resize path
and the GIF writer have not moved. Matplotlib is the one that drifts. So a
dirty `git status` after a rerun is the expected consequence of a matplotlib
release, not evidence that an input changed, and the `Stack:` line is what
tells the two apart: same versions and a changed image means an input moved;
different versions and the diff is almost certainly rasterization, which a mask
of the changed pixels confirms in a minute.

**The dataset cards are kept though nothing displays them.** The dataset strip
they were drawn for was cut from both landing pages. `gen_figures.py` imports
their pin, palette and fetcher, and the handbook's *The Data We Use* section is
the obvious place to bring them back. Their absence from every page is not a
bug to fix by re-adding a strip to the homepage.

**Three cube animations per notebook, not two.** The floor was two until the
pictures were read side by side, and what that showed was scene after scene
opening on the identical `np.arange(60)` cube in a different accent: the video
pipeline, the colour images and the Tucker unfoldings were all the same
picture. Two slots went to the move and none to the material. Three is the
count that makes room for it, and `check_table()` now enforces it, along with a
duplicate stem and a stem filed under the wrong notebook, which would render in
the wrong accent and then be rejected by check 1 two tools away from its
cause. It was a printed advisory while twelve notebooks were still on two,
because a generator that refused to draw until all of them were done would
have been useless for the work that got them done. Nothing in CI checks any of
this: check 1 tests ownership and never a number.

**Frames are 4050 ms, one global value.** A frame is a whole labelled picture
with a caption and a shape line, not a tween; the stepper cell in each notebook
is the other half of that answer, handing frames over one at a time for a
reader studying rather than watching. The duration has been raised three
times, 900 → 1800 → 2700 → 4050, each time by watching one rather than by
reasoning about it: a reader meeting a frame for the first time has to find
the caption, find the pile it names, and then look for what moved, which is
three passes and not one -- and four once the frame holds two piles side by
side. Raising it rewrites every cube GIF in `images/` and changes nothing else:
frame delay is metadata, so `MAX_KB` is not at risk.

**`render` quantizes with `palette_from="all"`.** One palette is shared by
every frame so colours cannot shift mid-animation, and reading it off frame 0
alone silently crushes any hue a later frame introduces. That is not a
colour-scene problem: `cube-06-matmul` is drawn entirely in one accent, so its
green `lit_tint` highlight had no green anywhere in frame 0 to quantize against
and rendered grey.

**The one colour scene is still not real data.** `cube-04-rgb` draws a 3x4
swatch through `planes(cell_colors=...)`, and the swatch is as synthetic as the
cube: every channel value in it is 0, 128 or 255, so "the red plane says 255
wherever the pixel looks red" is checkable by eye in exactly the way
`T[1, 2, 3] == 33` is. That is the test a colour scene has to pass, and a
photograph fails it -- it would put 87 there and there would be nothing to
check. Real arrays stay in `gen_figures.py`.

**Every frame is a complete picture.** `fig_hero` already recorded what a
build animation does: Chrome parks on frame 0 at the end of a finite loop,
which in a build-from-empty is the emptiest frame there is.

**GIFs loop forever.** `loop=0` is a correction, not a preference. At `loop=3`
a browser started the animation when the image loaded rather than when it
scrolled into view, so it played out to an empty room and a reader arriving at
the cell met a parked frame 0 -- a still, indistinguishable from a broken
image, which is exactly how it was reported. No finite loop count survives
that; it is a race against how fast somebody scrolls. The video-stack GIF and
notebook 16's PCA GIFs use `loop=0` for the same reason. The hero band is a
still PNG: an earlier GIF build parked on empty frame 0, so the reveal moved to
CSS.

**`_check_layout` measures what code cannot decide.** The `sub` and `note`
captions share one baseline at opposite ends of it and a long pair prints
through itself; and a pile tall enough for its own shape grows up through the
label, because `centred` centres on the caption band without asking how much
band there is. Both were found by shipping them. A third trap it cannot catch
is occlusion: the planes are painted front-last and cover exactly, so `lit` on
a cell of plane 1 or 2 highlights something plane 0 is painted over, and the
frame comes out with nothing visibly selected.

**One accent per notebook, and `INDEX` for identity.** The accent rule exists
so a reader can tell which notebook a screenshot came from, and that survives
as long as the accent is what ordinary data is drawn in. A second colour
appears only where the picture is making a claim about *identity* -- which
axis, which index, which operand -- because that is a claim one tint cannot
carry. `INDEX` holds those hues, from the Okabe–Ito colour-blind-safe set.
Today that is the three einsum scenes (`i` blue, `j` orange, `k` green, so "k
is gone after the arrow" is something a reader watches rather than reads),
`cube-00-axes` and `cube-10-unfold`, which agree with each other on what colour
each axis is, and `cube-06-matmul`. Colour is never the only carrier: every
index is written out as a letter and every caption still says which axis in
words, for the reason the Spanish box says `ESPAÑOL` rather than just being
grey.

**Slide art is WebP.** The seventy-eight slide images weighed 94 MB as PNG,
most of the site's payload and most of a clone; re-encoded with Pillow at
quality 90 they weigh 11 MB and are indistinguishable at 1920 wide. Chrome's
`--screenshot` writes PNG only, so `gen_slide_art.py` shoots to a temporary
PNG and converts, which is why it runs under `--group figures`. The thirty-one
pre-existing slides have no source and were converted from the PNGs in
history; the old bytes are still in git if one ever needs redrawing from the
original export. Baked page numbers in that art are not authoritative
(`slides/README.md`), so the generated slides carry none.

**The visualizer's photos are shipped as JSON.** The widget cannot import
scikit-image, so `gen_figures.py widget` writes the three photographs out once,
tiny, as JSON it fetches same-origin -- not from the network, which
`check_navigation.cjs` aborts, and not inlined into the HTML, which stays
hand-written. Four resolutions: 4 px is what a stride table can be read from and
what a value printed on each cube fits, 16 px is where a photo first reads as
one, and 32 px is the ceiling the instanced mesh is sized for. Centre-crop to
a square, then Pillow's BOX filter, so the bytes do not depend on which
matplotlib is installed.

**three.js is vendored.** The widget shipped pointing at
`three@0.169.0/build/three.min.js`, a UMD build that has not existed since
r160, so the request 404'd and every reader got the isometric canvas under a
message blaming their WebGL; and because `check_navigation.cjs` aborts every
off-origin request, that check could never have caught it. Same-origin, it
loads, and the check asserts `THREE.REVISION`.

**The companion's artifacts have `/artifact/<uuid>` URLs, and no exports.**
The Studio row's ⋮ menu hides *Copy link* for the quiz, flashcards and Audio
Overview, which is what made them look unshareable; every artifact has a link.
What none of them has is an export, so they only work while the notebook is
shared as "anyone with the link" -- and only for a visitor with a Google
account, which is why each carries a `thumb:` screenshot the site serves
itself, with a caption on the three unexportable ones saying it is a still of
something live. A page that lets a reader miss that has mis-sold the click.
`covers` on each short is a hand-made reading of the title: nothing in
NotebookLM knows this workshop has sections, so check 12 verifies the number
names a section that exists and cannot catch a bad call.

**The brainstorm diagram is generated, and inside the gate.** The
idea-to-section mapping is a hand-made reading, the same kind of call `covers`
is. The generator refuses a section under no idea or under two, which catches
one added twice or forgotten and cannot catch one filed under the wrong idea;
that check lives in the generator rather than `check_links.py` because the
generator is what CI reruns, so a bad mapping fails at the point that names it.
Being drawn by `gen_tables.py` puts the diagram inside the byte-exact
regenerate gate, unlike every other picture on the site, and makes it the only
one whose text is real text: selectable, scalable, read out from the `<desc>`
the generator writes. An SVG with a fixed `viewBox` does not reflow, so the
layout is emitted twice and `custom.scss` picks one at 44rem; the diagram
draws itself from the site's own SCSS variables.

**The visualizer is one page with tabs, not one page per operation.** When
its sidebar outgrew the stage (2026-09-17) the obvious split was a reshape page,
a transpose page and a memory page. It was not taken because section 04's
lesson is the composition: transpose to NCHW, then reshape, then
`.contiguous()`, watching one buffer through all three, and "a reshape after a
transpose copies" cannot be shown on a page that has only reshape. Separate
pages would also each need the hero embed's sequence and the browser check's
chain. So the operations are tabs over one state, and the tab panels carry
plain ids (`reshape`, `transpose`, `slice`, `memory`) so that `#transpose` in
the URL is the "transpose page" and a link to it resolves for check 3, which
looks a fragment up by id. That is also why the *Compare with reshape* checkbox
is `#compare`: it held `#reshape` first.

**The stage drifts while idle, and the pointer is the switch.** A reader
arriving at the visualizer saw a still isometric pile with no sign it was a
3-D view; the stage note said *drag to rotate*, which is a caption doing a
demonstration's job. So the camera sways and breathes until someone points at
it. Three things about how it is built are deliberate.

It is a sway, not a spin, for the reason `startEmbed()` already gave: a full
turn passes through the angles where the three photographs stack up behind one
another, and the pile is the one thing this widget exists to take apart. Both
the swing and the zoom are bounded by what stays in frame, which took two
tries to get right. `glDistance()` frames the tensor as a cylinder, which is
rotation-invariant, but the camera is a 32-degree perspective one and the row
of three photographs is 51 units long: swing far enough that the row runs into
the screen and the near photograph blows up past the bottom of the stage. So
the swing is 0.26 radians either side, not the 0.35 first tried, and the zoom
only ever pulls *out* from where the reader had it -- the framing already
leaves 12% to spare and anything tighter crops. The zoom runs at half the
sway's period so that the camera is at its furthest out exactly at each end of
the swing, which is where the tensor needs the room.

The pointer is the only switch a reader has to find, and they find it by
accident. `pointerenter` on `#stage` stops the drift; `pointerleave` schedules
its return 1.5 seconds later. The legend, the snap button and the gizmo are
children of `#stage`, so crossing into them is still being on the stage, which
is what `pointerenter` and `pointerleave` already mean. The keyboard is held
off by `:focus-visible` rather than `:focus`: a click focuses the stage too,
and keying off plain focus meant that clicking once killed the drift for the
rest of the visit -- which the Playwright run caught before this shipped.

Stopping and starting again must not move the tensor, which is why the sway's
origin is seeded once and its phase is carried across the pause. Both bounds
above are bounds on *one* cycle around an origin; re-reading that origin from
the view on every resume would have made them bounds on nothing. The breath
only ever pulls the scale down, so each pause would have left a smaller origin
than the last until a reader who crossed the widget a few times found it sitting
on `zoomBy()`'s floor, and the yaw would have random-walked out past the 0.35
that was rejected in the first place. The origin therefore only ever comes from
a pose the reader left: `dropDrift()` drops the seed because a drag, a wheel or
a gizmo click is the reader choosing a new one, while a pointer merely crossing
the stage is not.

It rides `tick()`, the one `requestAnimationFrame` loop the page owns, as a
third source of motion beside the snap glide and the reshape tween, rather
than the second loop `startEmbed()` runs. A glide or a tween still paints
every frame; the drift is throttled to 40ms and skips the frames it did not
move on, because repainting 9216 cubes to draw them where they already are is
the whole cost of an animation nobody asked for. It yields to a hidden tab,
to `prefers-reduced-motion`, and to `snap.on` -- drifting away from face on
would undo the one view the reader asked for by name.

## Which document owns what

**Seven documents, one home per fact.** They drifted once -- five copies of the
prerequisites, three different local-run commands, two incompatible
vocabularies -- which is why the ownership table exists and why the local-run
command, still written in six places, no longer carries a package list that can
drift: the list is the generated `notebooks` group.

## How a notebook looks

**Notebooks 00 and 12 name their CI cells.** Notebook 12's core path tells the
student "Exit check (5 min). No code required ... Other exercises and
explorers are optional", and that is the real lesson, so the route is not the
thing to bend to suit CI. `ci_cells` answers the separate question of what CI
executes: the setup and the five take-home TODO/solution pairs, and not the
explorer widgets, which are what a facilitator demonstrates, are the
notebook's slowest cells, and one of which renders a base64 WAV big enough to
stall the kernel. Notebook 00 declares one for the same reason at smaller
scale: its route is a written exit answer, and the blanket fallback stood
until it gained a predict-first cell, whose live `Dropdown` and `Checkbox`
made the widget sweep stall for the whole `PROBE_CELL_TIMEOUT` on two runs in
three. `ci_cells` names the six cells the fallback used to pick, which leaves
the predict cell outside every route, where the other thirteen already sit and
where the counterexample in it is gated by `tests/test_teaching_materials.py`
rather than by a kernel. The blanket fallback is now the path nothing takes;
it is kept so a new notebook with no route executes something sensible rather
than nothing.

**Notebooks 16, 17 and 18 name their CI cells too.** They gained predict-first
cells, and a predict cell is a live `RadioButtons` and `Checkbox` -- the exact
pair that made the sweep stall for the whole `PROBE_CELL_TIMEOUT` on two runs
in three in notebook 00. All three took the blanket fallback before this, so
the new widgets would have landed in the sweep. Their `ci_cells` name the code
cells the fallback already picked, minus the predict cell, which leaves the
counterexample gated by `tests/test_teaching_materials.py` rather than by a
kernel -- where the other sixteen already sit. Notebook 16 holds one more cell
out: `p16-stepper` is a frame stepper, and the rule everywhere else is that no
route runs one. The fallback had been running it, network and all, which is
the bug this fixes rather than a cost it pays.

**The widget sweep silences the display publisher.** `widgets.interactive_output`
runs its callback inside an `Output` widget, whose `__exit__` hands the
traceback to the frontend and returns `True`, so a broken callback leaves a
clean cell and total silence; the runner patches that `__exit__` before the
route runs, then drives controls to the far end of their range and reports
what was swallowed. It is a sweep, not a proof: a notebook with four explorers
is sampled. It silences pyplot and the display publisher underneath it, and
that second one is not tidiness. A large payload leaving an `Output` widget
makes nbclient wait out the whole cell timeout: display the same bytes straight
from a cell and 1 MB is instant, but route them through `interactive_output`
and anything past roughly 200 KB stalls. Notebook 12's audio explorer is
exactly that, which is why only the sweep tripped it and why the job once went
red there. Silencing the publisher rather than the name `display` is what
works: a callback resolves `display` from the namespace it was defined in, not
the probe's. The frame stepper renders into a `widgets.Image`, never an
`Output`, for the same reason, and is in no route because its every change
ships a PNG.

**Why the styling rules are what they are.** Colab strips a `<style>` block
from a markdown cell, so a stylesheet would silently do nothing; GitHub renders
`.ipynb` but strips the `style` attribute itself. Every rule in that section
follows from one of those two facts. The predict-first cells' `<style>` block
is the exception because it ships in the cell's output, the path pandas' own
`Styler` uses, and ipywidgets exposes no way to set the space between radio
options from Python. `\mathrm{ndim}` rather than `\texttt`: MathJax spaces
`\texttt` as though each letter were a variable, so `ndim` comes out as
"ndi m", and `\text{\texttt{...}}` is worse -- text mode does not define
`\texttt` and the macro ships to the reader literally.

## No commits on main

**Three guards, and the ruleset is the boundary.** Deciding which repository a
shell command will commit into is not decidable in general, so the Claude hook
is an early, explanatory failure rather than the line. Requiring the
`notebooks` check is the deliberate half: it executes real kernels against the
live datasets, so a dead URL or a PyPI outage blocks merging rather than only
reporting, because a notebook that no longer runs is the one failure a student
meets first. No approving review is required because a two-person workshop
would stall on it; the PR itself is the gate.

## Commands and checks

**Check 13 is numbered 13.** It compares the shape of the two handbooks --
heading counts, table rows, the notebooks each links -- because AGENTS.md
requires them to change together and nothing else verifies it. It is numbered
13 because the numbers are a contract AGENTS.md refers to, and inserting it
where it reads best would renumber three others. It catches a heading added to
one side only; it cannot catch wording, which is the half that actually
drifts, and its docstring says so. Since 2026-09-18 it also compares the
fenced code blocks byte for byte: code and identifiers stay English on both
sides by rule, the 44 blocks were already identical, and nothing had been
checking it.

**Check 4 looks at notebook-to-notebook links and embedded images** because a
notebook reaches `docs/` as a verbatim copy rather than a rendered page, so
nothing else looks at those, which is how notebook 01 spent months linking two
files that had never existed. Ownership rather than a count for the cube
animations, because a count stopped being the useful question the moment a
notebook carried two, and because the likeliest mistake by far is a cube cell
copied between notebooks with the number left alone.

**Checks 11 and 12 only print a TODO.** Both cover material that is pasted in
after the page exists -- Kahoot join URLs, companion exports -- and CI must not
go red in between.

**ruff, with a small rule set.** Twelve thousand lines of Python had no linter
or formatter until 2026-09-17; the first run found nothing worse than unsorted
imports, a few unused names and two ambiguous variables, which is the argument
for keeping the set small: errors, unused names, import order, bugbear and
outdated syntax. E501 is off because the formatter sets the code width and a
long comment is not a defect; B905 is off because `zip(strict=)` is a runtime
change, not a spelling.

## Commands and checks: the browser check

**axe audits the pages and the widgets, not the decks, and allowlists by
element.** The first run (2026-09-18) found four rules over 120 nodes. Two
were ours and are fixed: the Okabe–Ito axis hues as 12–14px text in the
visualizer ran from 4.2:1 down to 1.8:1 (orange), so text now takes a
`--axN-ink` shade per theme while cubes keep the hue; and the notebook table's
grey file names sat at 4.47:1 inside `<code>`. Two are Quarto's search box,
which quarto-search.js renders after load with an unnamed button and combobox;
patching that DOM from an include would have to be re-checked on every Quarto
bump, so those two elements are allowlisted by selector, not by rule -- a
listed rule still fires on any other node. The decks are out because Reveal's
hidden-slide DOM is its own; the pass is for our pages, and adding the decks
would mean deciding what of Reveal's to ignore before seeing anything of ours.

## Publishing

**`docs/` was committed, once.** While it was, CI had to prove the committed
copy still matched a fresh render, and could not do it byte-exactly: Quarto
compiles the theme SCSS at render time and names it by content hash, and that
compilation differs between macOS and ubuntu-latest at the same pinned
version, so `scripts/compare_render.py` normalized the hashes away and
compared the rest. It walked `*.html` only, which left `docs/notebooks/` --
copied verbatim rather than rendered -- with no gate at all, and it went stale
twice, once to nine notebooks at a stroke. Both the script and that whole
failure mode are gone: there is no committed copy to drift, because the site
is built from source on every deploy. That retired a gate rather than
replacing one, and it is why check 2 is narrowed to what a fresh render can
still get wrong.

**The lightbox is opt-in.** A bare `lightbox: true` is auto: it wrapped every
image on the site in an `<a class="lightbox">`, which put an anchor between the
`<p>` and the `<img>`, so the figure rules in `custom.scss` stopped matching
and the handbook's four figures fell back to 766 px against the left margin.
Written as a mapping without `match: auto`, the filter only wraps an image that
carries `.lightbox`.

**The handbook figures are boxed on the prose measure.** They were
`{.column-page}`, which let each one out into Quarto's page grid; with the
table of contents open that grid is asymmetric, so on a laptop every figure
sat off to the right of the text it illustrates. The 46rem box costs label
size on the widest figures, which is what their `.lightbox` is for.
