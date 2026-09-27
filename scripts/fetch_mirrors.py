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
