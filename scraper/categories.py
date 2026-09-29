"""Product categories. Each one is scraped from the same sources, into public/data/<name>/."""

from dataclasses import dataclass
from typing import Callable

import normalize
import normalize_cpu
import normalize_ram


@dataclass(frozen=True)
class Category:
    name: str
    skroutz_path: str
    # BestPrice stops paginating at 50 pages (800 products), so big categories are
    # split into filtered slices that are fetched one by one and merged.
    bestprice_paths: tuple[str, ...]
    make_listing: Callable[..., object | None]  # keyword args shared by normalize*.make_listing
    model_key: Callable[[dict], str]  # grouping key, shared with the frontend (src/lib/categories.tsx)


CATEGORIES = {
    "gpu": Category(
        name="gpu",
        skroutz_path="/c/55/kartes-grafikwn.html",
        bestprice_paths=("/cat/2613/kartes-grafikwn.html",),
        make_listing=normalize.make_listing,
        model_key=lambda l: f"{l['chip']} {l['vram']}GB",
    ),
    "cpu": Category(
        name="cpu",
        skroutz_path="/c/32/cpu-epeksergastes.html",
        bestprice_paths=("/cat/2606/epeksergastes.html",),
        make_listing=normalize_cpu.make_listing,
        model_key=lambda l: l["chip"],
    ),
    "ram": Category(
        name="ram",
        skroutz_path="/c/56/mnhmes-pc-ram.html",
        # ~2000 products: sliced by capacity filter (every product has one).
        bestprice_paths=tuple(
            f"/cat/2609/mnimes-ram/f/5641_{f}.html"
            for f in (
                "1000-2000/eos-2gb", "4000-4000/4gb", "8000-8000/8gb", "16000-16000/16gb",
                "32000-32000/32gb", "64000-64000/64gb", "128000-128000/128gb", "256000-0/256gb-kai-ano",
            )
        ),
        make_listing=normalize_ram.make_listing,
        model_key=lambda l: f"{l['chip']} {l['formFactor']}",
    ),
}
