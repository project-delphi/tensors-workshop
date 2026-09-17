#!/usr/bin/env python3
"""Draw notebook 16's scientific animations (NumPy/Matplotlib/Pillow).

uv run --group figures python scripts/gen_pca_gifs.py
Optional --archive points at the same UCI archive cached by the notebook.
All satellite panels use real training data; the cave cloud and shape diagram
are explicitly illustrative. No model is fitted to test data. GIFs loop
forever (`loop=0`), for the same reason the cube animations do: a finite
loop parks on frame 0 after it ends. The notebook supplies a frame stepper
for accessible inspection.
"""

import argparse
import hashlib
import io
import urllib.request
import zipfile
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Circle, Polygon, Rectangle
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "images"
URL = "https://archive.ics.uci.edu/static/public/146/statlog+landsat+satellite.zip"
SHA = "7c54e0e11c872a1b0b647da370d596dcb06746159cce4121d92ccd70b7d7ce3c"
TEAL, ORANGE, INK = "#0f766e", "#e07836", "#20334a"
plt.rcParams.update(
    {
        "font.family": "DejaVu Sans",
        "font.size": 11,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "text.color": INK,
        "axes.labelcolor": INK,
    }
)


def capture(fig):
    fig.canvas.draw()
    frame = Image.fromarray(np.asarray(fig.canvas.buffer_rgba())[:, :, :3].copy())
    plt.close(fig)
    return frame


def save(name, frames, duration):
    path = OUT / f"cube-16-{name}.gif"
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=False,
        disposal=2,
    )
    print(f"{path.name}: {len(frames)} frames, {path.stat().st_size // 1024} KB")


def cave():
    rng = np.random.default_rng(16)
    cloud = rng.normal(size=(65, 2)) @ np.array([[1.6, 0.65], [0, 0.3]])
    cloud -= cloud.mean(axis=0)
    frames = []
    for angle in np.linspace(0, np.pi, 36, endpoint=False):
        fig, (story, ax) = plt.subplots(1, 2, figsize=(11, 5), dpi=100)
        fig.subplots_adjust(left=0.04, right=0.96, top=0.80, bottom=0.21, wspace=0.24)
        fig.suptitle(
            "PLATO’S CAVE · What does a shadow preserve?",
            fontsize=17,
            weight="bold",
            y=0.96,
        )
        story.set(xlim=(0, 10), ylim=(0, 7))
        story.axis("off")
        story.add_patch(
            Polygon(
                [[0, 0], [0.3, 5.7], [2, 6.8], [8, 6.6], [10, 5], [10, 0]],
                facecolor="#f2e9d8",
                edgecolor="#b8a98c",
                lw=2,
            )
        )
        story.add_patch(Polygon([[0.9, 1], [1.3, 2.3], [1.7, 1]], color=ORANGE))
        story.text(1.3, 0.4, "fire", ha="center")
        story.add_patch(Rectangle((4, 1.6), 0.5, 1.4, color=TEAL))
        story.add_patch(Circle((4.25, 3.4), 0.4, color=TEAL))
        story.text(4.2, 0.65, "objects", ha="center")
        story.plot([8, 8], [0.7, 5.9], color=INK, lw=5)
        story.plot([1.3, 8], [1.6, 4.8], color=ORANGE, ls="--", alpha=0.6)
        story.plot([1.3, 8], [1.6, 2], color=ORANGE, ls="--", alpha=0.6)
        story.plot([8, 8], [2, 4.8], color="#786b5c", lw=12)
        story.text(8, 6.15, "wall", ha="center")
        for x in [5.5, 6.6]:
            story.add_patch(Circle((x, 1.6), 0.18, color=INK))
            story.plot([x, x, x + 0.4], [1.4, 0.8, 0.8], color=INK, lw=3)
            story.plot([x, x + 0.4], [1.15, 1.3], color=INK, lw=2)
        story.text(6.2, 0.2, "prisoners see shadows", ha="center", fontsize=10)
        w = np.array([np.cos(angle), np.sin(angle)])
        projected = np.outer(cloud @ w, w)
        ax.scatter(
            *cloud.T, s=18, color=TEAL, alpha=0.65, label="objects (synthetic points)"
        )
        for a, b in zip(cloud[::3], projected[::3]):
            ax.plot([a[0], b[0]], [a[1], b[1]], color="#b9c5ce", lw=0.7)
        ax.plot([-4 * w[0], 4 * w[0]], [-4 * w[1], 4 * w[1]], color=ORANGE, lw=2)
        ax.scatter(*projected.T, s=15, color=ORANGE, label="orthogonal shadow")
        fraction = np.sum(projected**2) / np.sum(cloud**2)
        ax.set(
            xlim=(-4, 4),
            ylim=(-3, 3),
            xlabel="feature 1",
            ylabel="feature 2",
            title=f"Wall angle {np.degrees(angle):.0f}° · variation kept {fraction:.0%}",
        )
        ax.set_aspect("equal")
        ax.legend(loc="lower right", fontsize=8)
        fig.text(
            0.5,
            0.05,
            "Mathematical adaptation: PCA selects the orthogonal shadow with greatest variance.",
            ha="center",
            fontsize=11,
        )
        frames.append(capture(fig))
    save("cave", frames, 180)


def reconstruction(X):
    mean = X.mean(axis=0)
    _, _, vt = np.linalg.svd(X - mean, full_matrices=False)
    sample = X[0]
    frames = []
    for k in [1, 2, 4, 8, 12, 24, 36]:
        approx = ((sample - mean) @ vt[:k].T) @ vt[:k] + mean
        fig, axes = plt.subplots(2, 4, figsize=(10, 5), dpi=100)
        fig.subplots_adjust(
            left=0.10, right=0.86, top=0.78, bottom=0.12, hspace=0.20, wspace=0.12
        )
        fig.suptitle(
            f"LANDSAT · Reconstruct 36 sensor values from {k} scores",
            fontsize=17,
            weight="bold",
            y=0.96,
        )
        for b in range(4):
            for row, data in enumerate([sample, approx]):
                im = axes[row, b].imshow(
                    data.reshape(3, 3, 4)[:, :, b], vmin=0, vmax=255, cmap="viridis"
                )
                axes[row, b].set_xticks([])
                axes[row, b].set_yticks([])
            axes[0, b].set_title(
                ["green", "red", "near infrared 1", "near infrared 2"][b], fontsize=11
            )
        axes[0, 0].set_ylabel("original patch", fontsize=12)
        axes[1, 0].set_ylabel(f"PCA · k = {k}", fontsize=12)
        cax = fig.add_axes([0.89, 0.17, 0.015, 0.55])
        fig.colorbar(im, cax=cax, label="sensor value")
        fig.text(
            0.5,
            0.84,
            f"Training patch 0 · RMSE {np.sqrt(np.mean((sample - approx) ** 2)):.2f} · fixed 0–255 scale",
            ha="center",
        )
        fig.text(
            0.5,
            0.04,
            "Real UCI Landsat training data · four spectral bands shown in false colour",
            ha="center",
            fontsize=11,
        )
        frames.append(capture(fig))
    save("reconstruction", frames, 1100)


def modes():
    frames = []
    stages = [
        ((3, 3, 4), "Original patches", None),
        ((2, 3, 4), "Contract rows with Hᵀ", 0),
        ((2, 2, 4), "Contract columns with Wᵀ", 1),
        ((2, 2, 3), "Contract bands with Bᵀ", 2),
    ]
    colors = [TEAL, "#6366f1", ORANGE]
    for shape, title, active in stages:
        fig = plt.figure(figsize=(10, 5), dpi=100)
        fig.suptitle(
            "MULTILINEAR PCA · Keep samples, compress feature axes",
            fontsize=16,
            weight="bold",
            y=0.96,
        )
        ax = fig.add_axes([0.03, 0.1, 0.47, 0.72], projection="3d")
        filled = np.ones(shape, dtype=bool)
        ax.voxels(
            filled,
            facecolors=colors[active] if active is not None else "#b4c7cc",
            edgecolor="white",
            alpha=0.8,
        )
        ax.set(
            xlim=(0, 3),
            ylim=(0, 3),
            zlim=(0, 4),
            xlabel="row",
            ylabel="column",
            zlabel="band",
        )
        ax.view_init(elev=22, azim=-55)
        ax.set_title("One sample’s coordinates", fontsize=12, pad=10)
        txt = fig.add_axes([0.57, 0.15, 0.4, 0.65])
        txt.axis("off")
        txt.text(0, 0.94, title, fontsize=16, weight="bold")
        txt.text(
            0,
            0.74,
            f"N × {shape[0]} × {shape[1]} × {shape[2]}",
            fontsize=27,
            color=TEAL,
        )
        txt.text(0, 0.56, "N is unchanged: one core per patch.", fontsize=11)
        txt.text(0, 0.37, "H: 3 → 2     W: 3 → 2     B: 4 → 3", fontsize=11)
        txt.text(0, 0.18, f"{np.prod(shape)} coordinates per sample", fontsize=16)
        fig.text(
            0.5,
            0.045,
            "Axis diagram · projected coordinates mix values; this is not cropping pixels.",
            ha="center",
            fontsize=11,
        )
        frames.append(capture(fig))
    save("modes", frames, 1400)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path)
    args = parser.parse_args()
    if args.archive:
        data = args.archive.read_bytes()
    else:
        with urllib.request.urlopen(URL, timeout=60) as response:
            data = response.read()
    if hashlib.sha256(data).hexdigest() != SHA:
        raise ValueError("UCI archive fingerprint changed")
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        X = np.loadtxt(io.BytesIO(z.read("sat.trn")))[:, :-1]
    OUT.mkdir(exist_ok=True)
    cave()
    reconstruction(X)
    modes()


if __name__ == "__main__":
    main()
