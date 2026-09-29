"""Product categories. Each one is scraped from the same sources, into public/data/<name>/."""

from dataclasses import dataclass
from typing import Callable

import normalize
import normalize_cpu


@dataclass(frozen=True)
class Category:
    name: str
    skroutz_path: str
    bestprice_path: str
    make_listing: Callable[..., object | None]  # keyword args shared by normalize*.make_listing
    model_key: Callable[[dict], str]  # grouping key, shared with the frontend (src/lib/categories.tsx)


CATEGORIES = {
    "gpu": Category(
        name="gpu",
        skroutz_path="/c/55/kartes-grafikwn.html",
        bestprice_path="/cat/2613/kartes-grafikwn.html",
        make_listing=normalize.make_listing,
        model_key=lambda l: f"{l['chip']} {l['vram']}GB",
    ),
    "cpu": Category(
        name="cpu",
        skroutz_path="/c/32/cpu-epeksergastes.html",
        bestprice_path="/cat/2606/epeksergastes.html",
        make_listing=normalize_cpu.make_listing,
        model_key=lambda l: l["chip"],
    ),
}
