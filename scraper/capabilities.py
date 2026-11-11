"""What each source may do for each category: lists, specs, shipping, history.

A (source, category) pair listed in UNSUPPORTED is not collected and is never a failed scrape: callers
skip it and checks (scripts/checks/validate_skroutz.py) do not expect it. Everything not listed is
supported, so the nine PC-part categories behave as before. Monitors: Skroutz lists only (FINAL_PLAN D2).
"""

LISTS, SPECS, SHIPPING, HISTORY = "lists", "specs", "shipping", "history"
OPERATIONS = (LISTS, SPECS, SHIPPING, HISTORY)

UNSUPPORTED: dict[tuple[str, str], frozenset[str]] = {
    ("skroutz", "mouse"): frozenset({SPECS, SHIPPING, HISTORY}),
    ("eshop", "mouse"): frozenset(OPERATIONS),
    ("shopflix", "mouse"): frozenset(OPERATIONS),
    ("skroutz", "monitor"): frozenset({SPECS, SHIPPING, HISTORY}),
    # Not monitor sources (Phase 0: O5 e-shop's offset paging against its robots.txt, O6 Shopflix access).
    ("eshop", "monitor"): frozenset(OPERATIONS),
    ("shopflix", "monitor"): frozenset(OPERATIONS),
}


def supports(source: str, category: str, operation: str) -> bool:
    if operation not in OPERATIONS:
        raise ValueError(f"unknown operation {operation!r}")
    return operation not in UNSUPPORTED.get((source, category), frozenset())
