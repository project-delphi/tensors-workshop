#!/usr/bin/env python3
"""The workshop's running clock, derived from _variables.yml.

Two scripts need it and used to walk it separately: gen_tables.py, which writes
the agenda table both decks show, and check_links.py, which verifies each
section's written `start`/`end`. A second walk is a second place to drift, so
the walk lives here and both import it.

Everything comes off four keys — `sections`, `kahoot`, `schedule` and, for the
titles of the deep dives `schedule.labs` opens live, `extras`. Nothing in this
module knows a clock time; it only adds `minutes` up in run order.
"""

from __future__ import annotations

import pathlib

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
V = yaml.safe_load((ROOT / "_variables.yml").read_text(encoding="utf-8"))

SECTIONS = [V["sections"][k] for k in sorted(V["sections"])]
QUIZZES = [V["kahoot"][k] for k in ("q1", "q2", "q3")]
BY_N = {s["n"]: s for s in SECTIONS}
EXTRA_BY_N = {x["n"]: x for x in V.get("extras", {}).values()}
LUNCH = "lunch"


class ScheduleError(ValueError):
    """`agenda` in _variables.yml does not spell out the derived clock."""


def clock(minutes: int, sign: str = "") -> str:
    """Minutes from the start as HH:MM. `sign="+"` for the pace badges."""
    return f"{sign}{minutes // 60:02d}:{minutes % 60:02d}"


def labs() -> list[dict]:
    """`schedule.labs`: the deep dives that are opened live, in run order."""
    return list(V["schedule"].get("labs", {}).values())


def atoms() -> list[tuple[str, int]]:
    """Everything that takes time, in run order, as (id, minutes).

    Ids are the ones _variables.yml uses elsewhere: "00".."12" for a section,
    "q1".."q3" for a quiz, "lab-NN" for the live slot `schedule.labs` gives
    deep dive NN, "break-NN" for the break `schedule.break_after` puts after
    section or lab NN, and "lunch" for the pause after `schedule.lunch_after`.

    After a section the order is always quiz, break, lunch, and then the labs
    that follow it, each with its own break and lunch. Lunch is listed with
    zero minutes: it is in the run order, so the agenda has to place it, and
    off the clock, so nothing after it moves.
    """
    sched = V["schedule"]
    breaks = set(sched["break_after"])
    lunch_after = sched.get("lunch_after")
    out: list[tuple[str, int]] = []

    def pauses(n: str) -> None:
        if n in breaks:
            out.append((f"break-{n}", sched["break_minutes"]))
        if n == lunch_after:
            out.append((LUNCH, 0))

    for s in SECTIONS:
        out.append((s["n"], s["minutes"]))
        q = next((q for q in QUIZZES if q["after"] == s["n"]), None)
        if q:
            out.append((f"q{q['n']}", sched["quiz_minutes"]))
        pauses(s["n"])
        for lab in labs():
            if lab["after"] == s["n"]:
                out.append((f"lab-{lab['extra']}", lab["minutes"]))
                pauses(lab["extra"])
    _validate_schedule(out)
    return out


def _validate_schedule(out: list[tuple[str, int]]) -> None:
    """Every lab, break and lunch `schedule` declares has to land on the clock.

    A lab that follows a section that does not exist, or names a deep dive
    that does not, would otherwise simply never be appended: the day would
    come up short and say only that the total is wrong.
    """
    sched = V["schedule"]
    placed = {name for name, _ in out}
    for lab in labs():
        if lab["extra"] not in EXTRA_BY_N:
            raise ScheduleError(
                f"_variables.yml `schedule.labs`: {lab['extra']!r} is not an extra"
            )
        if f"lab-{lab['extra']}" not in placed:
            raise ScheduleError(
                f"_variables.yml `schedule.labs`: lab {lab['extra']} follows "
                f"{lab['after']!r}, which is not a section"
            )
    for n in sched["break_after"]:
        if f"break-{n}" not in placed:
            raise ScheduleError(
                f"_variables.yml `schedule.break_after`: {n!r} is neither a "
                "section nor a live lab"
            )
    if sched.get("lunch_after") and LUNCH not in placed:
        raise ScheduleError(
            f"_variables.yml `schedule.lunch_after`: {sched['lunch_after']!r} is "
            "neither a section nor a live lab"
        )


def lab_extra(name: str) -> dict | None:
    """The extra behind a "lab-NN" atom, or None for any other atom."""
    return EXTRA_BY_N.get(name[4:]) if name.startswith("lab-") else None


def section_windows() -> list[tuple[dict, int, int]]:
    """(section, start, end) in minutes from the start, for every section."""
    windows = []
    minute = 0
    for name, length in atoms():
        if name in BY_N:
            windows.append((BY_N[name], minute, minute + length))
        minute += length
    return windows


def lab_windows() -> list[tuple[dict, int, int]]:
    """(lab, start, end) in minutes from the start, for every live lab."""
    by_id = {f"lab-{lab['extra']}": lab for lab in labs()}
    windows = []
    minute = 0
    for name, length in atoms():
        if name in by_id:
            windows.append((by_id[name], minute, minute + length))
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
    for row in V["agenda"]:
        _validate(row)
    declared = [i for row in V["agenda"] for i in row["items"]]
    expected = [name for name, _ in schedule]
    if declared != expected:
        raise ScheduleError(_mismatch(declared, expected))

    rows, minute = [], 0
    for row in V["agenda"]:
        duration = sum(lengths[i] for i in row["items"])
        rows.append(
            {
                "start": clock(minute),
                "minutes": duration,
                "part": _part(row["items"]),
                "label": row[f"label_{lang}"],
            }
        )
        minute += duration
    return rows


def _validate(row: dict) -> None:
    """A row needs items and a label in *both* languages.

    Both, whichever language is being generated: check_links.py asks for the
    English rows only, and a Spanish label left off a new row would otherwise
    reach the deck as a KeyError out of the generator rather than a failing
    check.
    """
    if not row.get("items"):
        raise ScheduleError("_variables.yml `agenda`: a row lists no `items`")
    for key in ("label_en", "label_es"):
        if not row.get(key):
            raise ScheduleError(
                f"_variables.yml `agenda`: the row for "
                f"{', '.join(row['items'])} has no `{key}`"
            )


def _part(items: list[str]) -> str:
    """The Part column: 🎯 for any row with a quiz in it, 🔬 for a deep dive
    opened live, else the sections' own part — one value, since a row only
    ever groups sections that share one — and an em dash for a row that is
    just a break or lunch."""
    if any(i.startswith("q") for i in items):
        return "🎯"
    if any(i.startswith("lab-") for i in items):
        return "🔬"
    parts = list(dict.fromkeys(BY_N[i]["part"] for i in items if i in BY_N))
    return " · ".join(parts) if parts else "—"


def _surplus(a: list[str], b: list[str]) -> list[str]:
    """The items of `a` that `b` does not cover, repeats counted separately.

    Membership alone would report nothing for a segment listed twice — every
    id would be present in both lists — so the counts have to be consumed.
    """
    left: dict[str, int] = {}
    for i in b:
        left[i] = left.get(i, 0) + 1
    out = []
    for i in a:
        if left.get(i):
            left[i] -= 1
        else:
            out.append(i)
    return out


def _mismatch(declared: list[str], expected: list[str]) -> str:
    """Say which agenda item is wrong, not just that one is.

    A segment never listed, listed twice, or not in the schedule at all names
    itself. A row simply put in the wrong place does none of those — the two
    lists hold exactly the same ids — so it falls through to the first
    position where they diverge, and a plain length difference to the counts.
    """
    missing = _surplus(expected, declared)
    surplus = _surplus(declared, expected)
    known = set(expected)
    detail = []
    if missing:
        detail.append(f"never listed: {', '.join(missing)}")
    if repeated := [i for i in surplus if i in known]:
        detail.append(f"listed more than once: {', '.join(repeated)}")
    if unknown := [i for i in surplus if i not in known]:
        detail.append(f"not in the schedule at all: {', '.join(unknown)}")
    if not detail:
        i = next(
            (i for i, (d, e) in enumerate(zip(declared, expected)) if d != e), None
        )
        detail.append(
            f"item {i + 1} is {declared[i]!r}, the clock reaches {expected[i]!r} there"
            if i is not None
            else f"{len(declared)} items listed, the clock has {len(expected)}"
        )
    return "_variables.yml `agenda` does not match the running clock — " + "; ".join(
        detail
    )
