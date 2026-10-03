#!/usr/bin/env python3
"""Draw notebook 20's three animations (NumPy, Matplotlib, Pillow).

    uv run --group figures python scripts/gen_alphatensor_gifs.py

- `cube-20-trays`: the 4 x 4 x 4 matrix multiplication tensor as four trays,
  one per entry of C, with its eight 1s arriving one product at a time.
- `cube-20-strassen`: Strassen's seven rank-one blocks added one at a time,
  with the count of cells that still differ from the tensor: 8, 12, 12, 12,
  10, 8, 4, 0. Every cell prints its signed value, so +1 and -1 are told
  apart without colour, and the cells the tensor wants carry a heavy outline.
- `cube-20-trails`: nonzero cells left after every move of two winning games,
  the greedy player's 8, 7, ..., 0 against Strassen's climb to 12.

Captions are expressions, not prose, so one GIF serves both languages. Every
number drawn is computed here from the arrays shown: the tensor is
`matmul_tensor(2)` as the handbook and the notebook write it, U, V and W are
the handbook's Strassen arrays, and the greedy trail is found by searching all
128,000 moves with entries in {-1, 0, 1}. GIFs loop forever (`loop=0`), for the
same reason the cube animations do: a finite loop parks on frame 0 after it
ends. The accent is notebook 20's, `gen_notebooks.ACCENTS` indexed modulo its
length.
"""

import itertools
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Rectangle
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_notebooks import ACCENTS  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "images"
ACCENT = ACCENTS[20 % len(ACCENTS)]  # the notebook's own accent, as its header draws it
CORAL, INK, MUTED, EMPTY = "#c45c26", "#20334a", "#8a909c", "#e9ecf1"
DURATION = 1800
plt.rcParams.update(
    {
        "font.family": "DejaVu Sans",
        "font.size": 12,
        "text.color": INK,
        "axes.labelcolor": INK,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "axes.spines.top": False,
        "axes.spines.right": False,
    }
)

ENTRIES = ("11", "12", "21", "22")  # a matrix read row by row
EXAMPLE_A = np.array([[1, 2], [3, 4]])
EXAMPLE_B = np.array([[5, 6], [7, 8]])


def matmul_tensor(n):
    # One 1 for each schoolbook product A[i, k] * B[k, j], added into C[i, j].
    M = np.zeros((n * n, n * n, n * n), dtype=int)
    for i, j, k in itertools.product(range(n), repeat=3):
        M[i * n + k, k * n + j, i * n + j] = 1
    return M


T = matmul_tensor(2)

# Strassen's seven products. Row r of U and of V says which entries of A and
# of B product r adds up before it multiplies; row r of W says which entries
# of C it is added to (1) or subtracted from (-1). Order: 11, 12, 21, 22.
U = np.array(
    [
        [1, 0, 0, 1],
        [0, 0, 1, 1],
        [1, 0, 0, 0],
        [0, 0, 0, 1],
        [1, 1, 0, 0],
        [-1, 0, 1, 0],
        [0, 1, 0, -1],
    ]
)
V = np.array(
    [
        [1, 0, 0, 1],
        [1, 0, 0, 0],
        [0, 1, 0, -1],
        [-1, 0, 1, 0],
        [0, 0, 0, 1],
        [1, 1, 0, 0],
        [0, 0, 1, 1],
    ]
)
W = np.array(
    [
        [1, 0, 0, 1],
        [0, 0, 1, -1],
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [-1, 1, 0, 0],
        [0, 0, 0, 1],
        [1, 0, 0, 0],
    ]
)
BLOCKS = np.einsum("ra,rb,rc->rabc", U, V, W)


def capture(fig) -> Image.Image:
    fig.canvas.draw()
    frame = Image.fromarray(np.asarray(fig.canvas.buffer_rgba())[:, :, :3].copy())
    plt.close(fig)
    return frame


def save(name: str, frames: list[Image.Image]) -> None:
    path = OUT / f"cube-20-{name}.gif"
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=DURATION,
        loop=0,
        optimize=False,
    )
    print(
        f"{path.relative_to(ROOT)}: {len(frames)} frames, {path.stat().st_size // 1024} KB"
    )


def entry(letter: str, index: int) -> str:
    """Mathtext for entry `index` of a 2 x 2 matrix read row by row: a_{12}."""
    return f"{letter}_{{{ENTRIES[index]}}}"


def signed(value: int) -> str:
    """A cell's value with its sign printed, so +1 and -1 differ in ink."""
    return f"+{value}" if value > 0 else f"−{-value}"


def draw_trays(fig, values: np.ndarray, outline: np.ndarray | None, plain: bool):
    """Four 4 x 4 trays, one per entry of C: rows are A's entries, columns B's.

    `values[a, b, c]` is what each cell holds. With `plain`, a nonzero cell
    prints its value alone (the tensor's 1s); otherwise it prints the signed
    value, +1 in the accent and -1 in coral. `outline` marks the cells the
    multiplication tensor wants with a heavy ink border, whatever they hold.
    """
    for c in range(4):
        ax = fig.add_axes((0.065 + 0.237 * c, 0.22, 0.19, 0.19 * 9 / 4.6))
        ax.set_xlim(0, 4)
        ax.set_ylim(4, 0)
        ax.set_aspect("equal")
        for a in range(4):
            for b in range(4):
                value = int(values[a, b, c])
                colour = EMPTY if value == 0 else (ACCENT if value > 0 else CORAL)
                ax.add_patch(
                    Rectangle((b + 0.06, a + 0.06), 0.88, 0.88, color=colour, lw=0)
                )
                if value:
                    ax.text(
                        b + 0.5,
                        a + 0.52,
                        str(value) if plain else signed(value),
                        ha="center",
                        va="center",
                        color="white",
                        fontsize=12 if plain else 10.5,
                        fontweight="bold",
                    )
                if outline is not None and outline[a, b, c]:
                    ax.add_patch(
                        Rectangle(
                            (b + 0.06, a + 0.06),
                            0.88,
                            0.88,
                            fill=False,
                            edgecolor=INK,
                            lw=2.2,
                        )
                    )
        ax.set_xticks(
            np.arange(4) + 0.5, [f"${entry('b', b)}$" for b in range(4)], fontsize=9.5
        )
        ax.set_yticks(
            np.arange(4) + 0.5, [f"${entry('a', a)}$" for a in range(4)], fontsize=9.5
        )
        ax.xaxis.tick_top()
        ax.tick_params(length=0, pad=2, colors=INK)
        for side in ax.spines.values():
            side.set_visible(False)
        ax.set_xlabel(f"${entry('c', c)}$", fontsize=14, labelpad=6)


def trays_frames() -> list[Image.Image]:
    """The eight 1s of the tensor, arriving one schoolbook product at a time."""
    flat_a, flat_b = EXAMPLE_A.ravel(), EXAMPLE_B.ravel()
    # The products grouped by the entry of C they are added into.
    order = [(a, b, c) for c in range(4) for a, b in np.argwhere(T[:, :, c])]
    frames = []
    for shown in range(len(order) + 1):
        values = np.zeros_like(T)
        for a, b, c in order[:shown]:
            values[a, b, c] = 1
        fig = plt.figure(figsize=(9, 4.6), dpi=90)
        draw_trays(fig, values, None, plain=True)
        fig.text(
            0.5,
            0.91,
            rf"$T[a,\, b,\, c]$     4 × 4 × 4     $\Sigma\, T = {shown}$",
            ha="center",
            fontsize=14,
        )
        fig.text(
            0.5,
            0.77,
            r"$C_c = \sum_{a}\sum_{b}\; T_{abc}\, A_a\, B_b$",
            ha="center",
            fontsize=14,
        )
        if shown:
            c = order[shown - 1][2]
            terms = [(a, b) for a, b, cc in order[:shown] if cc == c]
            names = " + ".join(f"{entry('a', a)}\\,{entry('b', b)}" for a, b in terms)
            if len(terms) == 2:
                numbers = " + ".join(
                    f"{flat_a[a]} \\cdot {flat_b[b]}" for a, b in terms
                )
                total = sum(int(flat_a[a] * flat_b[b]) for a, b in terms)
                caption = rf"${entry('c', c)} = {names} = {numbers} = {total}$"
            else:
                caption = rf"${entry('c', c)} = {names} + \ldots$"
            fig.text(0.5, 0.06, caption, ha="center", fontsize=15)
        frames.append(capture(fig))
    return frames + [frames[-1]]


def combination(row: np.ndarray, letter: str) -> str:
    """Mathtext for a weighted sum of entries, a positive term first."""
    terms = [(int(k), i) for i, k in enumerate(row) if k > 0]
    terms += [(int(k), i) for i, k in enumerate(row) if k < 0]
    text = ""
    for position, (weight, index) in enumerate(terms):
        if position == 0:
            text += ("-" if weight < 0 else "") + entry(letter, index)
        else:
            text += (" - " if weight < 0 else " + ") + entry(letter, index)
    return text if len(terms) == 1 else f"({text})"


def strassen_frames() -> list[Image.Image]:
    """Add Strassen's seven blocks one at a time; count the cells still wrong."""
    frames = []
    partial = np.zeros_like(T)
    trail = [int(np.count_nonzero(T - partial))]
    for step in range(len(BLOCKS) + 1):
        if step:
            partial = partial + BLOCKS[step - 1]
            trail.append(int(np.count_nonzero(T - partial)))
        fig = plt.figure(figsize=(9, 4.6), dpi=90)
        draw_trays(fig, partial, T.astype(bool), plain=False)
        if step:
            r = step - 1
            title = rf"$m_{step} = {combination(U[r], 'a')}\,{combination(V[r], 'b')}$"
            # `{-}1`, not `-1`: mathtext sets a bare minus after a comma as a
            # binary operator and pads it, which reads as "0, - 1".
            weights = "      ".join(
                f"${name}_{step} = "
                f"({', '.join(str(k) if k >= 0 else f'{{-}}{-k}' for k in row)})$"
                for name, row in (("u", U[r]), ("v", V[r]), ("w", W[r]))
            )
        else:
            title = r"$T = \sum_{r} u_r \circ v_r \circ w_r$"
            weights = r"$T_{abc} = \sum_{r} U_{ra}\, V_{rb}\, W_{rc}$"
        fig.text(0.5, 0.91, title, ha="center", fontsize=14)
        fig.text(0.5, 0.78, weights, ha="center", fontsize=13)
        fig.text(
            0.5,
            0.06,
            r"count_nonzero$(T - \Sigma)$:   " + "  →  ".join(str(n) for n in trail),
            ha="center",
            fontsize=14,
        )
        frames.append(capture(fig))
    assert trail == [8, 12, 12, 12, 10, 8, 4, 0], trail
    return frames + [frames[-1]]


def greedy_trail() -> list[int]:
    """Nonzero cells left after every move of a player who always takes the
    move that leaves the fewest, over all 128,000 moves in {-1, 0, 1}."""
    vectors = np.array([v for v in itertools.product((-1, 0, 1), repeat=4) if any(v)])
    leading = vectors[np.arange(len(vectors)), (vectors != 0).argmax(axis=1)]
    half = vectors[leading > 0]  # u∘v∘w is unchanged when two vectors flip sign
    moves = np.einsum("ua,vb,wc->uvwabc", half, half, vectors)
    moves = moves.reshape(-1, 4, 4, 4).astype(np.int8)
    assert len(moves) == 128_000, len(moves)
    state = T.astype(np.int8)
    trail = [int(np.count_nonzero(state))]
    while trail[-1]:
        left = state[None] - moves
        nonzero = np.count_nonzero(left, axis=(1, 2, 3))
        best = int(np.argmin(nonzero * 1000 + np.abs(left).sum(axis=(1, 2, 3))))
        assert nonzero[best] < trail[-1], "greedy stopped before the tensor was empty"
        state = left[best]
        trail.append(int(nonzero[best]))
    return trail


def trails_frames() -> list[Image.Image]:
    """Two winning games, move by move: straight down, and up before down."""
    greedy = greedy_trail()
    strassen = [int(np.count_nonzero(T))]
    state = T.copy()
    for block in BLOCKS:
        state = state - block
        strassen.append(int(np.count_nonzero(state)))
    assert greedy == [8, 7, 6, 5, 4, 3, 2, 1, 0], greedy
    assert strassen == [8, 12, 12, 12, 10, 8, 4, 0], strassen

    frames = []
    last = max(len(greedy), len(strassen)) - 1
    for step in range(last + 1):
        fig, ax = plt.subplots(figsize=(9, 4.6), dpi=90)
        fig.subplots_adjust(left=0.1, right=0.97, top=0.86, bottom=0.2)
        g = greedy[: step + 1]
        s = strassen[: step + 1]
        ax.plot(
            range(len(g)),
            g,
            "s--",
            color=CORAL,
            lw=2,
            ms=8,
            label=r"$\arg\min$ count_nonzero$(T - u \circ v \circ w)$",
        )
        ax.plot(
            range(len(s)),
            s,
            "o-",
            color=ACCENT,
            lw=2,
            ms=8,
            label=r"Strassen:  $m_1, \ldots, m_7$",
        )
        # Strassen's counts sit above their points, except the final 0, which
        # goes below so it cannot land on the greedy game's marker at 1.
        for x, y in enumerate(s):
            ax.annotate(
                str(y),
                (x, y),
                xytext=(0, 9) if y else (0, -19),
                textcoords="offset points",
                ha="center",
                fontsize=12,
                color=INK,
            )
        # The greedy game's newest count, to the right of its point. At r = 0
        # the two games share a point and Strassen's label already says 8.
        if len(g) > 1:
            ax.annotate(
                str(g[-1]),
                (len(g) - 1, g[-1]),
                xytext=(13, -4),
                textcoords="offset points",
                ha="center",
                fontsize=12,
                color=INK,
            )
        if len(s) == len(strassen):
            ax.annotate(
                f"R = {len(strassen) - 1}",
                (len(strassen) - 1, 0),
                xytext=(-52, -5),
                textcoords="offset points",
                ha="center",
                fontsize=13,
                fontweight="bold",
                color=INK,
            )
        if len(g) == len(greedy):
            ax.annotate(
                f"R = {len(greedy) - 1}",
                (len(greedy) - 1, 0),
                xytext=(0, 14),
                textcoords="offset points",
                ha="center",
                fontsize=13,
                fontweight="bold",
                color=INK,
            )
        ax.axhline(8, color=MUTED, ls=":", lw=1)
        ax.set_xlim(-0.4, last + 0.6)
        ax.set_ylim(-2.2, 14)  # room under 0 for the label of Strassen's last count
        ax.set_xticks(range(last + 1))
        ax.set_yticks(range(0, 13, 2))
        ax.grid(axis="y", alpha=0.25)
        ax.set_xlabel("r")
        ax.set_ylabel(r"count_nonzero$(T - \Sigma)$")
        ax.legend(frameon=False, loc="upper right", fontsize=11)
        fig.suptitle(
            r"$T - u_1 \circ v_1 \circ w_1 - \ldots - u_r \circ v_r \circ w_r$",
            fontsize=14,
        )
        frames.append(capture(fig))
    return frames + [frames[-1]]


def main() -> None:
    save("trays", trays_frames())
    save("strassen", strassen_frames())
    save("trails", trails_frames())


if __name__ == "__main__":
    main()
