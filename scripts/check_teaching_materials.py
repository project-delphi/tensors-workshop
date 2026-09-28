#!/usr/bin/env python3
"""Validate GitHub teaching resources and explicit core-cell routes.

Checks structure and local links, not translation quality or runtime
dependencies. The full site checker owns rendered pages and notebook validity.
`check_clock_table` is the one check that reaches for `timeline.py` (and so
`--group site`'s pyyaml, not stdlib alone) to confirm the facilitator guide's
and day sheet's hand-written check-at times still match the running clock.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

# The marker a predict-first cell opens with -- exactly one per notebook, so
# scripts/test_notebooks.py can name the cell it steps over the same way
# tests/test_teaching_materials.py names the one it runs against stubs.
COUNTEREXAMPLE = "# --- counterexample / contraejemplo"


def is_predict_cell(cell: dict) -> bool:
    """A predict-first cell: live widgets that stall the kernel's widget probe.

    Identified by the counterexample marker, not by an id fragment (ids vary --
    p16-counterexample-code, m17-counterexample) and not by a tag.
    """
    return cell.get("cell_type") == "code" and COUNTEREXAMPLE in "".join(
        cell.get("source", [])
    )


PAIRED = (
    "group-tasks.md",
    "facilitator-guide.md",
    "assessments.md",
    "worked-mistakes.md",
    "workshop-feedback.md",
)


def prose(text: str) -> str:
    return re.sub(r"^```[^\n]*\n.*?^```\s*$", "", text, flags=re.MULTILINE | re.DOTALL)


def anchors(text: str) -> set[str]:
    """GitHub-style heading slugs plus explicit HTML/Quarto anchors."""
    text = prose(text)
    result = set(re.findall(r"\bid=[\"\']([^\"\']+)[\"\']", text))
    seen: dict[str, int] = {}
    for heading in re.findall(r"^#{1,6}\s+(.+?)\s*#*\s*$", text, re.MULTILINE):
        explicit = re.search(r"\{#([^} ]+)[^}]*\}", heading)
        if explicit:
            result.add(explicit[1])
            heading = heading[: explicit.start()].rstrip()
        heading = re.sub(r"\[([^]]+)\]\([^)]*\)", r"\1", heading)
        heading = re.sub(r"<[^>]+>", "", heading).lower()
        slug = re.sub(r"[^\w\- ]", "", heading).replace(" ", "-")
        count = seen.get(slug, 0)
        seen[slug] = count + 1
        result.add(f"{slug}-{count}" if count else slug)
    return result


def check_links(path: Path, root: Path) -> None:
    for target in re.findall(r"\]\(([^\s)]+)\)", prose(path.read_text())):
        parsed = urlsplit(target.strip("<>"))
        if parsed.scheme or parsed.netloc:
            continue
        destination = (
            (path.parent / unquote(parsed.path)).resolve()
            if parsed.path
            else path.resolve()
        )
        if not destination.is_relative_to(root.resolve()):
            raise ValueError(f"{path}: link escapes repository: {target}")
        if not destination.exists():
            raise ValueError(f"{path}: missing link: {target}")
        if parsed.fragment and destination.suffix in {".md", ".qmd"}:
            if unquote(parsed.fragment) not in anchors(destination.read_text()):
                raise ValueError(f"{path}: missing anchor: {target}")


def check_tasks(path: Path, notebooks: dict[str, str]) -> list[tuple[str, int]]:
    text = path.read_text()
    sections = list(re.finditer(r"^## (\d{2}) · .+$", text, re.MULTILINE))
    if [m[1] for m in sections] != sorted(notebooks):
        raise ValueError(f"{path}: tasks must match notebook numbers in order")
    result = []
    for i, match in enumerate(sections):
        body = text[
            match.end() : sections[i + 1].start()
            if i + 1 < len(sections)
            else len(text)
        ]
        times = re.findall(r"\*\*(?:Time|Tiempo):\*\* (\d+)", body)
        shares = re.findall(r"^\*\*(?:Share|Compartan):\*\*", body, re.MULTILINE)
        links = re.findall(r"\]\(([^)]+\.ipynb)\)", body)
        if len(times) != 1 or not 1 <= int(times[0]) <= 15 or len(shares) != 1:
            raise ValueError(
                f"{path}: task {match[1]} needs one time box and deliverable"
            )
        expected = (
            path.parents[1] / "notebooks"
            if path.parent.name == "es"
            else path.parent / "notebooks"
        )
        if (
            len(links) != 1
            or (path.parent / links[0]).resolve()
            != (expected / notebooks[match[1]]).resolve()
        ):
            raise ValueError(f"{path}: task {match[1]} must link to its own notebook")
        result.append((match[1], int(times[0])))
    return result


def workshop_meta(notebook: dict, label: str) -> dict:
    """The `workshop` block on the one CORE-PATH scaffold cell.

    One function owns finding that cell, so the readers below and
    scripts/test_notebooks.py cannot disagree about where the declaration
    lives.
    """
    cells = notebook["cells"]
    scaffold = [
        c for c in cells if "<!-- CORE-PATH -->" in "".join(c.get("source", []))
    ]
    if len(scaffold) != 1:
        raise ValueError(f"{label}: expected exactly one core path")
    return scaffold[0].get("metadata", {}).get("workshop", {})


def route_of(notebook: dict, label: str) -> tuple[list[str], str]:
    """The core route a notebook declares: preparation cell ids, then activity.

    Split out so that one function owns what a route *is*. check_route below
    validates the convention around it; scripts/test_notebooks.py executes it.
    Cells are addressed by id and never by numeric prefix -- notebook 09 carries
    s12-* ids and notebook 11 s13-*, preserved through a renumbering.
    """
    route = workshop_meta(notebook, label)
    prep, activity = route.get("prep"), route.get("activity")
    if not isinstance(prep, list) or not isinstance(activity, str):
        raise ValueError(f"{label}: missing core route metadata")
    return prep, activity


def support_of(notebook: dict, label: str) -> list[str]:
    """Optional feedback helpers, available before a learner attempts the core.

    Declare these separately from setup so adding hints/checkers cannot turn a
    code-free entry or exit assessment into an executable route.
    """
    support = workshop_meta(notebook, label).get("support", [])
    if not isinstance(support, list) or any(
        not isinstance(cid, str) for cid in support
    ):
        raise ValueError(f"{label}: support must be a list of cell IDs")
    cells = notebook["cells"]
    ids = [c.get("id") for c in cells]
    prep, activity = route_of(notebook, label)
    if len(set(support)) != len(support) or set(support) & set(prep + [activity]):
        raise ValueError(
            f"{label}: support cells must be unique and separate from the core"
        )
    for cid in support:
        if ids.count(cid) != 1:
            raise ValueError(f"{label}: missing or duplicate support cell {cid}")
        cell = cells[ids.index(cid)]
        tags = cell.get("metadata", {}).get("tags", [])
        if (
            cell["cell_type"] != "code"
            or "solution" in tags
            or "workshop-support" not in tags
        ):
            raise ValueError(
                f"{label}: support {cid} must be tagged executable feedback, not a solution"
            )
        if activity not in ids or ids.index(cid) >= ids.index(activity):
            raise ValueError(f"{label}: support {cid} must precede the activity")
    marked = {
        c.get("id")
        for c in cells
        if "workshop-support" in c.get("metadata", {}).get("tags", [])
    }
    if marked != set(support):
        raise ValueError(f"{label}: support metadata and tagged cells disagree")
    return support


def check_route(notebook: dict, label: str) -> None:
    cells = notebook["cells"]
    prep, activity = route_of(notebook, label)
    targets = prep + [activity]
    ids = [c.get("id") for c in cells]
    if len(set(targets)) != len(targets) or any(ids.count(t) != 1 for t in targets):
        raise ValueError(f"{label}: missing or duplicate core cell ID")
    positions = [ids.index(t) for t in targets]
    if positions != sorted(positions):
        raise ValueError(f"{label}: core cells are out of order")
    for cell_id in targets:
        cell = cells[ids.index(cell_id)]
        tags = cell.get("metadata", {}).get("tags", [])
        required = (
            "workshop-core-activity" if cell_id == activity else "workshop-core-prep"
        )
        if required not in tags or "solution" in tags:
            raise ValueError(f"{label}: {cell_id} must be tagged and not a solution")
        if cell_id in prep and cell["cell_type"] != "code":
            raise ValueError(f"{label}: preparation {cell_id} must be executable")
    marked = {
        c.get("id")
        for c in cells
        if any(
            t in c.get("metadata", {}).get("tags", [])
            for t in ("workshop-core-prep", "workshop-core-activity")
        )
    }
    if marked != set(targets):
        raise ValueError(f"{label}: route metadata and tagged cells disagree")
    at = ids.index(activity)
    prompt = "\n".join(
        "".join(c.get("source", [])) for c in cells[max(0, at - 1) : at + 1]
    )
    for text in (
        "Core activity",
        "Predict → Run → Explain → Check",
        "Predice → Ejecuta → Explica → Comprueba",
    ):
        if text not in prompt:
            raise ValueError(f"{label}: activity lacks nearby bilingual loop: {text}")
    for step, cell_id in enumerate(prep, 1):
        before = cells[ids.index(cell_id) - 1]
        if f"Core prep {step}/{len(prep)}" not in "".join(before.get("source", [])):
            raise ValueError(f"{label}: preparation label missing for {cell_id}")
    support_of(notebook, label)
    check_sequence(notebook, label)


def check_sequence(notebook: dict, label: str) -> list[str]:
    """A declared live sequence must be contiguous immediately after its route.

    Include prose and folded solutions, so an optional explorer cannot creep
    between the example and attempt while the executable route still passes.
    Entry/exit checks and take-home notebooks may omit this declaration.
    """
    route = workshop_meta(notebook, label)
    sequence = route.get("sequence")
    if sequence is None:
        return []
    cells = notebook["cells"]
    ids = [c.get("id") for c in cells]
    if (
        not isinstance(sequence, list)
        or not sequence
        or any(not isinstance(cid, str) for cid in sequence)
        or len(set(sequence)) != len(sequence)
        or any(ids.count(cid) != 1 for cid in sequence)
    ):
        raise ValueError(f"{label}: sequence needs unique existing cell IDs")
    scaffold = next(
        i
        for i, c in enumerate(cells)
        if "<!-- CORE-PATH -->" in "".join(c.get("source", []))
    )
    if scaffold != 1 or ids[scaffold + 1 : scaffold + 1 + len(sequence)] != sequence:
        raise ValueError(
            f"{label}: core sequence must follow the header and route without gaps"
        )
    prep, activity = route_of(notebook, label)
    if not set(prep + [activity] + support_of(notebook, label)) <= set(sequence):
        raise ValueError(
            f"{label}: core sequence omits preparation, feedback or activity"
        )
    checkpoint = route.get("checkpoint")
    if checkpoint not in sequence or sequence.index(checkpoint) <= sequence.index(
        activity
    ):
        raise ValueError(f"{label}: checkpoint must follow the activity")
    boundary = cells[scaffold + 1 + len(sequence)]
    if "## Explore later / Explora después" not in "".join(boundary.get("source", [])):
        raise ValueError(f"{label}: core sequence needs an explicit extension boundary")
    return sequence


CLOCK_TABLES = (
    "facilitator-guide.md",
    "es/facilitator-guide.md",
    "day-sheet.md",
    "es/day-sheet.md",
)


def cut_table_rows(text: str) -> list[tuple[str, str]]:
    """(check-at, should-be-starting) for every body row of the cut/clock table.

    Both languages' facilitator guide ("If you are behind") and day sheet
    ("Clock strip") carry this table under a distinctive header; a blank
    "check at" cell is a continuation row sharing the row above it (the
    Kahoot 1 lateness ladder), and both cells are returned unmodified so the
    caller decides what a blank means.
    """
    lines = text.splitlines()
    header = next(
        (
            i
            for i, line in enumerate(lines)
            if line.startswith("| Check at") or line.startswith("| Comprueba en")
        ),
        None,
    )
    if header is None:
        raise ValueError("no cut/clock table found")
    rows = []
    for line in lines[header + 2 :]:
        if not line.startswith("|"):
            break
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        rows.append((cells[0], cells[1]))
    return rows


def check_clock_table(path: Path) -> tuple[int, int]:
    """Every hand-written check-at time must match `timeline`'s own clock.

    Only a row whose "should be starting" cell names a segment plainly --
    a bare section number (`03`) or `Kahoot N` -- can be checked this way; a
    row naming something else (an activity partway through a section, like
    02's axis-meaning task) is skipped, and the skip is counted so a summary
    that checks less than usual never reads like a clean one.
    """
    import timeline  # noqa: PLC0415  (sibling module, scripts/ on sys.path)

    starts: dict[str, int] = {}
    minute = 0
    for name, length in timeline.atoms():
        starts[name] = minute
        minute += length

    checked = skipped = 0
    for check_at, starting in cut_table_rows(path.read_text()):
        if not starting:
            continue
        section = re.fullmatch(r"\d{2}", starting)
        kahoot = re.fullmatch(r"Kahoot (\d)", starting)
        if not (section or kahoot):
            skipped += 1
            continue
        segment_id = starting if section else f"q{kahoot[1]}"
        if segment_id not in starts:
            raise ValueError(f"{path}: {starting!r} is not a known segment")
        expected_minute = starts[segment_id]
        actual = re.fullmatch(r"\+(\d+):(\d{2})", check_at)
        if not actual or int(actual[1]) * 60 + int(actual[2]) != expected_minute:
            raise ValueError(
                f"{path}: {starting} starts at {timeline.clock(expected_minute, '+')} "
                f"on the clock, table says {check_at or '(blank)'}"
            )
        checked += 1
    return checked, skipped


def check(root: Path = ROOT) -> None:
    paths = sorted((root / "notebooks").glob("[0-9][0-9]-*.ipynb"))
    notebooks = {p.name[:2]: p.name for p in paths}
    if not paths or len(notebooks) != len(paths):
        raise ValueError("Expected uniquely numbered notebooks")
    for name in PAIRED:
        for prefix in (Path(), Path("es")):
            path = root / prefix / name
            if not path.is_file():
                raise ValueError(f"Missing teaching resource: {path}")
            check_links(path, root)
    for name in (
        "README.md",
        "notebooks/README.md",
        "CONTRIBUTING.md",
        "RELEASE_CHECKLIST.md",
        "CHANGELOG.md",
    ):
        check_links(root / name, root)
    en = check_tasks(root / "group-tasks.md", notebooks)
    es = check_tasks(root / "es/group-tasks.md", notebooks)
    if en != es:
        raise ValueError("Group task timings differ between English and Spanish")
    for path in paths:
        notebook = json.loads(path.read_text())
        check_route(notebook, path.name)
        if 1 <= int(path.name[:2]) <= 11 and not check_sequence(notebook, path.name):
            raise ValueError(f"{path}: live practice needs a contiguous core sequence")
    for source in sorted(root.glob("*.md")) + sorted(root.glob("*.qmd")):
        translated = root / "es" / source.name
        if not translated.exists():
            continue
        keys = []
        for page in (source, translated):
            found = re.findall(r'data-language-key="([^"]+)"', prose(page.read_text()))
            if len(found) != len(set(found)):
                raise ValueError(f"{page}: duplicate language key")
            keys.append(set(found))
        if keys[0] != keys[1]:
            raise ValueError(f"{source}: English and Spanish language keys differ")
    checked = skipped = 0
    for name in CLOCK_TABLES:
        c, s = check_clock_table(root / name)
        checked += c
        skipped += s
    print(
        f"Teaching materials valid: {len(paths)} core routes, paired tasks and "
        f"local links; {checked} clock rows checked, {skipped} skipped"
    )


if __name__ == "__main__":
    try:
        check()
    except (ValueError, OSError, KeyError, TypeError) as exc:
        raise SystemExit(str(exc)) from exc
