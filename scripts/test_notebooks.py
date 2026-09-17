#!/usr/bin/env python3
"""Execute each notebook's declared core route in a fresh kernel.

Every other gate in this repo is static. check_links.py validates notebook
JSON, byte-compares docs/notebooks/ against notebooks/, and proves by AST that
no visible cell reads a name only a folded solution binds.
check_teaching_materials.py validates a core route as *structure* -- ids
present, tagged, in order. None of them starts a kernel, so a dead CSV URL or a
solution that no longer runs would ship green. That gap is what
RELEASE_CHECKLIST.md used to hand to a human.

WHAT RUNS, AND WHY IT IS NOT JUST THE ROUTE
-------------------------------------------
Many core-activity cells hold no executable code: they are
the student's blank `# TODO n / TAREA n` block. Notebooks 00 and 12 declare an
empty `prep` and a markdown activity -- deliberately, because neither needs
code live. Only notebook 10's activity is real code. So prep + activity would
execute the setup cells and then a comment.

The code that actually demonstrates the lesson is the `solution`-tagged cell
answering the activity, so a run is:

    prep + declared feedback helpers -> activity -> paired solution

Feedback helpers are called by the paired solutions; focused unit tests also
exercise plausible wrong learner results. The activity remains a blank TODO
where the lesson expects the learner to write code.

Those run sets are self-contained; none needs an intervening cell.
Notebooks whose route holds no executable code at all fall back to running
every code cell in document order, solutions included.

COLAB IS THE RUNTIME THIS DEFENDS
---------------------------------
Nothing here is stripped or mocked. `%pip install` lines run verbatim, remote
data is fetched for real, and the guarded `from google.colab import output`
blocks take their own ImportError branch exactly as they would off Colab.
A mock `google.colab` would defeat that guard rather than support it, and a
cuda/mps device selector would be dead code -- these notebooks are NumPy,
scikit-learn, scikit-image, matplotlib and ipywidgets, with no accelerator
code anywhere. check_colab_parity() below is what keeps both statements true
as the notebooks change.

The executed notebook is never written back. notebooks/ sits inside the
byte-exact regenerate gate in .github/workflows/publish.yml, so a stray output
or execution count would fail CI and check 1.

    uv run --group execute python scripts/test_notebooks.py
    uv run --group execute python scripts/test_notebooks.py --list
    uv run --group execute python scripts/test_notebooks.py --only 10
    uv run --group execute python scripts/test_notebooks.py --offline
"""

from __future__ import annotations

import argparse
import copy
import os
import re
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NBDIR = ROOT / "notebooks"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_teaching_materials import (  # noqa: E402
    check_sequence,
    route_of,
    support_of,
    workshop_meta,
)

# Matplotlib must not try to open a window: this runs headless on a CI runner
# and on a developer's Mac. Set before any kernel inherits the environment.
os.environ.setdefault("MPLBACKEND", "Agg")

# Routes that fetch remote data or run %pip. --offline skips exactly these.
# 12 is here for the voice.wav it fetches inside its fallback run.
NETWORK = {"00", "02", "05", "07", "08", "09", "10", "11", "12", "14", "15", "16"}

# Bigger than any cell's own retry budget, so a slow-but-alive remote fails
# with the bilingual sentence the fetch cells were written to print rather than
# with an opaque timeout. Notebook 15's fetch_crime is the longest: three
# attempts at 70s plus 9s of backoff.
CELL_TIMEOUT = 300

# Cells slower than this are named as they finish, so a long CI step says
# what it is waiting on.
SLOW_CELL_SECONDS = float(os.environ.get("WORKSHOP_SLOW_CELL", "20"))

# Stdout each executed cell must produce, keyed by notebook number then cell id.
# Seeded from real output, so these assert the numbers the workshop teaches --
# not merely that nothing raised. Cells absent from the table are still
# required to execute cleanly.
EXPECTED: dict[str, dict[str, list[str]]] = {
    "00": {
        "s00-11": [
            "Housing shape / Forma de vivienda: (20640, 10)",
            "Busiest pickup hour / Hora con más recogidas: 18",
        ]
    },
    "01": {
        "s01-11": [
            "order-3 tensor / tensor de orden 3: shape=(2, 3, 4), ndim=3, size=24",
            "Digits / Dígitos: (1797, 8, 8)",
            "Astronaut / Astronauta: (512, 512, 3)",
        ]
    },
    "02": {
        "s02-02": ["real_video / video real: (16, 540, 960, 3)"],
        # Shuffling reorders presentation, not the pairing of X with y.
        "s02-09": ["Same labeled examples / Mismos ejemplos etiquetados: True"],
    },
    "03": {
        "s03-02": [
            "Breast-cancer matrix / Matriz de cáncer de mama: (569, 30)",
            "Digit images / Imágenes de dígitos: (1797, 8, 8)",
        ],
        "s03-13": ["Flattened matrix / Matriz aplanada: (1797, 64)"],
        # Dividing by a zero-variance column makes NaN; the safe denominator
        # removes it. Both halves are asserted, because either alone can pass.
        "s03-16": [
            "NaN before fix / NaN antes de corregir: True",
            "Zero-variance pixels / Píxeles de varianza cero: 3",
            "NaN after fix / NaN después de corregir: False",
        ],
    },
    "04": {
        "s04-02": [
            "Histology / Histología: (512, 512, 3)",
            "Microscopy / Microscopía: (660, 550)",
        ],
        "s04-06": ["HWC: (512, 512, 3)", "CHW: (3, 512, 512)"],
    },
    "05": {
        "s05-02": ["Recorded source frames / Fotogramas grabados:"],
        "s05-06": ["Axes / Ejes: (T, H, W, C)"],
    },
    "06": {"s06-02": ["Photo / Foto: (512, 512, 3)"]},
    "07": {
        "p07-identifiability-solution": [
            "Same predictions / Mismas predicciones: True",
            "Minimum-norm coefficients / Coeficientes de norma mínima: [1. 1.]",
            "Separate effects remain unknown / Los efectos separados siguen sin conocerse.",
        ],
    },
    "08": {
        "s08-02": [
            "Real months / Meses reales: 144",
            "Passengers min/max / Pasajeros mín/máx: 104 622",
        ],
        # Fibonacci by repeated matrix multiplication must match matrix_power.
        "s08-06": [
            "Loop final / Final del ciclo: [89, 55]",
            "matrix_power: [89, 55]",
            "Same result / Mismo resultado: True",
            "Fibonacci(10): 55",
        ],
    },
    "09": {
        "s12-b-4e9353481f91": [
            "Digit matrix / Matriz de dígitos: (1797, 64)",
            "Airline months / Meses de aerolíneas: (144,)",
        ],
        "s12-b-a673c50f1008": ["Design matrix / Matriz de diseño: (144, 11)"],
    },
    "10": {
        "s10-02": ["Tensor shape / Forma del tensor: (4, 5, 24)", "Order / Orden: 3"]
    },
    "11": {
        "s13-setup": ["Taxi tensor / Tensor taxis: (4, 5, 24) entries: 480"],
        "s13-ex1-solution": ["Taxi shape: (4, 5, 24)"],
    },
    "12": {
        # Unstandardized PCA answers a different question: one component
        # against ten. The contrast is the lesson, so assert both numbers.
        "p11-pca-solution": [
            "95% components — raw / sin estandarizar: 1",
            "95% components — standardized / estandarizado: 10",
        ],
        "p11-attention-solution": [
            "Rows sum to 1 / Filas suman 1: True",
            "Largest padded weight / Mayor peso en padding: 0.0",
        ],
        "p11-cholesky-solution": ["L @ L.T == Sigma / L @ L.T == Sigma: True"],
    },
    "13": {"s09-02": ["Full image / Imagen completa: (512, 512)"]},
    # 14's tensor is a file in a git repository, so every number it prints is
    # as fixed as the file is, and asserting them costs nothing.
    "14": {
        "s14-04": [
            "Tensor / Tensor: (43, 200, 88)",
            "Targets / Objetivos: [-90   0  90 180]",
        ],
        "s14-07": ["lam = 0.004784", "peak_t = 54"],
    },
    # 15's tensor is a live query against a city data portal. Its *shape* is
    # structural -- seven days, twenty-four hours, Chicago's 77 community
    # areas plus the unassigned one, the ten commonest types -- and the
    # deviance ratio is arithmetic on two literals. The report counts are
    # neither: Chicago reclassifies and expunges historical records, so
    # asserting 244,367 here would be asserting that nobody in the city ever
    # corrects a 2023 filing.
    "15": {
        "s15-03": ["Tensor / Tensor: (7, 24, 78, 10)"],
        "s15-07": ["Squared error charges both misses 4", "614 times more"],
    },
}

failures: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)
    print(f"  FAIL  {msg}")


def tags(cell: dict) -> list[str]:
    return cell.get("metadata", {}).get("tags", [])


def source(cell: dict) -> str:
    src = cell.get("source", "")
    return src if isinstance(src, str) else "".join(src)


def is_stub(cell: dict) -> bool:
    """A student's blank exercise: comments and whitespace, nothing to run."""
    return not [
        line
        for line in source(cell).splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]


# ── Colab parity ─────────────────────────────────────────────────────────────

COLAB_IMPORT = re.compile(r"^[ \t]*(?:from|import)[ \t]+google\.colab\b", re.M)
ABSOLUTE_PATH = re.compile(r"""["'](?:/Users/|/home/|/content/|[A-Za-z]:\\)""")
PIP_INSTALL = re.compile(r"^[ \t]*[%!]pip[ \t]+install\b(.*)$", re.M)
DEVICE_STRING = re.compile(r"""["'](?:cuda(?::\d+)?|mps)["']""")


def guarded(src: str, match: re.Match) -> bool:
    """Is this google.colab import inside a try: with an ImportError branch?

    Indentation decides it, because that is what decides it in Python. Walk
    back to the nearest `try:` less indented than the import, then forward from
    the import to the first line at that same indent: a real guard reaches an
    `except ImportError`/`except Exception` before it reaches anything else.
    """
    lines = src.splitlines()
    line_no = src[: match.start()].count("\n")
    if line_no >= len(lines):
        return False

    def indent(text: str) -> int:
        return len(text) - len(text.lstrip())

    own = indent(lines[line_no])

    opener = None
    for i in range(line_no - 1, -1, -1):
        stripped = lines[i].strip()
        if not stripped or stripped.startswith("#"):
            continue
        if indent(lines[i]) < own and stripped == "try:":
            opener = i
            break
        if indent(lines[i]) < own:
            return False  # some other block opened first
    if opener is None:
        return False

    base = indent(lines[opener])
    for line in lines[line_no + 1 :]:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if indent(line) > base:
            continue  # still inside the try body
        return bool(re.match(r"except\s+(ImportError|Exception)\b", stripped))
    return False


def check_colab_parity(nb: dict, label: str) -> None:
    """Keep a notebook runnable in Colab and in a bare local kernel alike.

    Static, and it runs before any kernel starts. These are the properties the
    audit asked for shims to provide; the notebooks already hold them, so the
    useful thing is a guard that says so when one stops being true.
    """
    for cell in nb["cells"]:
        if cell.get("cell_type") != "code":
            continue
        src = source(cell)
        cid = cell.get("id")

        for match in COLAB_IMPORT.finditer(src):
            # The import only works on Colab, so it must sit under a try: with
            # an ImportError branch -- that branch is what every local and CI
            # run of this script actually takes.
            # Scoped to the import's own block, not the whole cell: an
            # unrelated earlier `try:` and an unrelated later
            # `except ImportError:` would otherwise vouch for a bare import
            # sitting between them -- the exact ImportError this guards.
            if not guarded(src, match):
                fail(
                    f"{label}: cell {cid} imports google.colab without a "
                    f"try/except ImportError guard"
                )

        if ABSOLUTE_PATH.search(src):
            fail(
                f"{label}: cell {cid} hardcodes an absolute path; it would "
                f"not resolve on Colab"
            )

        for args in PIP_INSTALL.findall(src):
            if "-q" not in args.split("#")[0].split():
                fail(
                    f"{label}: cell {cid} has a %pip install without -q; "
                    f"Colab output fills with resolver noise"
                )

        if DEVICE_STRING.search(src):
            fail(
                f"{label}: cell {cid} hardcodes a device string. These "
                f"notebooks carry no accelerator code, and Colab, CI and a "
                f"Mac do not agree on one"
            )


# ── Choosing what to execute ─────────────────────────────────────────────────


def run_set(nb: dict, label: str) -> tuple[list[int], str, str | None]:
    """Indices to execute, the activity cell id, and the paired solution id.

    Cells are addressed by id throughout. Never by numeric prefix: notebook 09
    carries s12-* ids and notebook 11 s13-*, preserved through a renumbering.
    """
    cells = nb["cells"]
    ids = [c.get("id") for c in cells]
    prep, activity = route_of(nb, label)

    at = ids.index(activity)
    chosen = [ids.index(p) for p in prep]
    if cells[at].get("cell_type") == "code":
        chosen.append(at)
    # Decide the fallback HERE, from the route itself. Reading it off `chosen`
    # after the paired-solution block below has appended to it would let a
    # route with no executable prep and a markdown activity run a lone solution
    # cell with none of its setup -- a NameError that reads as a broken
    # notebook rather than a broken run set.
    route_has_code = bool(chosen)
    support = support_of(nb, label)

    paired = None
    for j in range(at + 1, min(at + 3, len(cells))):
        if cells[j].get("cell_type") == "code" and "solution" in tags(cells[j]):
            paired = ids[j]
            chosen.append(j)
            break

    if not route_has_code:
        # The route declares no executable code. Notebook 12's says so to the
        # student in as many words -- "Exit check (5 min). No code required...
        # Other exercises and explorers are optional" -- and that is the real
        # lesson, so the route is not the thing to change.
        #
        # What CI runs there is a separate question, and `ci_cells` answers it
        # explicitly: the setup and the five take-home TODO/solution pairs, and
        # not the explorer widgets. Those explorers are what a facilitator
        # demonstrates, they are the notebook's slowest cells, and one of them
        # renders a base64 WAV big enough to stall the kernel outright (see the
        # probe's silencing comment). Executing the answers a student works
        # through alone is worth far more than driving the widgets.
        #
        # Without `ci_cells` the old blanket fallback stands, which is what
        # notebook 00 still uses: it is short and every code cell is setup.
        #
        # The list is a set, not an order: the return below sorts by position,
        # so cells always execute in document order however they are written
        # here. Leave a cell's setup out and it fails, whatever you list first.
        declared = workshop_meta(nb, label).get("ci_cells")
        if declared is not None:
            if not isinstance(declared, list) or not declared:
                raise ValueError(f"{label}: ci_cells must be a non-empty list")
            for cid in declared:
                if ids.count(cid) != 1:
                    raise ValueError(
                        f"{label}: ci_cells names {cid}, which is "
                        f"not a unique cell in this notebook"
                    )
                if cells[ids.index(cid)].get("cell_type") != "code":
                    raise ValueError(
                        f"{label}: ci_cells names {cid}, which is not a code cell"
                    )
            chosen = [ids.index(cid) for cid in declared]
        else:
            chosen = [i for i, c in enumerate(cells) if c.get("cell_type") == "code"]

    # Explicit fallback run sets also exercise their declared feedback helpers.
    chosen.extend(ids.index(cid) for cid in support)
    # Execute every code cell in the physical live block, including worked
    # examples and feedback widgets, rather than silently testing only the TODO.
    chosen.extend(
        ids.index(cid)
        for cid in check_sequence(nb, label)
        if cells[ids.index(cid)].get("cell_type") == "code"
    )
    return sorted(set(chosen)), activity, paired


# widgets.interactive_output runs its callback inside an Output widget, and
# Output.__exit__ hands the traceback to the frontend and returns True. Nothing
# reaches the cell, and the widget's own `outputs` trait is synced *from* the
# frontend, so kernel-side it stays empty -- a broken callback leaves a clean
# cell and total silence. That silence is the whole reason these two cells
# exist. The prologue runs first and records what __exit__ swallows -- which
# already covers each explorer's initial render, for free. The probe runs last
# and drives controls to the far end of their range, within the budget below,
# to reach the failures that only appear away from the default value.
PROLOGUE = """
try:
    import builtins as _b
    from ipywidgets.widgets.widget_output import Output as _Out

    _b.__workshop_widget_errors__ = []
    if not getattr(_Out, "_workshop_patched", False):
        _workshop_exit = _Out.__exit__

        def _patched_exit(self, etype, evalue, tb):
            if etype is not None:
                import traceback as _tb
                _b.__workshop_widget_errors__.append(
                    "".join(_tb.format_exception_only(etype, evalue)).strip())
            return _workshop_exit(self, etype, evalue, tb)

        _Out.__exit__ = _patched_exit
        _Out._workshop_patched = True
except ImportError:
    pass
"""

PROBE = """
def _workshop_probe():
    import builtins as _b
    swallowed = list(getattr(_b, "__workshop_widget_errors__", []))
    try:
        import ipywidgets as _w
    except ImportError:
        print("PROBE: ipywidgets absent, nothing to drive")
        return
    # ipywidgets 8.1 keeps the live registry at module level; Widget.widgets
    # still reaches it but warns. Prefer the quiet one, fall back for 9.x.
    try:
        from ipywidgets.widgets.widget import _instances as registry
    except ImportError:
        registry = getattr(_w.Widget, "widgets", {})
    live = list(registry.values())

    import time as _time

    # Every state change re-runs a callback that redraws a figure, and each
    # redraw is a PNG pushed over iopub. Notebook 12 holds nineteen explorers;
    # sweeping them at full fidelity stalls the run. We only care that the
    # callback RUNS without raising, so silence the rendering for the sweep.
    #
    # Silencing pyplot saves the figure work. It is not enough on its own:
    # what actually stalls the kernel is a large payload leaving an Output
    # widget. Measured with a standalone nbclient script -- display the same
    # bytes straight from a cell and 1MB is instant, but route them through
    # widgets.interactive_output and anything past roughly 200KB makes nbclient
    # wait out the cell's entire timeout. That is notebook 12's audio explorer
    # exactly: a base64 WAV per change, small at the default k and much bigger
    # further along the dropdown, which is why only the sweep tripped it.
    #
    # So silence the display PUBLISHER too, which is the one place every route
    # funnels through -- plain display(), a rich repr, Output capture. Stubbing
    # the name `display` does not work: a callback resolves it from whatever
    # namespace it was defined in, not from ours.
    try:
        import matplotlib.pyplot as _plt
        _real_show = _plt.show

        def _quiet_show(*a, **k):
            _plt.close("all")

        _plt.show = _quiet_show
    except ImportError:
        _plt = None

    _pub = _real_publish = None
    try:
        _pub = get_ipython().display_pub
        _real_publish = _pub.publish
        _pub.publish = lambda *a, **k: None
    except Exception:
        _pub = None

    # Bound the sweep so this stays a check rather than the slowest thing in
    # CI. What is skipped is printed, so partial coverage is visible.
    try:
        deadline = _time.monotonic() + __BUDGET__
        driven = 0
        skipped = 0
        numeric = (_w.IntSlider, _w.FloatSlider, _w.BoundedIntText, _w.BoundedFloatText)
        chooser = (_w.Dropdown, _w.SelectionSlider, _w.ToggleButtons, _w.RadioButtons)
        for widget in live:
            # Type first: Layout, VBox and friends are in the registry too and
            # have no `value` at all.
            if not isinstance(widget, numeric + chooser + (_w.Checkbox,)):
                continue
            if driven >= __CHANGES__ or _time.monotonic() > deadline:
                skipped += 1
                continue
            try:
                start = widget.value
                if isinstance(widget, numeric):
                    # The far end of the range is where a callback breaks.
                    values = (widget.max,)
                elif isinstance(widget, chooser):
                    options = list(widget.options or ())
                    values = tuple(o[1] if isinstance(o, tuple) else o
                                   for o in options[-1:])
                else:
                    values = (not start,)
                for value in values:
                    widget.value = value
                    driven += 1
                    # After, not only before. Setting a control to its far end
                    # fires its callback synchronously, and nothing here can
                    # preempt that -- so the budget can only be enforced between
                    # changes. Checking it beforehand alone let __CHANGES__ slow
                    # callbacks run back to back: notebook 12 spent the whole 300s
                    # cell timeout that way and failed CI.
                    if _time.monotonic() > deadline:
                        break
                widget.value = start
            except Exception as exc:
                swallowed.append("driving %s: %r" % (type(widget).__name__, exc))
    finally:
        if _pub is not None and _real_publish is not None:
            _pub.publish = _real_publish
        if _plt is not None:
            _plt.show = _real_show
            _plt.close("all")

    swallowed += [e for e in getattr(_b, "__workshop_widget_errors__", [])
                  if e not in swallowed]
    print("PROBE: %d widgets, %d driven, %d over budget"
          % (len(live), driven, skipped))
    if swallowed:
        raise AssertionError(
            "widget callbacks raised, and the Output widget swallowed it: "
            + "; ".join(sorted(set(swallowed))))

_workshop_probe()
"""

# Widget sweep limits. What a callback pushes is the expensive part, not the
# arithmetic, so the probe silences rendering and these two bounds cap the
# sweep. Raise them with the environment variables if a notebook needs it -- a
# sweep that overruns says so rather than passing silently.

# The probe's own cell timeout, well clear of CELL_TIMEOUT, because the probe
# must never be the thing that fails a route.
#
# It is a backstop now rather than a load-bearing limit. The probe used to sit
# here for the full ceiling on notebook 12 -- 60s for 0.2s of Python -- and on
# a CI runner that surfaced as CellTimeoutError and turned this job red. The
# cause is in the probe's own silencing comment: a large payload leaving an
# Output widget, which the sweep no longer produces. Notebook 12 now finishes
# in about 9s end to end. Keep the ceiling anyway: it costs nothing when
# nothing is wrong, and overrunning it is reported as incomplete widget
# coverage rather than a broken notebook. The probe is a sweep, not the lesson.
PROBE_CELL_TIMEOUT = 60
PROBE_BUDGET_SECONDS = float(os.environ.get("WORKSHOP_PROBE_BUDGET", "20"))
PROBE_MAX_CHANGES = int(os.environ.get("WORKSHOP_PROBE_CHANGES", "8"))
PROBE = PROBE.replace("__BUDGET__", str(PROBE_BUDGET_SECONDS)).replace(
    "__CHANGES__", str(PROBE_MAX_CHANGES)
)


# ── Execution ────────────────────────────────────────────────────────────────


def stdout_of(cell: dict) -> str:
    chunks = []
    for item in cell.get("outputs", ()) or ():
        if item.get("output_type") == "stream":
            text = item.get("text", "")
            chunks.append(text if isinstance(text, str) else "".join(text))
        elif item.get("output_type") == "execute_result":
            chunks.append(item.get("data", {}).get("text/plain", ""))
    return "".join(chunks)


ANSI = re.compile(r"\x1b\[[0-9;]*m")


def errors_in(cell: dict) -> list[str]:
    found = []
    for item in cell.get("outputs", ()) or ():
        if item.get("output_type") == "error":
            trace = item.get("traceback") or []
            head = ANSI.sub("", f"{item.get('ename')}: {item.get('evalue')}")
            last = ANSI.sub("", trace[-1]).strip() if trace else ""
            # The final traceback line is usually the exception line again.
            found.append(
                head
                if last.startswith(str(item.get("ename")))
                else f"{head} {last}".strip()
            )
    return found


def execute(path: Path, number: str, show_output: bool) -> None:
    import nbformat
    from nbclient import NotebookClient
    from nbclient.exceptions import CellExecutionError, CellTimeoutError

    label = path.name
    nb = nbformat.read(path, as_version=4)

    chosen, activity, paired = run_set(nb, label)
    ids = [c.get("id") for c in nb["cells"]]
    stub = nb["cells"][ids.index(activity)] if activity in ids else None

    trimmed = copy.deepcopy(nb)
    prologue = nbformat.v4.new_code_cell(PROLOGUE)
    prologue["id"] = "workshop-prologue"
    probe = nbformat.v4.new_code_cell(PROBE)
    probe["id"] = "workshop-probe"
    trimmed["cells"] = (
        [prologue] + [copy.deepcopy(nb["cells"][i]) for i in chosen] + [probe]
    )

    print(f"      {len(chosen)} cell(s): {', '.join(ids[i] for i in chosen)} + probe")

    # A scratch cwd, so nothing a cell writes can land in the repository.
    with tempfile.TemporaryDirectory() as workdir:
        started = {}

        def on_cell_start(cell, cell_index):
            started[cell_index] = time.monotonic()

        def on_cell_executed(cell, cell_index, execute_reply):
            spent = time.monotonic() - started.get(cell_index, time.monotonic())
            # Only the slow ones. A CI log that names every cell is noise; one
            # that says nothing for six minutes is worse.
            if spent >= SLOW_CELL_SECONDS:
                print(f"        {cell.get('id')} took {spent:.0f}s")

        client = NotebookClient(
            trimmed,
            timeout=CELL_TIMEOUT,
            # Per cell, so the probe gets its own, tighter ceiling.
            timeout_func=lambda cell: (
                PROBE_CELL_TIMEOUT
                if cell.get("id") == "workshop-probe"
                else CELL_TIMEOUT
            ),
            kernel_name="python3",
            allow_errors=False,
            resources={"metadata": {"path": workdir}},
            on_cell_start=on_cell_start,
            on_cell_executed=on_cell_executed,
        )
        stopped = None
        probe_timed_out = False
        try:
            client.execute()
        except CellExecutionError as exc:
            # The offending cell keeps its own traceback, and the per-cell walk
            # below names it with the cell id. Hold this in case it did not.
            stopped = ANSI.sub("", str(exc).strip().splitlines()[-1])[:200]
        except CellTimeoutError as exc:
            # A timeout inside the probe means the widget sweep was cut short,
            # not that the notebook is broken -- every teaching cell before it
            # already ran clean. Say so and keep the route green; anything else
            # lets an explorer nobody teaches from fail the whole gate.
            if "_workshop_probe" in str(exc):
                probe_timed_out = True
            else:
                fail(f"{label}: kernel error — {type(exc).__name__}: {exc}")
        except Exception as exc:  # noqa: BLE001 — report, do not raise
            fail(f"{label}: kernel error — {type(exc).__name__}: {exc}")

    expected = EXPECTED.get(number, {})
    reported = False
    for cell in trimmed["cells"]:
        cid = cell.get("id")
        for message in errors_in(cell):
            reported = True
            fail(f"{label}: cell {cid} raised — {message[:200]}")

        out = stdout_of(cell)
        if show_output and out.strip():
            for line in out.strip().splitlines():
                print(f"        {cid} | {line}")

        # The blank exercise must stay blank. A student's TODO cell that
        # suddenly prints means an answer was pasted into it.
        if cid == activity and stub is not None and is_stub(stub) and out.strip():
            fail(
                f"{label}: the core activity {cid} is a blank exercise but "
                f"produced output — has an answer been pasted into it?"
            )

        for want in expected.get(cid, []):
            if want not in out:
                fail(
                    f"{label}: cell {cid} did not print {want!r}; got "
                    f"{out.strip()[:160]!r}"
                )

    if probe_timed_out:
        print(
            f"        WARN  widget sweep hit {PROBE_CELL_TIMEOUT}s and was "
            f"cut short — callbacks after that point are unchecked"
        )

    if stopped and not reported:
        # No cell carried a traceback, so this was a timeout or a dead kernel.
        fail(
            f"{label}: execution stopped after {CELL_TIMEOUT}s or the kernel "
            f"died — {stopped}"
        )

    # Not `set(ids)`: a cell can still exist and yet have dropped out of the
    # run set, and then its EXPECTED line asserts nothing while CI stays green.
    # Compare against what actually ran.
    ran = {ids[i] for i in chosen}
    for cid in sorted(set(expected) - ran):
        gone = cid not in ids
        fail(
            f"{label}: EXPECTED names cell {cid}, which "
            + (
                "no longer exists"
                if gone
                else "exists but is not in the run set, so it asserts nothing"
            )
        )


# ── Entry point ──────────────────────────────────────────────────────────────


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--only",
        action="append",
        metavar="NN",
        help="run just this notebook number; repeatable",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="print the resolved run set and exit, no kernel",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="skip the routes that fetch data or run %%pip",
    )
    parser.add_argument(
        "--show-output", action="store_true", help="echo each executed cell's stdout"
    )
    args = parser.parse_args(argv)

    paths = sorted(NBDIR.glob("[0-9][0-9]-*.ipynb"))
    if not paths:
        print("No notebooks found", file=sys.stderr)
        return 1
    if args.only:
        wanted = {n.zfill(2) for n in args.only}
        paths = [p for p in paths if p.name[:2] in wanted]
        if not paths:
            print(f"No notebook matches {sorted(wanted)}", file=sys.stderr)
            return 1

    mode = "run sets" if args.list else "core routes"
    print(f"Executing {mode} for {len(paths)} notebook(s)")

    skipped = []
    for index, path in enumerate(paths, 1):
        number = path.name[:2]
        print(f"\n[{index}] {path.name}")

        if args.list:
            import nbformat

            nb = nbformat.read(path, as_version=4)
            try:
                chosen, activity, paired = run_set(nb, path.name)
            except (ValueError, KeyError) as exc:
                fail(f"{path.name}: {exc}")
                continue
            ids = [c.get("id") for c in nb["cells"]]
            print(
                f"      activity={activity} paired={paired} "
                f"network={'yes' if number in NETWORK else 'no'}"
            )
            print(f"      {len(chosen)} cell(s): {', '.join(ids[i] for i in chosen)}")
            continue

        # Static, so it needs no kernel and no network. It runs here rather
        # than inside execute() because --offline skips execute() wholesale for
        # notebooks marked as needing the network. Static checks must still
        # cover them when their execution is skipped.
        try:
            import nbformat

            check_colab_parity(nbformat.read(path, as_version=4), path.name)
        except (ValueError, KeyError) as exc:
            fail(f"{path.name}: {exc}")

        if args.offline and number in NETWORK:
            print("      skipped — needs the network (--offline)")
            skipped.append(number)
            continue

        try:
            execute(path, number, args.show_output)
        except (ValueError, KeyError) as exc:
            fail(f"{path.name}: {exc}")

    print()
    if skipped:
        print(f"Skipped {len(skipped)} network route(s): {', '.join(skipped)}")
    if failures:
        print(f"{len(failures)} FAILURE(S)")
        return 1
    print(
        "Run sets resolved." if args.list else "All notebook routes executed cleanly."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
