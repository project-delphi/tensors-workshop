#!/usr/bin/env python3
"""Export the six attention/compression GIFs from notebook-owned functions.

Run with the figures environment. Only NumPy, Matplotlib and Pillow are needed;
no notebook kernel, PyTorch, network or system encoder is used by this exporter.
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.animation import FuncAnimation, PillowWriter

ROOT = Path(__file__).resolve().parents[1]


def export_module(number: str, slug: str, kinds: tuple[str, ...]) -> None:
    """Read the explicitly selected local cells and export their animations."""
    path = ROOT / "notebooks" / f"{number}-{slug}.ipynb"
    cells = {cell["id"]: cell for cell in json.loads(path.read_text())["cells"]}
    namespace = {"np": np, "plt": plt, "FuncAnimation": FuncAnimation}
    selected = (["m18-data"] if number == "18" else []) + [f"m{number}-animation"]
    for cell_id in selected:
        source = "".join(cells[cell_id]["source"])
        exec(compile(source, f"{path.name}:{cell_id}", "exec"), namespace)
    function = (
        "make_attention_animation" if number == "17" else "make_compression_animation"
    )
    for kind in kinds:
        animation = namespace[function](kind)
        destination = ROOT / "images" / f"cube-{number}-{kind}.gif"
        animation.save(str(destination), writer=PillowWriter(fps=1.25), dpi=90)
        print(f"{destination.name}: {destination.stat().st_size // 1024} KB")


if __name__ == "__main__":
    export_module("17", "multi-head-attention", ("split", "scores", "values"))
    export_module("18", "feature-compression", ("reconstruct", "energy", "terms"))
