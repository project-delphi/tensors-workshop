#!/usr/bin/env python3
"""Draw one small numbered cube per notebook, doing the thing that notebook teaches.

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
nobody can follow. `T[1, 2, 3] == 23` can be checked by eye, and being able to
check it by eye is the entire reason the picture exists.

FOUR RULES THE DRAWING FOLLOWS
------------------------------
**No prose on the images.** Every caption is an expression or a shape --
`T[1]`, `(4, 5)`, `axis 0` -- which reads the same in English and in Spanish.
One GIF therefore serves both languages, and there is no second asset to keep
in step with the first. The sentence that explains the picture lives in the
notebook cell, where it is written out in both.

**Every frame is a complete picture.** `fig_hero` in `gen_figures.py` records
what happens otherwise: Chrome, on reaching the end of a finite loop, goes back
to displaying frame 0, and in a build-from-empty animation that is the emptiest
frame there is -- the banner "sat there showing a single grey square". So no
scene here starts from nothing. Each one cycles between complete states, and
whichever frame a browser parks on still says something true.

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
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from gen_notebooks import ACCENTS                                  # noqa: E402
from gen_thumbnails import IMAGES, INK, canvas_to_pil, write_gif   # noqa: E402

PAPER = "#ffffff"
MUTE = "#7b8794"

# A ceiling per file, not a target. Flat colour quantizes well and these land
# far below it; the point is that nothing in CI looks at image sizes, so the
# generator has to be the thing that notices.
MAX_KB = 250

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

    ax.text(0.30, YLIM[1] - 0.30, label, ha="left", va="top",
            fontsize=17, family="monospace", color=tint)
    if note:
        # Bottom right, not top right: the axis 0 arrow runs up into the top
        # right corner on every scene that draws one, and the two collided.
        ax.text(XLIM[1] - 0.30, 0.22, note, ha="right", va="bottom",
                fontsize=15, family="monospace", color=MUTE)
    if sub:
        ax.text(0.30, 0.22, sub, ha="left", va="bottom",
                fontsize=13.5, family="monospace", color=MUTE)
    return plt, fig, ax


def axis_arrows(ax, shape, origin=BODY, cell=CELL):
    """The three axis names, each along the edge it actually runs down."""
    d, rows, cols = shape
    w, h = extent(shape, cell=cell)
    x0, y0 = origin

    # axis 2 runs across the front plane, under it.
    ax.annotate("", xy=(x0 + cols * cell, y0 - 0.26), xytext=(x0, y0 - 0.26),
                arrowprops=dict(arrowstyle="->", color=MUTE, lw=1.3))
    ax.text(x0 + cols * cell / 2, y0 - 0.44, f"axis 2 ({cols})", ha="center",
            va="top", fontsize=12, family="monospace", color=MUTE)

    # axis 1 runs down the front plane, to its left.
    ax.annotate("", xy=(x0 - 0.26, y0), xytext=(x0 - 0.26, y0 + rows * cell),
                arrowprops=dict(arrowstyle="->", color=MUTE, lw=1.3))
    ax.text(x0 - 0.40, y0 + rows * cell / 2, f"axis 1 ({rows})", ha="right",
            va="center", fontsize=12, family="monospace", color=MUTE,
            rotation=90)

    # axis 0 runs back along the pile, above it.
    dx, dy = step_for(cell)
    bx, by = x0 + cols * cell + 0.18, y0 + rows * cell + 0.14
    ax.annotate("", xy=(bx + (d - 1) * dx, by + (d - 1) * dy),
                xytext=(bx, by),
                arrowprops=dict(arrowstyle="->", color=MUTE, lw=1.3))
    ax.text(bx + (d - 1) * dx + 0.16, by + (d - 1) * dy + 0.10,
            f"axis 0 ({d})", ha="left", va="bottom", fontsize=12,
            family="monospace", color=MUTE)


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


def planes(ax, arr, *, tint, lit=None, hide=None, labels=True, cell=CELL,
           origin=BODY, label_size=10.0, edge_axis=True):
    """One tensor as its pile of (axis 1, axis 2) matrices, drawn back to front.

    `lit` is a boolean mask of the entries this frame is about: those take the
    accent, the rest go pale. `hide` drops entries entirely -- for a slice
    lifted clear of the pile, where dimming is not enough because the reader
    has to see the gap it came out of.

    Occlusion needs no depth sort. A plane is painted opaque, and the planes
    are painted from the back of the pile forwards, so a nearer plane simply
    covers what is behind it.
    """
    import numpy as np
    from matplotlib.patches import Rectangle

    arr = np.asarray(arr)
    if arr.ndim == 2:                      # a lone matrix is a pile of one
        arr = arr[None, :, :]
    d, rows, cols = arr.shape
    lit = np.ones(arr.shape, bool) if lit is None else np.broadcast_to(lit, arr.shape)
    hide = np.zeros(arr.shape, bool) if hide is None else np.broadcast_to(hide, arr.shape)

    for i in range(d - 1, -1, -1):         # back of the pile first
        ox, oy = plane_origin(i, origin, cell)
        top = oy + rows * cell
        for r in range(rows):
            for c in range(cols):
                if hide[i, r, c]:
                    continue
                on = bool(lit[i, r, c])
                x, y = ox + c * cell, top - (r + 1) * cell
                ax.add_patch(Rectangle(
                    (x, y), cell, cell,
                    facecolor=_mix(tint, 0.30 if on else 0.88),
                    edgecolor=INK if on else _mix(INK, 0.70),
                    linewidth=0.7, zorder=2 * (d - i)))
                if labels:
                    ax.text(x + cell / 2, y + cell / 2, cell_text(arr[i, r, c]),
                            ha="center", va="center", fontsize=label_size,
                            family="monospace", zorder=2 * (d - i) + 1,
                            color=INK if on else _mix(INK, 0.55))
        if edge_axis and not hide[i].all():
            ax.plot([ox, ox], [oy, top], color=_mix(tint, 0.45),
                    linewidth=1.4, zorder=2 * (d - i) + 1)


def sequence(ax, items, *, tint, cell=0.46, gap=0.42, y=None, caption_dy=0.30):
    """Several tensors in a row, with glyphs between them.

    An item is either a string -- drawn as an operator between its neighbours,
    `=`, `x`, `->` -- or a dict with `arr` and optionally `lit`, `hide`,
    `caption` and `labels`. Widths come from each pile's own extent, so a tall
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
                   hide=it.get("hide"), labels=it.get("labels", True),
                   cell=cell, origin=(x, oy), label_size=it.get("size", 7.5))
            if it.get("caption"):
                ax.text(x + span / 2, base, it["caption"],
                        ha="center", va="top", fontsize=12.5,
                        family="monospace", color=MUTE)
        x += span + gap
    return


def cube():
    import numpy as np
    return np.arange(60).reshape(SHAPE)


def render(tint, states, out_name, *, duration=900, colors=48):
    """Each state is (label, note, sub, draw) -- draw gets the axes."""
    frames = []
    for label, note, sub, draw in states:
        plt, fig, ax = frame(tint, label, note, sub)
        draw(ax)
        frames.append(canvas_to_pil(fig))
        plt.close(fig)
    out = write_gif(frames, IMAGES / out_name, duration=duration, loop=3,
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
        axis_arrows(ax, SHAPE, origin=o)

    def face(a):
        def draw(ax):
            planes(ax, T, tint=tint, lit=lit_axis[a], origin=o)
            axis_arrows(ax, SHAPE, origin=o)
        return draw

    return [
        ("T = np.arange(60).reshape(3, 4, 5)", "shape (3, 4, 5)",
         "60 numbers, three directions", whole),
        ("T[0]", "shape (4, 5)", "axis 0 fixed — one plane of the pile", face(0)),
        ("T[:, 0]", "shape (3, 5)", "axis 1 fixed — one row from every plane", face(1)),
        ("T[:, :, 0]", "shape (3, 4)", "axis 2 fixed — one column from every plane", face(2)),
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


def scene_03(tint):
    """03 — broadcasting: one (5,) row reused down every row of every plane."""
    import numpy as np
    T = cube()
    w = T.mean(axis=(0, 1)).astype(int)
    o = centred(SHAPE)
    row0 = np.zeros(SHAPE, bool)
    row0[:, 0, :] = True

    def whole(ax):
        planes(ax, T, tint=tint, origin=o)

    def vector(ax):
        planes(ax, w.reshape(1, 1, 5), tint=tint,
               origin=centred((1, 1, 5)), label_size=13)

    def first_row(ax):
        planes(ax, T, tint=tint, lit=row0, origin=o)

    def result(ax):
        planes(ax, T - w, tint=tint, origin=o)

    return [
        ("T", "shape (3, 4, 5)", "the tensor, three planes of four rows", whole),
        ("w = T.mean(axis=(0, 1))", "shape (5,)",
         "one number per column of axis 2", vector),
        ("T - w", "(3, 4, 5) - (5,)",
         "w lines up with the last axis and is reused down every row", first_row),
        ("T - w", "shape (3, 4, 5)",
         "12 rows, one w, nothing copied", result),
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


def scene_06(tint):
    """06 — contraction: the summed index disappears."""
    import numpy as np
    T = cube()
    w = np.ones(5, int)
    out = np.einsum("ijk,k->ij", T, w)
    fibre = np.zeros(SHAPE, bool)
    fibre[0, 0, :] = True
    cell00 = np.zeros((1, 3, 4), bool)
    cell00[0, 0, 0] = True

    def whole(ax):
        planes(ax, T, tint=tint, origin=centred(SHAPE))

    def one_fibre(ax):
        planes(ax, T, tint=tint, lit=fibre, origin=centred(SHAPE))

    def sum_row(ax):
        sequence(ax, [
            {"arr": T, "lit": fibre, "caption": "ijk"},
            "x",
            {"arr": w.reshape(1, 1, 5), "caption": "k"},
            "->",
            {"arr": out.reshape(1, 3, 4), "lit": cell00, "caption": "ij"},
        ], tint=tint, cell=0.38)

    def result(ax):
        planes(ax, out.reshape(1, 3, 4), tint=tint,
               origin=centred((1, 3, 4)), label_size=12)

    return [
        ("T", "shape (3, 4, 5)", "three indices: i, j, k", whole),
        ("T[0, 0, :]", "5 numbers", "one fibre along k — what one sum eats", one_fibre),
        ("einsum('ijk,k->ij', T, w)", "k is gone after the arrow",
         "every fibre becomes one number", sum_row),
        ("einsum('ijk,k->ij', T, w)", "shape (3, 4)",
         "i and j survive, k was summed away", result),
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
        planes(ax, T.transpose(2, 0, 1), tint=tint, origin=centred((5, 3, 4)))

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


# ─── the table ──────────────────────────────────────────────────────────────
#
# One row per notebook, so a filename, a notebook and the move it illustrates
# cannot drift apart. `gen_slide_art.SLIDES` is the same idea for the decks.

SCENES = {
    "00": ("cube-00-axes", scene_00),
    "01": ("cube-01-order", scene_01),
    "02": ("cube-02-relabel", scene_02),
    "03": ("cube-03-broadcast", scene_03),
    "04": ("cube-04-transpose-vs-reshape", scene_04),
    "05": ("cube-05-sampling", scene_05),
    "06": ("cube-06-contract", scene_06),
    "07": ("cube-07-pinv", scene_07),
    "08": ("cube-08-recurrence", scene_08),
    "09": ("cube-09-svd", scene_09),
    "10": ("cube-10-tucker", scene_10),
    "11": ("cube-11-cp", scene_11),
    "12": ("cube-12-recap", scene_12),
    "13": ("cube-13-convolution", scene_13),
}


def main(only=None) -> None:
    print("Cube GIFs")
    total = 0
    for n, (stem, build) in SCENES.items():
        if only and n not in only:
            continue
        tint = accent_of(n)
        out = render(tint, build(tint), f"{stem}.gif")
        total += out.stat().st_size
    print(f"  {total / 1024:.0f} KB total")


if __name__ == "__main__":
    main(set(sys.argv[1:]) or None)
