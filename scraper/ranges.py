"""Plausible ranges for measured values, applied before specs.SAFER joins them (Q4, 2026-10-20).

SAFER (min for clearances, max for lengths) trusts every value: BestPrice's Spire U20M "3.502" mm
beat Skroutz's 350 and then went to every listing of the model. A value outside its range is a
scraping error, not a measurement, so it is set to None (unknown) here, where the values enter:
main.finish right after specs.apply, and makers.apply on each maker value.

The table is the same as v2's src/data/validate/ranges.ts (ids, fields, inclusive min/max); only
the ids that are about a scraped measurement: no PSU watts (the model name), no RAM speed (the RAM
normalizer), no GPU minPsu (depends on the card's power table). scripts/checks/test_ranges.py
compares the two tables. overrides.json runs after this and is never checked.
"""

from collections import Counter

# (v2 id, category, field, min, max): inclusive
RANGES = [
    ("cooler-height", "cooler", "heightMm", 30, 200),  # under 30 mm is a fan's thickness
    ("case-gpu-max", "case", "gpuMaxMm", 100, 700),
    ("case-cooler-max", "case", "coolerMaxMm", 25, 300),
    ("gpu-length", "gpu", "lengthMm", 100, 400),
    ("cpu-tdp", "cpu", "tdp", 10, 500),
    ("mobo-max-memory", "mobo", "maxMemoryGB", 4, 16384),
    ("ram-cas", "ram", "cas", 5, 60),
]

_BY_CAT: dict[str, list[tuple[str, str, float, float]]] = {}
for _id, _cat, _field, _lo, _hi in RANGES:
    _BY_CAT.setdefault(_cat, []).append((_id, _field, _lo, _hi))


def check(cat: str, field: str, value) -> str | None:
    """The v2 id of the range `value` is outside of, else None (also for unknown / unchecked fields)."""
    if value is None or isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    for rid, f, lo, hi in _BY_CAT.get(cat, ()):
        if f == field and not lo <= value <= hi:
            return rid
    return None


def fields(cat: str) -> list[str]:
    return [f for _, f, _, _ in _BY_CAT.get(cat, ())]


def drop_log(cat: str, field: str, value, origin: str, rid: str) -> None:
    print(f"[{cat}] range: {field} {value:g} from {origin} dropped ({rid})")


def clean(cat: str, listings: list[dict], origin: str | None) -> Counter:
    """Set out-of-range values of `listings` to None and log each. `origin` names where the value came
    from (a maker); None = the listing's own site. Returns the dropped count per field."""
    dropped: Counter = Counter()
    for f in fields(cat):
        for l in listings:
            rid = check(cat, f, l.get(f))
            if rid:
                drop_log(cat, f, l[f], origin or l.get("source", "?"), rid)
                l[f] = None
                dropped[f] += 1
    return dropped
