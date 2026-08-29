"""Centrally owned Setup cells for the twelve workshop notebooks.

Teaching body cells live directly in notebooks/*.ipynb and are intentionally
not represented here. scripts/gen_notebooks.py refreshes the generated
scaffolding while preserving the notebook-owned teaching body in place.

Shared workshop facts and bilingual objectives live in _variables.yml.
This file owns Setup code only.
"""
from __future__ import annotations

# Shared by the section 00 Setup cell.
CSV_URLS = """HOUSING = "https://raw.githubusercontent.com/ageron/handson-ml2/master/datasets/housing/housing.csv"
TAXIS   = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/taxis.csv"
FLIGHTS = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/flights.csv\""""

CONTENT: dict[str, dict[str, str]] = {}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["00"] = {
    "setup": f"""# Section 05 decodes a real video and Colab does not reliably ship an
# ffmpeg backend, so install it now. Everything else below is already here.
%pip install -q "imageio[ffmpeg]"

import numpy as np
import pandas as pd
from sklearn.datasets import load_digits, load_breast_cancer
from skimage import data
from scipy import signal
from scipy.linalg import lu, toeplitz

{CSV_URLS}

housing = pd.read_csv(HOUSING)
taxis   = pd.read_csv(TAXIS)
flights = pd.read_csv(FLIGHTS)
print(housing.shape, taxis.shape, flights.shape)   # (20640, 10) (6433, 14) (144, 3)

# Section 05's video is 5.9 MB, so don't pull it now -- just prove the backend
# imports and the host answers. Better to find out here than in two hours.
import imageio_ffmpeg, urllib.request
VIDEO_URL = ("https://upload.wikimedia.org/wikipedia/commons/1/1e/"
             "Tormenta_en_l%27Almadrava.webm")
req = urllib.request.Request(VIDEO_URL, headers={{
    "User-Agent": "tensors-workshop/1.0 "
                  "(https://github.com/project-delphi/tensors-workshop)",
    "Range": "bytes=0-1023"}})
got = urllib.request.urlopen(req, timeout=30).read()
# Assert rather than print the length: a proxy that ignores Range would quietly
# pull all 5.9 MB here and still look like a pass, which is the opposite of what
# this cell is for.
assert len(got) == 1024, f"expected a 1 KB range, got {{len(got)}} bytes"
print("1024 bytes of video reachable | ffmpeg", imageio_ffmpeg.get_ffmpeg_version())""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["01"] = {
    "setup": """import numpy as np
from sklearn.datasets import load_digits
from skimage import data

rng = np.random.default_rng(0)""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["02"] = {
    "setup": """%pip install -q "imageio[ffmpeg]"

import hashlib
import io
import urllib.request

import imageio.v3 as iio
import numpy as np
from sklearn.datasets import load_digits
from skimage import data

rng = np.random.default_rng(0)

# Real image data: handwritten digits
digits = load_digits()
digit_batch = digits.images[:8].astype(np.float32)   # (N, H, W)
digit_labels = digits.target[:8]
real_digit = digit_batch[0]
real_photo = data.astronaut()                        # real RGB photograph

# Real video data: "Tormenta en l'Almadrava" by Nicolas Vigier, CC0.
# Same pinned source/checksum used by notebook 05.
VIDEO_URL = (
    "https://upload.wikimedia.org/wikipedia/commons/1/1e/"
    "Tormenta_en_l%27Almadrava.webm"
)
VIDEO_SHA256 = "e377fcdd2c79b55bce13c2c24b5dd7e412af39cd400eec548a79d0e59d79dc1b"
UA = "tensors-workshop/1.0 (https://github.com/project-delphi/tensors-workshop)"


def fetch_verified_video(url, expected_sha256, n_frames=16, stride=45):
    # Download, checksum, and retain sampled frames from a real video.
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    raw = urllib.request.urlopen(req, timeout=120).read()

    got = hashlib.sha256(raw).hexdigest()
    if got != expected_sha256:
        raise ValueError(
            f"checksum mismatch: expected {expected_sha256}, got {got}"
        )

    frames = []
    for i, frame in enumerate(
        iio.imiter(io.BytesIO(raw), plugin="FFMPEG", extension=".webm")
    ):
        if i % stride == 0:
            frames.append(frame)
            if len(frames) == n_frames:
                break

    return np.stack(frames)


real_video = fetch_verified_video(VIDEO_URL, VIDEO_SHA256)
assert real_video.shape == (16, 540, 960, 3), real_video.shape

# Build a real temporal tensor with the same shape as digit_batch: (8, 8, 8).
# Take 8 sampled video frames, a centered 8x8 crop, and average RGB.
r0 = real_video.shape[1] // 2 - 4
c0 = real_video.shape[2] // 2 - 4
video_patch = (
    real_video[:8, r0:r0 + 8, c0:c0 + 8]
    .mean(axis=3)
    .astype(np.float32)
)

print("real_digit :", real_digit.shape, real_digit.dtype)
print("digit_batch:", digit_batch.shape, digit_batch.dtype)
print("real_photo :", real_photo.shape, real_photo.dtype)
print("real_video :", real_video.shape, real_video.dtype)
print("video_patch:", video_patch.shape, video_patch.dtype)""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["03"] = {
    "setup": """import numpy as np
from sklearn.datasets import load_breast_cancer, load_digits

bc = load_breast_cancer()
X, y = bc.data, bc.target          # (569, 30); y: 0 = malignant, 1 = benign
names = list(bc.feature_names)
print(X.shape, len(names))""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["04"] = {
    "setup": """import numpy as np
from skimage import data

# Real images distributed with scikit-image.
photo = data.immunohistochemistry()   # (512, 512, 3) real histology, RGB
cells = data.cell()                   # (660, 550)    real microscopy, grayscale
astronaut = data.astronaut()          # (512, 512, 3) real RGB photograph
coffee = data.coffee()                # (400, 600, 3) real RGB photograph


def center_crop_rgb(img, size=256):
    # Deterministic centre crop so distinct real RGB images can be stacked.
    h, w, c = img.shape
    if c != 3 or h < size or w < size:
        raise ValueError(
            f"expected RGB image at least {size}x{size}, got {img.shape}"
        )

    r0 = (h - size) // 2
    c0 = (w - size) // 2
    return img[r0:r0 + size, c0:c0 + size]


rgb_sources = [photo, astronaut, coffee]

print("histology:", photo.shape)
print("microscopy:", cells.shape)
print("astronaut:", astronaut.shape)
print("coffee:", coffee.shape)""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["05"] = {
    "setup": """%pip install -q "imageio[ffmpeg]"

import hashlib
import io
import urllib.request

import numpy as np
import imageio.v3 as iio
import matplotlib.pyplot as plt

# Real clip: "Tormenta en l'Almadrava" by Nicolas Vigier, CC0.
# https://commons.wikimedia.org/wiki/File:Tormenta_en_l%27Almadrava.webm
VIDEO_URL = (
    "https://upload.wikimedia.org/wikipedia/commons/1/1e/"
    "Tormenta_en_l%27Almadrava.webm"
)
VIDEO_SHA256 = "e377fcdd2c79b55bce13c2c24b5dd7e412af39cd400eec548a79d0e59d79dc1b"
UA = "tensors-workshop/1.0 (https://github.com/project-delphi/tensors-workshop)"


def fetch_verified_video(url, expected_sha256, n_frames=16, stride=45):
    # Verify the real file, decode the whole stream, retain only sparse frames.
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    raw = urllib.request.urlopen(req, timeout=120).read()

    got = hashlib.sha256(raw).hexdigest()
    if got != expected_sha256:
        raise ValueError(
            f"checksum mismatch: expected {expected_sha256}, got {got}"
        )

    kept_frames = []
    kept_source_indices = []
    total_frames = 0

    for i, frame in enumerate(
        iio.imiter(io.BytesIO(raw), plugin="FFMPEG", extension=".webm")
    ):
        total_frames = i + 1
        if i % stride == 0 and len(kept_frames) < n_frames:
            kept_frames.append(frame)
            kept_source_indices.append(i)

    clip = np.stack(kept_frames)
    return clip, np.asarray(kept_source_indices), total_frames


clip, kept_source_indices, total_frames = fetch_verified_video(
    VIDEO_URL, VIDEO_SHA256
)

assert clip.shape == (16, 540, 960, 3), f"unexpected clip shape {clip.shape}"
assert total_frames == 720, f"unexpected frame count {total_frames}"

print("retained tensor:", clip.shape, clip.dtype)
print("source frames:", total_frames)
print("source indices retained:", kept_source_indices.tolist())
print("RAM retained:", f"{clip.nbytes / 1024**2:.1f} MB")""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["06"] = {
    "setup": """import numpy as np
import matplotlib.pyplot as plt
import ipywidgets as widgets
from IPython.display import display
from sklearn.datasets import load_digits
from skimage import data

# Enable ipywidgets in Google Colab when available.
try:
    from google.colab import output
    output.enable_custom_widget_manager()
except ImportError:
    pass

# Real colour images.
photo = data.immunohistochemistry().astype(float)          # (512, 512, 3)
batch = np.stack([photo, data.astronaut().astype(float)]) # (2, 512, 512, 3)
w = np.array([0.2125, 0.7154, 0.0721])                    # RGB -> grayscale weights

# Real handwritten digits (UCI Optical Recognition dataset, packaged by sklearn).
digits = load_digits()
digit_images = digits.images.astype(float)                 # (1797, 8, 8)

# Small 2x2 matrices for Exercise 2 are NOT invented numbers:
# they are central pixel patches from two real digit images.
A = digit_images[0, 2:4, 2:4]
B = digit_images[1, 2:4, 2:4]

print("photo:", photo.shape, "batch:", batch.shape)
print("digits:", digit_images.shape, "labels:", digits.target.shape)
print(
    "Exercise 2 patches come from digit labels:",
    digits.target[0],
    "and",
    digits.target[1],
)
print("A =\\n", A)
print("B =\\n", B)""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["07"] = {
    "setup": """import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import ipywidgets as widgets
import plotly.express as px
import plotly.graph_objects as go
from IPython.display import display
from sklearn.datasets import load_digits

# Enable ipywidgets in Google Colab when available.
try:
    from google.colab import output
    output.enable_custom_widget_manager()
except ImportError:
    pass

HOUSING = (
    "https://raw.githubusercontent.com/ageron/handson-ml2/master/"
    "datasets/housing/housing.csv"
)
housing = pd.read_csv(HOUSING).dropna().reset_index(drop=True)

features = [
    "housing_median_age",
    "total_rooms",
    "total_bedrooms",
    "population",
    "households",
    "median_income",
]

X_raw = housing[features].to_numpy(float)
feature_mean = X_raw.mean(axis=0)
feature_std = X_raw.std(axis=0)
X_scaled = (X_raw - feature_mean) / feature_std

# Bias + six standardized real features -> 7 columns.
X = np.column_stack([np.ones(len(housing)), X_scaled])
y = housing["median_house_value"].to_numpy(float)
column_names = ["bias"] + features

# Real image tensor for Exercise 3.
digits = load_digits()
digit_tensor = digits.images.astype(float)  # (1797, 8, 8)

def unfold(T, axis=0):
    return np.moveaxis(T, axis, 0).reshape(T.shape[axis], -1)

print("housing rows:", len(housing))
print("housing design matrix:", X.shape)
print("digit tensor:", digit_tensor.shape)
print("interactive charts: Plotly enabled (hover, zoom, pan)")""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["08"] = {
    "setup": """import numpy as np
import pandas as pd
import ipywidgets as widgets
import plotly.express as px
import plotly.graph_objects as go
from IPython.display import display

# Enable ipywidgets in Google Colab when available.
try:
    from google.colab import output
    output.enable_custom_widget_manager()
except ImportError:
    pass

FLIGHTS = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/flights.csv"
flights = pd.read_csv(FLIGHTS)

y = flights["passengers"].to_numpy(float)
labels = (
    flights["year"].astype(str)
    + "-"
    + flights["month"].astype(str).str[:3]
).to_numpy()

rng = np.random.default_rng(0)

print("real months / meses reales:", len(y))
print("range / periodo:", labels[0], "→", labels[-1])
print("passengers min/max:", int(y.min()), int(y.max()))
print("interactive charts: Plotly + ipywidgets enabled")""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["09"] = {
    "setup": """import numpy as np
from scipy import signal
from scipy.linalg import toeplitz
from skimage import data
from skimage.restoration import richardson_lucy

img = data.camera().astype(float) / 255.      # real photograph, 512x512
sobel = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], float)
print(img.shape, img.min(), img.max())""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["10"] = {
    "setup": """import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from skimage import data

TAXIS = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/taxis.csv"
taxis = pd.read_csv(TAXIS)

def unfold(T, axis):
    return np.moveaxis(T, axis, 0).reshape(T.shape[axis], -1)

print(taxis.shape)                       # (6433, 14) — 6,433 real NYC taxi trips""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["11"] = {
    "setup": """import numpy as np
import pandas as pd
from sklearn.datasets import load_breast_cancer
from scipy import signal

rng = np.random.default_rng(0)""",
}
