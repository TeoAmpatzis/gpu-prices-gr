"""Manual fixes for specs the automatic sources get wrong (scraper/overrides.json).

Each entry names one product and the fields to set, with the source and a note on why:
  {"cat": "case", "model": "<category model key>" or [keys], "title": "<regex>"?, "set": {"gpuMaxMm": 455.7},
   "source": "<url>", "date": "YYYY-MM-DD", "note": "…"}
A product is named by `model` (the category's model key, as in history.json), `card` (a graphics
card: normalize.card_key) or `id` (one listing); `title` (a regex, case-insensitive) narrows it to
listings whose title matches, for a model key that holds two products. Applied last in main.finish,
after the shops', the makers' and the shared values, so an override always wins (also over
specs.SAFER). Remove an entry once the automatic sources get it right; the run log says how many
listings each one set (0 = it no longer matches anything).
"""

import json
import re
from pathlib import Path

import normalize

PATH = Path(__file__).with_name("overrides.json")


def load() -> list[dict]:
    try:
        return json.loads(PATH.read_text(encoding="utf-8"))["overrides"]
    except FileNotFoundError:
        return []


def apply(cat: str, listings: list[dict], model_key) -> None:
    for o in (o for o in load() if o["cat"] == cat):
        models = o.get("model") or []
        models = [models] if isinstance(models, str) else models
        title = re.compile(o["title"], re.I) if o.get("title") else None
        hits = [
            l for l in listings
            if (model_key(l) in models
                or (o.get("card") and normalize.card_key(l) == o["card"])
                or (o.get("id") and l["id"] == o["id"]))
            and (not title or title.search(l["title"]))
        ]
        for l in hits:
            l.update(o["set"])
        print(f"[{cat}] override {models or o.get('card') or o.get('id')}: {o['set']} on {len(hits)} listings")
