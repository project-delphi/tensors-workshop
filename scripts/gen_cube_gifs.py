#!/usr/bin/env python3
"""Draw three or more small numbered cubes per notebook, doing what it teaches.

    uv run --group figures python scripts/gen_cube_gifs.py

A fourth image generator, and like the other three it is **not** in the CI
regenerate gate: it needs matplotlib and Pillow, which the `render` job does not
install. It is deterministic, so `git status` after a run is the staleness
check.

WHY THIS IS NOT IN gen_figures.py
---------------------------------
That module's contract is that every figure is built from an array a
participant actually touches -- `camera()`, `load_digits()`, the storm clip, the
taxi CSV -- so the numbers printed on a figure are the numbers the exercise
prints. These cubes are `np.arange`. Filing them under that docstring would
make it a lie, so they get their own module and their own rule:

    the numbers here are INDICES, because index arithmetic is the whole lesson.

A cube of real pixel values would show the operation happening to numbers
nobody can follow. `T[1, 2, 3] == 33` can be checked by eye, and being able to
check it by eye is the entire reason the picture exists.

THE ONE EXCEPTION, AND WHY IT IS NOT A CRACK IN THAT RULE
---------------------------------------------------------
`planes` takes `cell_colors`, and the RGB scenes fill a cell with the colour it
actually is. That is real colour, so it needs saying why it is not real data.

The swatch those scenes draw is 3x4 pixels of flat, saturated colour -- pure
red, green, blue, yellow, white, mid-grey -- and every channel value in it is
0, 128 or 255. So the rule above still holds exactly: a reader looks at a cell
that is visibly red, looks at the red plane, and checks that it says 255. That
is the same check as `T[1, 2, 3] == 33`, done with a colour instead of an
index, and it is the only way to show that the three planes of numbers *are*
the picture.

What this is not is licence for a photograph. `gen_figures.py` is where real
arrays go, and `data.astronaut()` through this module would produce three
planes of numbers in the 80s and 90s with nothing checkable anywhere on the
frame. The test a colour scene has to pass is the same one every scene here
passes: can a reader verify one cell by eye, without running anything?

FOUR RULES THE DRAWING FOLLOWS
------------------------------
**No prose on the images.** Every caption is an expression or a shape --
`T[1]`, `(4, 5)`, `axis 0` -- which reads the same in English and in Spanish.
One GIF therefore serves both languages, and there is no second asset to keep
in step with the first. The sentence that explains the picture lives in the
notebook cell, where it is written out in both.

**Every frame is a complete picture, and the loop never ends.** `fig_hero` in
`gen_figures.py` records half of this: Chrome, on reaching the end of a finite
loop, goes back to displaying frame 0, and in a build-from-empty animation that
is the emptiest frame there is -- the banner "sat there showing a single grey
square". So no scene here starts from nothing, and whichever frame a reader's
eye lands on still says something true.

The other half was found by a reader, not by a rule. These shipped at `loop=3`,
and a browser starts a GIF when the image *loads*, not when it scrolls into
view -- so by the time anybody had scrolled down to the cell, fourteen seconds
of animation had already played to an empty room, and what they met was a still
frame indistinguishable from a broken image. A finite loop count cannot be
tuned out of that: any number is a race against how fast somebody scrolls.
`loop=0` is the fix, and the cost it buys back is small here, because
`duration` is slow enough to read rather than to flicker, and the stepper cell
in each notebook is there for a reader who wants the motion to stop.

**A pile of offset planes, not a sheared voxel grid.** This is the idiom the
repo already owns: `gen_figures._cube` draws a tensor as "the pile of matrices
it is -- every slice along the last axis, drawn back to front", and `_stack`
gives the reason -- "an offset pile is what everyone already draws for a
sequence of slices". A true isometric voxel grid was tried first and is worse
here for a reason specific to numbers: unit cubes offset by less than their own
width cannot hide what is behind them without drawing back faces, so a reader
sees three depths of digits at once. Offset planes occlude exactly, because a
whole plane is painted before the one in front of it, and every number stays
axis-aligned and level -- which is the only way a two-digit label survives at
this size. `mplot3d` is not used at all: its depth sorting is unreliable and
its raster output is too soft to read a number off.

**One accent per notebook**, from `gen_notebooks.ACCENTS`, so a cube matches the
notebook it sits in. One palette, in one place -- the same reason
`gen_figures.py` imports its colours from `gen_thumbnails.py` rather than
repeating them.

AT LEAST THREE ANIMATIONS PER NOTEBOOK
--------------------------------------
`SCENES` holds a list per notebook: the first draws the move the section is
named after, the second a move it needs and the first has no room for, and the
third the section's own subject -- its data, or its trap.

That third one is what the floor was raised for. At two, most notebooks spent
both on the move and neither on the material, so scene after scene opened on
the same `np.arange(60).reshape(3, 4, 5)` cube in a different accent: the video
pipeline, the colour images and the Tucker unfoldings were all drawn with the
identical picture. A reader who had met one had met them all. The rule is now
that a notebook's animations must between them show what that notebook is
*about*, and "at least three" is the count that makes room for it.

Every stem keeps the `cube-NN-` prefix, which is what check 1 in
`check_links.py` reads to tell a notebook's own animation from another
notebook's pasted into it -- the mistake a count could never catch, and the
likeliest one, since these cells are copied between notebooks and the number in
the URL is the part you have to remember to change. Note what check 1 does
*not* do: it tests ownership, never a count, so nothing in CI will tell you a
notebook dropped back to two. This docstring is the whole of that rule.

THREE WAYS A SCENE GOES WRONG SILENTLY
--------------------------------------
Fifty animations of four frames is more than anybody re-reads after a one-line
change, and matplotlib reports none of these. `_check_layout` measures the
first two after a draw and refuses the frame:

- The `sub` and `note` captions share one baseline at opposite ends of it, so a
  long pair prints one sentence through the other.
- A pile tall enough for its own shape grows up through the label, because
  `centred` centres on the caption band without asking how much band there is.
- Two `sequence` captions collide under piles too narrow to carry them.

The third it cannot catch, and it is the one to know before writing a scene:
the planes occlude exactly, so `lit` on a cell of plane 1 or 2 highlights
something plane 0 is painted over, and the frame comes out with nothing
visibly selected. Light plane 0, or `hide` what is in front of what you mean.
This one has shipped: `cube-12-recap` lit `T[1]` in a three-deep pile for
months, and what a reader saw was a sliver down the right-hand edge.

A FOURTH, WHICH IS NOT A BUG BUT READS LIKE ONE
-----------------------------------------------
A frame that uses almost none of its canvas. `centred` places a pile but never
sizes it, so a scene written at the default `CELL` and then narrowed to a small
array leaves a stamp in a field of white -- and at 960x540 scaled into a Colab
cell, the numbers stop being legible on a phone before they stop being legible
on a laptop, which is where nobody checks. Pick `cell` to fill the band, and
let `_check_layout` tell you when you have gone too far.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from gen_notebooks import ACCENTS                                  # noqa: E402
from gen_thumbnails import IMAGES, INK, canvas_to_pil, stack, write_gif  # noqa: E402

PAPER = "#ffffff"
MUTE = "#7b8794"

# A ceiling per file, not a target. Flat colour quantizes well and these land
# far below it; the point is that nothing in CI looks at image sizes, so the
# generator has to be the thing that notices.
MAX_KB = 250

# The clear space a frame's two bottom captions must leave between them, in
# pixels at the 960x540 render size. Enough that they read as two captions
# rather than one run-on line.
CAPTION_GAP_PX = 24

# ─── index colours ──────────────────────────────────────────────────────────
#
# One accent per notebook says which notebook a picture came from. It cannot
# also say which axis is which, and in an einsum scene that second question is
# the whole lesson: `ijk,k->ij` is a claim about which index survives. So each
# index letter gets a hue, and the same hue marks that index everywhere it
# appears -- on the axis arrow, on the operand it indexes, and in the caption.
#
# From the Okabe-Ito colour-blind-safe set, and picked to differ in lightness
# as well as in hue. Colour is never the only carrier: every index is written
# out as a letter too, for the reason every Spanish box says ESPAÑOL in words.
INDEX = {
    "i": "#0072b2",      # blue
    "j": "#e69f00",      # orange
    "k": "#009e73",      # green
    "d": "#cc79a7",      # reddish purple
}

# The cube every scene starts from: np.arange(60).reshape(3, 4, 5).
SHAPE = (3, 4, 5)

# Geometry, in figure units. A plane is the (axis 1, axis 2) face -- the one a
# reader reads as an ordinary matrix -- and axis 0 is the pile it is stacked
# along, each plane set back up and to the right of the one in front of it.
CELL = 0.70
# The set-back per plane, as a fraction of a cell rather than an absolute
# distance -- a pile drawn at half size has to lean back half as far, or the
# depth swamps the plane and the pile walks off the canvas.
STEP_RATIO = (0.88, 0.68)
BODY = (1.15, 1.05)      # where a pile starts, clear of both caption lines
BAND_MID = 2.95          # the middle of the space between the two caption lines


def accent_of(n: str) -> str:
    """The notebook's own accent, exactly as `gen_notebooks.accent` picks it."""
    return ACCENTS[int(n) % len(ACCENTS)]


def mpl():
    """matplotlib with Agg and the house defaults, as `gen_figures.mpl` sets them."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    plt.rcParams.update({
        "font.family": "sans-serif",
        "text.color": INK,
        "axes.edgecolor": INK,
        "savefig.facecolor": PAPER,
        "figure.facecolor": PAPER,
    })
    return plt


def _mix(hex_colour: str, weight: float, towards: str = "#ffffff") -> str:
    """`hex_colour` blended `weight` of the way towards white (or black)."""
    a = [int(hex_colour[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(towards[i:i + 2], 16) for i in (1, 3, 5)]
    return "#%02x%02x%02x" % tuple(
        round(x + (y - x) * weight) for x, y in zip(a, b))


def _ink_on(fill: str) -> str:
    """Label ink that survives on `fill`, chosen by the fill's own luminance.

    Every other colour here is a pale wash of an accent, so `INK` reads on all
    of them and the question never came up. `cell_colors` is what raises it: a
    channel plane is filled with the colour it actually is, and `255` in `INK`
    on saturated blue is a smudge. Rec. 709 luminance, thresholded once --
    dark ink above, near-white below.

    Near-white rather than white: a pure `#ffffff` digit on a pure `#0000ff`
    cell buzzes, and the GIF palette is quantized to a shared 48 or 64 entries,
    which turns that buzz into fringing.
    """
    r, g, b = (int(fill[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return INK if (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.55 else "#f6f7f8"


# ─── the canvas ─────────────────────────────────────────────────────────────
#
# Nothing on these images is prose. Every caption is an expression or a shape
# -- `T[1]`, `(4, 5)`, `axis 0` -- which reads the same in English and in
# Spanish, so one GIF serves both languages and there is no second asset to
# keep in step. The sentence explaining it lives in the notebook cell, in both.

W, H = 9.6, 5.4          # inches at dpi=100 -> 960x540
# Axes units chosen 16:9 like the figure, so `aspect="equal"` letterboxes
# nothing and one unit means the same thing horizontally and vertically.
XLIM = (0.0, 9.6)
YLIM = (0.0, 5.4)


def frame(tint, label, note="", sub=""):
    """A blank frame with the caption furniture every scene shares."""
    plt = mpl()
    fig = plt.figure(figsize=(W, H), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(*XLIM)
    ax.set_ylim(*YLIM)
    ax.set_aspect("equal")
    ax.axis("off")

    label_t = ax.text(0.30, YLIM[1] - 0.30, label, ha="left", va="top",
                      fontsize=17, family="monospace", color=tint)
    note_t = sub_t = None
    if note:
        # Bottom right, not top right: the axis 0 arrow runs up into the top
        # right corner on every scene that draws one, and the two collided.
        note_t = ax.text(XLIM[1] - 0.30, 0.22, note, ha="right", va="bottom",
                         fontsize=15, family="monospace", color=MUTE)
    if sub:
        sub_t = ax.text(0.30, 0.22, sub, ha="left", va="bottom",
                        fontsize=13.5, family="monospace", color=MUTE)
    # `render` checks these two for overlap before it keeps the frame. They
    # share a baseline at opposite ends of it, so a long pair silently prints
    # one sentence through the other -- legible in neither language, and
    # invisible to anyone who does not open every file and read every frame.
    ax._furniture = (label_t, sub_t, note_t)
    return plt, fig, ax


# The three axes, when a scene wants them told apart by eye. Same hues as
# `INDEX` and for the same reason -- see the note there about colour never
# being the only carrier.
AXIS_TINTS = (INDEX["i"], INDEX["j"], INDEX["k"])


def axis_arrows(ax, shape, origin=BODY, cell=CELL, names=None, tints=None):
    """The three axis names, each along the edge it actually runs down.

    `names` is a triple of index letters, one per axis, in axis order. Given
    one, each arrow is labelled with its letter instead of `axis N`, which is
    what lets a later frame say "k is gone" and have it mean something a
    reader can see: an entry of `None` drops that arrow entirely, so an output
    frame simply has no third arrow to draw.

    `tints` colours the arrows without renaming them, for a scene that is
    still talking about `axis 0` but needs the three told apart at a glance.
    Passing `names` colours them too, from `INDEX`.
    """
    d, rows, cols = shape
    x0, y0 = origin
    letters = names or (None, None, None)

    def look(pos, fallback):
        colour = tints[pos] if tints else MUTE
        if names is None:
            return fallback, colour
        letter = letters[pos]
        if letter is None:
            return None, None
        return f"{letter} ({fallback.split('(')[1]}", INDEX.get(letter, colour)

    # axis 2 runs across the front plane, under it.
    label, colour = look(2, f"axis 2 ({cols})")
    if label:
        ax.annotate("", xy=(x0 + cols * cell, y0 - 0.26),
                    xytext=(x0, y0 - 0.26),
                    arrowprops=dict(arrowstyle="->", color=colour, lw=1.6))
        ax.text(x0 + cols * cell / 2, y0 - 0.44, label, ha="center",
                va="top", fontsize=12, family="monospace", color=colour)

    # axis 1 runs down the front plane, to its left.
    label, colour = look(1, f"axis 1 ({rows})")
    if label:
        ax.annotate("", xy=(x0 - 0.26, y0), xytext=(x0 - 0.26, y0 + rows * cell),
                    arrowprops=dict(arrowstyle="->", color=colour, lw=1.6))
        ax.text(x0 - 0.40, y0 + rows * cell / 2, label, ha="right",
                va="center", fontsize=12, family="monospace", color=colour,
                rotation=90)

    # axis 0 runs back along the pile, above it.
    label, colour = look(0, f"axis 0 ({d})")
    if label:
        dx, dy = step_for(cell)
        bx, by = x0 + cols * cell + 0.18, y0 + rows * cell + 0.14
        ax.annotate("", xy=(bx + (d - 1) * dx, by + (d - 1) * dy),
                    xytext=(bx, by),
                    arrowprops=dict(arrowstyle="->", color=colour, lw=1.6))
        ax.text(bx + (d - 1) * dx + 0.16, by + (d - 1) * dy + 0.10,
                label, ha="left", va="bottom", fontsize=12,
                family="monospace", color=colour)


def step_for(cell=CELL):
    """The (dx, dy) between one plane and the next, at this cell size."""
    return (STEP_RATIO[0] * cell, STEP_RATIO[1] * cell)


def cell_text(v, decimals=1) -> str:
    """A number as it should appear inside a cell.

    Whole numbers stay whole -- the index cubes are `arange`, and `0.0` where a
    reader expects `0` reads as a bug. Everything else gets one decimal, which
    is all that fits and all a factor matrix needs to make its point.

    `decimals` raises that for the one kind of scene where one is actively
    wrong: a convergence. `cube-08-direction` watches a ratio settle on the
    golden ratio, and at one decimal every frame after the second reads `1.6`
    -- so the picture of something settling is a picture of something that was
    never moving. Three decimals is the smallest that shows the approach, and
    it is a per-scene choice rather than a new default because every other
    scene here would only get wider cells out of it.
    """
    v = float(v)
    if v == int(v):
        return str(int(v))
    return f"{v:.{decimals}f}"


def plane_origin(i, origin, cell=CELL):
    """Where plane `i` sits. Higher `i` is further back: up and to the right."""
    dx, dy = step_for(cell)
    return (origin[0] + i * dx, origin[1] + i * dy)


def extent(shape, origin=(0.0, 0.0), cell=CELL):
    """The (width, height) a whole pile occupies, offsets included."""
    d, r, c = shape
    dx, dy = step_for(cell)
    return (c * cell + (d - 1) * dx, r * cell + (d - 1) * dy)


def centred(shape, cell=CELL, y=None):
    """Origin that centres a pile of `shape` in the band between the captions.

    Vertically as well as horizontally: a one-row vector anchored to the same
    floor as a four-row cube sits at the bottom of the frame with the whole
    picture empty above it.
    """
    w, h = extent(shape, cell=cell)
    return ((XLIM[1] - w) / 2, (BAND_MID - h / 2) if y is None else y)


def planes(ax, arr, *, tint, lit=None, hide=None, ghost=None, labels=True,
           cell=CELL, origin=BODY, label_size=10.0, edge_axis=True,
           lit_tint=None, cell_colors=None, ghost_labels=True, decimals=1):
    """One tensor as its pile of (axis 1, axis 2) matrices, drawn back to front.

    Three masks, each answering a different question about an entry:

    `lit` -- is this frame about it? Lit entries take the accent, the rest go
    pale. `lit_tint` overrides the colour the lit ones take, which is how a
    highlight can carry a meaning rather than only an emphasis: an einsum
    scene lights a fibre in its index's own colour, so that the fibre and the
    vector it pairs with are visibly the same `k`. `hide` -- is it there at all? Hidden entries are dropped, for a slice
    lifted clear of the pile, where dimming is not enough because the reader
    has to see the gap it came out of. `ghost` -- does it exist, or does NumPy
    merely act as if it does? A ghost cell is drawn as a dashed outline with no
    fill, which is the whole of the broadcasting lesson: the picture has to
    show four rows so the arithmetic can be followed, and it has to show that
    three of them were never allocated. Filling them would say the opposite of
    what the caption says, and leaving them out would make the subtraction
    impossible to follow.

    `cell_colors` is the fourth question and the only one not about emphasis:
    *what colour is this number?* Given an array of colours broadcastable to
    `arr.shape`, each cell is filled with its own rather than with the pile's
    one `tint`, and the label ink follows the fill through `_ink_on` so a value
    on saturated blue is still readable. It exists for one lesson: a colour
    image is three planes of numbers, and the only way to show that the red
    plane *is* the reds is to paint it.

    That does not make this a place for real pixel data -- see the module
    docstring. The colours a scene passes here are flat and few, and the
    numbers under them stay checkable by eye. `lit` still dims: an unlit cell
    is washed towards white the same way, so a highlight reads against a
    colour image exactly as it does against an accent pile. `hide` and `ghost`
    still win outright, since a cell that is not there has no colour.

    `ghost_labels=False` keeps the dashed outlines and drops the numbers inside
    them. Whether a ghost's value is worth printing depends on what the ghost
    is *for*, and there are two kinds here. Under broadcasting it is the whole
    point -- `scene_03` has to show the four rows NumPy acts as if it
    allocated, and their values are the arithmetic the reader is following. In
    a padded batch it is noise: the value is zero because nothing was measured,
    and two ghost planes deep the dashed grids interpenetrate and the zeros
    crowd into a tangle that reads as a mistake rather than as an absence.

    `cell_colors` also beats `lit_tint`, and that is worth knowing before you
    reach for both: a scene lighting one channel of an RGB image in its index
    colour would get the index colour dropped, silently, because a cell's own
    colour is a fact about the data and a `lit_tint` is only emphasis. Nothing
    reports it -- `_check_layout` measures geometry, not intent. If a scene
    ever needs both, give the lit cells their own entry in `cell_colors`
    rather than adding a precedence rule here.

    Occlusion needs no depth sort. A plane is painted opaque, and the planes
    are painted from the back of the pile forwards, so a nearer plane simply
    covers what is behind it. The cost is a trap worth knowing before you write
    a scene: `lit` on a cell of plane 1 or 2 highlights something plane 0 is
    painted over, and the frame comes out with nothing visibly selected. Light
    plane 0, or `hide` the planes in front of the one you mean. A ghost cell is the exception a reader wants
    anyway: unfilled, it lets the pile behind it show through, which reads as
    "not really here" without a word of prose.
    """
    import numpy as np
    from matplotlib.patches import Rectangle

    arr = np.asarray(arr)
    if arr.ndim == 2:                      # a lone matrix is a pile of one
        arr = arr[None, :, :]
    d, rows, cols = arr.shape
    lit = np.ones(arr.shape, bool) if lit is None else np.broadcast_to(lit, arr.shape)
    hide = np.zeros(arr.shape, bool) if hide is None else np.broadcast_to(hide, arr.shape)
    ghost = (np.zeros(arr.shape, bool) if ghost is None
             else np.broadcast_to(ghost, arr.shape))
    if cell_colors is not None:
        cell_colors = np.broadcast_to(np.asarray(cell_colors, dtype=object),
                                      arr.shape)

    for i in range(d - 1, -1, -1):         # back of the pile first
        ox, oy = plane_origin(i, origin, cell)
        top = oy + rows * cell
        for r in range(rows):
            for c in range(cols):
                if hide[i, r, c]:
                    continue
                on = bool(lit[i, r, c])
                faint = bool(ghost[i, r, c])
                x, y = ox + c * cell, top - (r + 1) * cell
                own = None if cell_colors is None else cell_colors[i, r, c]
                hot = own or (lit_tint if (on and lit_tint) else tint)
                if faint:
                    ax.add_patch(Rectangle(
                        (x, y), cell, cell, facecolor="none",
                        edgecolor=_mix(tint, 0.35), linewidth=1.0,
                        linestyle=(0, (2.4, 2.0)), zorder=2 * (d - i)))
                else:
                    # A cell_colors fill is the colour itself when lit, not a
                    # wash of it: the whole claim is that this cell IS this
                    # colour. Accent piles keep the 0.30 wash they always had,
                    # which is what stops a whole cube reading as a solid slab.
                    fill = (hot if (own and on)
                            else _mix(hot, 0.30 if on else 0.88))
                    ax.add_patch(Rectangle(
                        (x, y), cell, cell, facecolor=fill,
                        edgecolor=INK if on else _mix(INK, 0.70),
                        linewidth=0.7, zorder=2 * (d - i)))
                if labels and not (faint and not ghost_labels):
                    if faint:
                        ink = _mix(INK, 0.45)
                    elif own:
                        ink = _ink_on(fill)
                    else:
                        ink = INK if on else _mix(INK, 0.55)
                    ax.text(x + cell / 2, y + cell / 2,
                            cell_text(arr[i, r, c], decimals),
                            ha="center", va="center", fontsize=label_size,
                            family="monospace", zorder=2 * (d - i) + 1,
                            style="italic" if faint else "normal",
                            color=ink)
        # The solid left edge marks a plane that is really there, so a plane
        # that is entirely ghosted does not get one.
        if edge_axis and not (hide[i] | ghost[i]).all():
            ax.plot([ox, ox], [oy, top], color=_mix(tint, 0.45),
                    linewidth=1.4, zorder=2 * (d - i) + 1)


def sequence(ax, items, *, tint, cell=0.46, gap=0.42, y=None,
             caption_dy=0.30, size=7.5):
    """Several tensors in a row, with glyphs between them.

    An item is either a string -- drawn as an operator between its neighbours,
    `=`, `x`, `->` -- or a dict with `arr` and optionally `lit`, `hide`,
    `ghost`, `lit_tint`, `cell_colors`, `ghost_labels`, `decimals`, `caption`
    and `labels`. `size` sets the label point size for
    every item at once, which is what a row of same-sized piles wants;
    an item's own `size` still wins where one pile is drawn smaller. Widths come from each pile's own extent, so a tall
    thin factor beside a wide one keeps its real proportions, the way
    `gen_figures._block` does it.
    """
    import numpy as np

    spans = []
    for it in items:
        if isinstance(it, str):
            spans.append(0.62)
        else:
            arr = np.asarray(it["arr"])
            shape = arr.shape if arr.ndim == 3 else (1,) + arr.shape
            spans.append(extent(shape, cell=cell)[0])
    total = sum(spans) + gap * (len(items) - 1)
    x = (XLIM[1] - total) / 2

    # One baseline for every caption, set under the tallest pile. Hanging each
    # caption off its own pile leaves them stepped, which reads as a mistake.
    heights = [extent(np.asarray(it["arr"]).shape
                      if np.asarray(it["arr"]).ndim == 3
                      else (1,) + np.asarray(it["arr"]).shape, cell=cell)[1]
               for it in items if not isinstance(it, str)]
    base = BAND_MID - max(heights) / 2 - caption_dy

    for it, span in zip(items, spans):
        if isinstance(it, str):
            ax.text(x + span / 2, BAND_MID, it, ha="center", va="center",
                    fontsize=20, family="monospace", color=MUTE)
        else:
            arr = np.asarray(it["arr"])
            shape = arr.shape if arr.ndim == 3 else (1,) + arr.shape
            h = extent(shape, cell=cell)[1]
            # Centre each pile on the band between the captions, so a short
            # factor beside a tall one lines up through the middle rather than
            # sitting on a shared floor.
            oy = (BAND_MID - h / 2) if y is None else y
            planes(ax, arr, tint=it.get("tint", tint), lit=it.get("lit"),
                   hide=it.get("hide"), ghost=it.get("ghost"),
                   labels=it.get("labels", True), lit_tint=it.get("lit_tint"),
                   cell_colors=it.get("cell_colors"),
                   ghost_labels=it.get("ghost_labels", True),
                   decimals=it.get("decimals", 1),
                   cell=cell, origin=(x, oy), label_size=it.get("size", size))
            if it.get("caption"):
                t = ax.text(x + span / 2, base, it["caption"],
                            ha="center", va="top", fontsize=12.5,
                            family="monospace", color=MUTE)
                # A caption is centred under its own pile, so two thin piles
                # with wide captions collide however wide the gap between the
                # piles is. `_check_layout` compares these.
                ax._captions = getattr(ax, "_captions", []) + [t]
        x += span + gap
    return


def cube():
    import numpy as np
    return np.arange(60).reshape(SHAPE)


# ─── the colour swatch ──────────────────────────────────────────────────────
#
# Twelve pixels, and every channel value in them is 0, 128 or 255. That is the
# whole of what keeps the RGB scenes inside this module's rule: a reader looks
# at a cell that is visibly red, looks at the red plane, and reads 255 off it.
# A photograph would put 87 there and the check would be unavailable.
#
# Chosen so that no two rows repeat a pattern and every channel takes all three
# of its values somewhere in the image -- otherwise a reader can "verify" the
# red plane by noticing it is the only one with any 255s in it, which is not
# the same as reading the picture.
SWATCH_ROWS = (
    ((255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0)),
    ((0, 255, 255), (255, 0, 255), (255, 255, 255), (0, 0, 0)),
    ((128, 128, 128), (255, 128, 0), (0, 128, 128), (128, 0, 255)),
)


def swatch():
    """The 3x4 colour image the RGB scenes draw, as (H, W, C)."""
    import numpy as np
    return np.array(SWATCH_ROWS, dtype=int)


def _hex(rgb) -> str:
    """An (r, g, b) triple as the hex string matplotlib wants."""
    return "#%02x%02x%02x" % tuple(int(round(float(v))) for v in rgb)


def swatch_hex(img):
    """Each pixel of an (H, W, 3) image as the colour it actually is.

    Shaped (1, H, W) so it lines up with what `planes` draws for a lone matrix
    -- the image is one plane, not a pile of three.
    """
    import numpy as np
    h, w, _ = img.shape
    out = np.empty((1, h, w), dtype=object)
    for r in range(h):
        for c in range(w):
            out[0, r, c] = _hex(img[r, c])
    return out


def clip_frames(n=3, rows=2, cols=3):
    """A tiny colour clip: a bright dot one column further along each frame.

    The same 0/128/255 discipline the swatch keeps -- a flat grey field and a
    pure red dot -- so a reader can still read the red plane and check that
    255 is exactly where the dot is. What it adds over the swatch is *motion*,
    which is the only thing section 05 is about: a clip is not a pile of
    unrelated pictures, it is one picture at several moments, and dropping a
    frame is dropping a moment rather than a slab of numbers.
    """
    import numpy as np
    out = np.full((n, rows, cols, 3), 128, dtype=int)
    for t in range(n):
        out[t, 0, t % cols] = (255, 0, 0)
    return out


def frame_hex(img):
    """One frame of a colour clip as its (1, H, W) grid of colours."""
    return swatch_hex(img)


def channel_hex(values, channel):
    """Each value as the colour that channel alone would show.

    The other two channels zeroed, which is what a single plane of an RGB image
    looks like on its own -- and deliberately the same thing notebook 04's own
    `as_channel_image` helper does, so the animation and the widget under it
    are showing a reader the same picture. Not a colormap: `Reds` runs white to
    red, so a bright pixel comes out dark and the plane reads inverted.
    """
    import numpy as np
    values = np.asarray(values)
    out = np.empty(values.shape, dtype=object)
    for idx in np.ndindex(values.shape):
        rgb = [0, 0, 0]
        rgb[channel] = values[idx]
        out[idx] = _hex(rgb)
    return out


def _check_layout(fig, ax, out_name, i) -> None:
    """Refuse a frame whose furniture and picture do not fit alongside each other.

    Two failures, both silent and both found the hard way. The `sub` line is
    left-aligned and the `note` right-aligned on one shared baseline, so a long
    pair simply prints one sentence through the other. And a pile tall enough
    for its own shape -- a (12, 5) concatenation, say -- grows up through the
    label, because `centred` centres on the caption band without ever asking
    how much band there is.

    Both are measured after a draw, because a string's width and a pile's
    height in pixels are font and geometry questions, not arithmetic ones.

    A hard failure rather than a warning, for the reason `write_gif`'s `max_kb`
    is: nothing in CI looks at these images, so the generator is the only thing
    that can notice. Fifty animations of four frames is more than anybody
    re-reads after a one-line change to a caption.
    """
    from matplotlib.transforms import Bbox

    label_t, sub_t, note_t = getattr(ax, "_furniture", (None, None, None))
    fig.canvas.draw()
    r = fig.canvas.get_renderer()

    if sub_t is not None and note_t is not None:
        left = sub_t.get_window_extent(renderer=r)
        right = note_t.get_window_extent(renderer=r)
        gap = right.x0 - left.x1
        if gap < CAPTION_GAP_PX:
            raise SystemExit(
                f"{out_name} frame {i}: the two bottom captions are "
                f"{gap:.0f}px apart, under the {CAPTION_GAP_PX}px minimum. "
                f"Shorten one of\n"
                f"  sub:  {sub_t.get_text()}\n"
                f"  note: {note_t.get_text()}")

    # Only the cell rectangles, not the arrow patches an `axis_arrows` adds:
    # the axis 0 arrow is meant to run up past the top of the pile, and the
    # label sits clear of it on the other side of the frame.
    from matplotlib.patches import Rectangle
    boxes = [q.get_window_extent(r) for q in ax.patches
             if type(q) is Rectangle]
    if not boxes:
        return
    body = Bbox.union(boxes)
    for name, t in (("label", label_t), ("sub", sub_t), ("note", note_t)):
        if t is None or not t.get_text():
            continue
        if body.overlaps(t.get_window_extent(renderer=r)):
            raise SystemExit(
                f"{out_name} frame {i}: the drawing runs into the {name} "
                f"({t.get_text()!r}). Draw it at a smaller `cell`, or give "
                f"`centred` a `y`.")

    caps = getattr(ax, "_captions", [])
    for a, b in zip(caps, caps[1:]):
        ba, bb = (a.get_window_extent(renderer=r),
                  b.get_window_extent(renderer=r))
        if bb.x0 - ba.x1 < CAPTION_GAP_PX:
            raise SystemExit(
                f"{out_name} frame {i}: the captions {a.get_text()!r} and "
                f"{b.get_text()!r} run together under piles too narrow to "
                f"carry them. Shorten them, or raise `sequence`'s `gap`.")


def render(tint, states, out_name, *, duration=4050, colors=48,
           palette_from="all"):
    """Each state is (label, note, sub, draw) -- draw gets the axes.

    `duration` is per frame, in milliseconds, and one global value rather than
    a per-scene one: a reader who has learnt the pace of one animation should
    not have to relearn it on the next. 4050 ms is deliberately slow. A frame
    here is not a tween -- it is a whole labelled picture with a caption and a
    shape line, and 900 ms was not long enough to read a 60-cell grid once,
    let alone compare it with the frame before. The stepper cell in each
    notebook is the other half of the answer: this sets the pace for a reader
    watching, that one hands the frames over for a reader studying.

    It has been raised three times, every time by watching rather than by a
    rule: 900 ms could not be read at all, 1800 ms could be read only if you
    already knew what the frame was going to say, and 2700 ms was still short
    for the scenes that now draw two piles side by side. A reader meeting a
    scene for the first time has to find the caption, find the pile it names,
    and then look for what moved since the frame before -- three passes, not
    one, and a frame with two piles in it is four.

    Raising it rewrites every cube GIF and changes nothing else. Frame delay
    is metadata, not pixels, so `MAX_KB` is not at risk and no frame is
    redrawn -- which is why this is the cheapest of all the knobs here and the
    first one to reach for.

    `colors` and `palette_from` are the two arguments a scene may legitimately
    override, and a scene drawing real colour needs both.

    48 is ample for flat accent tints -- and note it already buys a 64-entry
    table, because a GIF's colour table is rounded up to a power of two, so
    asking for 96 and asking for 128 cost the same bytes. A colour scene may as
    well ask for 128.

    `palette_from` is the one that bit, twice, and this module now overrides
    `write_gif`'s own default because of it. One palette is shared by every
    frame so the colours cannot shift mid-animation; the question is which
    frames it is read off. Frame 0 alone is fine only if frame 0 already
    contains every hue the animation will use, and two scenes here broke that
    on their first render:

    `cube-04-rgb` opens on twelve saturated pixels and then draws channel
    planes where 128 is a half-bright fill. Off frame 0's palette the dark
    green came out teal and the dark blue came out slate.

    `cube-06-matmul` is the one that shows this is not a colour-scene problem.
    It is drawn entirely in the notebook's pink accent, and its frame 1 lights
    a row and a column in green with `lit_tint` -- an index colour, the thing
    half the scenes in this module use. There is no green anywhere in frame 0,
    so the highlight rendered grey: the frame still said "sum over k" and had
    nothing green in it.

    Both were wrong, both perfectly legible, and nothing would ever have
    reported either. So `"all"` is the default here: read the palette off every
    frame at once. It costs nothing a reader can see -- 48 entries is far more
    than any of these scenes needs -- and `lit_tint` makes frame 0 the wrong
    place to look in any scene that highlights something.
    """
    frames = []
    for i, (label, note, sub, draw) in enumerate(states):
        plt, fig, ax = frame(tint, label, note, sub)
        draw(ax)
        _check_layout(fig, ax, out_name, i)
        frames.append(canvas_to_pil(fig))
        plt.close(fig)
    out = write_gif(frames, IMAGES / out_name, duration=duration, loop=0,
                    colors=colors, max_kb=MAX_KB, palette_from=palette_from)
    print(f"  {out.relative_to(IMAGES.parent)}  {out.stat().st_size // 1024} KB"
          f"  {len(frames)} frames")
    return out


# ─── the scenes, one per notebook ───────────────────────────────────────────

def scene_00(tint):
    """00 — what the three axes are. The cube never changes; the naming does.

    Frame 0 is the finished cube with every number on it, which is the state a
    browser parks on and a perfectly good thing to be left looking at.
    """
    import numpy as np
    T = cube()
    lit_axis = [np.zeros(SHAPE, bool) for _ in range(3)]
    for a in range(3):
        idx = [slice(None)] * 3
        idx[a] = 0
        lit_axis[a][tuple(idx)] = True

    o = centred(SHAPE)

    def whole(ax):
        planes(ax, T, tint=tint, origin=o)
        axis_arrows(ax, SHAPE, origin=o, tints=AXIS_TINTS)

    def face(a):
        # The cut is lit in its own axis's colour, so the highlight and the
        # arrow naming it are visibly the same thing. The caption still says
        # which axis in words: the colour is a second channel, never the only.
        def draw(ax):
            planes(ax, T, tint=tint, lit=lit_axis[a], lit_tint=AXIS_TINTS[a],
                   origin=o)
            axis_arrows(ax, SHAPE, origin=o, tints=AXIS_TINTS)
        return draw

    return [
        ("T = np.arange(60).reshape(3, 4, 5)", "shape (3, 4, 5)",
         "60 numbers, three directions, three colours", whole),
        ("T[0]", "shape (4, 5)", "axis 0 fixed — one plane of the pile", face(0)),
        ("T[:, 0]", "shape (3, 5)", "axis 1 fixed — one row from every plane", face(1)),
        ("T[:, :, 0]", "shape (3, 4)", "axis 2 fixed — one column from every plane", face(2)),
    ]


def scene_00_index(tint):
    """00, second animation — three indices narrowing to one number.

    The module docstring's claim, animated: `T[1, 2, 3] == 33` has to be
    checkable by eye, and this is the picture that lets a reader check it. Each
    frame fixes one more index and the note says what is left, so a reader who
    has never met `[i, j, k]` can watch the shape fall from (3, 4, 5) to (4, 5)
    to (5,) to nothing at all.
    """
    import numpy as np
    T = cube()
    o = centred(SHAPE)

    def lit_of(*idx):
        m = np.zeros(SHAPE, bool)
        m[idx] = True
        return m

    # Plane 0 sits in front of plane 1 and paints over it, so lighting a cell
    # of plane 1 lights something the reader cannot see -- the first draft of
    # this scene ended on a frame with nothing visibly lit at all. Every frame
    # after the first therefore hides the front plane. The index stays 1: an
    # arithmetic line reading `0 x 20 + ...` teaches the stride worse than one
    # whose first term is not zero.
    front = np.zeros(SHAPE, bool)
    front[0] = True

    def opening(ax):
        planes(ax, T, tint=tint, origin=o)
        axis_arrows(ax, SHAPE, origin=o)

    def draw_of(mask):
        def draw(ax):
            planes(ax, T, tint=tint, lit=mask, hide=front, origin=o)
        return draw

    return [
        ("T", "shape (3, 4, 5)", "60 numbers, and one of them is 33", opening),
        ("T[1]", "shape (4, 5)",
         "the front plane lifted away — this is the next one", draw_of(lit_of(1))),
        ("T[1, 2]", "shape (5,)", "and its third row", draw_of(lit_of(1, 2))),
        ("T[1, 2, 3]", "= 33", "1 x 20 + 2 x 5 + 3, checkable by eye",
         draw_of(lit_of(1, 2, 3))),
    ]


def scene_00_shape(tint):
    """00, third animation — a shape is the label on the box, not the contents.

    The notebook's own claim, in its own words: "A shape is the label on a box.
    It says how the contents are arranged. It never says what they mean." Three
    frames rearrange the identical sixty numbers, and the fourth shows what that
    costs -- 33 is still in there, at a different address in every shape.

    Pairs with `cube-00-index`, which is where a reader met 33 in the first
    place. That one asks where a number lives; this one asks whether the
    question even has one answer.
    """
    import numpy as np
    T = cube()
    flat = T.ravel()
    wide = flat.reshape(4, 15)
    tall = flat.reshape(6, 10)

    def pile(ax):
        o = centred(SHAPE)
        planes(ax, T, tint=tint, origin=o)
        axis_arrows(ax, SHAPE, origin=o, tints=AXIS_TINTS)

    def flat_grid(arr, cell, size):
        def draw(ax):
            shape = (1,) + arr.shape
            planes(ax, arr, tint=tint, origin=centred(shape, cell=cell),
                   cell=cell, label_size=size)
        return draw

    def both(ax):
        # Where 33 is: [1, 2, 3] in the cube, [2, 3] in the (4, 15). The lit
        # cell is in plane 1 of the pile, which plane 0 paints over -- so
        # plane 0 alone is hidden, the documented way out of the occlusion
        # trap. Only the one: plane 2 is behind the cell and hiding it would
        # cost the pile its depth for nothing.
        cube_lit = np.zeros(SHAPE, bool)
        cube_lit[1, 2, 3] = True
        front = np.zeros(SHAPE, bool)
        front[0] = True
        wide_lit = np.zeros(wide.shape, bool)
        wide_lit[2, 3] = True
        sequence(ax, [
            {"arr": T, "lit": cube_lit, "hide": front, "caption": "(3, 4, 5)"},
            {"arr": wide, "lit": wide_lit, "caption": "(4, 15)"},
        ], tint=tint, cell=0.40, size=7.5)

    return [
        ("T", "shape (3, 4, 5)", "sixty numbers, in a box with three sides",
         pile),
        ("T.reshape(4, 15)", "shape (4, 15)",
         "the same sixty numbers, in a flatter box", flat_grid(wide, 0.56, 9)),
        ("T.reshape(6, 10)", "shape (6, 10)",
         "and again — not one number moved", flat_grid(tall, 0.62, 10)),
        ("where 33 lives", "T[1, 2, 3]  and  [2, 3]",
         "same number, a different address in each shape", both),
    ]


def scene_01(tint):
    """01 — the order ladder, every rung the same numbers at a different order."""
    import numpy as np
    T = cube()

    def rung(arr, shape_note):
        def draw(ax):
            a = np.atleast_3d(arr) if arr.ndim < 2 else arr
            a = a.reshape((1,) + a.shape) if a.ndim == 2 else a
            a = a.reshape(1, 1, -1) if arr.ndim == 1 else a
            a = a.reshape(1, 1, 1) if arr.ndim == 0 else a
            planes(ax, a, tint=tint, origin=centred(a.shape), label_size=13)
        return draw, shape_note

    rows = [
        ("T[0, 0, 0]", "shape ()      ndim 0", "a scalar — no axis at all", np.array(0)),
        ("T[0, 0]", "shape (5,)    ndim 1", "a vector — one axis", T[0, 0]),
        ("T[0]", "shape (4, 5)  ndim 2", "a matrix — two axes", T[0]),
        ("T", "shape (3, 4, 5)  ndim 3", "an order-3 tensor — three axes", T),
    ]
    states = []
    for label, note, sub, arr in rows:
        draw, _ = rung(arr, note)
        states.append((label, note, sub, draw))
    return states


def scene_01_slice_fibre(tint):
    """01, second animation — the two cuts, and how many axes each leaves.

    The notebook makes both on the histology photo: `photo[:, :, 0]` is a slice
    and keeps height and width, `photo[100, 200, :]` is a fibre and keeps only
    colour. The confusion is never what a cut *is* -- it is how many axes
    survive it -- so every frame draws the pile with the cut lit *and* the
    thing that falls out of it, side by side, with the shape under each.

    The cut is taken from plane 0 throughout. That is not a stylistic choice:
    the planes occlude exactly (see `planes`), so lighting a cell of plane 1 or
    2 highlights something the front plane is painted over, and the reader is
    shown a frame with nothing visibly selected.
    """
    import numpy as np
    T = cube()
    plane = np.zeros(SHAPE, bool)
    plane[0] = True
    fibre = np.zeros(SHAPE, bool)
    fibre[0, 2, :] = True
    one = np.zeros(SHAPE, bool)
    one[0, 2, 3] = True

    def cut(lit, out, caption):
        def draw(ax):
            sequence(ax, [
                {"arr": T, "lit": lit, "caption": "T  (3, 4, 5)"},
                "->",
                {"arr": out, "caption": caption},
            ], tint=tint, cell=0.40, size=7.5)
        return draw

    def compare(ax):
        sequence(ax, [
            {"arr": T[0], "caption": "T[0]  (4, 5)"},
            "vs",
            {"arr": T[0, 2].reshape(1, 5), "caption": "T[0, 2]  (5,)"},
        ], tint=tint, cell=0.52, size=11)

    return [
        ("T[0]", "2 axes survive", "a slice — fix one index",
         cut(plane, T[0], "T[0]  (4, 5)")),
        ("T[0, 2]", "1 axis survives", "a fibre — fix two",
         cut(fibre, T[0, 2].reshape(1, 5), "T[0, 2]  (5,)")),
        ("slice vs fibre", "2 axes against 1",
         "how many you fixed decides how many are left", compare),
        ("T[0, 2, 3]", "= 13", "fix all three and no axis is left at all",
         cut(one, np.array([[13]]), "T[0, 2, 3]  ()")),
    ]


def scene_01_rank(tint):
    """01, third animation — order counts axes, rank counts directions.

    Notebook 01 has a section called *Order vs. rank* and, until this, no
    picture for it. The two words get confused because both answer "how many?"
    about the same object, and a reader who has just learnt that order is the
    number of axes reasonably assumes rank is a synonym for it.

    So the scene holds the order fixed and changes only the rank. Both matrices
    are (4, 3) and order 2. One is built as a single outer product, so every
    row is a multiple of the first and seven numbers regenerate all twelve; the
    other needs a second term. Nothing about the shape distinguishes them,
    which is the whole point and the same shape of claim `cube-04-transpose-vs-reshape`
    makes about transpose and reshape.
    """
    import numpy as np
    a = np.array([1, 2, 3, 4])
    b = np.array([1, 2, 3])
    M1 = np.outer(a, b)
    M2 = M1 + np.outer([0, 0, 1, 1], [1, 0, 0])

    def whole(arr, lit=None):
        def draw(ax):
            planes(ax, arr, tint=tint, lit=lit,
                   origin=centred((1,) + arr.shape, cell=0.78), cell=0.78,
                   label_size=15)
        return draw

    def factored(ax):
        sequence(ax, [
            {"arr": a.reshape(4, 1), "tint": INDEX["i"], "caption": "a  (4,)"},
            "x",
            {"arr": b.reshape(1, 3), "tint": INDEX["j"], "caption": "b  (3,)"},
            "=",
            {"arr": M1, "caption": "M  (4, 3)"},
        ], tint=tint, cell=0.56, size=12)

    def both(ax):
        first = np.zeros(M1.shape, bool)
        first[0] = True
        sequence(ax, [
            {"arr": M1, "lit": first, "caption": "rank 1"},
            "vs",
            {"arr": M2, "lit": first, "caption": "rank 2"},
        ], tint=tint, cell=0.56, size=12)

    return [
        ("M = a x b", "(4, 3), order 2",
         "every row is a multiple of the first", whole(M1)),
        ("a and b", "7 numbers, not 12",
         "one direction is enough to rebuild all of it", factored),
        ("M + c x d", "(4, 3), order 2",
         "one term added, and no row is a multiple now", whole(M2)),
        ("rank 1 vs rank 2", "both (4, 3), both order 2",
         "order counts axes; rank counts directions", both),
    ]


def scene_02(tint):
    """02 — shuffle the axis, and watch which reading survives it.

    This replaced `cube-02-relabel`, which drew the identical tensor four times
    and changed only the caption. The claim was true -- the shape carries no
    meaning by itself -- but a picture in which nothing whatsoever moves is not
    a picture of it, and four frames of the same cube is how a reader learns
    there is nothing to look for here.

    So the scene applies the operation instead of naming it. The four planes are
    permuted once, and the last two frames put the two readings against the same
    permutation: the mean cannot tell it happened, and the series through one
    cell can tell immediately. That is also the notebook's own predict-first
    claim -- "the average is identical after shuffling, so no information was
    lost" -- drawn rather than asserted.

    Plane t starts at 10t so the ramp is visible without reading every cell:
    a reader sees four blocks of tens and then sees them out of order.

    And each plane carries a fixed step of a light-to-dark wash of the
    notebook's own accent, which is what makes frame 1 land in the half-second
    before anybody starts reading digits -- four shades in order, then the same
    four out of order. The tens digit says the same thing for a reader who does
    look, which is the rule this module applies to colour everywhere: never the
    only carrier. The four steps are spread wide rather than kept close: at a
    narrow spread the reader has to compare shades to see the reorder, which
    is the same work as reading the digits and buys nothing.
    """
    import numpy as np
    x = np.arange(4)[:, None, None] * 10 + np.arange(12).reshape(3, 4)
    perm = [2, 0, 3, 1]
    sx = x[perm]
    wash = [_mix(tint, w) for w in (0.86, 0.62, 0.38, 0.14)]

    def row(arr, names, shades):
        def draw(ax):
            sequence(ax, [
                {"arr": arr[i], "caption": names[i],
                 "cell_colors": np.full(arr[i].shape, shades[i], dtype=object)}
                for i in range(len(names))
            ], tint=tint, cell=0.46, size=8)
        return draw

    def means(ax):
        sequence(ax, [
            {"arr": x.mean(0), "caption": "x.mean(0)"},
            "=",
            {"arr": sx.mean(0), "caption": "x[perm].mean(0)"},
        ], tint=tint, cell=0.60, size=11)

    def series(ax):
        # The same wash as frames 0 and 1, so the last frame is recognisably
        # the first one flattened to a single cell -- the shades that were in
        # order across four planes are out of order along four timesteps.
        sequence(ax, [
            {"arr": x[:, 0, 0].reshape(1, 4), "caption": "x[:, 0, 0]",
             "cell_colors": np.array(wash, dtype=object).reshape(1, 4)},
            "vs",
            {"arr": sx[:, 0, 0].reshape(1, 4), "caption": "x[perm][:, 0, 0]",
             "cell_colors": np.array([wash[i] for i in perm],
                                     dtype=object).reshape(1, 4)},
        ], tint=tint, cell=0.62, size=13)

    return [
        ("x", "shape (4, 3, 4)", "four planes — plane t starts at 10t",
         row(x, ["x[0]", "x[1]", "x[2]", "x[3]"], wash)),
        ("x[perm]", "perm = [2, 0, 3, 1]",
         "the same four planes, in a new order",
         row(sx, ["x[2]", "x[0]", "x[3]", "x[1]"],
             [wash[i] for i in perm])),
        ("x.mean(0)", "identical",
         "as a batch: the average never looks at order", means),
        ("x[:, 0, 0]", "0 10 20 30  ->  20 0 30 10",
         "as time: the order was the data", series),
    ]


def scene_02_pad(tint):
    """02, third animation — padding, and the zeros nobody measured.

    Section 2.3 is about clips of different lengths, and it is the part of the
    notebook with the only equation in it: every clip is stretched to the
    longest, and the difference is cells a model will read unless a mask says
    not to. `ghost` is exactly the mark for that -- a dashed, unfilled cell
    reads as "not really here" without a word of prose, in either language.

    The last frame is why the mask is not optional. Averaging clip 0 over four
    slots rather than two halves every number in it, and the halving is visible
    without arithmetic: the cells on the right are the ones on the left, twice.
    """
    import numpy as np
    lengths = [2, 4, 3]
    longest = max(lengths)
    frame_of = lambda t: np.full((2, 3), (t + 1) * 2)
    clips = [np.stack([frame_of(t) for t in range(longest)]) for _ in lengths]
    pads = []
    for n, clip in zip(lengths, clips):
        clip[n:] = 0
        g = np.zeros(clip.shape, bool)
        g[n:] = True
        pads.append(g)

    def real_only(ax):
        sequence(ax, [
            {"arr": clips[i][:lengths[i]], "caption": f"({lengths[i]}, 2, 3)"}
            for i in range(3)
        ], tint=tint, cell=0.46, size=9)

    def padded(ax):
        # No numbers inside the dashed planes. Clip 0 is two pads deep, and
        # with labels on, its two ghost grids interpenetrate and the zeros
        # crowd together into something that reads as a drawing mistake. The
        # value is zero because nothing was measured, so the outline already
        # says everything the cell has to say.
        sequence(ax, [
            {"arr": clips[i], "ghost": pads[i], "caption": "(4, 2, 3)",
             "ghost_labels": False}
            for i in range(3)
        ], tint=tint, cell=0.46, size=9)

    def mask(ax):
        m = np.array([[1 if t < n else 0 for t in range(longest)]
                      for n in lengths])
        planes(ax, m, tint=tint, lit=m.astype(bool),
               origin=centred((1,) + m.shape, cell=0.78), cell=0.78,
               label_size=15)

    def diluted(ax):
        real = clips[0][:lengths[0]].mean(0)
        whole = clips[0].mean(0)
        sequence(ax, [
            {"arr": real, "caption": "clip[:2].mean(0)"},
            "vs",
            {"arr": whole, "caption": "clip.mean(0)"},
        ], tint=tint, cell=0.62, size=13)

    return [
        ("clips", "2, 4 and 3 frames", "three real clips, no two the same length",
         real_only),
        ("np.stack(padded)", "every clip now (4, 2, 3)",
         "the dashed planes were never measured", padded),
        ("mask", "shape (3, 4)",
         "1 where a frame was measured, 0 where it was invented", mask),
        ("clip.mean(0)", "halved, exactly",
         "the padding is counted unless a mask says not to", diluted),
    ]


def scene_02_stack(tint):
    """02, second animation — stack against concatenate, on the same frames.

    Section 02 builds its batch by padding video frames and stacking them, and
    the mistake waiting there is `concatenate`: both take a list of matrices,
    both return something with 60 numbers in it, and only one of them still
    knows where each frame ended. The last frame puts the two shapes side by
    side, because that is the only place the difference is visible.
    """
    import numpy as np
    T = cube()
    joined = T.reshape(12, 5)

    def apart(ax):
        sequence(ax, [
            {"arr": T[0], "caption": "frames[0]"},
            {"arr": T[1], "caption": "frames[1]"},
            {"arr": T[2], "caption": "frames[2]"},
        ], tint=tint, cell=0.40, size=7.5)

    def stacked(ax):
        planes(ax, T, tint=tint, origin=centred(SHAPE))

    def concatenated(ax):
        planes(ax, joined.reshape(1, 12, 5), tint=tint,
               origin=centred((1, 12, 5), cell=0.30), cell=0.30, label_size=6.5)

    def both(ax):
        sequence(ax, [
            {"arr": T, "caption": "stack  (3, 4, 5)"},
            "vs",
            {"arr": joined, "caption": "concatenate  (12, 5)"},
        ], tint=tint, cell=0.30, size=6)

    return [
        ("frames", "3 x (4, 5)", "three matrices — not a tensor yet", apart),
        ("np.stack(frames)", "shape (3, 4, 5)",
         "a new axis at the front, one entry per frame", stacked),
        ("np.concatenate(frames)", "shape (12, 5)",
         "no new axis — the rows are joined along one that exists",
         concatenated),
        ("stack vs concatenate", "60 numbers either way",
         "only one of them still knows where a frame ends", both),
    ]


def scene_03(tint):
    """03 — broadcasting a vector: the stretch drawn, and drawn as not real.

    A matrix and a vector, not a cube and a vector. The notebook's own
    arithmetic is `D - mean` at `(1797, 64) - (64,)`, and the rule a reader has
    to internalise -- line the shapes up at the *last* axis, stretch what is
    missing -- is a two-dimensional rule that a third axis only obscures.

    The frame that matters is 1. Being told "NumPy never copies it" before ever
    seeing the copies is being handed the caveat without the thing it is a
    caveat about, so the reused rows are drawn -- as dashed outlines, which is
    the whole claim in one mark: the arithmetic happens four times, the memory
    holds one row.
    """
    import numpy as np
    M = np.arange(20).reshape(4, 5)
    w = M.mean(axis=0)                      # (5,) — one number per column
    tile = np.broadcast_to(w, (4, 5))
    every = np.ones((4, 5), bool)

    def operands(ax):
        sequence(ax, [
            {"arr": M, "caption": "M  (4, 5)"},
            "-",
            {"arr": w.reshape(1, 5), "caption": "w  (5,)"},
        ], tint=tint, cell=0.60, size=11)

    def stretch(ax):
        sequence(ax, [
            {"arr": w.reshape(1, 5), "caption": "w  (5,)"},
            "->",
            {"arr": tile, "ghost": every, "caption": "(4, 5)"},
        ], tint=tint, cell=0.60, size=11)

    def subtract(ax):
        sequence(ax, [
            {"arr": M, "caption": "M"},
            "-",
            {"arr": tile, "ghost": every, "caption": "w, four times"},
            "=",
            {"arr": M - w, "caption": "M - w"},
        ], tint=tint, cell=0.42, size=8)

    def result(ax):
        sequence(ax, [{"arr": M - w, "caption": "M - w"}],
                 tint=tint, cell=0.70, size=12)

    return [
        ("M - w", "(4, 5) - (5,)",
         "a matrix and a vector — five numbers against five columns", operands),
        ("w stretches", "(5,) -> (4, 5)",
         "dashed: NumPy acts as if, and allocates nothing", stretch),
        ("M - w", "(4, 5) - (4, 5)",
         "four subtractions, one w", subtract),
        ("M - w", "shape (4, 5)",
         "every column now sits at its own mean", result),
    ]


def scene_03_scalar(tint):
    """03, second animation — a scalar stretches everywhere, a column does not.

    The companion to `scene_03`, and the case the notebook never draws at all:
    `M - 3` has no axis to line up, so the one number is reused twenty times.

    Frame 3 is the trap the section's own independent checkpoint sets. A `(4,)`
    meant as one offset per *row* is the common first attempt and it does not
    broadcast -- the rule matches from the last axis, and 4 against 5 is not a
    match. `b[:, None]` makes it `(4, 1)`, and the stretch then runs across the
    row instead of down the column. Same numbers, same intent, one `None`.
    """
    import numpy as np
    M = np.arange(20).reshape(4, 5)
    k = 3
    scalar_tile = np.full((4, 5), k)
    b = np.array([0, 10, 20, 30])
    col_tile = np.broadcast_to(b.reshape(4, 1), (4, 5))
    every = np.ones((4, 5), bool)

    def operands(ax):
        sequence(ax, [
            {"arr": M, "caption": "M  (4, 5)"},
            "-",
            {"arr": np.array([[k]]), "caption": "3  ()"},
        ], tint=tint, cell=0.60, size=11)

    def stretch(ax):
        sequence(ax, [
            {"arr": np.array([[k]]), "caption": "3  ()"},
            "->",
            {"arr": scalar_tile, "ghost": every, "caption": "(4, 5)"},
        ], tint=tint, cell=0.60, size=11)

    def result(ax):
        sequence(ax, [{"arr": M - k, "caption": "M - 3"}],
                 tint=tint, cell=0.70, size=12)

    def column(ax):
        sequence(ax, [
            {"arr": b.reshape(4, 1), "caption": "b[:, None]  (4, 1)"},
            "->",
            {"arr": col_tile, "ghost": every, "caption": "(4, 5)"},
        ], tint=tint, cell=0.60, size=11)

    return [
        ("M - 3", "(4, 5) - ()",
         "a scalar has no axis to line up with", operands),
        ("3 stretches", "() -> (4, 5)",
         "one number, twenty subtractions, nothing allocated", stretch),
        ("M - 3", "shape (4, 5)",
         "every entry moved by the same amount", result),
        ("b[:, None]", "(4, 1) -> (4, 5)",
         "a bare (4,) fails — a (4, 1) column stretches across", column),
    ]


def scene_03_mask(tint):
    """03, third animation — a Boolean mask is a test, not a list of positions.

    Section 3.2 is *Fancy indexing and Boolean masks* and had no picture. The
    confusion the scene is aimed at is a real one: `M[[2, 3]]` and `M[mask]`
    return the same rows, so a reader concludes a mask is a roundabout way of
    writing a list of indices. It is not -- it is one truth value per row, and
    the count of rows that come back is not something you wrote down anywhere.

    Frame 1 is therefore the whole lesson: the comparison happens first, on a
    column, and produces four Booleans. The selection is what those Booleans
    then do.
    """
    import numpy as np
    M = np.arange(20).reshape(4, 5)
    keep = M[:, 0] > 5
    col = np.zeros(M.shape, bool)
    col[:, 0] = True
    rows = np.broadcast_to(keep[:, None], M.shape)

    def draw(lit=None, arr=None, cell=0.72, size=14):
        arr = M if arr is None else arr
        def inner(ax):
            planes(ax, arr, tint=tint, lit=lit,
                   origin=centred((1,) + arr.shape, cell=cell), cell=cell,
                   label_size=size)
        return inner

    return [
        ("M", "shape (4, 5)", "four rows of five, and a question about each",
         draw()),
        ("M[:, 0] > 5", "one column, four answers",
         "the test runs first, and it runs on a column", draw(lit=col)),
        ("mask", "[False, False, True, True]",
         "two rows passed — a Boolean each, not a position", draw(lit=rows)),
        ("M[mask]", "shape (2, 5)",
         "the rows that passed, and the count was never written down",
         draw(arr=M[keep])),
    ]


def scene_04(tint):
    """04 — transpose against reshape: one shape, two different tensors."""
    import numpy as np
    T = cube()
    tr = T.transpose(2, 0, 1)
    rs = T.reshape(5, 3, 4)
    mark = np.zeros((5, 3, 4), bool)
    mark[1, 0, 0] = True

    def one(arr, lit=None):
        def draw(ax):
            sequence(ax, [{"arr": arr, "lit": lit}], tint=tint, cell=0.52)
        return draw

    def both(ax):
        sequence(ax, [
            {"arr": tr, "lit": mark, "caption": "transpose(2, 0, 1)"},
            "vs",
            {"arr": rs, "lit": mark, "caption": "reshape(5, 3, 4)"},
        ], tint=tint, cell=0.40)

    return [
        ("T", "shape (3, 4, 5)", "where every number starts", one(T)),
        ("T.transpose(2, 0, 1)", "shape (5, 3, 4)",
         "axes reordered — every number keeps its neighbours", one(tr)),
        ("T.reshape(5, 3, 4)", "shape (5, 3, 4)",
         "the same 60 numbers read off in order", one(rs)),
        ("same shape, different tensor", "[1, 0, 0] is 1 against 12",
         "a shape check passes for both", both),
    ]


def scene_04_ravel(tint):
    """04, second animation — reading order, in the six numbers the notebook uses.

    Deliberately `np.arange(6).reshape(2, 3)`, which is the array in the
    notebook's own strides cell, and deliberately six rather than sixty: the
    claim is about the *order* the buffer is read in, and that is a claim a
    reader can only check if they can hold every number at once.

    `reshape` reads along the rows and hands them back in the same order.
    `transpose` does not move a byte -- it permutes the strides -- so its
    `ravel` has to reorder. Same buffer, two readings.
    """
    import numpy as np
    a = np.arange(6).reshape(2, 3)

    def one(arr, caption):
        def draw(ax):
            sequence(ax, [{"arr": arr, "caption": caption}],
                     tint=tint, cell=0.80, size=15)
        return draw

    return [
        ("a", "shape (2, 3)", "six numbers, two rows", one(a, "a")),
        ("a.ravel()", "0 1 2 3 4 5", "reshape reads along the rows",
         one(a.ravel().reshape(1, 6), "a.ravel()")),
        ("a.T", "shape (3, 2)", "the strides were permuted, not the buffer",
         one(a.T, "a.T")),
        ("a.T.ravel()", "0 3 1 4 2 5", "same six bytes, a different reading",
         one(a.T.ravel().reshape(1, 6), "a.T.ravel()")),
    ]


def scene_04_rgb(tint):
    """04, third animation — an image is three planes of numbers, and here they are.

    The one scene in this module that paints real colour, and the module
    docstring says why that is not a crack in the indices rule: every channel
    value in `swatch()` is 0, 128 or 255, so "the red plane says 255 wherever
    the pixel looks red" is a claim a reader checks by eye, exactly like
    `T[1, 2, 3] == 33`.

    The last frame is the notebook's own most important sentence, drawn. Both
    results are (3, 3, 4) and a shape check passes for both; the transpose is a
    plane that is entirely red, and the reshape is a plane striped red, green,
    blue, because it took every third number out of the flat buffer. The
    scramble is not something a reader has to be told about -- it is stripes.
    """
    import numpy as np
    img = swatch()
    h, w, _ = img.shape
    chw = img.transpose(2, 0, 1)
    bad = img.reshape(3, h, w)

    def picture(ax):
        planes(ax, img[:, :, 0], tint=tint, cell_colors=swatch_hex(img),
               labels=False, cell=0.92,
               origin=centred((1, h, w), cell=0.92))

    def channels(ax):
        sequence(ax, [
            {"arr": img[:, :, c], "cell_colors": channel_hex(img[:, :, c], c),
             "caption": f"img[:, :, {c}]"}
            for c in range(3)
        ], tint=tint, cell=0.64, size=11)

    def pile(ax):
        o = centred(chw.shape, cell=0.70)
        colours = np.empty(chw.shape, dtype=object)
        for c in range(3):
            colours[c] = channel_hex(chw[c], c)
        planes(ax, chw, tint=tint, cell_colors=colours, origin=o, cell=0.70,
               label_size=11)
        axis_arrows(ax, chw.shape, origin=o, cell=0.70, tints=AXIS_TINTS)

    def scramble(ax):
        # Which channel each number in the reshaped plane 0 actually came from.
        # The flat HWC buffer runs r, g, b, r, g, b -- so plane 0 is striped,
        # and that stripe IS the bug.
        flat_channel = (np.arange(h * w) % 3).reshape(h, w)
        mixed = np.empty((h, w), dtype=object)
        for r in range(h):
            for c in range(w):
                rgb = [0, 0, 0]
                rgb[flat_channel[r, c]] = bad[0][r, c]
                mixed[r, c] = _hex(rgb)
        sequence(ax, [
            {"arr": chw[0], "cell_colors": channel_hex(chw[0], 0),
             "caption": "transpose[0]"},
            "vs",
            {"arr": bad[0], "cell_colors": mixed, "caption": "reshape[0]"},
        ], tint=tint, cell=0.58, size=10)

    return [
        ("img", "shape (3, 4, 3)", "twelve pixels — H rows, W columns, C channels",
         picture),
        ("img[:, :, 0], [:, :, 1], [:, :, 2]", "each (3, 4)",
         "the red plane says 255 wherever the pixel looks red", channels),
        ("img.transpose(2, 0, 1)", "shape (3, 3, 4)",
         "axis 0 is colour now — the same numbers, CHW", pile),
        ("transpose vs reshape", "both (3, 3, 4)",
         "one plane is the reds; the other is every third number", scramble),
    ]


def scene_05(tint):
    """05 — sampling: what a smaller tensor quietly threw away.

    Redrawn on a colour clip. It used to open on the same `np.arange(60)` cube
    every other scene opened on, captioned `clip`, and the caption was the only
    thing making it a video at all -- so "the gap is the point" was a claim
    about a slab of numbers rather than something a reader could see.

    Now the frames are pictures and the dot moves one column per frame, so the
    last frame does the work by itself: after `clip[::2]` the dot jumps two
    columns, and a reader who has never thought about sampling can see that the
    motion is wrong rather than be told the index means something else.
    """
    import numpy as np
    clip = clip_frames()
    hexes = [frame_hex(clip[t])[0] for t in range(3)]
    blank = np.ones(clip[0].shape[:2], bool)

    def row(items):
        def draw(ax):
            sequence(ax, items, tint=tint, cell=0.62, size=9)
        return draw

    def item(t, lit=None, hide=None, caption=None):
        return {"arr": clip[t, :, :, 0], "cell_colors": hexes[t],
                "labels": False, "lit": lit, "hide": hide,
                "caption": caption if caption is not None else f"clip[{t}]"}

    dim = np.zeros(clip[0].shape[:2], bool)

    return [
        ("clip", "shape (3, 2, 3, 3)",
         "three moments — the dot moves one column each",
         row([item(0), item(1), item(2)])),
        ("clip[::2]", "keeping 2 of 3", "frame 1 is about to go",
         row([item(0), item(1, lit=dim), item(2)])),
        ("clip[::2]", "keeping 2 of 3", "and it is gone — the gap is the point",
         row([item(0), item(1, hide=blank, caption=""), item(2)])),
        ("clip[::2]", "shape (2, 2, 3, 3)",
         "the dot jumps two columns now — clip[1] is the old frame 2",
         row([item(0), item(2, caption="clip[1]")])),
    ]


def scene_05_axes(tint):
    """05, third animation — (T, H, W, C), one axis at a time.

    Section 05's core-path cell is a four-row table naming T, H, W and C, and
    the notebook had no picture of any of them. A table can say "T is time";
    it cannot show that the time axis is the one carrying the motion, which is
    the claim every design decision later in the notebook rests on.

    The last frame is the one to keep: the dot's column equals its frame index,
    so `clip[t, 0, t]` is red for every t. The motion lives in T and only in T,
    and that is why reordering or dropping along T is the operation that costs
    something and reordering along H never is.
    """
    import numpy as np
    clip = clip_frames()
    hexes = [frame_hex(clip[t])[0] for t in range(3)]

    def strip(lit=None):
        def draw(ax):
            sequence(ax, [
                {"arr": clip[t, :, :, 0], "cell_colors": hexes[t],
                 "labels": False, "caption": f"clip[{t}]",
                 "lit": None if lit is None else lit[t]}
                for t in range(3)
            ], tint=tint, cell=0.62, size=9)
        return draw

    def one_frame(ax):
        o = centred((1, 2, 3), cell=1.05)
        planes(ax, clip[1, :, :, 0], tint=tint, cell_colors=hexes[1],
               labels=False, origin=o, cell=1.05)
        axis_arrows(ax, (1, 2, 3), origin=o, cell=1.05,
                    names=(None, "H", "W"), tints=AXIS_TINTS)

    def red_planes(ax):
        sequence(ax, [
            {"arr": clip[t, :, :, 0],
             "cell_colors": channel_hex(clip[t, :, :, 0], 0),
             "caption": f"clip[{t}, :, :, 0]"}
            for t in range(3)
        ], tint=tint, cell=0.62, size=11)

    dot = [np.zeros((2, 3), bool) for _ in range(3)]
    for t in range(3):
        dot[t][0, t] = True

    return [
        ("clip", "(T, H, W, C) = (3, 2, 3, 3)",
         "T moments, each one an H x W x C picture", strip()),
        ("clip[1]", "shape (2, 3, 3)",
         "one moment — H down, W across, C inside each cell", one_frame),
        ("clip[:, :, :, 0]", "shape (3, 2, 3)",
         "the red channel of every frame — 255 is exactly the dot", red_planes),
        ("clip[t, 0, t]", "red for every t",
         "the motion lives in T, and in no other axis", strip(lit=dot)),
    ]


def scene_05_window(tint):
    """05, second animation — a sliding window, which is what a clip batch is.

    Six frames become three clips of two, and the pile is drawn once with a
    different pair lit each time. Section 05's whole design question is what a
    downstream model is handed, and the answer is never "the video" -- it is a
    batch of windows cut out of it, with the window length and the stride as
    the two numbers somebody had to choose.
    """
    import numpy as np
    clip = np.arange(6 * 3 * 4).reshape(6, 3, 4)
    o = centred(clip.shape, cell=0.45)

    def window(lo):
        def draw(ax):
            lit = np.zeros(clip.shape, bool)
            lit[lo:lo + 2] = True
            planes(ax, clip, tint=tint, lit=lit, origin=o, cell=0.45,
                   label_size=7)
        return draw

    def whole(ax):
        planes(ax, clip, tint=tint, origin=o, cell=0.45, label_size=7)

    return [
        ("clip", "shape (6, 3, 4)", "six frames, as recorded", whole),
        ("clip[0:2]", "shape (2, 3, 4)", "window 1 — length 2, stride 2",
         window(0)),
        ("clip[2:4]", "shape (2, 3, 4)", "window 2 — no frame shared",
         window(2)),
        ("clip[4:6]", "shape (2, 3, 4)",
         "window 3 — the batch is (3, 2, 3, 4)", window(4)),
    ]


def scene_06(tint):
    """06 — contraction: the index that is summed away, and the sum itself.

    The first version of this scene used `w = np.ones(5)`, which quietly made
    it the wrong picture. Multiplying by ones is invisible, so what a reader
    actually saw was `T.sum(axis=2)` -- the same picture `scene_12` already
    draws, with an einsum caption on it. Real weights put the multiply back,
    and frame 2 then has something to show: five products, and their total.

    The three indices carry their own colours from `INDEX`, so "k is gone
    after the arrow" is a thing a reader watches happen rather than reads.
    Frame 3 draws the output with only the `i` and `j` arrows on it, because
    the missing third arrow is the whole claim.
    """
    import numpy as np
    T = cube()
    w = np.array([2, 0, 1, 3, 1])
    out = np.einsum("ijk,k->ij", T, w)
    fibre_in_pile = np.zeros(SHAPE, bool)
    fibre_in_pile[0, 0, :] = True
    corner = np.zeros((3, 4), bool)
    corner[0, 0] = True

    fibre = T[0, 0].reshape(1, 5)
    products = (T[0, 0] * w).reshape(1, 5)
    o = centred(SHAPE)

    def whole(ax):
        planes(ax, T, tint=tint, origin=o)
        axis_arrows(ax, SHAPE, origin=o, names=("i", "j", "k"))

    def share_k(ax):
        sequence(ax, [
            {"arr": T, "lit": fibre_in_pile, "lit_tint": INDEX["k"],
             "caption": "T[0, 0]  along k", "size": 7},
            {"arr": w.reshape(1, 5), "tint": INDEX["k"], "caption": "w  (5,)",
             "size": 11},
        ], tint=tint, cell=0.44)

    def arithmetic(ax):
        sequence(ax, [
            {"arr": fibre, "tint": INDEX["k"], "caption": "T[0, 0]"},
            "x",
            {"arr": w.reshape(1, 5), "tint": INDEX["k"], "caption": "w"},
            "=",
            {"arr": products, "caption": "products"},
        ], tint=tint, cell=0.40, size=10)

    def result(ax):
        origin = centred((1, 3, 4))
        planes(ax, out.reshape(1, 3, 4), tint=tint, lit=corner.reshape(1, 3, 4),
               origin=origin, label_size=12)
        axis_arrows(ax, (1, 3, 4), origin=origin, names=(None, "i", "j"))

    return [
        ("T", "shape (3, 4, 5)", "three indices, and each one has a colour",
         whole),
        ("T[0, 0] and w", "both indexed by k",
         "they line up because they share an index", share_k),
        ("out[0, 0] = sum(T[0, 0] * w)", f"= {int(out[0, 0])}",
         "multiply the pairs, then add the five together", arithmetic),
        ("einsum('ijk,k->ij', T, w)", "shape (3, 4)",
         "i and j survive — there is no k arrow left to draw", result),
    ]


def scene_06_outer(tint):
    """06, second animation — the index that appears, and then leaves again.

    The companion to contraction, in the same three colours: `i` blue, `j`
    orange, and the `k` green of `cube-06-contract` reserved for the index
    being summed. An index written after the arrow but on neither side of the
    comma is a *new* axis, so `'i,j->ij'` is the outer product. Ending on
    `'ij,j->i'` closes the loop -- the two halves of einsum are one rule, and
    what survives is decided entirely by what you wrote after the arrow.
    """
    import numpy as np
    a = np.arange(1, 5)
    b = np.arange(1, 6)
    outer = np.einsum("i,j->ij", a, b)
    back = np.einsum("ij,j->i", outer, b)
    hit = np.zeros((4, 5), bool)
    hit[2, 3] = True
    a_lit = np.zeros((4, 1), bool)
    a_lit[2, 0] = True
    b_lit = np.zeros((1, 5), bool)
    b_lit[0, 3] = True

    def operands(ax):
        sequence(ax, [
            {"arr": a.reshape(4, 1), "tint": INDEX["i"], "caption": "a  (4,)  i"},
            "x",
            {"arr": b.reshape(1, 5), "tint": INDEX["j"], "caption": "b  (5,)  j"},
        ], tint=tint, cell=0.68, size=13)

    def product(ax):
        origin = centred((1, 4, 5), cell=0.68)
        planes(ax, outer.reshape(1, 4, 5), tint=tint, origin=origin,
               cell=0.68, label_size=13)
        axis_arrows(ax, (1, 4, 5), origin=origin, cell=0.68,
                    names=(None, "i", "j"))

    def one_entry(ax):
        sequence(ax, [
            {"arr": a.reshape(4, 1), "tint": INDEX["i"], "lit": a_lit,
             "caption": "a[2]"},
            "x",
            {"arr": b.reshape(1, 5), "tint": INDEX["j"], "lit": b_lit,
             "caption": "b[3]"},
            "=",
            {"arr": outer, "lit": hit, "caption": "out[2, 3]"},
        ], tint=tint, cell=0.46, size=9)

    def contract(ax):
        sequence(ax, [
            {"arr": outer, "caption": "ij"},
            "x",
            {"arr": b.reshape(1, 5), "tint": INDEX["j"], "caption": "j"},
            "->",
            {"arr": back.reshape(4, 1), "tint": INDEX["i"], "caption": "i"},
        ], tint=tint, cell=0.46, size=9)

    return [
        ("a, b", "(4,) and (5,)", "two vectors, nine numbers between them",
         operands),
        ("einsum('i,j->ij', a, b)", "shape (4, 5)",
         "ij is on neither side of the comma — the axis is new", product),
        ("out[2, 3] = a[2] * b[3]", f"= {int(outer[2, 3])}",
         "every entry is one product, no sum anywhere", one_entry),
        ("einsum('ij,j->i')", "shape (4,)",
         "now j is the one summed away — the arrow decides", contract),
    ]


def scene_06_matmul(tint):
    """06, third animation — the einsum an ML reader already knows by another name.

    The other two scenes here teach the rule; this one spends it on the two
    expressions a reader will actually type. `ik,kj->ij` is the matrix product,
    and seeing it fall out of the same rule is the moment einsum stops being a
    separate thing to learn. `bik,bkj->bij` is the one after that: a batch axis
    is an index written on both sides of the comma *and* after the arrow, so it
    is carried rather than summed -- which is the whole of how a library
    multiplies a batch of matrices without a loop, and it joins this notebook to
    the batch axis section 02 spends twenty minutes on.

    Same three colours as `cube-06-contract`, and the same reason: `k` green is
    reserved for the index being summed, so a reader who has watched one scene
    already knows which one is about to disappear.

    Which is also why the batched form is spelt `bik,bkj->bij` rather than the
    `bij,bjk->bik` a reader will meet in most documentation. The two compute
    the same thing, but the conventional spelling moves the summed index from
    `k` to `j`, and this module has spent two animations teaching that green
    `k` is the one that goes. Prepending `b` to the letters frames 0 to 2
    already established keeps every colour meaning what it meant, and the
    batch axis is the only new thing in the frame -- which is the whole point
    of putting it last.
    """
    import numpy as np
    # Hand-picked rather than `arange`, for the reason `scene_06`'s docstring
    # records: its first draft used weights of all ones, which made the
    # multiply invisible and left a picture of a plain sum. Here the constraint
    # is that `out[0, 0] = 1*2 + 2*1 + 3*3` has no zero term in it, so frame 1
    # shows three products being added rather than one and two excuses.
    A = np.array([[1, 2, 3], [3, 1, 2]])
    B = np.array([[2, 0, 1, 3], [1, 4, 0, 2], [3, 1, 5, 1]])
    out = A @ B
    # X[0] is the A of frames 0 to 2, so a reader recognises it; X[1] is a
    # different matrix, because a batch of two identical products would not
    # show that the batch does two independent ones.
    X = np.stack([A, A[::-1]])
    Y = np.stack([B, B * 2])
    outb = np.einsum("bik,bkj->bij", X, Y)

    row_lit = np.zeros(A.shape, bool)
    row_lit[0] = True
    col_lit = np.zeros(B.shape, bool)
    col_lit[:, 0] = True
    corner = np.zeros(out.shape, bool)
    corner[0, 0] = True

    def operands(ax):
        sequence(ax, [
            {"arr": A, "caption": "A  (2, 3)  ik"},
            "@",
            {"arr": B, "caption": "B  (3, 4)  kj"},
        ], tint=tint, cell=0.74, size=14)

    def pairing(ax):
        sequence(ax, [
            {"arr": A, "lit": row_lit, "lit_tint": INDEX["k"],
             "caption": "A[0, :]"},
            "@",
            {"arr": B, "lit": col_lit, "lit_tint": INDEX["k"],
             "caption": "B[:, 0]"},
        ], tint=tint, cell=0.74, size=14)

    def product(ax):
        o = centred((1,) + out.shape, cell=0.78)
        planes(ax, out, tint=tint, lit=corner, origin=o, cell=0.78,
               label_size=15)
        axis_arrows(ax, (1,) + out.shape, origin=o, cell=0.78,
                    names=(None, "i", "j"))

    def batched(ax):
        sequence(ax, [
            {"arr": X, "caption": "X  bik"},
            "@",
            {"arr": Y, "caption": "Y  bkj"},
            "=",
            {"arr": outb, "caption": "out  bij"},
        ], tint=tint, cell=0.40, size=7.5)

    return [
        ("A, B", "(2, 3) @ (3, 4)", "the 3 they share is k, and only k",
         operands),
        (f"out[0, 0] = {int(out[0, 0])}", "sum over k",
         "one row against one column — three products, added", pairing),
        ("einsum('ik,kj->ij', A, B)", "shape (2, 4)",
         "k is on both operands, never after the arrow — so it goes",
         product),
        ("einsum('bik,bkj->bij', X, Y)", "shape (2, 2, 4)",
         "b survives the arrow — a batch axis is carried, never summed",
         batched),
    ]


def scene_07(tint):
    """07 — a duplicated column, and what the pseudoinverse can still do."""
    import numpy as np
    A = np.array([[2., 1., 3.], [1., 4., 2.], [3., 2., 1.], [0., 1., 2.]])
    Adup = A.copy()
    Adup[:, 2] = Adup[:, 1]
    P = np.linalg.pinv(Adup).round(1) + 0.0
    I = (P @ Adup).round(1)
    dup = np.zeros((1, 4, 3), bool)
    dup[0, :, 1:] = True

    def show(items, cell=0.52):
        def draw(ax):
            sequence(ax, items, tint=tint, cell=cell)
        return draw

    return [
        ("A", "shape (4, 3)", "four equations, three unknowns", show(
            [{"arr": A.astype(int), "caption": "A"}])),
        ("A[:, 2] = A[:, 1]", "rank 2, not 3",
         "two columns now carry one direction", show(
             [{"arr": Adup.astype(int), "lit": dup, "caption": "A"}])),
        ("np.linalg.pinv(A)", "shape (3, 4)",
         "pinv is defined for every matrix — it returns quietly", show(
             [{"arr": P, "caption": "A+"}], cell=0.62)),
        ("A+ @ A", "not the identity",
         "no error was ever going to tell you", show(
             [{"arr": P, "caption": "A+"}, "@",
              {"arr": Adup.astype(int), "caption": "A"}, "=",
              {"arr": I, "caption": "not I"}], cell=0.42)),
    ]


def scene_07_shapes(tint):
    """07, second animation — square, tall, wide, and what pinv returns for each.

    `cube-07-pinv` is about rank. This one is about shape, which is the part a
    reader can check before running anything: `pinv` of an (m, n) is always an
    (n, m), whatever the rank, and what changes between the three cases is not
    whether you get an answer but which question the answer is answering --
    exact, least squares, or minimum norm.
    """
    import numpy as np
    square = np.array([[2, 1, 3], [1, 4, 2], [3, 2, 1]])
    tall = np.array([[2, 1], [1, 4], [3, 2], [0, 1]])
    wide = np.array([[2, 1, 3, 0], [1, 4, 2, 1]])

    def one(arr, caption):
        def draw(ax):
            sequence(ax, [{"arr": arr, "caption": caption}],
                     tint=tint, cell=0.70, size=14)
        return draw

    def all_three(ax):
        sequence(ax, [
            {"arr": square, "caption": "(3, 3)"},
            {"arr": tall, "caption": "(4, 2)"},
            {"arr": wide, "caption": "(2, 4)"},
        ], tint=tint, cell=0.44, size=9)

    return [
        ("A", "shape (3, 3)", "square — one solution, if the rank allows",
         one(square, "A")),
        ("A", "shape (4, 2)",
         "tall — more equations than unknowns, so least squares",
         one(tall, "A")),
        ("A", "shape (2, 4)",
         "wide — more unknowns than equations, so smallest answer",
         one(wide, "A")),
        ("pinv(A)", "(m, n) -> (n, m)",
         "pinv gives (3, 3), (2, 4), (4, 2) — always the transpose", all_three),
    ]


def scene_07_residual(tint):
    """07, third animation — the answer that does not solve the equation.

    The two existing scenes are about what the pseudoinverse *is*: what a
    duplicated column costs it, and what shape it comes back. Neither shows the
    situation a reader actually meets, which is four equations and two
    unknowns, and the quiet fact that `pinv` hands back a vector anyway.

    So the numbers are the point here. `A @ x` is not `b` and no choice of `x`
    would make it so -- the columns of a (4, 2) matrix span a plane and `b` is
    not in it. What `pinv` returns is the closest thing there is, and frame 3
    prints the residual so that "closest" is a number rather than a reassurance.

    The design is the notebook's own: a column of ones and a column of times,
    which is a straight-line fit, so the residual a reader sees here is the one
    they already know from least squares.
    """
    import numpy as np
    A = np.array([[1, 0], [1, 1], [1, 2], [1, 3]])
    b = np.array([1, 3, 2, 5])
    x = np.linalg.pinv(A) @ b
    fit = A @ x
    res = b - fit
    ss = float(res @ res)

    def system(ax):
        sequence(ax, [
            {"arr": A, "caption": "A  (4, 2)"},
            "@",
            # x is what is being asked for, so it is drawn empty: two cells
            # with no numbers in them yet.
            {"arr": np.zeros((2, 1)), "labels": False, "caption": "x  (2,)"},
            "=",
            {"arr": b.reshape(4, 1), "caption": "b  (4,)"},
        ], tint=tint, cell=0.62, size=13)

    def solve(ax):
        sequence(ax, [
            {"arr": np.linalg.pinv(A), "caption": "pinv(A)  (2, 4)"},
            "@",
            {"arr": b.reshape(4, 1), "caption": "b"},
            "=",
            {"arr": x.reshape(2, 1), "caption": "x"},
        ], tint=tint, cell=0.52, size=11)

    def compare(ax):
        sequence(ax, [
            {"arr": fit.reshape(4, 1), "caption": "A @ x"},
            "vs",
            {"arr": b.reshape(4, 1), "caption": "b"},
        ], tint=tint, cell=0.74, size=14)

    def residual(ax):
        sequence(ax, [
            {"arr": b.reshape(4, 1), "caption": "b"},
            "-",
            {"arr": fit.reshape(4, 1), "caption": "A @ x"},
            "=",
            {"arr": res.reshape(4, 1), "caption": "r"},
        ], tint=tint, cell=0.62, size=13)

    return [
        ("A x = b", "(4, 2) and (4,)",
         "four equations, two unknowns — two too many", system),
        ("x = pinv(A) @ b", "shape (2,)",
         "it hands back an answer without complaining", solve),
        ("A @ x  vs  b", "not equal, and never will be",
         "the columns span a plane, and b is not on it", compare),
        ("b - A @ x", f"sum of squares {ss:.2f}",
         "the smallest this can be — smallest is not zero", residual),
    ]


def scene_08(tint):
    """08 — one update rule, applied again and again."""
    import numpy as np
    F = np.array([[1, 1], [1, 0]])
    states = [np.array([1, 0])]
    for _ in range(4):
        states.append(F @ states[-1])

    def step(t):
        def draw(ax):
            sequence(ax, [
                {"arr": F.reshape(1, 2, 2), "caption": "F", "size": 13},
                "@",
                {"arr": states[t].reshape(1, 2, 1), "caption": f"x[{t}]", "size": 13},
                "=",
                {"arr": states[t + 1].reshape(1, 2, 1),
                 "caption": f"x[{t + 1}]", "size": 13},
            ], tint=tint, cell=0.74)
        return draw

    return [(f"x[{t + 1}] = F @ x[{t}]",
             f"x[{t + 1}] = {tuple(int(v) for v in states[t + 1])}",
             "the same rule, the state carried forward", step(t))
            for t in range(4)]


def scene_08_power(tint):
    """08, second animation — the same matrix, applied n times.

    `cube-08-recurrence` walks the state forward. This one multiplies the
    operator by itself instead, which is the step that turns a recursion into a
    closed form: the Fibonacci numbers are not something the loop produces, they
    are what is already sitting in the entries of `F ** n`. Four frames is
    exactly enough for a reader to notice 1, 1, 2, 3, 5 arriving without being
    told.
    """
    import numpy as np
    F = np.array([[1, 1], [1, 0]])
    powers = [F]
    for _ in range(3):
        powers.append(powers[-1] @ F)

    def show(n):
        def draw(ax):
            sequence(ax, [{"arr": powers[n], "caption": f"F ** {n + 1}"}],
                     tint=tint, cell=1.00, size=20)
        return draw

    subs = [
        "one step of the recurrence",
        "two steps, in one multiplication",
        "three — and the entries are Fibonacci numbers",
        "n steps cost one matrix power, not n loops",
    ]
    return [(f"F ** {n + 1}", f"top left = {int(powers[n][0, 0])}", subs[n],
             show(n)) for n in range(4)]


def scene_08_direction(tint):
    """08, third animation — what repetition converges on, and why it is not zero.

    Exercise 2 is called *when repetition chooses a direction* and the notebook
    has a spectral-gap explorer for it, both behind widgets. The two existing
    scenes show the mechanism -- one step, then the operator -- and neither
    shows the consequence, which is the part that transfers: apply any matrix
    enough times and the result stops being about where you started.

    Fibonacci is the right vehicle because the reader has already built it in
    the core exercise, and because the ratio of the two entries is something
    they can watch settle without being told what a dominant eigenvalue is.
    Frame 3 then names it, which is the whole arc of the section in four
    pictures: notice, measure, converge, name.
    """
    import numpy as np
    F = np.array([[1, 1], [1, 0]])
    xs = [np.array([1, 0])]
    for _ in range(12):
        xs.append(F @ xs[-1])
    early = np.stack(xs[1:5], axis=1)                 # (2, 4)
    ratios = np.array([[xs[t][0] / xs[t][1] for t in range(1, 5)]])
    late = np.array([[xs[t][0] / xs[t][1] for t in (9, 10, 11, 12)]])

    def states(ax):
        sequence(ax, [
            {"arr": early[:, [t]], "caption": f"F^{t + 1} x"}
            for t in range(4)
        ], tint=tint, cell=0.74, size=15)

    def row(arr):
        def draw(ax):
            planes(ax, arr, tint=tint,
                   origin=centred((1,) + arr.shape, cell=0.94), cell=0.94,
                   label_size=15, decimals=3)
        return draw

    vals = np.sort(np.linalg.eigvals(F).real)[::-1]

    def spectrum(ax):
        big = np.zeros((1, 2), bool)
        big[0, 0] = True
        planes(ax, vals.reshape(1, 2), tint=tint, lit=big,
               origin=centred((1, 1, 2), cell=1.30), cell=1.30,
               label_size=20, decimals=3)

    return [
        ("F @ x, applied again and again", "each shape (2,)",
         "one rule, and nothing about it changes between steps", states),
        ("x[0] / x[1]", "1.000 to 1.667",
         "the ratio of the two entries, step by step", row(ratios)),
        ("after ten more steps", "all 1.618",
         "it stops moving, and not where it started", row(late)),
        # Both values, with the sign: the second one is negative, and writing
        # its magnitude here would have the caption disagree with the cell
        # under it.
        ("eigvals(F)", f"{vals[0]:.3f} and {vals[1]:.3f}",
         "repetition finds the direction that stretches most", spectrum),
    ]


def scene_09(tint):
    """09 — one matrix, three factors, and what rank 1 already captures."""
    import numpy as np
    # Chosen so all three singular values survive one decimal place -- a
    # figure whose point is trustworthy numbers must not print 0 for a
    # singular value that is not zero.
    A = np.array([[1, 2, 2], [6, 5, 1], [9, 5, 4], [9, 6, 5]])
    U, sv, Vt = np.linalg.svd(A.astype(float), full_matrices=False)

    def approx(k):
        return (U[:, :k] @ np.diag(sv[:k]) @ Vt[:k]).round(1)

    def split(ax):
        sequence(ax, [
            {"arr": A, "caption": "A"}, "=",
            {"arr": U.round(1) + 0.0, "caption": "U"}, "@",
            {"arr": np.diag(sv).round(1) + 0.0, "caption": "S"}, "@",
            {"arr": Vt.round(1) + 0.0, "caption": "Vt"},
        ], tint=tint, cell=0.42)

    def rank(k):
        def draw(ax):
            sequence(ax, [
                {"arr": A, "caption": "A"}, "~",
                {"arr": approx(k), "caption": f"rank {k}"},
            ], tint=tint, cell=0.60)
        return draw

    return [
        ("A", "shape (4, 3)", "one real matrix", lambda ax: sequence(
            ax, [{"arr": A, "caption": "A"}], tint=tint, cell=0.68)),
        ("U, S, Vt = svd(A)", "(4, 3) (3, 3) (3, 3)",
         "three factors, one product", split),
        ("rank 1", "one singular value kept",
         "the biggest direction, on its own", rank(1)),
        ("rank 2", "two singular values kept",
         "closer, and still smaller than A", rank(2)),
    ]


def scene_09_rank(tint):
    """09, second animation — the singular values as the budget they are.

    The same `A` as `cube-09-svd`, but with `s` itself on screen and the
    discarded values drawn as ghosts rather than dropped. That is the honest
    picture of a truncation: rank 2 is not a smaller list of singular values,
    it is the same list with the last one set to zero, and the reconstruction
    beside it says what that cost.
    """
    import numpy as np
    A = np.array([[1, 2, 2], [6, 5, 1], [9, 5, 4], [9, 6, 5]])
    U, sv, Vt = np.linalg.svd(A.astype(float), full_matrices=False)
    s = sv.round(1).reshape(1, 3) + 0.0

    def approx(k):
        return (U[:, :k] @ np.diag(sv[:k]) @ Vt[:k]).round(1) + 0.0

    def opening(ax):
        sequence(ax, [
            {"arr": A, "caption": "A  (4, 3)"},
            "->",
            {"arr": s, "caption": "s  (3,)"},
        ], tint=tint, cell=0.60, size=12)

    def keep(k):
        dropped = np.zeros((1, 3), bool)
        dropped[0, k:] = True

        def draw(ax):
            sequence(ax, [
                {"arr": s, "ghost": dropped, "caption": f"keep {k} of 3"},
                "->",
                {"arr": approx(k), "caption": f"rank {k}"},
            ], tint=tint, cell=0.60, size=12)
        return draw

    return [
        ("U, s, Vt = svd(A)", "3 singular values",
         "how much of A each direction carries", opening),
        ("rank 1", f"s = {s[0, 0]}, 0, 0",
         "the largest direction, on its own", keep(1)),
        ("rank 2", f"s = {s[0, 0]}, {s[0, 1]}, 0",
         "closer — the dashed value is the one thrown away", keep(2)),
        ("rank 3", "nothing discarded", "all three back, and A exactly",
         keep(3)),
    ]


def scene_09_nmf(tint):
    """09, third animation — the factorization you can point at.

    Section 9.6 is *NMF -- parts you can name*, and the two existing scenes are
    both about SVD. That leaves the notebook's own answer to "why would I ever
    use anything else?" undrawn, and the answer is not about accuracy: SVD is
    the best rank-k approximation there is, and `cube-09-rank` already says so.

    It is about signs. The data here is counts, so every entry of `A` is at or
    above zero, and a factor with negative entries describes it as a thing
    partly cancelled by another thing -- true arithmetic, and not a sentence
    anybody can say about counts. NMF gives up optimality to keep every number
    in the factors as pointable as the numbers in the data.

    `W` and `H` are exact here rather than fitted: `A` is built as their
    product, so the frame is about what a non-negative pair looks like, not
    about how an optimizer finds one. That also keeps it deterministic, which
    a `NMF(init=...)` call would not be.
    """
    import numpy as np
    W = np.array([[2, 0], [1, 1], [0, 2], [1, 0]])
    H = np.array([[1, 0, 1], [0, 1, 1]])
    A = W @ H
    U, sv, Vt = np.linalg.svd(A, full_matrices=False)
    U2 = np.round(U[:, :2], 1)
    neg = U2 < 0

    def whole(ax):
        planes(ax, A, tint=tint, origin=centred((1,) + A.shape, cell=0.80),
               cell=0.80, label_size=16)

    def svd_signs(ax):
        sequence(ax, [
            {"arr": U2, "lit": neg, "caption": "U[:, :2]"},
            {"arr": np.round(np.diag(sv[:2]), 1), "caption": "S"},
        ], tint=tint, cell=0.62, size=12)

    def parts(ax):
        sequence(ax, [
            {"arr": W, "caption": "W  (4, 2)"},
            "@",
            {"arr": H, "caption": "H  (2, 3)"},
            "=",
            {"arr": A, "caption": "A"},
        ], tint=tint, cell=0.52, size=11)

    def side(ax):
        sequence(ax, [
            {"arr": U2, "lit": neg, "caption": "U[:, :2]"},
            "vs",
            {"arr": W, "caption": "W"},
        ], tint=tint, cell=0.70, size=14)

    return [
        ("A", "(4, 3), every entry >= 0",
         "counts — nothing here can be less than nothing", whole),
        ("A = U S Vt", "the best rank 2 there is",
         "and the lit entries of U are negative", svd_signs),
        ("A = W @ H", "both factors >= 0",
         "every number in both factors is a quantity of something", parts),
        ("U[:, :2]  vs  W", "same rank, same data",
         "one is optimal; the other is the one you can read aloud", side),
    ]


def scene_10(tint):
    """10 — Tucker: a small core plus one basis per mode."""
    import numpy as np
    T = cube()
    core = np.arange(8).reshape(2, 2, 2) * 7
    U0 = np.arange(6).reshape(3, 2)
    U1 = np.arange(8).reshape(4, 2)
    U2 = np.arange(10).reshape(5, 2)

    def whole(ax):
        planes(ax, T, tint=tint, origin=centred(SHAPE))

    def just_core(ax):
        planes(ax, core, tint=tint, origin=centred((2, 2, 2)), label_size=13)

    def parts(ax):
        sequence(ax, [
            {"arr": core, "caption": "core (2,2,2)"}, "x",
            {"arr": U0, "caption": "U0 (3,2)"}, "x",
            {"arr": U1, "caption": "U1 (4,2)"}, "x",
            {"arr": U2, "caption": "U2 (5,2)"},
        ], tint=tint, cell=0.44)

    def budget(ax):
        sequence(ax, [
            {"arr": T, "caption": "60 numbers"}, "vs",
            {"arr": core, "caption": "8 + 6 + 8 + 10 = 32"},
        ], tint=tint, cell=0.42)

    return [
        ("T", "shape (3, 4, 5) — 60 numbers", "the tensor to compress", whole),
        ("core", "shape (2, 2, 2) — 8 numbers",
         "rank 2 on every mode", just_core),
        ("core x U0 x U1 x U2", "one basis per mode",
         "every original index keeps a row — a budget, not a subset", parts),
        ("32 against 60", "what Tucker costs here",
         "each mode gets its own budget", budget),
    ]


def scene_10_unfold(tint):
    """10, second animation — the same cube laid flat three ways.

    Unfolding is the step every HOSVD hides: there is no such thing as "the
    SVD of a tensor", so each mode is flattened into an ordinary matrix and
    given an ordinary SVD. Drawn at one cell size throughout, so the three
    results are comparable: the row count is the axis you kept, the column
    count is everything else multiplied together, and 60 stays 60.
    """
    import numpy as np
    T = cube()
    unfolds = [
        (T.reshape(3, 20), "(3, 20)", "axis 0 kept — 4 x 5 = 20 columns"),
        (T.transpose(1, 0, 2).reshape(4, 15), "(4, 15)",
         "axis 1 kept — 3 x 5 = 15 columns"),
        (T.transpose(2, 0, 1).reshape(5, 12), "(5, 12)",
         "axis 2 kept — 3 x 4 = 12 columns"),
    ]

    def flat(arr, caption, mode):
        # Each unfolding takes the colour of the axis it kept, so the three
        # results are told apart by more than a caption -- and the colour is
        # the same one `cube-00-axes` gave that axis.
        def draw(ax):
            sequence(ax, [{"arr": arr, "tint": AXIS_TINTS[mode],
                           "caption": caption}], tint=tint, cell=0.40, size=7)
        return draw

    def whole(ax):
        o = centred(SHAPE)
        planes(ax, T, tint=tint, origin=o)
        axis_arrows(ax, SHAPE, origin=o, tints=AXIS_TINTS)

    return [("T", "shape (3, 4, 5)",
             "no tensor has an SVD — a matrix does", whole)] + [
        (f"unfold(T, {m})", f"shape {shape}", sub, flat(arr, f"mode {m}", m))
        for m, (arr, shape, sub) in enumerate(unfolds)
    ]


def scene_11(tint):
    """11 — CP: a sum of rank-1 terms, and every partial sum is a real tensor."""
    import numpy as np
    rng = np.random.default_rng(3)
    A = rng.integers(1, 4, (3, 3))
    B = rng.integers(1, 4, (4, 3))
    C = rng.integers(1, 4, (5, 3))

    def term(r):
        return np.einsum("i,j,k->ijk", A[:, r], B[:, r], C[:, r])

    def partial(r):
        return sum(term(t) for t in range(r + 1))

    def draw_of(arr):
        def draw(ax):
            planes(ax, arr, tint=tint, origin=centred(SHAPE))
        return draw

    states = [("term 1", "one outer product", "rank 1 — a whole tensor already",
               draw_of(term(0)))]
    for r in (1, 2):
        states.append((f"term 1 + ... + {r + 1}", f"{r + 1} rank-1 terms",
                       "each term adds, none replaces", draw_of(partial(r))))
    # The last frame is the factors themselves, not the sum again: repeating
    # the previous picture under a new caption spends a quarter of the
    # animation saying nothing new.
    def factors(ax):
        sequence(ax, [
            {"arr": A, "caption": "A (3,3)"}, "x",
            {"arr": B, "caption": "B (4,3)"}, "x",
            {"arr": C, "caption": "C (5,3)"},
        ], tint=tint, cell=0.62)

    states.append(("A, B, C", "9 + 12 + 15 = 36 numbers",
                   "three factors against the tensor's 60", factors))
    return states


def scene_11_outer(tint):
    """11, second animation — one rank-1 term, built from three vectors.

    `cube-11-cp` sums the terms. This is what a single term *is*, which is the
    step that makes the sum mean anything: twelve numbers in three vectors,
    one multiplication per entry, and a full (3, 4, 5) tensor out of it. The
    last frame puts 12 against 60 on one line, because that ratio is the only
    reason anybody runs CP.
    """
    import numpy as np
    a = np.arange(1, 4)
    b = np.arange(1, 5)
    c = np.arange(1, 6)
    ab = np.einsum("i,j->ij", a, b)
    abc = np.einsum("i,j,k->ijk", a, b, c)

    def vectors(ax):
        sequence(ax, [
            {"arr": a.reshape(3, 1), "caption": "a  (3,)"},
            "x",
            {"arr": b.reshape(4, 1), "caption": "b  (4,)"},
            "x",
            {"arr": c.reshape(5, 1), "caption": "c  (5,)"},
        ], tint=tint, cell=0.62, size=13)

    def matrix(ax):
        sequence(ax, [{"arr": ab, "caption": "a x b  (3, 4)"}],
                 tint=tint, cell=0.68, size=13)

    def tensor(ax):
        planes(ax, abc, tint=tint, origin=centred(SHAPE))

    def budget(ax):
        sequence(ax, [
            {"arr": a.reshape(3, 1), "caption": "a"},
            "x",
            {"arr": b.reshape(4, 1), "caption": "b"},
            "x",
            {"arr": c.reshape(5, 1), "caption": "c"},
            "->",
            {"arr": abc, "caption": "60 entries"},
        ], tint=tint, cell=0.34, size=6)

    return [
        ("a, b, c", "3 + 4 + 5 = 12 numbers", "three vectors, nothing else",
         vectors),
        ("a x b", "shape (3, 4)",
         "every pair multiplied — no sums, so rank stays 1", matrix),
        ("a x b x c", "shape (3, 4, 5)",
         "one more vector, one more axis", tensor),
        ("one rank-1 term", "12 numbers, 60 entries",
         "this ratio is the only reason to run CP", budget),
    ]


def scene_10_modes(tint):
    """10, third animation — one factor per mode, applied one at a time.

    Section 10.2 is called *HOSVD -- compress each mode separately*, and the
    word doing the work in it is *separately*. `cube-10-tucker` shows the core
    and the three factor matrices together, which is the finished statement;
    this shows the sentence being built, and the shape line under each frame is
    the argument: 8 numbers, then 12, then 24, then 60.

    Running it in the expanding direction rather than the compressing one is
    deliberate. Compression frames it as loss, and a reader watching a tensor
    shrink learns only that something went missing. Expansion frames it as
    what it is -- a small core plus one basis per mode is a *recipe* for the
    whole thing, and each mode product is one instruction in it.
    """
    import numpy as np
    core = np.arange(1, 9).reshape(2, 2, 2)
    U0 = np.array([[1, 0], [0, 1], [1, 1]])
    U1 = np.array([[1, 0], [0, 1], [1, 1], [2, 0]])
    U2 = np.array([[1, 0], [0, 1], [1, 1], [0, 2], [2, 1]])
    s1 = np.einsum("ip,pjk->ijk", U0, core)
    s2 = np.einsum("jq,iqk->ijk", U1, s1)
    s3 = np.einsum("kr,ijr->ijk", U2, s2)

    def pile(arr, cell, size):
        def draw(ax):
            planes(ax, arr, tint=tint, origin=centred(arr.shape, cell=cell),
                   cell=cell, label_size=size)
        return draw

    return [
        ("core", "(2, 2, 2) — 8 numbers",
         "the whole tensor, before any mode gets its size back",
         pile(core, 0.86, 17)),
        ("core x0 U0", "(3, 2, 2) — 12",
         "mode 0 grows to 3, and nothing else moves", pile(s1, 0.74, 14)),
        ("... x1 U1", "(3, 4, 2) — 24",
         "mode 1 grows to 4 — one factor, one axis", pile(s2, 0.60, 11)),
        ("... x2 U2", "(3, 4, 5) — 60",
         "three factors, three modes, the tensor is back", pile(s3, 0.50, 8)),
    ]


def scene_11_tt(tint):
    """11, third animation — the tensor train, which is a chain, not a block.

    Exercise 3 is *prove why TT matters* and it is the one model of the four in
    this notebook with no picture. It also needs one most: CP and Tucker are
    both "a small thing plus some factor matrices", so a reader can carry one
    mental image for both, and TT is a genuinely different shape of answer --
    the cores are strung in a line and each one touches only its neighbours.

    Frame 3 is what that buys. An entry of `T` is not looked up; it is walked
    to, one core at a time, and the rank between two cores is the width of the
    passage between them. That is why the middle rank is the only knob, and why
    a chain scales to twenty axes where a Tucker core does not.
    """
    import numpy as np
    rng = np.random.default_rng(5)
    G1 = rng.integers(0, 4, (3, 2))
    G2 = rng.integers(0, 4, (2, 4, 2))
    G3 = rng.integers(0, 4, (2, 5))
    T = np.einsum("ip,pjq,qk->ijk", G1, G2, G3)
    cost = G1.size + G2.size + G3.size

    def whole(ax):
        planes(ax, T, tint=tint, origin=centred(T.shape, cell=0.50),
               cell=0.50, label_size=8)

    def chain(ax):
        sequence(ax, [
            {"arr": G1, "caption": "G1  (3, 2)"},
            "-",
            {"arr": G2, "caption": "G2  (2, 4, 2)"},
            "-",
            {"arr": G3, "caption": "G3  (2, 5)"},
        ], tint=tint, cell=0.46, size=9)

    def budget(ax):
        sequence(ax, [
            {"arr": T, "labels": False, "caption": f"T  {T.size}"},
            "vs",
            {"arr": G1, "labels": False, "caption": str(G1.size)},
            {"arr": G2, "labels": False, "caption": str(G2.size)},
            {"arr": G3, "labels": False, "caption": str(G3.size)},
        ], tint=tint, cell=0.40, size=8)

    def one_entry(ax):
        r1 = G1[[1]]
        r3 = G3[:, [3]]
        sequence(ax, [
            {"arr": r1, "tint": INDEX["i"], "caption": "G1[1]"},
            "@",
            {"arr": G2[:, 2, :], "tint": INDEX["j"], "caption": "G2[:, 2]"},
            "@",
            {"arr": r3, "tint": INDEX["k"], "caption": "G3[:, 3]"},
        ], tint=tint, cell=0.62, size=13)

    return [
        ("T", f"{T.size} numbers", "one block, and every entry stored in it",
         whole),
        ("G1, G2, G3", "(3, 2) (2, 4, 2) (2, 5)",
         "a chain — each core touches only its neighbours", chain),
        ("storage", f"{cost} against {T.size}",
         "the rank between two cores is the width of the passage", budget),
        ("T[1, 2, 3]", "one walk along the chain",
         "an entry is not looked up, it is multiplied out", one_entry),
    ]


def scene_12(tint):
    """12 — the whole day, in the four moves it kept coming back to.

    Frames 0 and 1 hide plane 0, and that is a fix rather than a flourish. Both
    light something that lives behind it -- `T[1]` is the middle plane, and the
    fibre `T[:, 1, 3]` runs back through all three -- and the pile occludes
    exactly, so for months this scene rendered `T[1]` as a sliver down the
    right-hand edge and a reader saw a highlight with no shape to it. The
    module docstring names this trap and `_check_layout` cannot catch it; this
    is the scene it was caught in.

    Hiding the front plane rather than dimming it, for the reason `planes`
    gives: a dimmed plane still paints over what is behind it.
    """
    import numpy as np
    T = cube()
    o = centred(SHAPE)
    plane = np.zeros(SHAPE, bool); plane[1] = True
    fibre = np.zeros(SHAPE, bool); fibre[:, 1, 3] = True
    front = np.zeros(SHAPE, bool); front[0] = True

    def lit(mask, hide=None):
        def draw(ax):
            planes(ax, T, tint=tint, lit=mask, hide=hide, origin=o)
        return draw

    def transposed(ax):
        # A (5, 3, 4) pile is five planes deep, and five set-backs at the full
        # CELL reach up through the label. Drawn smaller rather than moved: the
        # frame is about the shape, and a shape reads off a whole pile.
        planes(ax, T.transpose(2, 0, 1), tint=tint, cell=0.58,
               origin=centred((5, 3, 4), cell=0.58), label_size=9)

    def summed(ax):
        planes(ax, T.sum(axis=2).reshape(1, 3, 4), tint=tint,
               origin=centred((1, 3, 4)), label_size=12)

    return [
        ("T[1]", "shape (4, 5)", "slice — fix one index",
         lit(plane, hide=front)),
        ("T[:, 1, 3]", "shape (3,)", "fibre — fix two",
         lit(fibre, hide=front)),
        ("T.transpose(2, 0, 1)", "shape (5, 3, 4)",
         "reorder — every number keeps its neighbours", transposed),
        ("T.sum(axis=2)", "shape (3, 4)",
         "contract — an axis is summed away", summed),
    ]


def scene_12_budget(tint):
    """12, second animation — what the day's three factorizations each cost.

    Arrays lifted straight from `scene_09`, `scene_10` and `scene_11`, so the
    recap is drawn from the numbers the sections were.

    No labels anywhere, and one `cell` across all four frames, which together
    are the whole design: the painted area *is* the budget. Sixty squares, then
    forty-eight, then thirty-two, then thirty-six, all the same size, so a
    reader compares three factorizations by looking rather than by reading the
    sums -- and the sums are printed anyway, on the note line, from the same
    shapes.

    Dropping the numbers is the other half. A (2, 20) block of rounded SVD
    entries would be sixty digits nobody can check against anything, which is
    the failure the module docstring warns about: a cube of real values shows
    the operation happening to numbers nobody can follow. The claim here is
    about counting, so counting is all that is drawn.
    """
    import numpy as np
    T = cube()
    U0 = np.arange(6).reshape(3, 2)
    U1 = np.arange(8).reshape(4, 2)
    U2 = np.arange(10).reshape(5, 2)
    core = np.arange(8).reshape(2, 2, 2)
    rng = np.random.default_rng(3)
    A = rng.integers(1, 4, (3, 3))
    B = rng.integers(1, 4, (4, 3))
    C = rng.integers(1, 4, (5, 3))
    Uf = np.zeros((3, 2), int)
    sf = np.zeros((1, 2), int)
    Vf = np.zeros((2, 20), int)

    # One size for every block on every frame, so equal area means equal cost.
    UNIT = 0.26

    def row(items):
        def draw(ax):
            sequence(ax, [it if isinstance(it, str) else {**it, "labels": False}
                          for it in items], tint=tint, cell=UNIT)
        return draw

    def whole(ax):
        planes(ax, T, tint=tint, cell=UNIT, labels=False,
               origin=centred(SHAPE, cell=UNIT))

    return [
        ("T", "60 numbers", "every frame after this one is smaller", whole),
        ("svd(unfold(T, 0))", "6 + 2 + 40 = 48",
         "flatten first — one matrix, and one axis privileged", row([
             {"arr": Uf, "caption": "U  (3, 2)"}, "x",
             {"arr": sf, "caption": "s  (2,)"}, "x",
             {"arr": Vf, "caption": "Vt  (2, 20)"}])),
        ("Tucker (2, 2, 2)", "8 + 6 + 8 + 10 = 32",
         "a core, and one basis per mode", row([
             {"arr": core, "caption": "core (2,2,2)"}, "x",
             {"arr": U0, "caption": "U0 (3,2)"}, "x",
             {"arr": U1, "caption": "U1 (4,2)"}, "x",
             {"arr": U2, "caption": "U2 (5,2)"}])),
        ("CP, rank 3", "9 + 12 + 15 = 36",
         "no core at all — three thin factors", row([
             {"arr": A, "caption": "A (3,3)"}, "x",
             {"arr": B, "caption": "B (4,3)"}, "x",
             {"arr": C, "caption": "C (5,3)"}])),
    ]


def scene_12_attention(tint):
    """12, third animation — the take-home the whole day was building towards.

    Take-home B is called *Attention is two contractions*, and it is the one
    place the workshop's own machinery lands on something a reader has already
    heard of from somewhere else. It had no picture.

    Deliberately drawn in `cube-06-matmul`'s vocabulary rather than a new one:
    the two einsum strings are the scene, and both are shapes of expression the
    reader met in section 06. `id,jd->ij` sums the feature axis away to score
    every query against every key; `ij,jd->id` sums the key axis away to mix
    the values. The softmax between them is the only step in the whole
    operation that is not a contraction, and frame 2 says so.

    Two queries and four keys, small enough that the row sums can be checked by
    eye -- which is the point of frame 2 and the reason the weights are drawn
    to two decimals rather than one.
    """
    import numpy as np
    Q = np.array([[1, 0, 1], [0, 2, 1]])
    K = np.array([[1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 2]])
    V = np.array([[2, 0], [0, 2], [1, 1], [3, 3]])
    scores = np.einsum("id,jd->ij", Q, K)
    w = np.exp(scores - scores.max(1, keepdims=True))
    w = np.round(w / w.sum(1, keepdims=True), 2)
    out = np.round(np.einsum("ij,jd->id", w, V), 2)

    def operands(ax):
        sequence(ax, [
            {"arr": Q, "tint": INDEX["i"], "caption": "Q  (2, 3)  id"},
            {"arr": K, "tint": INDEX["j"], "caption": "K  (4, 3)  jd"},
        ], tint=tint, cell=0.72, size=14)

    def score(ax):
        o = centred((1,) + scores.shape, cell=0.86)
        planes(ax, scores, tint=tint, origin=o, cell=0.86, label_size=17)
        axis_arrows(ax, (1,) + scores.shape, origin=o, cell=0.86,
                    names=(None, "i", "j"))

    def weights(ax):
        planes(ax, w, tint=tint, origin=centred((1,) + w.shape, cell=0.86),
               cell=0.86, label_size=15, decimals=2)

    def mix(ax):
        sequence(ax, [
            {"arr": w, "caption": "softmax  (2, 4)", "decimals": 2},
            "@",
            {"arr": V, "tint": INDEX["j"], "caption": "V  (4, 2)"},
            "=",
            {"arr": out, "caption": "out  (2, 2)", "decimals": 2},
        ], tint=tint, cell=0.50, size=10)

    return [
        ("Q, K", "(2, 3) and (4, 3)",
         "two queries, four keys, both described by d = 3", operands),
        ("einsum('id,jd->ij', Q, K)", "shape (2, 4)",
         "d is summed away — one score per query-key pair", score),
        ("softmax(scores)", "every row sums to 1",
         "the one step in attention that is not a contraction", weights),
        ("einsum('ij,jd->id', w, V)", "shape (2, 2)",
         "j summed away — two contractions, and a softmax between",
         mix),
    ]


def scene_13(tint):
    """13 — a kernel sliding, and the one flip that separates the two names."""
    import numpy as np
    img = np.arange(20).reshape(4, 5)
    k = np.array([[1, 2], [3, 4]])
    out = np.zeros((3, 4), int)
    for r in range(3):
        for c in range(4):
            out[r, c] = int((img[r:r + 2, c:c + 2] * k).sum())

    def window(r, c):
        def draw(ax):
            lit = np.zeros((1, 4, 5), bool)
            lit[0, r:r + 2, c:c + 2] = True
            hit = np.zeros((1, 3, 4), bool)
            hit[0, r, c] = True
            sequence(ax, [
                {"arr": img.reshape(1, 4, 5), "lit": lit, "caption": "image"},
                "*",
                {"arr": k.reshape(1, 2, 2), "caption": "kernel"},
                "->",
                {"arr": out.reshape(1, 3, 4), "lit": hit, "caption": "output"},
            ], tint=tint, cell=0.52)
        return draw

    def flip(ax):
        sequence(ax, [
            {"arr": k.reshape(1, 2, 2), "caption": "kernel"},
            "vs",
            {"arr": k[::-1, ::-1].reshape(1, 2, 2), "caption": "flipped"},
        ], tint=tint, cell=0.78)

    return [
        ("out[0, 0]", f"= {out[0, 0]}", "the window at the top left", window(0, 0)),
        ("out[0, 1]", f"= {out[0, 1]}", "slide one column", window(0, 1)),
        ("out[1, 0]", f"= {out[1, 0]}", "and one row down", window(1, 0)),
        ("convolution flips first", "correlation does not",
         "for an asymmetric kernel the two disagree", flip),
    ]


def scene_13_transposed(tint):
    """13, second animation — transposed convolution, scattering rather than gathering.

    `cube-13-convolution` slides a window and *gathers*: every output cell is a
    sum over the inputs under it. This runs the arrow the other way -- every
    input cell scatters a whole scaled kernel into the output, and the
    overlapping scatters add up. That is the operation, and its name is the
    trap: it recovers the shape convolution consumed, which is why the last
    frame says shape and not values. Nothing here inverts a blur.
    """
    import numpy as np
    x = np.array([[1, 2], [3, 4]])
    k = np.array([[1, 2], [3, 4]])
    full = np.zeros((3, 3), int)
    partial = []
    for r in range(2):
        for c in range(2):
            full[r:r + 2, c:c + 2] += x[r, c] * k
            partial.append((r, c, full.copy()))

    def scatter(n):
        r, c, out = partial[n]
        src = np.zeros((2, 2), bool)
        src[r, c] = True
        hit = np.zeros((3, 3), bool)
        hit[r:r + 2, c:c + 2] = True

        def draw(ax):
            sequence(ax, [
                {"arr": x, "lit": src, "caption": "x  (2, 2)"},
                "*",
                {"arr": k, "caption": "k  (2, 2)"},
                "->",
                {"arr": out, "lit": hit, "caption": "out  (3, 3)"},
            ], tint=tint, cell=0.62, size=13)
        return draw

    def shapes(ax):
        sequence(ax, [
            {"arr": x, "caption": "in  (2, 2)"},
            "->",
            {"arr": full, "caption": "out  (3, 3)"},
        ], tint=tint, cell=0.72, size=14)

    return [
        ("x[0, 0] scatters", "1 x k into out[0:2, 0:2]",
         "every input writes a whole kernel, scaled", scatter(0)),
        ("x[0, 1] scatters", "2 x k, one column across",
         "where two scatters overlap, they add", scatter(1)),
        ("x[1, 1] scatters", "4 x k, the last one",
         "four scatters, nine output cells", scatter(3)),
        ("conv_transpose", "(2, 2) -> (3, 3)",
         "the shape convolution consumed, given back — not the values",
         shapes),
    ]


def scene_13_modes(tint):
    """13, third animation — valid, same and full, as three output lengths.

    The notebook has a section called *`valid`, `same`, and `full` in plain
    language* and an explorer widget behind it, and no picture. The three modes
    are the first thing that bites anybody wiring a convolution into a network,
    because picking the wrong one is not an error -- it is a tensor of the
    wrong length arriving somewhere that accepts it.

    One dimension, five samples, three taps, so all three answers fit on one
    row and the arithmetic in the captions is checkable without trusting
    anything: 5 - 3 + 1, then 5, then 5 + 3 - 1.
    """
    import numpy as np
    x = np.array([1, 2, 0, 3, 1])
    k = np.array([1, 0, 2])
    outs = {m: np.convolve(x, k, mode=m) for m in ("valid", "same", "full")}

    def operands(ax):
        sequence(ax, [
            {"arr": x.reshape(1, 5), "caption": "x  (5,)"},
            "*",
            {"arr": k.reshape(1, 3), "tint": INDEX["k"], "caption": "k  (3,)"},
        ], tint=tint, cell=0.80, size=16)

    def mode(name):
        def draw(ax):
            y = outs[name]
            sequence(ax, [
                {"arr": x.reshape(1, 5), "caption": "x  (5,)"},
                "->",
                {"arr": y.reshape(1, len(y)), "caption": f"{name}  ({len(y)},)"},
            ], tint=tint, cell=0.62, size=13)
        return draw

    return [
        ("x * k", "(5,) and (3,)",
         "five samples and a three-tap kernel", operands),
        ("mode='valid'", "shape (3,)",
         "only where the kernel fits whole — 5 - 3 + 1", mode("valid")),
        ("mode='same'", "shape (5,)",
         "padded so the output is as long as the input", mode("same")),
        ("mode='full'", "shape (7,)",
         "every overlap counts, edges included — 5 + 3 - 1", mode("full")),
    ]


def scene_14(tint):
    """14 -- a component is one profile per axis, and the peaks are the point.

    `cube-11-outer` already builds a rank-1 term out of three vectors, so this
    does not build one again. It asks the question deep dive 14 opens with:
    given the term, what is a reader allowed to read off it? Each vector is
    lit at its own peak, and the last frame puts the single entry those three
    peaks meet at. The peak is deliberately in plane 0 of the pile: `planes`
    paints front-last and covers exactly, so a lit cell anywhere behind would
    come out invisible.
    """
    import numpy as np
    a = np.array([4, 1, 2])
    b = np.array([2, 1, 5, 3])
    c = np.array([3, 1, 2, 4, 1])
    abc = np.einsum("i,j,k->ijk", a, b, c)

    def peak(vec, shape, caption):
        lit = np.zeros(len(vec), bool)
        lit[int(np.argmax(vec))] = True

        def draw(ax):
            sequence(ax, [{"arr": vec.reshape(shape),
                           "lit": lit.reshape(shape),
                           "caption": caption}],
                     tint=tint, cell=0.66, size=13)
        return draw

    def meeting(ax):
        lit = np.zeros(abc.shape, bool)
        lit[0, int(np.argmax(b)), int(np.argmax(c))] = True
        planes(ax, abc, tint=tint, lit=lit, origin=centred(SHAPE),
               label_size=8.0)

    return [
        ("a", "argmax = 0", "one number per neuron", peak(a, (3, 1), "a  (3,)")),
        ("b", "argmax = 2", "one number per time step",
         peak(b, (1, 4), "b  (4,)")),
        ("c", "argmax = 3", "one number per trial",
         peak(c, (1, 5), "c  (5,)")),
        ("a x b x c", "T[0, 2, 3] = 80", "where the three peaks meet", meeting),
    ]


def scene_14_als(tint):
    """14, second animation -- fix two factors, solve the third.

    The move the notebook is named after is not the model, it is the fit: with
    two factors held still the third is an ordinary least-squares problem, the
    one section 07 already solved with a pseudoinverse. So each frame pales
    two matrices and lights one, and the note carries the closed form that
    frame is solving. The last frame lights all three, because a sweep is the
    three of them in order and the error after it can only have fallen.
    """
    import numpy as np
    rng = np.random.default_rng(14)
    A = rng.integers(1, 5, (3, 2))
    B = rng.integers(1, 5, (4, 2))
    C = rng.integers(1, 5, (5, 2))
    mats = [("A (3,2)", A), ("B (4,2)", B), ("C (5,2)", C)]

    def sweep(active):
        def draw(ax):
            items = []
            for i, (caption, M) in enumerate(mats):
                if items:
                    items.append("x")
                items.append({"arr": M, "caption": caption,
                              "lit": np.full(M.shape, active in (i, -1))})
            sequence(ax, items, tint=tint, cell=0.56, size=11)
        return draw

    return [
        ("solve A", "A = T(0) (B \u2299 C) G+", "B and C held still", sweep(0)),
        ("solve B", "B = T(1) (A \u2299 C) G+", "now A and C are the fixed pair",
         sweep(1)),
        ("solve C", "C = T(2) (A \u2299 B) G+", "and once more, round the modes",
         sweep(2)),
        ("one sweep", "3 least squares", "each step is convex, so the error "
         "cannot rise", sweep(-1)),
    ]


def scene_14_unique(tint):
    """14, third animation — what "essentially unique" gives away, and what it keeps.

    Exercise 5 is *essentially unique, and what ALS returns*, and the phrase
    does a lot of quiet work. A reader who has just been told CP is unique --
    unlike the rotation ambiguity notebook 11 shows for NMF -- then runs ALS
    twice, gets two different-looking factor sets, and reasonably concludes
    they were lied to.

    They were not. Two things are free and nothing else is: which component is
    called first, and how a component's size is split between its three
    vectors. Both are drawn here, and both leave the tensor identical, which is
    what the note says on frames 2 and 3. The direction of each vector is what
    is pinned, and that is the part worth having.
    """
    import numpy as np
    A = np.array([[1, 2], [2, 1]])
    B = np.array([[3, 1], [1, 2]])
    C = np.array([[2, 1], [1, 3]])
    T = np.einsum("ir,jr,kr->ijk", A, B, C)

    def factors(a, b, c, lit=None):
        def draw(ax):
            mark = (lambda m: {"lit": m}) if lit is not None else (lambda m: {})
            sequence(ax, [
                dict({"arr": a, "tint": INDEX["i"], "caption": "A"}, **mark(lit)),
                dict({"arr": b, "tint": INDEX["j"], "caption": "B"}, **mark(lit)),
                dict({"arr": c, "tint": INDEX["k"], "caption": "C"}, **mark(lit)),
            ], tint=tint, cell=0.80, size=16)
        return draw

    def tensor(ax):
        planes(ax, T, tint=tint, origin=centred(T.shape, cell=0.82), cell=0.82,
               label_size=16)

    swap = [1, 0]
    scaled_A = A * np.array([2, 1])
    scaled_B = B * np.array([0.5, 1])
    assert np.allclose(np.einsum("ir,jr,kr->ijk", A[:, swap], B[:, swap],
                                 C[:, swap]), T)
    assert np.allclose(np.einsum("ir,jr,kr->ijk", scaled_A, scaled_B, C), T)

    return [
        ("A, B, C", "rank 2", "two components, one vector per axis each",
         factors(A, B, C)),
        ("T = sum of two outer products", "shape (2, 2, 2)",
         "the tensor those six vectors make", tensor),
        ("columns swapped", "T is unchanged",
         "which component is called first was never decided", 
         factors(A[:, swap], B[:, swap], C[:, swap])),
        ("A[:, 0] x 2, B[:, 0] / 2", "T is unchanged",
         "order and scale are free; the directions are not",
         factors(scaled_A, scaled_B, C)),
    ]


def scene_15_missing(tint):
    """15, third animation — the term you do not add.

    The notebook's closing idea is *missing data is one more term you do not
    add*, and it had no picture. It is the natural last scene for the whole
    module too, because it is the one place `ghost` means exactly what it means
    under broadcasting -- a cell the shape promises and nothing filled in --
    and the arithmetic turns on telling that apart from a zero.

    Frame 2 is the mistake, drawn rather than described. Treating a missing
    count as a measured zero does not fail; it contributes `m^2` to the
    objective, and it contributes most where the model predicted most, so a
    fit pulled towards the cells it knows least about is exactly what comes
    out. The lit cells are the damage.
    """
    import numpy as np
    X = np.array([[4, 2, 0, 3], [1, 5, 2, 0], [3, 0, 6, 2]])
    seen = np.ones(X.shape, bool)
    for r, c in ((0, 2), (1, 3), (2, 1)):
        seen[r, c] = False
    # The model is deliberately close on the cells that were measured and
    # nowhere near zero on the three that were not -- that is what makes the
    # third frame an argument rather than a diagram. A missing cell read as a
    # measured zero contributes m^2, so the damage is largest exactly where
    # the model is most confident, and the numbers say so: 25, 16 and 36
    # against errors of 0 and 1 everywhere else.
    M = np.array([[3, 2, 5, 3], [2, 4, 2, 4], [3, 6, 5, 2]])
    err_all = (np.where(seen, X, 0) - M) ** 2
    gone = ~seen

    def grid(arr, ghost=None, lit=None, decimals=1, cell=0.80, size=16):
        def draw(ax):
            planes(ax, arr, tint=tint, ghost=ghost, lit=lit,
                   ghost_labels=False, decimals=decimals,
                   origin=centred((1,) + arr.shape, cell=cell), cell=cell,
                   label_size=size)
        return draw

    return [
        ("X", "12 cells, 9 of them measured",
         "the dashed cells were never recorded", grid(X, ghost=gone)),
        ("mask", "9 of 12",
         "1 where there is a measurement, 0 where there is not",
         grid(seen.astype(int))),
        ("(X - M) ** 2, every cell", f"total {int(err_all.sum())}",
         "a missing cell read as a zero — the lit ones are the damage",
         grid(err_all, lit=gone, size=15)),
        ("summed over the mask only", f"total {int(err_all[seen].sum())}",
         "missing data is one more term you do not add",
         grid(err_all, ghost=gone, size=15)),
    ]


def scene_15(tint):
    """15 -- one model, one residual, and what different losses charge for it.

    Everything CP is stays fixed across the four frames: the same counts, the
    same predictions, the same residual in every cell. Only the penalty column
    changes. The two lit cells both miss by 2, on counts of
    2 and 40, and the whole animation exists to show that squared error prices
    them the same and the Poisson loss does not. They are the notebook's
    predict-first argument at a size that survives being drawn: that cell uses
    2/4 and 2000/2002, three orders of magnitude apart, and a 2000 does not fit
    in a cell. 40 is about the largest count whose Poisson deviance still
    renders at `cell_text`'s one decimal -- 0.1 rather than 0.0 -- which is
    what puts the ratio here at 12x against the cell's 614x.
    """
    import numpy as np
    x = np.array([[2, 1, 7], [1, 40, 3]])
    m = np.array([[4, 2, 6], [2, 42, 4]])
    squared = (x - m) ** 2
    deviance = np.round(2 * (m - x + x * np.log(x / m)), 2)

    lit = np.zeros(x.shape, bool)
    lit[0, 0] = True
    lit[1, 1] = True

    def row(penalty, caption):
        def draw(ax):
            sequence(ax, [
                {"arr": x, "lit": lit, "caption": "x  counts"},
                {"arr": m, "lit": lit, "caption": "m  model"},
                "->",
                {"arr": penalty, "lit": lit, "caption": caption},
            ], tint=tint, cell=0.62, size=11)
        return draw

    def both(ax):
        sequence(ax, [
            {"arr": squared, "lit": lit, "caption": "squared"},
            "vs",
            {"arr": deviance, "lit": lit, "caption": "Poisson"},
        ], tint=tint, cell=0.72, size=12)

    def data(ax):
        sequence(ax, [
            {"arr": x, "lit": lit, "caption": "x  counts"},
            "vs",
            {"arr": m, "lit": lit, "caption": "m  model"},
        ], tint=tint, cell=0.72, size=12)

    return [
        ("x and m", "both lit cells miss by 2", "one count is 2, one is 40",
         data),
        ("squared error", "(x - m)^2", "both misses cost 4",
         row(squared, "(x - m)^2")),
        ("Poisson", "2(m - x + x log x/m)", "now they do not",
         row(deviance, "deviance")),
        ("same model", "1.2 vs 0.1", "the loss is where you say what x is",
         both),
    ]


def scene_15_binary(tint):
    """15, second animation -- why a 0/1 tensor needs a link, not a constraint.

    Four frames and one claim: a squared-error fit of a binary tensor puts
    numbers on the line where only two are meaningful, and a Bernoulli model
    cannot, without anything bounding it. The lit cells in frame 2 are the
    ones outside [0, 1]. Frame 4 lights every cell instead, deliberately: the
    claim there is about the whole matrix, not about two cells in it, and
    lighting only the two that used to be out of range would read as though
    they had been repaired one at a time rather than that nothing can leave
    the interval. The arithmetic between the two is printed, so the frame is
    an argument rather than an assertion.
    """
    import numpy as np
    x = np.array([[1, 0, 1], [0, 1, 1]])
    gauss = np.array([[1.2, -0.1, 0.9], [0.2, 0.8, 0.95]])
    odds = np.array([[5.0, 0.2, 3.0], [0.3, 2.0, 4.0]])
    prob = np.round(odds / (1 + odds), 2)

    outside = (gauss < 0) | (gauss > 1)

    def one(arr, caption, lit=None, cell=0.78):
        def draw(ax):
            sequence(ax, [{"arr": arr, "lit": lit, "caption": caption}],
                     tint=tint, cell=cell, size=13)
        return draw

    def link(ax):
        sequence(ax, [
            {"arr": odds, "caption": "m  odds"},
            "->",
            {"arr": prob, "caption": "m / (1 + m)"},
        ], tint=tint, cell=0.68, size=12)

    return [
        ("x", "every entry 0 or 1", "did it happen at all",
         one(x, "x  (2, 3)")),
        ("squared error", "-0.1 and 1.2", "two cells left the interval",
         one(gauss, "m  (2, 3)", lit=outside)),
        ("Bernoulli", "m > 0", "the model value is the odds, not a probability",
         one(odds, "m  odds")),
        ("m / (1 + m)", "all of (0, 1)", "a probability, and nothing bounded it",
         link),
    ]


# ─── the table ──────────────────────────────────────────────────────────────
#
# One row per notebook, so a filename, a notebook and the move it illustrates
# cannot drift apart. `gen_slide_art.SLIDES` is the same idea for the decks.
#
# A row is a list because a notebook carries several animations: the first
# draws the move the section is named after, the second a move it needs and the
# first has no room for, the third the section's own subject. The floor is
# `MIN_PER_NOTEBOOK`, which `main` reports against rather than enforces.
#
# A row may carry a third element, a dict of `render` keywords for the one
# scene that needs them. Every stem keeps the `cube-NN-` prefix, which is what
# check 1 in `check_links.py` reads to tell a notebook's own animation from
# another notebook's pasted into it by mistake.

SCENES = {
    "00": [("cube-00-axes", scene_00),
           ("cube-00-index", scene_00_index),
           ("cube-00-shape", scene_00_shape)],
    "01": [("cube-01-order", scene_01),
           ("cube-01-slice-fibre", scene_01_slice_fibre),
           ("cube-01-rank", scene_01_rank)],
    # cube-02-relabel is gone, not renamed: the stem said what the old scene
    # did (relabel the axes and change nothing) and the new one does the
    # opposite. Nothing else in the repo refers to it but notebook 02's own
    # two mentions, and check 1 catches a missed one by name.
    "02": [("cube-02-shuffle", scene_02),
           ("cube-02-stack", scene_02_stack),
           ("cube-02-pad", scene_02_pad)],
    "03": [("cube-03-broadcast", scene_03),
           ("cube-03-scalar", scene_03_scalar),
           ("cube-03-mask", scene_03_mask)],
    # cube-04-rgb is the one scene drawn in real colour, and the only one that
    # needs a wider palette: twelve saturated fills, their washes, and the ink
    # that flips between them. A GIF colour table rounds up to a power of two,
    # so 128 and 96 cost the same bytes -- ask for 128.
    "04": [("cube-04-transpose-vs-reshape", scene_04),
           ("cube-04-ravel", scene_04_ravel),
           ("cube-04-rgb", scene_04_rgb, {"colors": 128})],
    # cube-05-sampling and cube-05-axes both paint real colour, for the reason
    # cube-04-rgb does: a clip has to look like moments rather than numbers.
    "05": [("cube-05-sampling", scene_05, {"colors": 128}),
           ("cube-05-window", scene_05_window),
           ("cube-05-axes", scene_05_axes, {"colors": 128})],
    "06": [("cube-06-contract", scene_06),
           ("cube-06-outer", scene_06_outer),
           ("cube-06-matmul", scene_06_matmul)],
    "07": [("cube-07-pinv", scene_07),
           ("cube-07-shapes", scene_07_shapes),
           ("cube-07-residual", scene_07_residual)],
    "08": [("cube-08-recurrence", scene_08),
           ("cube-08-power", scene_08_power),
           ("cube-08-direction", scene_08_direction)],
    "09": [("cube-09-svd", scene_09),
           ("cube-09-rank", scene_09_rank),
           ("cube-09-nmf", scene_09_nmf)],
    "10": [("cube-10-tucker", scene_10),
           ("cube-10-unfold", scene_10_unfold),
           ("cube-10-modes", scene_10_modes)],
    "11": [("cube-11-cp", scene_11),
           ("cube-11-outer", scene_11_outer),
           ("cube-11-tt", scene_11_tt)],
    "12": [("cube-12-recap", scene_12),
           ("cube-12-budget", scene_12_budget),
           ("cube-12-attention", scene_12_attention)],
    "13": [("cube-13-convolution", scene_13),
           ("cube-13-transposed", scene_13_transposed),
           ("cube-13-modes", scene_13_modes)],
    "14": [("cube-14-profile", scene_14), ("cube-14-als", scene_14_als),
           ("cube-14-unique", scene_14_unique)],
    "15": [("cube-15-loss", scene_15), ("cube-15-binary", scene_15_binary),
           ("cube-15-missing", scene_15_missing)],
}


# The floor, and now enforced. Three counts in this file went stale at once when
# the second animation per notebook became a third -- two docstrings and a
# comment all said twenty-eight while `SCENES` held thirty-two -- so the number
# lives here rather than in prose that nobody re-reads.
#
# It shipped as a printed advisory rather than a failure, deliberately: twelve
# notebooks were still on two, and a generator that refused to draw anything
# until every one of them reached three would have been useless for exactly the
# work that got them there. All sixteen are there now, so the advisory becomes
# the guard it was written to be. Nothing else can catch this -- check 1 in
# `check_links.py` tests that a notebook's animations are its own and never how
# many there are.
MIN_PER_NOTEBOOK = 3


def check_table() -> None:
    """The table's own invariants, which nothing downstream can see.

    Check 1 in `check_links.py` asks a notebook whether the animations it shows
    are its own. Nothing asks `SCENES` the mirror question, and it has two
    answers worth having:

    A duplicate stem silently overwrites -- two entries, one file, and the
    second render wins with no warning at all.

    A stem filed under the wrong notebook is worse, because it half-works: the
    file is drawn, in the *wrong notebook's accent*, under a name check 1 will
    then reject as another notebook's animation. The failure surfaces two tools
    away from its cause.

    And the count. That one was a printed line while the rollout was in flight;
    now that every notebook is at `MIN_PER_NOTEBOOK` it is a failure, so a
    notebook cannot quietly drop back to two.
    """
    stems = [stem for row in SCENES.values() for stem, *_ in row]
    dupes = sorted({s for s in stems if stems.count(s) > 1})
    if dupes:
        raise SystemExit(f"SCENES has duplicate stems: {', '.join(dupes)} -- "
                         f"the second would silently overwrite the first")
    for n, row in SCENES.items():
        for stem, *_ in row:
            if not stem.startswith(f"cube-{n}-"):
                raise SystemExit(
                    f"{stem} is filed under notebook {n}, so it would be drawn "
                    f"in {n}'s accent and then rejected by check 1 as another "
                    f"notebook's animation")
    short = sorted(n for n, row in SCENES.items()
                   if len(row) < MIN_PER_NOTEBOOK)
    if short:
        raise SystemExit(
            f"notebooks {', '.join(short)} carry fewer than "
            f"{MIN_PER_NOTEBOOK} animations. The third is the one that draws "
            f"the section's own subject rather than the shared arange cube -- "
            f"see the module docstring.")


def main(only=None) -> None:
    check_table()
    stack()
    print("Cube GIFs")
    total = 0
    count = 0
    for n, scenes in SCENES.items():
        if only and n not in only:
            continue
        tint = accent_of(n)
        for stem, build, *rest in scenes:
            # A scene is (stem, builder), or (stem, builder, options) where
            # options is whatever `render` keyword this one scene needs --
            # today only the RGB scene, and only for its palette.
            out = render(tint, build(tint), f"{stem}.gif",
                         **(rest[0] if rest else {}))
            total += out.stat().st_size
            count += 1
    print(f"  {count} animations, {total / 1024:.0f} KB total")


if __name__ == "__main__":
    main(set(sys.argv[1:]) or None)
