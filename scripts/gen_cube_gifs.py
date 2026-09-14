#!/usr/bin/env python3
"""Draw two small numbered cubes per notebook, doing the things it teaches.

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

TWO ANIMATIONS PER NOTEBOOK
---------------------------
`SCENES` holds a list per notebook: the first draws the move the section is
named after, the second a move it needs and the first has no room for. Every
stem keeps the `cube-NN-` prefix, which is what check 1 in `check_links.py`
reads to tell a notebook's own animation from another notebook's pasted into
it -- the mistake a count could never catch, and the likeliest one, since these
cells are copied between notebooks and the number in the URL is the part you
have to remember to change.

THREE WAYS A SCENE GOES WRONG SILENTLY
--------------------------------------
Twenty-eight animations of four frames is more than anybody re-reads after a
one-line change, and matplotlib reports none of these. `_check_layout` measures
the first two after a draw and refuses the frame:

- The `sub` and `note` captions share one baseline at opposite ends of it, so a
  long pair prints one sentence through the other.
- A pile tall enough for its own shape grows up through the label, because
  `centred` centres on the caption band without asking how much band there is.
- Two `sequence` captions collide under piles too narrow to carry them.

The third it cannot catch, and it is the one to know before writing a scene:
the planes occlude exactly, so `lit` on a cell of plane 1 or 2 highlights
something plane 0 is painted over, and the frame comes out with nothing
visibly selected. Light plane 0, or `hide` what is in front of what you mean.
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
    # invisible to anyone who does not open all 28 files and read every frame.
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


def cell_text(v) -> str:
    """A number as it should appear inside a cell.

    Whole numbers stay whole -- the index cubes are `arange`, and `0.0` where a
    reader expects `0` reads as a bug. Everything else gets one decimal, which
    is all that fits and all a factor matrix needs to make its point.
    """
    v = float(v)
    if v == int(v):
        return str(int(v))
    return f"{v:.1f}"


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
           lit_tint=None):
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
                hot = lit_tint if (on and lit_tint) else tint
                if faint:
                    ax.add_patch(Rectangle(
                        (x, y), cell, cell, facecolor="none",
                        edgecolor=_mix(tint, 0.35), linewidth=1.0,
                        linestyle=(0, (2.4, 2.0)), zorder=2 * (d - i)))
                else:
                    ax.add_patch(Rectangle(
                        (x, y), cell, cell,
                        facecolor=_mix(hot, 0.30 if on else 0.88),
                        edgecolor=INK if on else _mix(INK, 0.70),
                        linewidth=0.7, zorder=2 * (d - i)))
                if labels:
                    ax.text(x + cell / 2, y + cell / 2, cell_text(arr[i, r, c]),
                            ha="center", va="center", fontsize=label_size,
                            family="monospace", zorder=2 * (d - i) + 1,
                            style="italic" if faint else "normal",
                            color=_mix(INK, 0.45) if faint
                            else (INK if on else _mix(INK, 0.55)))
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
    `ghost`, `lit_tint`, `caption` and `labels`. `size` sets the label point size for
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
    that can notice. Twenty-eight animations of four frames is more than
    anybody re-reads after a one-line change to a caption.
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


def render(tint, states, out_name, *, duration=1800, colors=48):
    """Each state is (label, note, sub, draw) -- draw gets the axes.

    `duration` is per frame, in milliseconds, and one global value rather than
    a per-scene one: a reader who has learnt the pace of one animation should
    not have to relearn it on the next. 1800 ms is deliberately slow. A frame
    here is not a tween -- it is a whole labelled picture with a caption and a
    shape line, and 900 ms was not long enough to read a 60-cell grid once,
    let alone compare it with the frame before. The stepper cell in each
    notebook is the other half of the answer: this sets the pace for a reader
    watching, that one hands the frames over for a reader studying.
    """
    frames = []
    for i, (label, note, sub, draw) in enumerate(states):
        plt, fig, ax = frame(tint, label, note, sub)
        draw(ax)
        _check_layout(fig, ax, out_name, i)
        frames.append(canvas_to_pil(fig))
        plt.close(fig)
    out = write_gif(frames, IMAGES / out_name, duration=duration, loop=0,
                    colors=colors, max_kb=MAX_KB)
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


def scene_02(tint):
    """02 — same numbers, two readings. Nothing moves; only the naming changes."""
    import numpy as np
    T = cube()
    first = np.zeros(SHAPE, bool)
    first[0] = True
    o = centred(SHAPE)

    def draw(lit):
        def inner(ax):
            planes(ax, T, tint=tint, lit=lit, origin=o)
        return inner

    return [
        ("(batch, time, feature)", "shape (3, 4, 5)",
         "3 samples x 4 timesteps x 5 features", draw(None)),
        ("T[0]  # batch 0", "shape (4, 5)",
         "one sample, its whole history", draw(first)),
        ("(time, batch, feature)", "shape (3, 4, 5)",
         "4 samples x 3 timesteps x 5 features -- same numbers", draw(None)),
        ("T[0]  # time 0", "shape (4, 5)",
         "every sample at one instant -- same cells, other meaning", draw(first)),
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


def scene_05(tint):
    """05 — sampling: what a smaller tensor quietly threw away."""
    import numpy as np
    T = cube()
    o = centred(SHAPE)
    drop = np.zeros(SHAPE, bool)
    drop[1] = True

    def whole(ax):
        planes(ax, T, tint=tint, origin=o)

    def dim(ax):
        planes(ax, T, tint=tint, lit=~drop, origin=o)

    def gone(ax):
        planes(ax, T, tint=tint, hide=drop, origin=o)

    def kept(ax):
        planes(ax, T[::2], tint=tint, origin=centred((2, 4, 5)))

    return [
        ("clip", "shape (3, 4, 5)", "every recorded plane", whole),
        ("clip[::2]", "keeping 2 of 3", "plane 1 is about to go", dim),
        ("clip[::2]", "keeping 2 of 3", "and it is gone — the gap is the point", gone),
        ("clip[::2]", "shape (2, 4, 5)",
         "clip[1] is plane 2 now, not plane 1", kept),
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


def scene_12(tint):
    """12 — the whole day, in the four moves it kept coming back to."""
    import numpy as np
    T = cube()
    o = centred(SHAPE)
    plane = np.zeros(SHAPE, bool); plane[1] = True
    fibre = np.zeros(SHAPE, bool); fibre[:, 1, 3] = True

    def lit(mask):
        def draw(ax):
            planes(ax, T, tint=tint, lit=mask, origin=o)
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
        ("T[1]", "shape (4, 5)", "slice — fix one index", lit(plane)),
        ("T[:, 1, 3]", "shape (3,)", "fibre — fix two", lit(fibre)),
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


# ─── the table ──────────────────────────────────────────────────────────────
#
# One row per notebook, so a filename, a notebook and the move it illustrates
# cannot drift apart. `gen_slide_art.SLIDES` is the same idea for the decks.
#
# A row is a list because a notebook carries two animations, not one: the first
# draws the move the section is named after, the second a move it needs and the
# first has no room for. Every stem keeps the `cube-NN-` prefix, which is what
# check 1 in `check_links.py` reads to tell a notebook's own animation from
# another notebook's pasted into it by mistake.

SCENES = {
    "00": [("cube-00-axes", scene_00),
           ("cube-00-index", scene_00_index)],
    "01": [("cube-01-order", scene_01),
           ("cube-01-slice-fibre", scene_01_slice_fibre)],
    "02": [("cube-02-relabel", scene_02),
           ("cube-02-stack", scene_02_stack)],
    "03": [("cube-03-broadcast", scene_03),
           ("cube-03-scalar", scene_03_scalar)],
    "04": [("cube-04-transpose-vs-reshape", scene_04),
           ("cube-04-ravel", scene_04_ravel)],
    "05": [("cube-05-sampling", scene_05),
           ("cube-05-window", scene_05_window)],
    "06": [("cube-06-contract", scene_06),
           ("cube-06-outer", scene_06_outer)],
    "07": [("cube-07-pinv", scene_07),
           ("cube-07-shapes", scene_07_shapes)],
    "08": [("cube-08-recurrence", scene_08),
           ("cube-08-power", scene_08_power)],
    "09": [("cube-09-svd", scene_09),
           ("cube-09-rank", scene_09_rank)],
    "10": [("cube-10-tucker", scene_10),
           ("cube-10-unfold", scene_10_unfold)],
    "11": [("cube-11-cp", scene_11),
           ("cube-11-outer", scene_11_outer)],
    "12": [("cube-12-recap", scene_12),
           ("cube-12-budget", scene_12_budget)],
    "13": [("cube-13-convolution", scene_13),
           ("cube-13-transposed", scene_13_transposed)],
}


def main(only=None) -> None:
    stack()
    print("Cube GIFs")
    total = 0
    count = 0
    for n, scenes in SCENES.items():
        if only and n not in only:
            continue
        tint = accent_of(n)
        for stem, build in scenes:
            out = render(tint, build(tint), f"{stem}.gif")
            total += out.stat().st_size
            count += 1
    print(f"  {count} animations, {total / 1024:.0f} KB total")


if __name__ == "__main__":
    main(set(sys.argv[1:]) or None)
