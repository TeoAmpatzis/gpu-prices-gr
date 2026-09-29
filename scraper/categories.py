"""Product categories. Each one is scraped from the same sources, into public/data/<name>/."""

from dataclasses import dataclass
from typing import Callable

import names
import normalize
import normalize_case
import normalize_cooling
import normalize_cpu
import normalize_psu
import normalize_ram


@dataclass(frozen=True)
class Category:
    name: str
    skroutz_paths: tuple[str, ...]  # several category pages merged into one category (coolers)
    # BestPrice stops paginating at 50 pages (800 products), so big categories are
    # split into filtered slices that are fetched one by one and merged.
    bestprice_paths: tuple[str, ...]
    make_listing: Callable[..., object | None]  # keyword args shared by normalize*.make_listing
    model_key: Callable[[dict], str]  # grouping key, shared with the frontend (src/lib/categories.tsx)
    # e-shop.gr lists as (path, category name): `<path>?offset=N&table=PER&category=<name>`.
    # The path matters — the generic `ypologistes-list` ignores `offset` (see sources/eshop.py).
    eshop_categories: tuple[tuple[str, str], ...] = ()


CATEGORIES = {
    "gpu": Category(
        name="gpu",
        skroutz_paths=("/c/55/kartes-grafikwn.html",),
        bestprice_paths=("/cat/2613/kartes-grafikwn.html",),
        make_listing=normalize.make_listing,
        model_key=lambda l: f"{l['chip']} {l['vram']}GB",
        eshop_categories=(("ypologistes-kartes-grafikon-gpu-list", "ΚΑΡΤΑ ΓΡΑΦΙΚΩΝ"),),
    ),
    "cpu": Category(
        name="cpu",
        skroutz_paths=("/c/32/cpu-epeksergastes.html",),
        bestprice_paths=("/cat/2606/epeksergastes.html",),
        make_listing=normalize_cpu.make_listing,
        model_key=lambda l: l["chip"],
        eshop_categories=(("ypologistes-epeksergastes-cpu-list", "ΕΠΕΞΕΡΓΑΣΤΗΣ - CPU"),),
    ),
    "ram": Category(
        name="ram",
        skroutz_paths=("/c/56/mnhmes-pc-ram.html",),
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
        eshop_categories=(("ypologistes-mnimes-ram-list", "ΜΝΗΜΗ RAM"),),
    ),
    "psu": Category(
        name="psu",
        skroutz_paths=("/c/30/psu-trofodotika.html",),
        # ~1200 products: sliced by wattage filter.
        bestprice_paths=tuple(
            f"/cat/2608/trofodotika-ypologiston/f/679_{f}.html"
            for f in (
                "0-300000/mechri-300w", "301000-500000/301w-500w", "501000-650000/501w-650w",
                "651000-800000/651w-800w", "801000-0/801w-kai-ano",
            )
        ),
        make_listing=normalize_psu.make_listing,
        model_key=lambda l: f"{l['chip']} {l['formFactor']}",
        eshop_categories=(("ypologistes-trofodotika-psu-list", "ΤΡΟΦΟΔΟΤΙΚΟ"),),
    ),
    "case": Category(
        name="case",
        skroutz_paths=("/c/28/cases-koutia.html",),
        # ~2050 products: sliced by price (BestPrice's ?min/?max are in cents).
        bestprice_paths=tuple(
            f"/cat/2607/koutia-ypologiston.html?{q}"
            for q in ("max=4999", "min=5000&max=7999", "min=8000&max=11999", "min=12000")
        ),
        make_listing=normalize_case.make_listing,
        model_key=lambda l: names.model_key(l["chip"]),
        eshop_categories=(("ypologistes-koutia-cases-list", "ΚΟΥΤΙΑ - CASES"),),
    ),
    "fan": Category(
        name="fan",
        skroutz_paths=("/c/674/case-fans.html",),
        # ~1400 products: sliced by price (cents).
        bestprice_paths=tuple(
            f"/cat/6148/case-fans.html?{q}" for q in ("max=999", "min=1000&max=2499", "min=2500")
        ),
        make_listing=normalize_cooling.make_fan_listing,
        model_key=lambda l: names.model_key(l["chip"]),
        eshop_categories=(("ypologistes-case-modding-fans-list", "ΑΝΕΜΙΣΤΗΡΑΣ ΚΟΥΤΙΟΥ"),),
    ),
    "cooler": Category(
        name="cooler",
        # Air coolers + water cooling (AIOs; custom-loop parts are dropped by the normalizer).
        skroutz_paths=("/c/673/cpu-fans.html", "/c/677/water-cooling.html"),
        bestprice_paths=("/cat/2614/psyktres-epeksergaston.html", "/cat/8397/ydropsyksi.html"),
        make_listing=normalize_cooling.make_cooler_listing,
        model_key=lambda l: names.model_key(l["chip"]),
        eshop_categories=(("ypologistes-epeksergastes-cpu-psyktres-coolers-list", "ΣΥΣΤΗΜΑ ΨΥΞΗΣ ΕΠΕΞΕΡΓΑΣΤΗ"), ("ypologistes-ydropsyksi-water-cooling-list", "ΥΔΡΟΨΥΞΗ")),
    ),
}
