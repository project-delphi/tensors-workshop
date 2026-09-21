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
hand-written. Five resolutions: 4 px is what a stride table can be read from and
what a value printed on each cube fits, 16 px is where a photo first reads as
one, and 64 px is the ceiling. Centre-crop to a square, then Pillow's BOX
filter, so the bytes do not depend on which matplotlib is installed.

32 px was the ceiling until the mesh stopped being the thing that decided it.
The number that ends the list is the JSON's: 4 px through 64 px is 170 kB of
decimal bytes and 128 px alone would be four times that again, which is more
than the widget is worth on a phone. 64 px earns its place because it is where
the reveal stops being a demonstration and becomes a photograph -- snap to
2-D at 32 px and the astronaut is a shape, at 64 px she has a face -- and the
whole argument the page makes is that the bytes under a shape are a real
image.

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

## The widgets

**The reader can add a photograph, and it is not an upload.** The batch takes
a fourth slab from a file the reader picks, built into exactly the record
`photos.json` ships -- an id, a name per language, one HWC uint8 array per
resolution -- so `makeSource()`, the image strip, the channel colours and the
code log go on treating the batch as a batch and none of them learns it is
there. Nothing crosses the network: `<input type=file>` hands JavaScript the
bytes, the decoding, centre-cropping and shrinking are canvas work on the
reader's own machine, the photo lives in `PHOTOS` and closing the tab deletes
it. It is decoded through an `<img>` rather than `createImageBitmap`, which
is what applies the EXIF rotation -- a photo straight off a phone is on its
side otherwise -- and shrunk by halving rather than in one `drawImage`,
because the long jump is the case browsers resample worst and a 4000 px photo
came back aliased, which at 8x8 is the whole picture.

`data-photos` still says three. It is what `check_navigation.cjs` reads to
know the fetch landed, and a fourth photo that was never in `photos.json`
would make one attribute answer two questions and neither of them cleanly;
the reader's photo is `data-uploaded`.

**three.js is vendored.** The widget shipped pointing at
`three@0.169.0/build/three.min.js`, a UMD build that has not existed since
r160, so the request 404'd and every reader got the isometric canvas under a
message blaming their WebGL; and because `check_navigation.cjs` aborts every
off-origin request, that check could never have caught it. Same-origin, it
loads, and the check asserts `THREE.REVISION`.

**The three.js addons are vendored unmodified, and a static import map
resolves `three`.** The projection & SVD stage needs the post-processing
composer, the bloom pass and the CSS2D label renderer, which are
`examples/jsm` modules rather than part of the core build -- eleven files once
their own imports are followed, `MaskPass` and `RenderPass` among them because
`EffectComposer` imports them whether or not the widget asks. Every one says
`import ... from 'three'`, and a browser resolves a bare specifier with an
import map, a bundler or nothing. Rewriting the specifier in eleven files was
the alternative, and it would have made the README's SHA-256 column describe
files that are no longer what upstream ships -- which is the only thing that
column is for. A boot module re-exporting the core build is not a substitute:
a bare specifier stays bare however the file beside it is named. So the map is
static and in `<head>` (one per document, and it must precede the first module
resolution), and it fetches nothing until an import resolves, which is what
lets `bootGL()` stay lazy and keeps three.js off the homepage hero. The map is
element content rather than an attribute, so `check_links.py`'s harvest cannot
see it, and `repo.widgets` is the only thing that would notice an addon
missing from `docs/` -- which is why `check_navigation.cjs` now asserts
`#stage.dataset.gl`, not just that the page rendered.

**The hero's unopened tabs hold their URL in `data-src`, because
`loading="lazy"` is a no-op on a hidden iframe.** A browser does not defer an
iframe it cannot see -- `display: none` is what a tracking pixel looks like,
so it loads eagerly whatever `loading` says. With three tabs that meant every
visitor paid for all three widgets, the stage included: its page, its two
plain scripts and all eight scene files, then every scene's `init()`. So every
panel carries `data-src` and the tab script assigns `src` when the panel is
really on screen -- the open tab, and nothing at all under reduced motion or
at 540px, where `homepage.scss` replaces the whole row with the static
diagram and the reader least able to spare a widget was being sent one. A
`change` listener on that same media query hands the open tab its widget if a
window is widened back. The assignment happens once --
assigning it again on a second visit to the tab would reload the widget and
throw away whatever the reader had set up in it, so the attribute is removed
once spent. `check_navigation.cjs` reads `src || data-src` for the URL check,
pins that exactly one frame has a `src` at rest, and loads the page again at
390px to pin that none does behind the diagram.

**Bloom and `setViewport` cannot share a chain, so the SVD portal renders
direct.** `EffectComposer` runs every pass as a full-screen quad over its own
render target and `Pass` has no scissor, and `setRenderTarget()` resets the
viewport to the target's full size -- so the portal's two viewports and the
bloom pass are mutually exclusive through one composer. Two composers with two
targets and a manual blit would buy glow on a frame whose content is a circle
and an ellipse. Bloom was already gated per step, for reduced motion and for a
frame budget, so this is one more gate: steps that are one camera render
through the composer, the portal renders direct, and its arrows carry emissive
colour instead.

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
accident. `pointerenter` stops the drift; `pointerleave` schedules its return
0.3 seconds later. Both are bound to `.stagewrap`, not to `#stage`: the legend,
the snap button, the arrange pair and the gizmo are *siblings* of `#stage` that
sit absolutely over it, so on `#stage` the pointer crossing onto a control was
already a leave -- it armed the resume timer, the control's own `dropDrift()`
cleared it, and the sway never came back. The wrapper is the same box as the
stage, and it is the reader's idea of being on the widget. The keyboard is held
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
the stage is not. That is why the drift's state machine sits in
`tensor-core.js` beside the stride arithmetic rather than in the HTML with the
rest of the widget's state: the browser check watches the stage move, stop and
move again, and every one of those still happened while the tensor was
shrinking a little on each pass. A state in and a state out is a thing
`tests/tensor_core.test.cjs` can pin, and it pins the ratchet directly -- forty
crossings, origin unmoved.

It rides `tick()`, the one `requestAnimationFrame` loop the page owns, as a
third source of motion beside the snap glide and the reshape tween, rather
than the second loop `startEmbed()` runs. A glide or a tween still paints
every frame; the drift is throttled to 40ms and skips the frames it did not
move on, because repainting every cube to draw it where it already is is the
whole cost of an animation nobody asked for. The frames it does paint stopped
rewriting the instance buffers when 64 px arrived: a drift, a drag and a zoom
all move the camera and not one cube, and re-composing 49152 matrices and
re-parsing 49152 colour strings to report that nothing had moved was what a
full batch at the new ceiling spent its time on. `syncGL` now holds the list
it last uploaded and compares by identity, which is the right test rather than
a cheap one -- `buildVoxels()` returns a fresh array whenever anything a cube
shows changes, and `drawList()` returns a fresh one on every frame of a tween,
which is exactly when the buffers do have to be rewritten. It yields to a hidden tab,
to `prefers-reduced-motion`, and to `snap.on` -- drifting away from face on
would undo the one view the reader asked for by name.

**The projection & SVD stage turns too, and its two panes turn together.** It
rendered two scenes through three.js and pinned both to a fixed camera: step 1
built a glass plane, a residual and a right angle in three dimensions and then
showed one unmovable view of them, and step 8 drew a circle and an ellipse
through two orthographic cameras aimed straight down, which is a diagram drawn
with a GPU. So the stage took the visualizer's bargain -- it sways until a
reader reaches for it, and is theirs the moment they do -- with the same
gates (`prefers-reduced-motion`, a hidden tab, `pointerenter`, `:focus-visible`
and `pointerleave`) so that a reader who has met one widget has met both.
The visualizer's pause before the sway returns is its own; this stage picks up
the moment the pointer leaves. Four things here are this stage's own.

*One frame, and no roll.* Azimuth turns about world +Y, elevation lifts above
the horizon, and the camera's own up stays +Y, for both scenes. The portal was
built first with up along the plane its circle lies in, which is the natural
frame for a turntable and the wrong one for a picture: a drag rolled both panes
in their own plane, the labels leaned, and the tilt that was supposed to give
the step depth was the one thing the gesture could not reach. Under one frame
the portal is a card being tipped instead, which is why it is also the scene
that clamps *azimuth* -- past a quarter turn a reader is reading two planes
from behind, where the picture is mirrored and every label on it is backwards.

*The drift lifts, it does not breathe.* The visualizer's second axis of motion
is a zoom that only ever pulls out, bounded by what stays in frame. Here the
framing is fitted to sigma_1 and a breath that pulled *in* would crop the
ellipse the step exists to show, so the second axis is a small rise in
elevation, which can only ever flatten against `elMax`. Everything else about
the machine is the one in `tensor-core.js`, constants aside, down to seeding the
origin once and banking the phase across a pause: the ratchet that walked the
visualizer's tensor smaller on every crossing would have walked this camera
upwards instead, and `tests/linalg_core.test.cjs` pins forty crossings the same
way.

**The stage owns plain wheel zoom.** This reverses the entry above: with the
zoom buttons in the bar, the wheel over the frame now changes its camera
distance, and scrolling beside it still navigates the steps. Ctrl/command-wheel remains the browser's
page zoom. Visible instructions explain that boundary, and buttons and `+`/`-`
provide alternatives. `check_navigation.cjs` checks both frame zoom and page
scrolling outside it. Hover pauses a shared scene clock as well as camera
drift, so entrances and transitions resume from the frame the reader left.
Each step also exposes presets for its own mathematical experiment; Reset
example restores its controls, while Home view only restores the camera.

*Both render paths take the camera from `orbitEye`.* The flat SVG fallback
already derived its screen basis from the GL camera rather than building an
isometric one -- isometric looks down (1, 1, 1), which is very nearly the
direction this housing data lies along, and the figure collapsed into a few
pixels. Now that the camera moves, that derivation is what keeps the promise:
the fallback turns under the same drag and shows the same view, so `#stage`
carries `dataset.cam` and the browser check asserts rotation as numbers in
whichever renderer the runner gives it.

**The stage cleared to a colour it was never asked for, and one value cannot
fix it.** `setClearColor` was handed `new THREE.Color(css("--stage"))` once at
init, and this widget clears in two different places:
`getUnlitUniformColorSpace()` clears a bound render target in the working
(linear) space and the canvas in the output (sRGB) one, so step 1 through the
composer and the portal rendering direct need *different* values. With
`--stage` at #101826, measured off the drawing buffer: the composer cleared to
#47566c unconverted and #101826 converted; rendering direct it is #101826
unconverted and #010205 converted. So step 1 shipped a washed-out lavender, on
the one widget whose CSS says in as many words that the stage is dark *because
glow needs a dark ground*, and the first attempt at a fix -- one converted
colour for both -- simply moved the error onto the portal, where a code review
caught it.

Two things are worth keeping from that. The bug survived as long as it did
because there is nothing on screen to compare the canvas against: it covers the
element whose background it is supposed to match. Putting a `var(--stage)`
swatch on top of the canvas shows it immediately, and reading the pixel back
out of the drawing buffer settles it in numbers. And the reasoning about which
space three.js converts in runs both ways depending on where you stop reading
the renderer -- the pixels do not, which is why `STAGE` carries both colours
with the four measurements written beside them, and `renderGL()` sets the one
that belongs to the path it is about to take.

**A long line disappeared rather than being clipped.** The frame furniture on a
stage -- an axis drawn well past the visible range so it reads as infinite --
vanished whole instead of running to the edge of the picture. It is not
clipping and no clipping plane fixes it: three.js frustum-culls a `Line` by its
bounding sphere, as one object, and a line whose ends sit 100-odd world units
beyond the frame has a sphere the camera never intersects, so the draw call is
skipped entirely. The fix is to keep frame furniture in world units close to
what the camera holds, which is also the honest picture -- an axis that leaves
the frame was never going to be seen. `frustumCulled = false` and a hand-set
bounding sphere are the escape hatches, for a scene where a long line really is
the subject.

**The browser check polls, it does not wait.** Two assertions after
`page.mouse.wheel` read the stage's `data-*` once, after a fixed
`waitForTimeout` tuned on a Mac. They passed locally on every run and failed on
the Linux runner, where the whole check runs slower and the zoom had not
settled by the time the read happened -- so the assertion saw the pre-gesture
value and the failure looked like a zoom bug rather than a timing one. Every
assertion now goes through `page.waitForFunction` on the attribute, with the
timeout as a ceiling rather than a schedule. `waitForTimeout` is left only
where the wait is itself under test, such as the visualizer's 0.3 s drift
resume.

## Which document owns what

**Seven documents, one home per fact.** They drifted once -- five copies of the
prerequisites, three different local-run commands, two incompatible
vocabularies -- which is why the ownership table exists and why the local-run
command, still written in six places, no longer carries a package list that can
drift: the list is the generated `notebooks` group.

**The stage's scenes are one file each, under a registry.** `linalg-stage.html`
shipped with two steps and a card listing the six still to come, and the two
steps already ran it to 1,774 lines with every scene's GL build, per-frame
render, SVG fallback, readout and both languages' copy interleaved through one
script. Six more in the same file would have been a 6,000-line page in which a
change to the cube meant reading past the portal. So the page keeps only what
is the page's -- layout, the step machine, the camera, boot -- and each scene
keeps what is the scene's, in `linalg-scenes/<name>.js`, calling
`LinalgScenes.register()` with a pose, its EN/ES copy, `build`/`render`,
`flat` and `readout`. `linalg-kit.js` holds the drawing every scene shares,
arrows, labels, the bracketed column vectors and the axes, once for three.js
and once for the SVG, so the two render paths take their furniture from one
place. Plain scripts, not modules: they work from `file://`, and the page's
lazy `bootGL()` still decides whether three.js is fetched at all. Each file is
in `repo.widgets` because a scene missing from `docs/` is not a broken link
the harvest would see; it is a page that throws at boot.

**The stage is black in every theme, and its labels are Computer Modern.** The
stage was dark-per-theme -- `#101826`, `#0a0a1a`, navy -- with sans-serif label
chips, and it looked like page furniture. The look the stage now takes is a
Manim frame, which is black with thin tick-marked axes and Computer Modern
labels, and a frame is a picture: it does not change colour with the page around
it, so one black serves all three themes, and one set of stage colours measured
against it serves all three. The chip under every label is still opaque, for
the reason it always was -- axe cannot resolve contrast over a `<canvas>` and
reports "incomplete" -- but it is the stage's own black, so it is measured and
not seen. The font is vendored (`interactive/vendor/cmu-serif/`, SIL OFL) for
the reason three.js is: `check_navigation.cjs` aborts off-origin requests, so a
CDN font would test as Times on the runner and nothing would say so.

**The SVD portal is step 4, and the eigenvectors are section 08's.** The
stage shipped with the portal last, as the destination, and the condition
number, the collinear walk and the float32 collapse all said "singular value"
and "κ" from step 3 on -- a reader working in order met the vocabulary five
steps before the picture that defines it. The determinant step, a section 07
idea, sat between two section 09 steps, and the eigenvector step was badged
09 though it is section 08's power iteration that teaches it. So the order is
now the story the page's own lead tells: what least squares draws (07, 07,
07), what the SVD says (the portal, the ellipsoid, the eigenvectors), then the
two failures. Steps are linked by scene name (`#portal`) rather than number
so the next reorder does not break a notebook.

**The pictures are not numbered steps.** The stage shipped saying "Step 5 of
8" in the bar and "Step 5 · section 09" over every heading, and the bodies
referred to each other by number ("step 3's collapse"). Eight numbered things
read as one procedure, and a reader looked for what step 5 did with step 4's
result; but projection, the pseudoinverse, the determinant, the SVD, the
condition number, eigenvectors, collinearity and rounding are separate ideas
that meet in one problem, in three groups. So the kicker names the concept and
its section, the bar counts "5 of 8" with no noun, the sidebar heads the three
groups (what least squares draws, what the SVD says, where the arithmetic
fails) through a `part` a scene registers, and a body names another picture
by its concept or as the previous one. Section ids, `data-step` and the
`#step-N` hashes are unchanged: nothing a reader sees says them, and the
notebooks link by name. The same review found the four later bodies opened on
the formula (κ = σ₁ ⁄ σ₃, (1 − t) I + t A) before saying what it meant, so
each now leads with the concrete failure and a number -- an error of 0.001 in
b along a direction A shrank to 0.01 comes out as 0.1 in x -- and its predict
question asks for that number, which the readout then computes.

**Step 1 opens with the gap at four times its length.** On the real housing
rows the residual is 8% of `|ŷ|`. Drawn true, `y` sat on top of `ŷ`, the
dashed residual was a smudge, the right-angle mark existed only in the flat
fallback, and the copy called that angle "the definition". The picture could
not show its own claim. The slider already scaled the residual, so the step
opens at ×4 with the label saying so and the readout keeping the real `‖r‖`;
sliding to ×1 shows the fit as it is, and to 0 puts `y` in the plane.
Nothing about `β` depends on the scale, which is the claim. The plane is
ruled on an orthonormal basis of itself rather than along the two columns,
because those columns are 21° apart and the parallelogram they span is a
needle from every angle.

**The condition-number step is a sphere, not a cube.** The cube's three
`σᵢuᵢ` arrows were indistinguishable inside a green blob, and a
parallelepiped has no obvious "proportion". A unit sphere through `A` is an
ellipsoid whose semi-axes *are* `σᵢuᵢ`, `κ` is visibly its longest axis over
its shortest, and it is the portal's circle-into-ellipse one dimension up,
so the reader has just seen it. The ghost sphere stays behind it as what went
in. Volume × `det A` still holds, and the readout says so.

**Every step asks before it tells.** The notebooks are built on predict-first
cells; the stage explained first and then said "watch", and its readouts were
`key = value ← comment` lines that read as a debugger's. Each step now opens
with one question the reader commits to before touching the slider, the
stage carries the claim as a line of maths on a title card, and the readout
answers the question in a sentence with the numbers in it. Sliders take the
colour of the thing they move, show their value, and brighten it while
dragging; nothing a slider moves snaps; and a step plays its entrance once --
`y` rising off the plane, the circle inflating into the ellipse -- so the
picture arrives as a change, which is what a picture of a change should do.

**Step 8 fails in float32 for real, not on a threshold.** The step's claim is
that a number format can make two different columns the same, and the first
draft made the point with a "glitch" once the angle fell under a chosen cutoff.
That would have broken the page's own rule -- every number computed, nothing
drawn to a stored answer -- on the one step where the honest version is also
the better picture. So the columns go through `Math.fround`, which is IEEE
round-to-nearest, the SVD of the rounded pair genuinely returns σ₂ = 0, `cond`
genuinely returns `Infinity`, and an unguarded 2 x 2 Cramer solve genuinely
divides by the zero determinant and hands back `NaN` -- which is what the
overlay prints. Two things had to be true for that to happen on a slider. The
basis pair sits at 45° in the floor, because float32 keeps *relative*
precision: two columns split only in a component near zero would never round
together. And the scene is drawn in ulp units, one world unit per float32
spacing, because drawing it at true scale would put the GPU's own float32
through the same failure and the picture would shake.

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

**The voice stage opens in three.js and keeps its spectrograms on a 2-D
canvas.** The page's first sentence had been "a voice is a list of numbers",
and nothing on it showed that: every scene began with `x[n]` already an
array. The three scenes that now open it -- sampling, quantization, the array
-- are the one picture in the workshop that needs depth, because the lesson
is a wave that looks continuous from far away and turns out, close up, to be
beads on a ruler with nothing between them; a flat waveform zoom shows the
beads but not the dissolve. So those three draw in three.js, through the
projection stage's vendored modules and its import map, booted lazily on the
first of them shown, and each keeps a 2-D twin drawn from the same slice for a
reader without WebGL and for the runner. The spectrogram scenes stay on the
canvas: a (513, 465) matrix is an image, and three.js would make it a worse
one. Tabs stay tabs -- a scene that plays sound still needs its transport
under the hand rather than under the scroll. The camera is `linalg-core`'s
orbit rather than a second one, for the reason that module exists: an orbit's
clamps and a drift's origin are invisible in a screenshot, and one pinned
machine is better than two.

**The audio stage became a scroller, and grew the two pictures between a
waveform and a matrix** (2026-09-21). It had been five tabs, and the reader's
verdict was that the page did not teach: the input, the transforms and the
effect of each control were not separable, and "window and hop" and the
transform itself were words in control labels rather than things on the
stage. Tabs were chosen so a scene that plays sound could keep its transport
under the reader's hand rather than under their scroll position; that
constraint is real, and it is met by putting the transport in the sticky
column beside the stage, which is where it should have been. So the page is
now the projection stage's shape -- a section per picture, three part
headings, predict-first over the controls -- and the two missing pictures are
in it: one frame with its window, and the transform of that one frame. The
second of those is where the page can finally say why a spectrogram has 513
rows rather than 1 024, because it draws the mirror half and greys it out.

**The sound swaps under a moving control rather than stopping.** A stage whose
whole claim is that these numbers are audible cannot make a reader press Play
again to hear what a slider did; the comparison they need is *this rate versus
that rate at the same moment of the same word*. So a control moved mid-play
re-renders what the scene plays and restarts it at the offset the old one had
reached. Two things make that safe rather than glitchy: the swap is debounced,
because the hop scene's `audio()` inverts a whole spectrogram, and every
source is generation-tagged, because the outgoing source's `onended` fires
after its replacement has already started and would otherwise report the
transport idle while sound was coming out of it.

**The timeline belongs to the frame, and it is what lets a picture zoom in.**
Every scene on this page is a window onto one array, and none of them could
show both the window and the array: the hop scene drew the whole recording,
where one window is three pixels wide and the overlap -- the single thing that
picture exists to teach -- was invisible. One strip under the stage, drawn by
the frame, carries the global view for all seven: the waveform, a band for
what the picture above is looking at, and the playhead. The hop scene then
draws five windows' worth of samples, where the humps cross at half height and
the overlap is simply there to see.

**The third recording is synthesised rather than vendored.** The voice and the
beat are both broadband, and on a first reading every picture on the page is a
haze: 513 bins of speech is a wall, and a spectrogram of it is weather. A
440 Hz tone makes each picture show exactly one of the thing it is about --
one peak, one horizontal line, one stripe after a transpose -- and it costs
nothing to ship, because it is six lines of arithmetic at exactly the voice's
length and rate. A reader who has seen what one tone does to each picture can
then read the voice.

**The stage ships two recordings and takes a third from the reader.** The
sampling and quantization scenes want transients -- a kick thinned to 3 kHz
and crunched to 3 bits is the lesson you can hear -- and the voice has few.
The second clip is a CC0 reggaeton loop from Freesound, cut to exactly the
voice's 237 568 samples so that every shape on every scene is the same for
either and the readouts never carry a second set of numbers. A commercial
record was asked for and declined, however short the clip: this repository
and its site are public, and a copyright question is not worth three seconds
of any song. The drop zone is where such a file goes -- decoded in the page
through an offline context at 48 kHz, so no autoplay policy applies and no
live `AudioContext` exists until Play is pressed, capped at 8 s, and never
committed or uploaded. A decoder resamples silently and does not report the
file's own rate, so the label says "decoded at 48 kHz" rather than pretending
to know.

**Check 4 looks at notebook-to-notebook links and embedded images** because a
notebook reaches `docs/` as a verbatim copy rather than a rendered page, so
nothing else looks at those, which is how notebook 01 spent months linking two
files that had never existed. Ownership rather than a count for the cube
animations, because a count stopped being the useful question the moment a
notebook carried two, and because the likeliest mistake by far is a cube cell
copied between notebooks with the number left alone.

**A remote that cannot be reached skips the route instead of failing it**
(2026-09-19). Twelve of the nineteen notebooks fetch a real dataset, unmocked,
because Colab is the runtime that gate defends. The cost had been that someone
else's bad day turned the job red. Chicago's portal is the worst of them: it
answers 503 for minutes at a time -- it was doing exactly that when this was
written -- and rate-limits anonymous requests outright, which is why notebook
15's `fetch_crime` already retries three times and then apologizes in two
languages. That apology was the whole remedy, and it was not one: `s15-03`
binds `T`, so the cell could not simply catch and carry on the way the GIF
steppers do; everything below it would `NameError`.

The line is a *transport* failure versus an answer. 404, 403 and 410 are
answers -- the host is up and says the resource is not there, is not ours, or
is gone -- and a dead dataset URL is the single thing this script's docstring
names as its reason to exist, so those still fail. So does a 500, which is far
more often the host answering about the *request* -- a renamed column or
malformed SoQL -- than a host that is down. A 502, 503 or 504, a 429, a refused
connection, a DNS miss, a timeout or a body that dies partway are not answers,
and there is nothing in the notebook to fix. `UNREACHABLE` matches the
exception *text* rather than the type because the fetch cells wrap the cause in
`raise RuntimeError(...) from error`, which leaves the 503 alive only in the
middle of the chained traceback.

Every alternative is anchored to the shape of an exception *summary* line, and
a review of this change is why. An IPython traceback echoes the source of every
frame it passes through, so a bare `\bURLError\b` matched a cell hardened to
`except urllib.error.URLError` -- and a real 404 through that cell was read as
a transport failure and shipped green, which is the exact thing the gate is
for. The probe is excluded from the scan for a related reason: it raises one
`AssertionError` holding every swallowed widget error joined together, so a
transport failure in one explorer could have carried a real bug in another out
of the report with it.

A skipped route returns early rather than warning and continuing, because
`allow_errors=False` already halted the kernel at that cell: every cell after
it has no output, and its `EXPECTED` lines would assert against an empty
string. The `EXPECTED`-staleness check moved above that return so it keeps
holding on the days the portal is down -- it is static and needs no kernel.
The summary names every skipped route, says in as many words that it went
unchecked, and stops claiming "All notebook routes executed cleanly", so the
one way this gate reports less than usual is never something a reader has to
infer.

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

**The widgets share one frame, and the way out of an embed is one button on
the hero.** Each widget shipped as a self-contained page with its own `:root`
palette, base rules, header, panel and button styles -- four copies that had
already drifted: two pages linked back to the notebooks, two linked nowhere;
the wrapper was 72, 110, 96 and 96rem; focus rings were 2px on two pages and
3px on the others; the paper palette was the widgets' own and matched nothing
else on the site. And the "Open the full widget" link lived inside each
iframe's caption, so on the homepage it sat wherever that widget's caption
put it, and moved with every chip. `interactive/widget-chrome.css` now owns
the frame (2026-09-20): the site's palette from `custom.scss` on three
themes, the type, a `.site-nav` with the home and notebooks links first on
every page, the header, the panel card, the default control, and the chrome
embed mode strips; each page links it first and keeps its accent and its
stage. The homepage hero grew a single `.hero-open` button at the end of the
tab row, retargeted by the tab script from the open panel's `data-open`, and
the caption inside the frame lost its link. Every accent was re-measured
against the new surfaces (the lightest light-theme surface is brighter than
the paper it replaced, so every light accent gained contrast; the dark
surfaces are within 0.4% luminance of the old ones), and the browser check
now asserts the home link per language, the button per tab, and no link in
any caption.

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
