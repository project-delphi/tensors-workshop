#!/usr/bin/env python3
"""The workshop's running clock, derived from _variables.yml.

Two scripts need it and used to walk it separately: gen_tables.py, which writes
the agenda table both decks show, and check_links.py, which verifies each
section's written `start`/`end`. A second walk is a second place to drift, so
the walk lives here and both import it.

Everything comes off three keys — `sections`, `kahoot` and `schedule`. Nothing
in this module knows a clock time; it only adds `minutes` up in run order.
"""
from __future__ import annotations

import pathlib

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
V = yaml.safe_load((ROOT / "_variables.yml").read_text(encoding="utf-8"))

SECTIONS = [V["sections"][k] for k in sorted(V["sections"])]
QUIZZES = [V["kahoot"][k] for k in ("q1", "q2", "q3")]
BY_N = {s["n"]: s for s in SECTIONS}


class ScheduleError(ValueError):
    """`agenda` in _variables.yml does not spell out the derived clock."""


def clock(minutes: int, sign: str = "") -> str:
    """Minutes from the start as HH:MM. `sign="+"` for the pace badges."""
    return f"{sign}{minutes // 60:02d}:{minutes % 60:02d}"


def atoms() -> list[tuple[str, int]]:
    """Everything that takes time, in run order, as (id, minutes).

    Ids are the ones _variables.yml uses elsewhere: "00".."11" for a section,
    "q1".."q3" for a quiz, and "break-NN" for the break `schedule.break_after`
    puts after section NN.
    """
    sched = V["schedule"]
    breaks = set(sched["break_after"])
    out: list[tuple[str, int]] = []
    for s in SECTIONS:
        out.append((s["n"], s["minutes"]))
        q = next((q for q in QUIZZES if q["after"] == s["n"]), None)
        if q:
            out.append((f"q{q['n']}", sched["quiz_minutes"]))
        if s["n"] in breaks:
            out.append((f"break-{s['n']}", sched["break_minutes"]))
    return out


def section_windows() -> list[tuple[dict, int, int]]:
    """(section, start, end) in minutes from the start, for every section."""
    windows = []
    minute = 0
    for name, length in atoms():
        if name in BY_N:
            windows.append((BY_N[name], minute, minute + length))
        minute += length
    return windows


def total_minutes() -> int:
    return sum(length for _, length in atoms())


def agenda_rows(lang: str) -> list[dict]:
    """The agenda table's rows: start, duration, part and label.

    Raises ScheduleError unless `agenda` covers every atom exactly once and in
    run order. That is the whole point of declaring it: the clock is derived,
    so the only thing a human can get wrong is *which* segments share a row,
    and getting that wrong is caught here rather than printed to a facilitator.
    """
    schedule = atoms()
    lengths = dict(schedule)
    declared = [i for row in V["agenda"] for i in row["items"]]
    expected = [name for name, _ in schedule]
    if declared != expected:
        raise ScheduleError(_mismatch(declared, expected))

    rows, minute = [], 0
    for row in V["agenda"]:
        duration = sum(lengths[i] for i in row["items"])
        rows.append({
            "start": clock(minute),
            "minutes": duration,
            "part": _part(row["items"]),
            "label": row[f"label_{lang}"],
        })
        minute += duration
    return rows


def _part(items: list[str]) -> str:
    """The Part column: 🎯 for any row with a quiz in it, else the sections'
    own part — one value, since a row only ever groups sections that share
    one — and an em dash for a row that is just a break."""
    if any(i.startswith("q") for i in items):
        return "🎯"
    parts = list(dict.fromkeys(BY_N[i]["part"] for i in items if i in BY_N))
    return " · ".join(parts) if parts else "—"


def _mismatch(declared: list[str], expected: list[str]) -> str:
    """Say which agenda item is wrong, not just that one is.

    A missing or unknown item names itself. A row simply put in the wrong
    place has neither — nothing is missing and nothing is extra — so that case
    falls through to the first position where the two lists diverge.
    """
    missing = [i for i in expected if i not in declared]
    extra = [i for i in declared if i not in expected]
    detail = []
    if missing:
        detail.append(f"never listed: {', '.join(missing)}")
    if extra:
        detail.append(f"listed but not in the schedule: {', '.join(extra)}")
    if not detail:
        i = next(i for i, (d, e) in enumerate(zip(declared, expected)) if d != e)
        detail.append(f"item {i + 1} is {declared[i]!r}, the clock reaches "
                      f"{expected[i]!r} there")
    return ("_variables.yml `agenda` does not match the running clock — "
            + "; ".join(detail))
