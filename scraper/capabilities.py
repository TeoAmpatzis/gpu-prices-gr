"""What each source may do for each category: lists, specs, shipping, history.

A (source, category) pair listed in UNSUPPORTED is not collected and is never a failed scrape: callers
skip it and checks (scripts/checks/validate_skroutz.py) do not expect it. Everything not listed is
supported, so the nine PC-part categories behave as before. Monitors and mice: every source gives its lists;
Skroutz, e-shop.gr and Shopflix give nothing else (owner 2026-11-12: all five sources for every category).
"""

LISTS, SPECS, SHIPPING, HISTORY = "lists", "specs", "shipping", "history"
OPERATIONS = (LISTS, SPECS, SHIPPING, HISTORY)

UNSUPPORTED: dict[tuple[str, str], frozenset[str]] = {
    ("skroutz", "mouse"): frozenset({SPECS, SHIPPING, HISTORY}),
    ("eshop", "mouse"): frozenset({SPECS, SHIPPING, HISTORY}),
    ("shopflix", "mouse"): frozenset({SPECS, SHIPPING, HISTORY}),
    ("skroutz", "monitor"): frozenset({SPECS, SHIPPING, HISTORY}),
    # Lists only. e-shop.gr's robots.txt disallows the `offset=` paging its lists need (Phase 0, O5): open with the owner.
    ("eshop", "monitor"): frozenset({SPECS, SHIPPING, HISTORY}),
    ("shopflix", "monitor"): frozenset({SPECS, SHIPPING, HISTORY}),
}


def supports(source: str, category: str, operation: str) -> bool:
    if operation not in OPERATIONS:
        raise ValueError(f"unknown operation {operation!r}")
    return operation not in UNSUPPORTED.get((source, category), frozenset())
