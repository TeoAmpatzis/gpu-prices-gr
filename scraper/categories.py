"""Product categories. Each one is scraped from the same sources, into public/data/<name>/."""

from dataclasses import dataclass
from typing import Callable

import names
import normalize
import normalize_case
import normalize_cooling
import normalize_cpu
import normalize_mobo
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
    # Optional attributes stamped on every listing of the BestPrice slice at the same index, when
    # a slice is a spec filter ("4 RAM slots") rather than a price range.
    bestprice_tags: tuple[dict, ...] = ()
    # Fields shared by every listing of a model (see main.share_fields): a missing value is filled
    # from the model's other listings (bools: true if any listing says so), so a spec only one site
    # states reaches all of them.
    shared: tuple[str, ...] = ()
    # Like `shared`, but within a narrower group than the model: (fields, key function); a key of
    # None leaves that listing alone (e.g. a CPU's cooler is shared per chip + packaging).
    shared_by: tuple[tuple[tuple[str, ...], Callable[[dict], str | None]], ...] = ()


# BestPrice motherboard RAM-slot filter values: (url part, slots).
MOBO_SLOTS = (("9230/2", 2), ("6661/4", 4), ("9242/8", 8), ("73677/12", 12), ("9255/16", 16), ("73675/24", 24))

CATEGORIES = {
    "gpu": Category(
        name="gpu",
        skroutz_paths=("/c/55/kartes-grafikwn.html",),
        bestprice_paths=("/cat/2613/kartes-grafikwn.html",),
        make_listing=normalize.make_listing,
        model_key=lambda l: f"{l['chip']} {l['vram']}GB",
        shared=("memType",),
        eshop_categories=(("ypologistes-kartes-grafikon-gpu-list", "ΚΑΡΤΑ ΓΡΑΦΙΚΩΝ"),),
    ),
    "cpu": Category(
        name="cpu",
        skroutz_paths=("/c/32/cpu-epeksergastes.html",),
        bestprice_paths=("/cat/2606/epeksergastes.html",),
        make_listing=normalize_cpu.make_listing,
        model_key=lambda l: l["chip"],
        shared=("cores", "socket", "tdp"),
        shared_by=((("coolerIncluded",), lambda l: f"{l['chip']}|{l['packaging']}" if l.get("packaging") else None),),
        eshop_categories=(("ypologistes-epeksergastes-cpu-list", "ΕΠΕΞΕΡΓΑΣΤΗΣ - CPU"),),
    ),
    "mobo": Category(
        name="mobo",
        skroutz_paths=("/c/31/motherboards-mhtrikes.html",),
        # ~850 products: sliced by RAM slot count, which also tags each board with it.
        bestprice_paths=tuple(f"/cat/2611/motherboards/f/865_{f}.html" for f, _ in MOBO_SLOTS),
        bestprice_tags=tuple({"ramSlots": n} for _, n in MOBO_SLOTS),
        make_listing=normalize_mobo.make_listing,
        model_key=lambda l: names.model_key(l["chip"]),
        eshop_categories=(("ypologistes-mitrikes-motherboards-list", "ΜΗΤΡΙΚΗ ΚΑΡΤΑ"),),
        shared=("ramSlots", "chipset", "socket", "memory"),
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
        shared=("maxBoard", "window", "rgb", "gpuMaxMm", "coolerMaxMm", "fanSlots", "radiatorMounts"),
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
        shared=("pwm", "rgb"),
    ),
    "cooler": Category(
        name="cooler",
        # Air coolers + water cooling (AIOs; custom-loop parts are dropped by the normalizer).
        skroutz_paths=("/c/673/cpu-fans.html", "/c/677/water-cooling.html"),
        bestprice_paths=("/cat/2614/psyktres-epeksergaston.html", "/cat/8397/ydropsyksi.html"),
        make_listing=normalize_cooling.make_cooler_listing,
        model_key=lambda l: names.model_key(l["chip"]),
        shared=("sockets", "heightMm"),
        eshop_categories=(("ypologistes-epeksergastes-cpu-psyktres-coolers-list", "ΣΥΣΤΗΜΑ ΨΥΞΗΣ ΕΠΕΞΕΡΓΑΣΤΗ"), ("ypologistes-ydropsyksi-water-cooling-list", "ΥΔΡΟΨΥΞΗ")),
    ),
}
