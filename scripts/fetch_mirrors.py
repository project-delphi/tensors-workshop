"""Download the workshop's own copies of the datasets the notebooks fetch.

Every file here is one a notebook downloads from someone else's host, and falls
back to from `data/` on the published site when that host does not answer --
see data/README.md. This script refreshes those copies from their upstream
sources, checks the pinned ones against the same SHA-256 the notebooks verify,
and prints the ledger line for each. Standard library only, so it runs with a
bare `python3`:

    python3 scripts/fetch_mirrors.py            # every file
    python3 scripts/fetch_mirrors.py storm.webm # just this one

It needs the network, which is why nothing in CI runs it. Check 4 in
check_links.py is what fails the build when a notebook names a copy that is
not in `data/`.
"""

from __future__ import annotations

import hashlib
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
UA = "tensors-workshop/1.0 (https://github.com/project-delphi/tensors-workshop)"


def chicago_url() -> str:
    """Notebook 15's own query, read out of the notebook so the two cannot drift."""
    nb = json.loads((ROOT / "notebooks/15-generalized-cp.ipynb").read_text("utf-8"))
    (cell,) = [c for c in nb["cells"] if c.get("id") == "s15-03"]
    src = "".join(cell["source"])
    ns: dict = {}
    exec(src[src.index("CHICAGO_URL =") : src.index("ROW_LIMIT =")], ns)
    return ns["CHICAGO_URL"] + "?" + urllib.parse.urlencode(ns["CHICAGO_QUERY"])


BLOG_19 = (
    "https://raw.githubusercontent.com/project-delphi/ml-blog/"
    "d9f634c19b10f86efd687c8bfb78734b365705ce/posts/cp-or-tucker-in-practice/data/"
)
ALPHATENSOR_20 = (
    "https://raw.githubusercontent.com/google-deepmind/alphatensor/"
    "1949163da3bef7e3eb268a3ac015fd1c2dbfc767/algorithms/"
)

# name in data/ -> (upstream URL, the SHA-256 the notebooks pin, or None)
MIRRORS = {
    "housing.csv": (
        "https://raw.githubusercontent.com/ageron/handson-ml2/master/"
        "datasets/housing/housing.csv",
        None,
    ),
    "taxis.csv": (
        "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/taxis.csv",
        None,
    ),
    "flights.csv": (
        "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/flights.csv",
        None,
    ),
    "storm.webm": (
        "https://upload.wikimedia.org/wikipedia/commons/1/1e/"
        "Tormenta_en_l%27Almadrava.webm",
        "e377fcdd2c79b55bce13c2c24b5dd7e412af39cd400eec548a79d0e59d79dc1b",
    ),
    "landsat.zip": (
        "https://archive.ics.uci.edu/static/public/146/statlog+landsat+satellite.zip",
        "7c54e0e11c872a1b0b647da370d596dcb06746159cce4121d92ccd70b7d7ce3c",
    ),
    "chicago-crime-2023.csv": (None, None),  # URL built from notebook 15
    # Deep dive 19: the blog post's cached data, at the commit the notebook pins.
    "resnet18_layer3_1_conv2.npy": (
        BLOG_19 + "resnet18_layer3_1_conv2.npy",
        "2ace0a79d66e0d1ed2239639269df7f831122100033483a41779b760202e7df5",
    ),
    "sweep_cp_seed0.csv": (
        BLOG_19 + "sweep_cp_seed0.csv",
        "f5fb2d3eb3a1ceb09608c12a2c48513dd9f59a411489a7063c2dc8b192e1e832",
    ),
    "sweep_cp_seed1.csv": (
        BLOG_19 + "sweep_cp_seed1.csv",
        "6adfe63c99a8749f99418a581cf66f1476dbb924f9f0bddc33e99d0acf7e8780",
    ),
    "sweep_cp_seed2.csv": (
        BLOG_19 + "sweep_cp_seed2.csv",
        "6b942cafbace76f821ff96ab2c130a2af69ea5b4a1866a524bbc14611ceddd89",
    ),
    "sweep_tucker2.csv": (
        BLOG_19 + "sweep_tucker2.csv",
        "1a3fb982baa9ce1e8ff2c0a3ff75aca31b7f59f5a3af97e9bb423a7f2f268cfe",
    ),
    # Deep dive 20: the factorisations DeepMind published with the AlphaTensor
    # paper, at the commit the notebook pins.
    "factorizations_r.npz": (
        ALPHATENSOR_20 + "factorizations_r.npz",
        "4d59571a2537a9472e8229176d5ebe2925f3e041ad403c095b41853026caec33",
    ),
    "factorizations_f2.npz": (
        ALPHATENSOR_20 + "factorizations_f2.npz",
        "70f09f349d8d2874ef0e0e089459c7320f5aa3eef277df5ffa67f573709db2da",
    ),
}


def main(names: list[str]) -> int:
    DATA.mkdir(exist_ok=True)
    unknown = set(names) - set(MIRRORS)
    if unknown:
        print(f"unknown: {', '.join(sorted(unknown))}; known: {', '.join(MIRRORS)}")
        return 2
    failed = 0
    for name in names or MIRRORS:
        url, pinned = MIRRORS[name]
        url = url or chicago_url()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as response:
                raw = response.read()
        except Exception as error:  # noqa: BLE001 -- report and go on
            print(f"FAIL  {name}: {error}")
            failed += 1
            continue
        digest = hashlib.sha256(raw).hexdigest()
        if pinned and digest != pinned:
            print(f"FAIL  {name}: sha256 {digest}, notebooks pin {pinned}")
            failed += 1
            continue
        (DATA / name).write_bytes(raw)
        print(f"ok    {name}  sha256 {digest}  bytes {len(raw)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
