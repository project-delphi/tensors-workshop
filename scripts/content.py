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
from scipy.linalg import lu

rng = np.random.default_rng(0)""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["02"] = {
    "setup": """import numpy as np

rng = np.random.default_rng(0)""",
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

photo = data.immunohistochemistry()   # (512, 512, 3) real histology
cells = data.cell()                   # (660, 550)    real microscopy, grayscale
print(photo.shape, cells.shape)""",
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

# A real clip, pinned. "Tormenta en l'Almadrava" by Nicolas Vigier, CC0:
# https://commons.wikimedia.org/wiki/File:Tormenta_en_l%27Almadrava.webm
# 24 seconds of breaking waves at 960x540. The SHA-256 is checked below, so the
# file this notebook decodes cannot silently change under you -- the same
# guarantee section 11 puts on its voice recording.
VIDEO_URL = ("https://upload.wikimedia.org/wikipedia/commons/1/1e/"
             "Tormenta_en_l%27Almadrava.webm")
VIDEO_SHA256 = "e377fcdd2c79b55bce13c2c24b5dd7e412af39cd400eec548a79d0e59d79dc1b"

# Wikimedia answers the default `Python-urllib/3.x` User-Agent with a 403, so
# this identifies itself the way their policy asks.
UA = "tensors-workshop/1.0 (https://github.com/project-delphi/tensors-workshop)"


def fetch_verified_video(url, expected_sha256, n_frames=16, stride=45):
    \"\"\"Download a video, refuse to proceed if it does not match the pinned
    checksum, and decode only every `stride`-th frame, up to `n_frames`.

    Note what is and is not saved. `imiter` still decodes frames in order --
    it reaches frame 675 by decoding all 676 before it -- but it only ever
    RETAINS 16 of them, and it stops as soon as it has them. Holding all 720
    would be a 1.1 GB array. Sampling frames rather than keeping them all is
    exactly the decision the design exercise below asks you to make
    deliberately, for two systems, and to say what it costs.
    \"\"\"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    raw = urllib.request.urlopen(req, timeout=120).read()
    got = hashlib.sha256(raw).hexdigest()
    if got != expected_sha256:
        raise ValueError(
            f"checksum mismatch for {url}: expected {expected_sha256}, got "
            f"{got}. Refusing to use unverified video data.")
    frames = []
    for i, frame in enumerate(
            iio.imiter(io.BytesIO(raw), plugin="FFMPEG", extension=".webm")):
        if i % stride == 0:
            frames.append(frame)
            if len(frames) == n_frames:
                break
    return np.stack(frames)


clip = fetch_verified_video(VIDEO_URL, VIDEO_SHA256)
# The cells below index clip[15] and quote this shape, so a short stream should
# fail here, where the cause is visible, not as an IndexError further down.
assert clip.shape == (16, 540, 960, 3), f"unexpected clip shape {clip.shape}"
print(clip.shape, clip.dtype)   # (16, 540, 960, 3) uint8""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["06"] = {
    "setup": """import numpy as np
from sklearn.datasets import load_digits
from skimage import data

photo = data.immunohistochemistry().astype(float)         # (512, 512, 3)
batch = np.stack([photo, data.astronaut().astype(float)])  # (2, 512, 512, 3)
w = np.array([0.2125, 0.7154, 0.0721])                     # RGB -> grayscale weights
A = np.array([[1., 2.], [3., 4.]])
B = np.array([[5., 6.], [7., 8.]])
print(photo.shape, batch.shape)""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["07"] = {
    "setup": """import numpy as np
import pandas as pd

HOUSING = "https://raw.githubusercontent.com/ageron/handson-ml2/master/datasets/housing/housing.csv"
housing = pd.read_csv(HOUSING)

def unfold(T, axis):
    return np.moveaxis(T, axis, 0).reshape(T.shape[axis], -1)

rng = np.random.default_rng(0)
print(housing.shape)                                   # (20640, 10)
print(housing['total_bedrooms'].isnull().sum())        # 207 missing values!""",
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["08"] = {
    "setup": """import numpy as np
import pandas as pd

FLIGHTS = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/flights.csv"
flights = pd.read_csv(FLIGHTS)

rng = np.random.default_rng(0)
print(flights.shape)                       # (144, 3) — 144 real months, 1949-1960""",
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
