#!/usr/bin/env python3
"""Draw notebook 19's three animations (NumPy, Matplotlib, Pillow, scikit-image).

    uv run --group figures python scripts/gen_cp_tucker_gifs.py

- `cube-19-core`: CP's superdiagonal core against Tucker's dense one, filled
  term by term, so the storage gap is counted on screen.
- `cube-19-fold`: a photograph cut into 8 x 8 blocks and folded into
  block row x block column x position x colour, one block at a time.
- `cube-19-cancel`: two rank-one terms growing as 1/eps while their sum
  converges to a rank-3 tensor -- the cancellation that makes CP degenerate.

Captions are expressions, not prose, so one GIF serves both languages. Every
number drawn is computed here from the arrays shown. GIFs loop forever
(`loop=0`), for the same reason the cube animations do: a finite loop parks on
frame 0 after it ends. The accent is notebook 19's, `gen_notebooks.ACCENTS`
indexed modulo its length.
"""

import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Rectangle
from PIL import Image
from skimage import data as skdata

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_notebooks import ACCENTS  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "images"
ACCENT = ACCENTS[19 % len(ACCENTS)]  # the notebook's own accent, as its header draws it
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


def capture(fig) -> Image.Image:
    fig.canvas.draw()
    frame = Image.fromarray(np.asarray(fig.canvas.buffer_rgba())[:, :, :3].copy())
    plt.close(fig)
    return frame


def save(name: str, frames: list[Image.Image]) -> None:
    path = OUT / f"cube-19-{name}.gif"
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


def core_frames() -> list[Image.Image]:
    """Fill a 3 x 3 x 3 core: CP only on its superdiagonal, Tucker everywhere."""
    n = 3
    frames = []
    for step in range(n + 1):
        fig = plt.figure(figsize=(9, 4.6), dpi=90)
        for panel, (title, lit) in enumerate(
            (
                ("CP", lambda p, q, s, k=step: p == q == s and p < k),
                ("Tucker", lambda p, q, s, k=step: p < k),
            )
        ):
            ax = fig.add_subplot(1, 2, panel + 1, projection="3d")
            lit_mask = np.zeros((n, n, n), dtype=bool)
            for p in range(n):
                for q in range(n):
                    for s in range(n):
                        lit_mask[p, q, s] = lit(p, q, s)
            count = int(lit_mask.sum())
            # Two calls, because voxels() hides every face two filled cells of
            # one call share -- which would bury the middle of the diagonal.
            # The empty cells are nearly clear, so it shows through them.
            ax.voxels(
                ~lit_mask,
                facecolors=matplotlib.colors.to_rgba(EMPTY, 0.10),
                edgecolor="#9aa1ad",
                linewidth=0.5,
            )
            if count:
                colour = matplotlib.colors.to_rgba(
                    ACCENT if panel == 0 else CORAL, 0.95
                )
                ax.voxels(
                    lit_mask, facecolors=colour, edgecolor="#9aa1ad", linewidth=0.5
                )
            ax.set_box_aspect((1, 1, 1))
            ax.view_init(elev=24, azim=-58)
            ax.set_axis_off()
            label = r"$g_{rrr} \neq 0$" if panel == 0 else r"$g_{pqs} \neq 0$"
            ax.set_title(
                f"{title}:  {label}   ·   {count} / {n**3}", fontsize=14, pad=2
            )
        fig.text(
            0.5,
            0.05,
            r"$\sum_r\, a_{ir}\, b_{jr}\, c_{kr}$"
            r"$\qquad\qquad\sum_{pqs}\, g_{pqs}\, u_{ip}\, v_{jq}\, w_{ks}$",
            ha="center",
            fontsize=15,
            color=INK,
        )
        frames.append(capture(fig))
    return frames + [frames[-1]]


def fold_frames() -> list[Image.Image]:
    """Cut a 32 x 32 crop into 8 x 8 blocks and show where one block lands."""
    photo = skdata.astronaut()[88:216:4, 176:304:4] / 255  # 32 x 32 x 3 around the face
    h, w, c = photo.shape
    b = 8
    folded = photo.reshape(h // b, b, w // b, b, c).transpose(0, 2, 1, 3, 4)
    folded = folded.reshape(h // b, w // b, b * b, c)  # 4 x 4 x 64 x 3
    frames = []
    for block_i, block_j in ((0, 0), (1, 2), (2, 1), (3, 3)):
        fig = plt.figure(figsize=(9, 4.6), dpi=90)
        ax = fig.add_axes((0.03, 0.14, 0.4, 0.76))
        ax.imshow(photo, interpolation="nearest")
        for k in range(1, h // b):
            ax.axhline(k * b - 0.5, color="white", lw=1)
            ax.axvline(k * b - 0.5, color="white", lw=1)
        ax.add_patch(
            Rectangle(
                (block_j * b - 0.5, block_i * b - 0.5),
                b,
                b,
                fill=False,
                edgecolor=ACCENT,
                lw=3.5,
            )
        )
        ax.set_xticks([])
        ax.set_yticks([])
        ax.set_title("image  32 × 32 × 3", fontsize=13)

        grid = fig.add_axes((0.5, 0.14, 0.2, 0.76))
        grid.set_xlim(0, w // b)
        grid.set_ylim(h // b, 0)
        for gi in range(h // b):
            for gj in range(w // b):
                on = (gi, gj) == (block_i, block_j)
                grid.add_patch(
                    Rectangle(
                        (gj + 0.06, gi + 0.06),
                        0.88,
                        0.88,
                        color=ACCENT if on else EMPTY,
                    )
                )
        grid.set_aspect("equal")
        grid.set_xticks(np.arange(w // b) + 0.5, [str(j) for j in range(w // b)])
        grid.set_yticks(np.arange(h // b) + 0.5, [str(i) for i in range(h // b)])
        grid.tick_params(length=0)
        for side in grid.spines.values():
            side.set_visible(False)
        grid.set_xlabel("J")
        grid.set_ylabel("I")
        grid.set_title(r"$\mathcal{X}$  4 × 4 × 64 × 3", fontsize=13)

        strip = fig.add_axes((0.78, 0.14, 0.12, 0.76))
        strip.imshow(
            folded[block_i, block_j][:, None, :].repeat(6, axis=1), aspect="auto"
        )
        strip.set_xticks([])
        strip.set_yticks([0, 8, 16, 24, 32, 40, 48, 56, 63])
        strip.set_ylabel("8u + v")
        strip.set_title(rf"$\mathcal{{X}}$[{block_i}, {block_j}, :, :]", fontsize=13)

        fig.text(
            0.5,
            0.03,
            r"image[8I + u, 8J + v, c]  =  $\mathcal{X}$[I, J, 8u + v, c]",
            ha="center",
            fontsize=13,
        )
        frames.append(capture(fig))
    return frames


def cancel_frames() -> list[Image.Image]:
    """(1/eps)(a + eps b)^{∘3} − (1/eps) a^{∘3} → a∘a∘b + a∘b∘a + b∘a∘a as eps → 0."""
    rng = np.random.default_rng(19)
    a, b = rng.standard_normal((2, 4))

    def outer3(x, y, z):
        return np.einsum("i,j,k->ijk", x, y, z)

    target = outer3(a, a, b) + outer3(a, b, a) + outer3(b, a, a)
    target_norm = np.linalg.norm(target)
    epsilons = [1.0, 0.5, 0.25, 0.1, 0.05, 0.02]
    history = []
    frames = []
    for eps in epsilons:
        first = outer3(*(a + eps * b,) * 3) / eps
        second = -outer3(a, a, a) / eps
        error = np.linalg.norm(target - (first + second)) / target_norm
        history.append((eps, error, np.linalg.norm(first) / target_norm))

        fig, (left, right) = plt.subplots(1, 2, figsize=(9, 4.6), dpi=90)
        sizes = [
            np.linalg.norm(first) / target_norm,
            np.linalg.norm(second) / target_norm,
            np.linalg.norm(first + second) / target_norm,
        ]
        left.bar(
            ["‖term 1‖", "‖term 2‖", "‖sum‖"],
            sizes,
            color=[CORAL, CORAL, ACCENT],
        )
        left.axhline(1, color=MUTED, ls="--", lw=1)
        left.set_yscale("log")
        left.set_ylim(0.5, 200)
        left.set_ylabel(r"÷ ‖$\mathcal{T}$‖")
        left.set_title(f"ε = {eps:g}", fontsize=14)

        xs = [h[0] for h in history]
        right.plot(
            xs,
            [h[1] for h in history],
            "o-",
            color=ACCENT,
            label=r"‖$\mathcal{T}$ − sum‖ / ‖$\mathcal{T}$‖",
        )
        right.plot(
            xs,
            [h[2] for h in history],
            "s-",
            color=CORAL,
            label=r"‖term 1‖ / ‖$\mathcal{T}$‖",
        )
        right.set_xscale("log")
        right.set_yscale("log")
        right.set_xlim(1.4, 0.014)
        right.set_ylim(0.01, 200)
        right.set_xlabel("ε")
        right.legend(frameon=False, loc="upper left", fontsize=11)
        fig.suptitle(
            r"$\mathcal{T} = a\circ a\circ b + a\circ b\circ a + b\circ a\circ a\ \approx\ (a + \varepsilon b)^{\circ 3}/\varepsilon - a^{\circ 3}/\varepsilon$",
            fontsize=13,
        )
        fig.tight_layout(rect=(0, 0, 1, 0.93))
        frames.append(capture(fig))
    return frames + [frames[-1]]


def main() -> None:
    save("core", core_frames())
    save("fold", fold_frames())
    save("cancel", cancel_frames())


if __name__ == "__main__":
    main()
