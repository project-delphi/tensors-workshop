#!/usr/bin/env python3
"""Validate GitHub teaching resources and explicit core-cell routes.

Stdlib only. Checks structure and local links, not translation quality or runtime
dependencies. The full site checker owns rendered pages and notebook validity.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
PAIRED = ("group-tasks.md", "facilitator-guide.md", "assessments.md",
          "worked-mistakes.md", "workshop-feedback.md")


def prose(text: str) -> str:
    return re.sub(r"^```[^\n]*\n.*?^```\s*$", "", text,
                  flags=re.MULTILINE | re.DOTALL)


def anchors(text: str) -> set[str]:
    """GitHub-style heading slugs plus explicit HTML/Quarto anchors."""
    text = prose(text)
    result = set(re.findall(r'\bid=[\"\']([^\"\']+)[\"\']', text))
    seen: dict[str, int] = {}
    for heading in re.findall(r"^#{1,6}\s+(.+?)\s*#*\s*$", text, re.MULTILINE):
        explicit = re.search(r"\{#([^} ]+)[^}]*\}", heading)
        if explicit:
            result.add(explicit[1])
            heading = heading[:explicit.start()].rstrip()
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
        destination = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path.resolve()
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
        body = text[match.end():sections[i+1].start() if i+1 < len(sections) else len(text)]
        times = re.findall(r"\*\*(?:Time|Tiempo):\*\* (\d+)", body)
        shares = re.findall(r"^\*\*(?:Share|Compartan):\*\*", body, re.MULTILINE)
        links = re.findall(r"\]\(([^)]+\.ipynb)\)", body)
        if len(times) != 1 or not 1 <= int(times[0]) <= 15 or len(shares) != 1:
            raise ValueError(f"{path}: task {match[1]} needs one time box and deliverable")
        expected = path.parents[1] / "notebooks" if path.parent.name == "es" else path.parent / "notebooks"
        if len(links) != 1 or (path.parent / links[0]).resolve() != (expected / notebooks[match[1]]).resolve():
            raise ValueError(f"{path}: task {match[1]} must link to its own notebook")
        result.append((match[1], int(times[0])))
    return result


def check_route(notebook: dict, label: str) -> None:
    cells = notebook["cells"]
    scaffold = [c for c in cells if "<!-- CORE-PATH -->" in "".join(c.get("source", []))]
    if len(scaffold) != 1:
        raise ValueError(f"{label}: expected exactly one core path")
    route = scaffold[0].get("metadata", {}).get("workshop", {})
    prep, activity = route.get("prep"), route.get("activity")
    if not isinstance(prep, list) or not isinstance(activity, str):
        raise ValueError(f"{label}: missing core route metadata")
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
        required = "workshop-core-activity" if cell_id == activity else "workshop-core-prep"
        if required not in tags or "solution" in tags:
            raise ValueError(f"{label}: {cell_id} must be tagged and not a solution")
        if cell_id in prep and cell["cell_type"] != "code":
            raise ValueError(f"{label}: preparation {cell_id} must be executable")
    marked = {c.get("id") for c in cells if any(t in c.get("metadata", {}).get("tags", [])
              for t in ("workshop-core-prep", "workshop-core-activity"))}
    if marked != set(targets):
        raise ValueError(f"{label}: route metadata and tagged cells disagree")
    at = ids.index(activity)
    prompt = "\n".join("".join(c.get("source", [])) for c in cells[max(0, at-1):at+1])
    for text in ("Core activity", "Predict → Run → Explain → Check", "Predice → Ejecuta → Explica → Comprueba"):
        if text not in prompt:
            raise ValueError(f"{label}: activity lacks nearby bilingual loop: {text}")
    for step, cell_id in enumerate(prep, 1):
        before = cells[ids.index(cell_id)-1]
        if f"Core prep {step}/{len(prep)}" not in "".join(before.get("source", [])):
            raise ValueError(f"{label}: preparation label missing for {cell_id}")


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
    for name in ("README.md", "notebooks/README.md", "RELEASE_CHECKLIST.md", "CHANGELOG.md"):
        check_links(root / name, root)
    en = check_tasks(root / "group-tasks.md", notebooks)
    es = check_tasks(root / "es/group-tasks.md", notebooks)
    if en != es:
        raise ValueError("Group task timings differ between English and Spanish")
    for path in paths:
        check_route(json.loads(path.read_text()), path.name)
    print(f"Teaching materials valid: {len(paths)} core routes, paired tasks and local links")


if __name__ == "__main__":
    try:
        check()
    except (ValueError, OSError, KeyError, TypeError) as exc:
        raise SystemExit(str(exc)) from exc
