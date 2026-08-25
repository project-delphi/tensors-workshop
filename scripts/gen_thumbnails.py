"""Render the dataset-card thumbnails used by the "Nothing here is invented"
slide in both decks.

Unlike `gen_tables.py` and `gen_notebooks.py`, this is **not** part of the CI
regenerate gate: it needs the network, and re-fetching five files from
Wikimedia and one from GitHub on every push would be both slow and rude. It exists so the images in
`images/ds-*` are reproducible artifacts with recorded provenance rather
than mystery binaries — the gap the older `images/*.png` files still have.

Every source below is CC0. That is deliberate: the slide shows nine datasets
at once, and a deck is a bad place to owe nine attribution lines. Credit is
given anyway, in the speaker notes and here.

    uv run --with numpy,pillow,scipy,matplotlib,imageio,imageio-ffmpeg,\
scikit-learn,scikit-image python scripts/gen_thumbnails.py

Photographic cards are written as `images/ds-*.jpg`; the two flat-colour ones
(the waveform and the digit sheet) are `images/ds-*.png`, because JPEG rings
around hard edges and those two are all hard edges.
"""

from __future__ import annotations

import hashlib
import io
import urllib.request
from pathlib import Path

IMAGES = Path(__file__).resolve().parent.parent / "images"

# Wikimedia's User-Agent policy rejects the default `Python-urllib/3.x` with a
# 403, so every fetch here identifies itself. The notebooks do the same.
UA = "tensors-workshop/1.0 (https://github.com/project-delphi/tensors-workshop)"

# Card thumbnails are displayed ~230px wide in a 1280x760 deck — five columns
# of the grid, less the 95% max-width the reveal theme puts on every image.
# Generate at roughly 2x so they stay sharp on a projector and on a retina
# display. `.ds img` in slides/slides.scss pins the box to this 20:13.
CARD = (400, 260)

# ─── sources ────────────────────────────────────────────────────────────────
# name -> (url, sha256, credit). Pinned like the video and the audio: a Commons
# file can be overwritten by a later upload under the same name, and silently
# regenerating a card from a different photograph is exactly the kind of change
# nobody would catch in a binary diff.
PHOTOS = {
    "ds-nyc-taxi": (
        "https://upload.wikimedia.org/wikipedia/commons/6/6a/"
        "Yellow_Cabs_in_NYC_%28Unsplash%29.jpg",
        "2541280bcd1425c5dc22eebeddc427f6049d4ca89847074c272c033a17f1ccac",
        "Ferdinand Stohr, CC0 - "
        "commons.wikimedia.org/wiki/File:Yellow_Cabs_in_NYC_(Unsplash).jpg",
    ),
    "ds-airliner": (
        "https://upload.wikimedia.org/wikipedia/commons/2/2b/"
        "Douglas_DC-3_Airliner._%2816055221680%29.jpg",
        "f7505879ef9371fb3f42de150439829c5ac74e95e3c5b3e181dea0ffb4ada1d5",
        "Bernard Spragg NZ, CC0 - "
        "commons.wikimedia.org/wiki/File:Douglas_DC-3_Airliner._(16055221680).jpg",
    ),
    "ds-breast-cancer": (
        "https://upload.wikimedia.org/wikipedia/commons/e/ef/"
        "Histopathology_of_invasive_ductal_carcinoma_of_the_breast.jpg",
        "9cebd18130cf05d0d401f885f913451f0b4623c6dd4b049d0b8b17760afb6172",
        "Mikael Haggstrom MD, CC0 - commons.wikimedia.org/wiki/"
        "File:Histopathology_of_invasive_ductal_carcinoma_of_the_breast.jpg",
    ),
    "ds-housing": (
        "https://upload.wikimedia.org/wikipedia/commons/4/46/"
        "South-Los-Angeles-subdivision-houses-near-Darby-Park-"
        "Aerial-view-from-north-August-2014.jpg",
        "44a70a2531890f4b01371a52405d88710d5a4cfca2ecb936f3441cdbdca25923",
        "Alfred Twu, CC0 - commons.wikimedia.org/wiki/File:South-Los-Angeles-"
        "subdivision-houses-near-Darby-Park-Aerial-view-from-north-August-2014.jpg",
    ),
}

# The same pinned file section 11 downloads. Bart Massey, CC0.
VOICE_URL = (
    "https://raw.githubusercontent.com/pdx-cs-sound/wavs/"
    "ed5ebcbbbc2d11f0adddc9b50b78d581c29f738c/voice.wav"
)
VOICE_SHA256 = "2c4b4d9d5f90715fdbf599869a465d521638f40ca978b186df96f1543a4d67dc"

# The same pinned file section 05 downloads. Nicolas Vigier, CC0 -
# commons.wikimedia.org/wiki/File:Tormenta_en_l%27Almadrava.webm
# A storm at l'Almadrava: 24s, 960x540, breaking waves. Chosen over the other
# small CC0 clips on Commons because it is daylight (readable on a projector),
# has continuous large-scale motion (so a shuffled time axis is obviously
# wrong), and shows no identifiable people.
VIDEO_URL = (
    "https://upload.wikimedia.org/wikipedia/commons/1/1e/"
    "Tormenta_en_l%27Almadrava.webm"
)
VIDEO_SHA256 = "e377fcdd2c79b55bce13c2c24b5dd7e412af39cd400eec548a79d0e59d79dc1b"

INK = "#2f4858"      # $presentation-heading-color, from slides/slides.scss
ACCENT = "#2c5f8a"   # $link-color


def get(url: str, expected_sha256: str | None = None) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    raw = urllib.request.urlopen(req, timeout=120).read()
    if expected_sha256 is not None:
        got = hashlib.sha256(raw).hexdigest()
        if got != expected_sha256:
            raise ValueError(
                f"checksum mismatch for {url}: expected {expected_sha256}, "
                f"got {got}. Refusing to build a thumbnail from it.")
    return raw


def cover(img, size=CARD):
    """Resize to fill `size`, cropping the overflowing axis — every card is the
    same shape, so the grid stays on a baseline."""
    from PIL import Image
    tw, th = size
    sw, sh = img.size
    scale = max(tw / sw, th / sh)
    img = img.resize((round(sw * scale), round(sh * scale)), Image.LANCZOS)
    w, h = img.size
    left, top = (w - tw) // 2, (h - th) // 2
    return img.crop((left, top, left + tw, top + th)).convert("RGB")


def save(img, name: str, lossless: bool = False) -> None:
    """Photographs go out as JPEG: the same card as PNG is ~190 KB against
    ~30 KB, and nine of them share one slide. Pass `lossless=True` for the
    flat-colour cards — the digit sheet and the waveform are nothing but hard
    edges, JPEG rings around every one of them, and they compress smaller as
    PNG anyway."""
    if lossless:
        out = IMAGES / f"{name}.png"
        img.save(out, "PNG", optimize=True)
    else:
        out = IMAGES / f"{name}.jpg"
        img.save(out, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"  {out.relative_to(IMAGES.parent)}  "
          f"{img.size[0]}x{img.size[1]}  {out.stat().st_size // 1024} KB")


def photos() -> None:
    from PIL import Image
    print("Wikimedia photographs (CC0)")
    for name, (url, sha256, credit) in PHOTOS.items():
        img = Image.open(io.BytesIO(get(url, sha256)))
        save(cover(img), name)
        print(f"      {credit}")


def audio() -> None:
    """The waveform of the exact recording section 11 denoises."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np
    from scipy.io import wavfile

    print("Audio waveform, rendered from the pinned voice.wav (CC0)")
    fs, data = wavfile.read(io.BytesIO(get(VOICE_URL, VOICE_SHA256)))
    x = data.astype(np.float64) / 32768.0
    if x.ndim > 1:
        x = x.mean(axis=1)

    fig, ax = plt.subplots(figsize=(CARD[0] / 100, CARD[1] / 100), dpi=100)
    t = np.arange(len(x)) / fs
    ax.fill_between(t, x, -x, color=ACCENT, linewidth=0)
    ax.plot(t, x, color=INK, linewidth=0.4)
    ax.set_xlim(0, t[-1])
    ax.set_ylim(-1.05, 1.05)
    ax.axis("off")
    fig.subplots_adjust(0, 0, 1, 1)
    fig.savefig(IMAGES / "ds-audio.png", dpi=100, facecolor="white")
    plt.close(fig)
    out = IMAGES / "ds-audio.png"
    print(f"  {out.relative_to(IMAGES.parent)}  {len(x)} samples at {fs} Hz  "
          f"{out.stat().st_size // 1024} KB")


def digits() -> None:
    """The actual `load_digits()` samples, not MNIST. The distinction matters:
    this is the UCI optical-recognition set, 1797 images at 8x8, and the card
    should show the real thing rather than a look-alike."""
    import numpy as np
    from PIL import Image
    from sklearn.datasets import load_digits

    print("Handwritten digits, rendered from load_digits()")
    d = load_digits()
    picks = [np.flatnonzero(d.target == k)[0] for k in range(8)]

    cols, rows, gap = 4, 2, 6
    cw = (CARD[0] - (cols - 1) * gap) // cols
    ch = (CARD[1] - (rows - 1) * gap) // rows
    sheet = Image.new("RGB", CARD, "white")
    for k, idx in enumerate(picks):
        # 16 grey levels stretched to 0-255, inverted so ink is dark on white.
        a = 255 - (d.images[idx] / 16.0 * 255).astype(np.uint8)
        # NEAREST on purpose: the pixels are the data, and smoothing them away
        # would hide exactly what "shape (1797, 8, 8)" means.
        tile = Image.fromarray(a, "L").resize((min(cw, ch),) * 2, Image.NEAREST)
        sheet.paste(tile.convert("RGB"),
                    (k % cols * (cw + gap) + (cw - tile.width) // 2,
                     k // cols * (ch + gap) + (ch - tile.height) // 2))
    save(sheet, "ds-digits", lossless=True)


def cell() -> None:
    """skimage.data.cell(): a quantitative phase image of a single cell
    floating in saline, recovered from a digital hologram. CC0."""
    import numpy as np
    from PIL import Image
    from skimage import data

    print("Cell microscopy, rendered from skimage.data.cell() (CC0)")
    a = data.cell().astype(np.float64)

    # The cell sits off-centre in the 660x550 frame and a plain min/max stretch
    # leaves it as a dim blob. Centre the crop on the bright phase peak and
    # stretch on percentiles so the hologram's banding does not eat the range.
    ys, xs = np.nonzero(a >= np.percentile(a, 99.5))
    cy, cx = int(ys.mean()), int(xs.mean())
    # A square window, small enough that the cell still lands near the middle:
    # it sits close to the right edge of the 660x550 frame, so a wide crop just
    # clamps against that edge and pushes the cell back out to the side.
    side = 280
    top = int(np.clip(cy - side // 2, 0, a.shape[0] - side))
    left = int(np.clip(cx - side // 2, 0, a.shape[1] - side))
    a = a[top:top + side, left:left + side]

    lo, hi = np.percentile(a, (2, 99.8))
    a = np.clip((a - lo) / (hi - lo), 0, 1)
    img = Image.fromarray((a * 255).astype(np.uint8), "L").convert("RGB")
    save(cover(img), "ds-cell")


def histology() -> None:
    """skimage.data.immunohistochemistry(): colonic glands, with FHL2 expression
    revealed in brown by DAB over a blue haematoxylin counterstain. Acquired at
    the Center for Microscopy and Molecular Imaging; no known copyright
    restrictions. Already an 8-bit RGB photograph, so unlike `cell()` it needs
    no percentile stretch — the crop is the whole treatment."""
    from PIL import Image
    from skimage import data

    print("Histology, rendered from skimage.data.immunohistochemistry()")
    save(cover(Image.fromarray(data.immunohistochemistry())), "ds-histology")


def video() -> None:
    """A strip of frames from the exact clip section 05 decodes — a still of a
    single frame would not show that the time axis is the point."""
    import imageio.v3 as iio
    import numpy as np
    from PIL import Image

    print("Video frame strip, rendered from the pinned clip (CC0)")
    raw = get(VIDEO_URL, VIDEO_SHA256)
    frames = []
    for i, frame in enumerate(
            iio.imiter(io.BytesIO(raw), plugin="FFMPEG", extension=".webm")):
        if i % 60 == 0:
            frames.append(frame)
            if len(frames) == 3:
                break

    gap, (tw, th) = 6, CARD
    panel = (tw - 2 * gap) // 3
    strip = Image.new("RGB", CARD, "white")
    for k, frame in enumerate(frames):
        tile = cover(Image.fromarray(np.asarray(frame)), (panel, th))
        strip.paste(tile, (k * (panel + gap), 0))
    save(strip, "ds-video")


if __name__ == "__main__":
    photos()
    digits()
    cell()
    histology()
    audio()
    video()
