"""The category ids, in the order the scraper handles them: the one list the Python side takes its categories from.

No imports on purpose: merge_history.py is a git merge driver and glitches.py a repair tool, and both
must stay light. categories.py checks its CATEGORIES against this; tests/unit/registry.test.ts checks it
against the site's registry (src/lib/registry.ts). To add a category: here, in categories.py, in the registry.
"""

CATEGORY_IDS = ("gpu", "cpu", "mobo", "ram", "psu", "case", "fan", "cooler", "storage", "monitor", "mouse", "headphones")
