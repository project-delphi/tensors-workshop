"""Render the figures the handbook and the two landing pages show.

A companion to `gen_thumbnails.py`, and it imports that module rather than
repeating it: the storm clip is already pinned there by SHA-256, `INK` and
`ACCENT` are already the site's colours, and `get()` already carries the
User-Agent Wikimedia insists on. One pin, one palette, one fetcher.

Like `gen_thumbnails.py` this is **not** part of the CI regenerate gate — it
needs the network, and the workflow installs only `pyyaml nbformat`. It exists
so the figures are reproducible artifacts rather than mystery binaries.

    uv run --with numpy,pandas,pillow,scipy,matplotlib,imageio,imageio-ffmpeg,\
scikit-learn,scikit-image python scripts/gen_figures.py

Every figure is built from an array a participant actually touches during the
session — `camera()`, `load_digits()`, the storm clip, the taxi CSV. That is the
same rule the datasets follow ("all data in this workshop is real"), applied to
the illustrations, and it is why nothing here needs a licence line of its own:
the sources are CC0 or shipped with scikit-image/scikit-learn, and the drawing
is arithmetic on top of them.

House style, read off the images that were already here:

  * flat ink on white, no gridlines, no titles inside the figure, no legends
  * one warm mark per figure, and it points at the answer — the way the red bar
    at hour 18 in `nyc-taxi-pickups-by-hour.png` marks the peak that Block 6's
    decomposition rediscovers on its own
  * a collection of images side by side is how this repo draws a video

`MARK` is that warm colour, and it is deliberately not `$kahoot-accent`
(#b3541e): the orange means "a quiz starts here" everywhere else on the site,
and a figure borrowing it would be making a promise it does not keep.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from gen_thumbnails import ACCENT, INK, IMAGES, VIDEO_SHA256, VIDEO_URL, get

# Seaborn's "deep" red, which is what the bars in the existing
# `nyc-taxi-pickups-by-hour.png` are drawn in. Reusing it exactly keeps the new
# figures and the old one reading as one set.
MARK = "#c44e52"
PAPER = "#ffffff"

TAXIS_URL = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/taxis.csv"


def mpl():
    """matplotlib with the Agg backend and the house defaults."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    plt.rcParams.update({
        "font.family": "sans-serif",
        "text.color": INK,
        "axes.edgecolor": INK,
        "axes.labelcolor": INK,
        "xtick.color": INK,
        "ytick.color": INK,
        "savefig.facecolor": PAPER,
        "figure.facecolor": PAPER,
    })
    return plt


def report(path: Path, note: str = "") -> None:
    kb = path.stat().st_size / 1024
    print(f"  {path.relative_to(IMAGES.parent)}  {kb:.0f} KB  {note}")


# ─── the arrays, all real ───────────────────────────────────────────────────

def scalar_pixel() -> int:
    """One pixel of the camera photograph. `camera()[0, 0]` is 200 — a bright
    patch of sky in the top-left corner, and `shape=()` incarnate."""
    from skimage import data
    return int(data.camera()[0, 0])


def vector_row():
    """Row 256 of the same photograph: 512 grey values straight through the
    cameraman's head, spanning 4 to 226. A vector you can point at."""
    from skimage import data
    return data.camera()[256].copy()


def matrix_digit():
    """The very first image in `load_digits()`, 8x8, values 0-16, returned as
    ink-on-white floats in 0-1.

    A zero on purpose. Several of the other glyphs are genuinely ambiguous at
    8x8 — the first handwritten 3 in the set reads as a 1 to most people, which
    is a fine thing to discover in an exercise and a bad thing to discover in a
    figure whose job is to show what a grid of 64 numbers looks like. The ring
    also leaves the middle empty, so the pixel lattice stays visible through it.
    """
    from sklearn.datasets import load_digits
    return 1.0 - load_digits().images[0] / 16.0


def storm_frames(n_frames: int = 16, stride: int = 45):
    """The clip exactly as section 05's notebook decodes it: every 45th frame,
    16 of them, out of the 720 in the file.

    Matching `fetch_verified_video`'s stride matters — the figure is then a
    picture of `clip`, the array participants will have in front of them, not a
    look-alike sampled some other way. The clip itself is pinned by SHA-256 in
    `gen_thumbnails.py`, so a later re-upload under the same Commons name
    cannot quietly change what these figures show.

    Decoding stops as soon as it has 16 frames, the same reason the notebook
    gives: holding all 720 at 960x540x3 is 1.1 GB.
    """
    import imageio.v3 as iio
    import numpy as np

    raw = get(VIDEO_URL, VIDEO_SHA256)
    frames = []
    for i, frame in enumerate(
            iio.imiter(io.BytesIO(raw), plugin="FFMPEG", extension=".webm")):
        if i % stride == 0:
            frames.append(np.asarray(frame))
            if len(frames) == n_frames:
                break
    return frames


def taxi_tensor():
    """The Block 6 tensor, built exactly as the handbook builds it: pickup
    borough x dropoff borough x hour of day, from the 6,433 real trips."""
    import numpy as np
    import pandas as pd

    taxis = pd.read_csv(TAXIS_URL)
    taxis["hour"] = pd.to_datetime(taxis["pickup"]).dt.hour
    sub = taxis.dropna(subset=["pickup_borough", "dropoff_borough"])
    pb = sorted(sub["pickup_borough"].unique())
    db = sorted(sub["dropoff_borough"].unique())

    T = np.zeros((len(pb), len(db), 24))
    for (p, d, h), v in sub.groupby(
            ["pickup_borough", "dropoff_borough", "hour"]).size().items():
        T[pb.index(p), db.index(d), h] = v
    return T, pb, db


def tucker(T, rank=(2, 2, 3)):
    """HOSVD, the three steps the handbook lists. Returns the core, the three
    factor matrices, the relative error and the compression ratio — the same
    0.067 and 4.71 the handbook quotes."""
    import numpy as np

    def unfold(A, axis):
        return np.moveaxis(A, axis, 0).reshape(A.shape[axis], -1)

    Us = [np.linalg.svd(unfold(T, ax), full_matrices=False)[0][:, :rank[ax]]
          for ax in range(3)]
    core = np.einsum("ijk,ia,jb,kc->abc", T, *Us)
    recon = np.einsum("abc,ia,jb,kc->ijk", core, *Us)
    error = float(np.linalg.norm(T - recon) / np.linalg.norm(T))
    ratio = float(T.size / (core.size + sum(u.size for u in Us)))
    return core, Us, error, ratio


# ─── drawing ────────────────────────────────────────────────────────────────
#
# The ladder that the hero band and `fig-ladder` both draw, in order 0, 1, 2,
# 3, 4. Every rung is an array the handbook already names in section 1.2, which
# is the point: the picture is not an analogy for the code below it, it is the
# code below it.
#
#   ()                  one pixel of the camera photograph
#   (512,)              one row straight through it
#   (8, 8)              one handwritten digit
#   (512, 512, 3)       one colour photograph — the colour axis is the third
#   (16, 540, 960, 3)   sixteen frames of the storm clip
#
# Drawn back-to-front with plain axis-aligned offsets rather than a true
# isometric projection: a sheared photograph reads as a mistake at thumbnail
# size, and the offset stack is what everyone already draws for "a pile of
# slices".

# The vertical band every rung draws inside, so five very different arrays
# still sit on one baseline.
# The colour axis, in three muted primaries rather than screaming RGB. Pure
# red/green/blue would be the only saturated thing on the page and would drag
# the eye away from the mark that is actually meant to catch it.
CHANNELS = (MARK, "#5a8f5e", ACCENT)


def _mid(ax):
    """The vertical middle of a panel, in its own units.

    Every panel's y-axis runs 0 to (panel height / panel width), so one unit is
    the same number of pixels along both axes. Without that, a "square" box
    drawn 0.5 wide and 0.5 tall comes out visibly oblong and every photograph
    in the figure is quietly stretched.
    """
    return ax.get_ylim()[1] / 2


def _plane(ax, arr, x, y, w, h, *, cmap=None, z=0, edge=INK, lw=0.7):
    """One image plane with a hairline edge, in panel units."""
    from matplotlib.patches import Rectangle
    ax.imshow(arr, cmap=cmap, zorder=z, aspect="auto",
              extent=(x, x + w, y, y + h), interpolation="nearest")
    ax.add_patch(Rectangle((x, y), w, h, fill=False, edgecolor=edge,
                           linewidth=lw, zorder=z + 0.1))


def _stack(ax, planes, *, w, h, span, draw=None):
    """`planes` drawn back to front, offset by a fixed step and sized so the
    whole pile lands inside the panel however many planes there are.

    Plain axis-aligned offsets, not a true isometric projection: a sheared
    photograph reads as a rendering mistake at thumbnail size, and an offset
    pile is what everyone already draws for "a sequence of slices".
    """
    n = len(planes)
    dx, dy = (span[0] / max(n - 1, 1), span[1] / max(n - 1, 1))
    x0 = (1 - (w + span[0])) / 2
    y0 = _mid(ax) - (h + span[1]) / 2
    for k, plane in enumerate(planes):
        (draw or _plane)(ax, plane, x0 + k * dx, y0 + (n - 1 - k) * dy, w, h,
                         z=n - k)


def rung_scalar(ax, value: int, *, annotate=True):
    """`shape=()` — one square, filled with the grey the pixel actually holds,
    and the number under it. 200 out of 255: a corner of the sky."""
    from matplotlib.patches import Rectangle
    g = value / 255.0
    side = 0.30
    x, y = 0.5 - side / 2, _mid(ax) - side / 2
    ax.add_patch(Rectangle((x, y), side, side, facecolor=(g, g, g),
                           edgecolor=INK, linewidth=0.9))
    if annotate:
        ax.text(0.5, y - 0.06, str(value), ha="center", va="top",
                family="monospace", fontsize=12, color="#7b8794")


def rung_vector(ax, row, *, annotate=True):
    """`shape=(512,)` — the row as a strip, 512 pixels wide and one tall, drawn
    with NEAREST so the values stay countable rather than smoothed into a
    gradient."""
    h = 0.13
    _plane(ax, row[None, :], 0.04, _mid(ax) - h / 2, 0.92, h, cmap="gray")


def rung_matrix(ax, digit, *, annotate=True):
    """`shape=(8, 8)` — one digit, with white gutters ruled between the pixels.

    The gutters are the reason this rung is here: 64 numbers in a grid is what
    the word "matrix" means, and smoothing them into a picture of a nought
    would hide exactly that.
    """
    s = 0.50
    x, y = 0.5 - s / 2, _mid(ax) - s / 2
    _plane(ax, digit, x, y, s, s, cmap="gray")
    for k in range(1, 8):
        ax.plot([x + s * k / 8] * 2, [y, y + s], color=PAPER, lw=1.0, zorder=1)
        ax.plot([x, x + s], [y + s * k / 8] * 2, color=PAPER, lw=1.0, zorder=1)


def rung_photo(ax, photo, *, annotate=True):
    """`shape=(512, 512, 3)` — the three colour planes pulled apart, so the
    third axis is something you can see rather than something you are told."""
    planes = [photo[:, :, k] / 255.0 for k in range(3)]

    def draw(ax, arr, x, y, w, h, *, z):
        _plane(ax, arr, x, y, w, h, cmap="gray", z=z,
               edge=CHANNELS[draw.k], lw=1.8)
        draw.k += 1
    draw.k = 0
    _stack(ax, planes, w=0.40, h=0.40, span=(0.24, 0.24), draw=draw)


def rung_clip(ax, frames, *, annotate=True):
    """`shape=(16, 540, 960, 3)` — the frames stacked along the axis that makes
    them a video instead of sixteen unrelated photographs. Each frame keeps the
    clip's real 16:9."""
    w = 0.46
    _stack(ax, frames, w=w, h=w * 540 / 960, span=(0.38, 0.30))


def ladder_panels(fig, rungs, *, top=0.0, height=1.0):
    """Five equal panels across the figure.

    Each panel's y-axis is scaled so one unit is the same number of pixels
    horizontally and vertically — see `_mid`. Rungs then draw in plain units
    and nothing comes out stretched.
    """
    axes = []
    pad, gap = 0.012, 0.008
    w = (1 - 2 * pad - 4 * gap) / 5
    ratio = (height * fig.get_figheight()) / (w * fig.get_figwidth())
    for k in range(5):
        ax = fig.add_axes([pad + k * (w + gap), top, w, height])
        ax.set_xlim(0, 1)
        ax.set_ylim(0, ratio)
        ax.axis("off")
        axes.append(ax)
    for ax, draw in zip(axes, rungs):
        draw(ax)
    return axes


def load_ladder():
    """Every array the ladder needs, fetched once."""
    from skimage import data
    return {
        "scalar": scalar_pixel(),
        "vector": vector_row(),
        "matrix": matrix_digit(),
        "photo": data.immunohistochemistry(),
        "clip": storm_frames(),
        "taxi": taxi_tensor(),
    }


LADDER_LABELS = [
    ("camera()[0, 0]", "()", "0", "1"),
    ("camera()[256]", "(512,)", "1", "512"),
    ("digits.images[0]", "(8, 8)", "2", "64"),
    ("immunohistochemistry()", "(512, 512, 3)", "3", "786,432"),
    ("clip", "(16, 540, 960, 3)", "4", "24,883,200"),
]


def rungs_for(arrays, *, annotate=True):
    kw = {"annotate": annotate}
    return [
        lambda ax: rung_scalar(ax, arrays["scalar"], **kw),
        lambda ax: rung_vector(ax, arrays["vector"], **kw),
        lambda ax: rung_matrix(ax, arrays["matrix"], **kw),
        lambda ax: rung_photo(ax, arrays["photo"], **kw),
        lambda ax: rung_clip(ax, arrays["clip"], **kw),
    ]


def fig_ladder(arrays) -> Path:
    """Section 1.2, `shape` made of real arrays.

    The rungs climb order 0 to order 4 and the labels are the exact strings the
    code block above prints, so the reader can check the picture against their
    own output rather than take it on trust.
    """
    plt = mpl()
    fig = plt.figure(figsize=(18, 4.5), dpi=100)
    axes = ladder_panels(fig, rungs_for(arrays), top=0.36, height=0.62)

    for ax, (expr, shape, ndim, size) in zip(axes, LADDER_LABELS):
        ax.text(0.5, -0.05, expr, transform=ax.transAxes, ha="center",
                va="top", family="monospace", fontsize=13, color=INK)
        ax.text(0.5, -0.21, f"shape {shape}", transform=ax.transAxes,
                ha="center", va="top", family="monospace", fontsize=13.5,
                color=ACCENT, fontweight="bold")
        ax.text(0.5, -0.37, f"ndim {ndim}   size {size}", transform=ax.transAxes,
                ha="center", va="top", family="monospace", fontsize=11.5,
                color="#7b8794")

    out = IMAGES / "fig-ladder.png"
    fig.savefig(out, dpi=100, facecolor=PAPER)
    plt.close(fig)
    report(out, "order 0 to 4, every rung a real array")
    return out


# ─── the hero band ──────────────────────────────────────────────────────────
#
# The same five rungs, wearing a different job: the page title sits on top of
# this one. So it carries no labels — and no fading either. An earlier version
# baked a white ramp into the left of the image to clear a space for the title,
# which was solving the wrong problem: Quarto centres the title block inside the
# content column, so the text lands in the middle of the band, not at its left
# edge. The veil that makes the title readable is a CSS overlay in
# `custom.scss`, where it can be tuned against a real rendered page and where it
# covers the text wherever the column happens to put it.

# Close to the shape the banner is displayed at, so `background-size: cover` has
# little to crop. The height is the shortest the five rungs actually fit in:
# each rung is sized as a fraction of its panel's *width*, so a squatter band
# starts slicing the tops off the two stacks.
HERO = (2400, 340)


def hero_frame(arrays, rungs_shown: int = 5, partial: float = 1.0):
    """One frame of the band, as a PIL image.

    `rungs_shown` and `partial` exist for the animation: rungs arrive one at a
    time, the newest fading in, which is the order the workshop meets them in.
    """
    from PIL import Image

    plt = mpl()
    fig = plt.figure(figsize=(HERO[0] / 100, HERO[1] / 100), dpi=100)
    draws = rungs_for(arrays, annotate=False)
    for k, (ax, draw) in enumerate(
            zip(ladder_panels(fig, [], top=0.06, height=0.88), draws)):
        if k > rungs_shown - 1:
            continue
        draw(ax)
        if k == rungs_shown - 1 and partial < 1.0:
            # Fade the newest rung in by veiling it, rather than by setting
            # alpha on every artist a rung might have created.
            ax.add_patch(plt.Rectangle((0, 0), 1, 1, facecolor=PAPER,
                                       alpha=1.0 - partial, zorder=99))

    fig.canvas.draw()
    img = Image.frombuffer(
        "RGBA", fig.canvas.get_width_height(),
        fig.canvas.buffer_rgba(), "raw", "RGBA", 0, 1).convert("RGB")
    plt.close(fig)
    return img


def fig_hero(arrays) -> Path:
    """The banner, as one still image.

    It is deliberately not animated. An earlier version of this was a GIF of the
    band assembling itself, and it did not survive contact with a browser:
    Pillow ignores the `disposal` argument and crops every frame after the first
    to the rectangle that changed, and Chrome, on reaching the end of a finite
    loop, goes back to displaying frame 0 — which in a build animation is the
    emptiest frame there is. The banner sat there showing a single grey square.

    The build survives as a CSS reveal in `custom.scss`, over this image. That
    version cannot disagree with itself between browsers, holds its final state
    by construction, honours `prefers-reduced-motion` without a second asset,
    and costs no bytes at all.
    """
    out = IMAGES / "hero-band.png"
    hero_frame(arrays).save(out, "PNG", optimize=True)
    report(out, "the still banner the CSS reveal runs over")
    return out


# ─── the map of factorizations ──────────────────────────────────────────────

def _diverging():
    """Blue for negative, white for zero, red for positive — the site's own two
    accents rather than a stock colormap, so a factor matrix sitting next to a
    photograph still looks like it belongs to the same page."""
    from matplotlib.colors import LinearSegmentedColormap
    return LinearSegmentedColormap.from_list("tw", [ACCENT, PAPER, MARK])


def _block(ax, arr, x, y, cell, *, cmap, label, sub=None, vlim=None):
    """One factor drawn at its true shape: `cell` units per matrix entry, so a
    tall thin factor looks tall and thin. Returns the width it consumed."""
    from matplotlib.patches import Rectangle
    import numpy as np

    rows, cols = arr.shape
    w, h = cols * cell, rows * cell
    v = vlim if vlim is not None else np.abs(arr).max() or 1.0
    ax.imshow(arr, cmap=cmap, vmin=-v, vmax=v, aspect="auto", zorder=2,
              extent=(x, x + w, y - h / 2, y + h / 2), interpolation="nearest")
    ax.add_patch(Rectangle((x, y - h / 2), w, h, fill=False, edgecolor=INK,
                           linewidth=0.8, zorder=3))
    ax.text(x + w / 2, y + h / 2 + 0.020, label, ha="center", va="bottom",
            fontsize=12.5, color=INK, family="monospace")
    if sub:
        ax.text(x + w / 2, y - h / 2 - 0.018, sub, ha="center", va="top",
                fontsize=10, color="#7b8794", family="monospace",
                linespacing=1.5)
    return w


def _op(ax, x, y, glyph):
    ax.text(x, y, glyph, ha="center", va="center", fontsize=17, color="#7b8794")


def _cube(ax, slices, x, y, cell, *, cmap, label, sub=None, offset,
          label_above=False):
    """A tensor as the pile of matrices it is — every slice along the last
    axis, drawn back to front. Real counts, not a wireframe.

    Scaled to the 92nd percentile rather than the maximum: one borough pair at
    one hour dwarfs the rest, and against that every other cell renders as
    blank paper. Clipping the top lets the shape of the data show.
    """
    import numpy as np

    rows, cols = slices.shape[:2]
    n = slices.shape[2]
    w, h = cols * cell, rows * cell
    dx, dy = offset
    v = float(np.percentile(slices, 92)) or 1.0
    for k in range(n - 1, -1, -1):
        _block_raw(ax, slices[:, :, k], x + k * dx,
                   y - dy * (n - 1) / 2 + k * dy, w, h, cmap=cmap, v=v,
                   z=2 + (n - k), lo=0.0)
    cx = x + (w + dx * (n - 1)) / 2
    half = h / 2 + dy * (n - 1) / 2
    if label_above:
        ax.text(cx, y + half + 0.016, label, ha="center", va="bottom",
                fontsize=12.5, color=INK, family="monospace")
    else:
        ax.text(x - 0.022, y, label, ha="right", va="center", fontsize=12.5,
                color=MARK, family="monospace")
    if sub:
        ax.text(cx, y - half - 0.014, sub, ha="center", va="top", fontsize=10,
                color="#7b8794", family="monospace", linespacing=1.5)
    return w + dx * (n - 1)


def _block_raw(ax, arr, x, y, w, h, *, cmap, v, z=2, lo=None):
    from matplotlib.patches import Rectangle
    ax.imshow(arr, cmap=cmap, vmin=-v if lo is None else lo, vmax=v,
              aspect="auto", zorder=z,
              extent=(x, x + w, y - h / 2, y + h / 2), interpolation="nearest")
    ax.add_patch(Rectangle((x, y - h / 2), w, h, fill=False, edgecolor=INK,
                           linewidth=0.8, zorder=z + 0.1))


def fig_factorization_map(arrays) -> Path:
    """Section 1.4, drawn rather than tabulated.

    Every row factorizes the *same* real 8x8 digit, which is the point: LU, QR
    and SVD are three answers to one question, and at 8x8 their answers have
    shapes you can see. L really is lower triangular, U really is upper, and Σ
    really is empty except for its diagonal. A table of names cannot show that.

    Below the line, one order-3 tensor built from real taxi trips — drawn as
    what it is, a pile of matrices — and no factorization at all. That is the
    section's own cliffhanger, and Block 6 is where it gets resolved; drawing
    the answer here would spend it early.
    """
    import numpy as np
    from scipy.linalg import lu

    plt = mpl()
    cmap = _diverging()
    A = 1.0 - arrays["matrix"]                      # ink as positive values
    P, L, U = lu(A)
    Q, R = np.linalg.qr(A)
    Uu, S, Vt = np.linalg.svd(A)

    fig = plt.figure(figsize=(13, 11.6), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 11.6 / 13)
    ax.axis("off")
    cell, gap = 0.018, 0.030

    rows = [
        (0.760, "A = P L U",
         [(A, "A", "the digit, 8x8"), (P, "P", "row swaps"),
          (L, "L", "lower triangular"), (U, "U", "upper triangular")]),
        (0.540, "A = Q R",
         [(A, "A", None), (Q, "Q", "orthonormal"),
          (R, "R", "upper triangular")]),
        (0.320, "A = U Σ Vᵀ",
         [(A, "A", None), (Uu, "U", None),
          (np.diag(S), "Σ", "only the diagonal"), (Vt, "Vᵀ", None)]),
    ]
    for y, name, blocks in rows:
        x = 0.150
        for k, (arr, label, sub) in enumerate(blocks):
            _op(ax, x - gap / 2, y, "=" if k == 1 else ("·" if k > 1 else ""))
            x += _block(ax, arr, x, y, cell, cmap=cmap, label=label,
                        sub=sub) + gap
        ax.text(0.035, y, name, ha="left", va="center", fontsize=14,
                color=INK, family="monospace")

    # The line section 1.4 is really about.
    yline = 0.200
    ax.plot([0.03, 0.97], [yline, yline], color="#dfe3e8", lw=1.4)
    ax.text(0.035, yline + 0.014,
            "two axes — every factorization above needs a matrix",
            ha="left", va="bottom", fontsize=11.5, color="#7b8794")

    # And the object that does not fit above it: 24 hourly slices of the real
    # taxi tensor, stacked. No factorization drawn — that is Block 6's.
    T = arrays["taxi"][0]
    ax.text(0.035, yline - 0.022, "any number of axes", ha="left", va="top",
            fontsize=12, color=MARK)
    from matplotlib.colors import LinearSegmentedColormap
    counts = LinearSegmentedColormap.from_list("tw-counts", [PAPER, MARK])
    # Sliced along the pickup axis, so each slice is a dense dropoff-by-hour
    # heatmap with the day's rhythm visible in it. Sliced the other way — 24
    # hourly 4x5 frames — the pile is 24 deep, each one almost empty, and it
    # reads as a stack of blank paper.
    w = _cube(ax, np.moveaxis(T, 0, 2), 0.33, 0.105, 0.011, cmap=counts,
              offset=(0.030, 0.022), label="T",
              sub="(4, 5, 24) — one slice per pickup borough, dropoff x hour")
    ax.text(0.33 + w + 0.06, 0.105, "→  Block 6", ha="left", va="center",
            fontsize=13, color=MARK, family="monospace")

    out = IMAGES / "fig-factorization-map.png"
    fig.savefig(out, dpi=100, facecolor=PAPER)
    plt.close(fig)
    report(out, "one digit, factorized three ways, then the thing that will not fit")
    return out


# ─── the video, and its time axis ───────────────────────────────────────────
#
# The group exercise asks what a video's shape is at each stage of a pipeline,
# and question 4 asks what is lost when a recommender samples 8 frames out of
# 900. Both questions have the same thing behind them: axis 0 is not a bag, it
# is an order, and the arithmetic never says so.
#
# So both figures here do one thing — put the clip next to the same frames with
# axis 0 permuted. Nothing about the shape changes. `T.shape` is identical,
# `T.sum()` is identical, every summary statistic over the other three axes is
# identical. Only the meaning is gone.

SHUFFLE_SEED = 7        # fixed, so the figure is the same on every machine
STRIP = 8               # clip[:8] — enough frames to see the swell move


def _shuffled(n: int):
    """A permutation with no fixed points, so nothing sits where it started.

    A plain `permutation` will sometimes leave two or three frames in place,
    and a reader who spots one reasonably concludes the shuffle is partial.
    """
    import numpy as np
    rng = np.random.default_rng(SHUFFLE_SEED)
    while True:
        perm = rng.permutation(n)
        if not (perm == np.arange(n)).any():
            return perm


def _filmstrip(fig, frames, rect, *, label, sub, tint):
    """One row of frames with thin paper gutters, the way `ds-video.jpg` draws
    a clip.

    `rect` gives only the row's origin and width; the height comes from the
    clip's real 16:9, because a squashed sea reads as a bad figure rather than
    as a point about axis 0.
    """
    x0, y0, w = rect
    n = len(frames)
    gap = 0.0035
    fw = (w - (n - 1) * gap) / n
    h = fw * fig.get_figwidth() / fig.get_figheight() * 540 / 960
    for k, frame in enumerate(frames):
        ax = fig.add_axes([x0 + k * (fw + gap), y0, fw, h])
        ax.imshow(frame, aspect="auto", interpolation="bilinear")
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_edgecolor(tint)
            spine.set_linewidth(1.4)
    cap = fig.add_axes([x0, y0 + h, w, 0.001])
    cap.axis("off")
    cap.text(0, 0.008, label, transform=cap.transAxes, ha="left", va="bottom",
             fontsize=14, color=tint, family="monospace")
    cap.text(1, 0.008, sub, transform=cap.transAxes, ha="right", va="bottom",
             fontsize=11.5, color="#7b8794")


def fig_video_stack(arrays) -> Path:
    """The still version, for print and for `prefers-reduced-motion`.

    Two strips of the same eight frames. The swell in the top row builds and
    breaks; the bottom row is the identical set of numbers with axis 0 permuted
    and the sea jumps about. Both arrays have shape (8, 540, 960, 3) and the
    same sum.
    """
    frames = arrays["clip"][:STRIP]
    perm = _shuffled(STRIP)

    plt = mpl()
    fig = plt.figure(figsize=(18, 4.0), dpi=100)
    _filmstrip(fig, frames, (0.03, 0.560, 0.94),
               label="clip[:8]", sub="axis 0 in order — the swell builds",
               tint=ACCENT)
    _filmstrip(fig, [frames[i] for i in perm], (0.03, 0.160, 0.94),
               label="clip[perm]",
               sub="the same eight frames, axis 0 permuted", tint=MARK)
    fig.text(0.5, 0.035, "same shape (8, 540, 960, 3), same sum, "
                         "nothing left along axis 0",
             ha="center", va="bottom", fontsize=13, color=MARK,
             family="monospace")

    # JPEG, for the reason `gen_thumbnails.save` gives: this is sixteen
    # photographs and two lines of text, and as a PNG it is 939 KB against 130.
    out = IMAGES / "fig-video-stack.jpg"
    fig.savefig(out, dpi=100, facecolor=PAPER, pil_kwargs={
        "quality": 88, "optimize": True, "progressive": True})
    plt.close(fig)
    report(out, "in order against permuted")
    return out


def gif_video_stack(arrays) -> Path:
    """The same point, moving, which is the only way it really lands.

    Two panes playing at once: on the left the clip in order, on the right the
    permuted copy. Side by side rather than one after the other, so telling
    them apart costs no memory.
    """
    import numpy as np
    from PIL import Image

    frames = [f[::3, ::3] for f in arrays["clip"][:STRIP]]     # 180x320
    perm = _shuffled(STRIP)
    plt = mpl()

    out_frames = []
    for k in range(STRIP):
        fig = plt.figure(figsize=(7.6, 2.5), dpi=100)
        for col, (img, label, tint) in enumerate((
                (frames[k], "clip", ACCENT),
                (frames[perm[k]], "clip[perm]", MARK))):
            ax = fig.add_axes([0.02 + col * 0.495, 0.04, 0.465, 0.80])
            ax.imshow(img, aspect="auto", interpolation="bilinear")
            ax.set_xticks([])
            ax.set_yticks([])
            for spine in ax.spines.values():
                spine.set_edgecolor(tint)
                spine.set_linewidth(1.6)
            ax.set_title(label, fontsize=13, color=tint, family="monospace",
                         pad=7)
        fig.canvas.draw()
        out_frames.append(Image.frombuffer(
            "RGBA", fig.canvas.get_width_height(),
            fig.canvas.buffer_rgba(), "raw", "RGBA", 0, 1).convert("RGB"))
        plt.close(fig)

    pal = out_frames[0].quantize(colors=96, method=2)
    quant = [f.quantize(palette=pal, dither=0) for f in out_frames]

    # `disposal=1`, and no optimizer, for the reason `gif_hero` gives: cropped
    # difference frames render wrong in Chrome.
    out = IMAGES / "fig-video-stack.gif"
    quant[0].save(out, "GIF", save_all=True, append_images=quant[1:],
                  duration=260, loop=3, disposal=1, optimize=False)
    report(out, f"{len(quant)} frames, {quant[0].size[0]}x{quant[0].size[1]}")
    return out


# ─── Tucker, on the taxi tensor ─────────────────────────────────────────────

def fig_tucker_taxi(arrays) -> Path:
    """Block 6, and its TODO 6.

    The top strip is the decomposition at its real shapes: 480 numbers in T
    against 102 in the core and the three factors. The two charts underneath
    are the exercise's last question — the busiest hour in the raw counts, and
    the peak of the first column of the hour factor. They are the same hour,
    and nothing in the arithmetic was ever told what an hour is.

    Hour 18 is drawn in the same warm red as the bar in the existing
    `nyc-taxi-pickups-by-hour.png`, because it is the same hour, found twice.
    """
    import numpy as np
    from matplotlib.colors import LinearSegmentedColormap

    T, pb, db = arrays["taxi"]
    core, Us, err, ratio = tucker(T)
    hours = np.arange(24)
    raw = T.sum(axis=(0, 1))
    # SVD fixes each factor only up to sign; orient the column so its dominant
    # lobe is positive, or the peak reads as a trough on half the machines that
    # run this.
    hour_factor = Us[2][:, 0] * np.sign(Us[2][:, 0].sum())
    peak = int(raw.argmax())

    plt = mpl()
    counts = LinearSegmentedColormap.from_list("tw-counts", [PAPER, MARK])
    cmap = _diverging()

    fig = plt.figure(figsize=(14, 9.0), dpi=100)
    ax = fig.add_axes([0, 0.34, 1, 0.66])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 0.66 * 9.0 / 14)
    ax.axis("off")
    y, cell, gap = 0.215, 0.010, 0.075

    x = 0.075
    x += _cube(ax, np.moveaxis(T, 0, 2), x, y, cell, cmap=counts,
               offset=(0.022, 0.016), label="T", label_above=True,
               sub="(4, 5, 24)\n480 numbers") + gap
    _op(ax, x - gap / 2, y, "=")
    x += _cube(ax, core, x, y, cell, cmap=cmap, offset=(0.014, 0.010),
               label="G", label_above=True, sub="(2, 2, 3)\ncore") + gap
    for U, name, sub in ((Us[0], "A", "(4, 2)\npickup"),
                         (Us[1], "B", "(5, 2)\ndropoff"),
                         (Us[2], "C", "(24, 3)\nhour")):
        _op(ax, x - gap / 2, y, "·")
        x += _block(ax, U, x, y, cell, cmap=cmap, label=name, sub=sub) + gap

    ax.text(0.5, 0.030, f"102 numbers instead of 480 — {ratio:.1f}× fewer, "
                        f"{err * 100:.1f}% error",
            ha="center", va="bottom", fontsize=13.5, color=INK,
            family="monospace")

    # The two charts that answer TODO 6.
    for col, (values, title, ylabel) in enumerate((
            (raw, "the raw counts", "pickups"),
            (hour_factor, "the first column of the hour factor", "weight"))):
        a = fig.add_axes([0.085 + col * 0.500, 0.085, 0.375, 0.205])
        colors = [MARK if h == peak else "#4c72b0" for h in hours]
        a.bar(hours, values, color=colors, width=0.82)
        a.set_xlabel("hour of day")
        a.set_ylabel(ylabel)
        a.set_xticks([0, 4, 8, 12, 16, 20])
        a.set_title(title, fontsize=12.5, color=INK, pad=8)
        a.spines["top"].set_visible(False)
        a.spines["right"].set_visible(False)
        a.axhline(0, color=INK, lw=0.8)

    fig.text(0.5, 0.012, f"both peak at hour {peak}. "
                         "Nobody told it what an hour is.",
             ha="center", va="bottom", fontsize=13.5, color=MARK)

    out = IMAGES / "fig-tucker-taxi.png"
    fig.savefig(out, dpi=100, facecolor=PAPER)
    plt.close(fig)
    report(out, f"peak found twice at hour {peak}")
    return out


if __name__ == "__main__":
    print("Loading the arrays (network: the pinned clip and the taxi CSV)")
    arrays = load_ladder()
    print("Figures")
    fig_hero(arrays)
    fig_ladder(arrays)
    fig_factorization_map(arrays)
    fig_video_stack(arrays)
    gif_video_stack(arrays)
    fig_tucker_taxi(arrays)
