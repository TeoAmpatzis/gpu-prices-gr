"""Product specs from Skroutz product pages, for the PC builder's compatibility checks.

List pages only carry a short spec line; the product page has the full table (`dl` of `dt`/`dd`):
  GPU:    "Μήκος: 290 mm", "Ελάχιστη Ισχύς Τροφοδοτικού: 750 W"
  CPU:    "Περιλαμβάνει Ψύκτρα: Ναι", "Thermal Design Power (TDP): 65 W"
  Case:   "Μέγιστο Μήκος Κάρτας Γραφικών: 392 mm", "Μέγιστο Ύψος Ψύκτρας Επεξεργαστή: 180,5 mm",
          fan positions "Μπροστινές Θέσεις: 3" / "Πίσω Θέσεις: 1" / "Άνω Θέσεις: 3",
          "Θέση Ψυγείου: Άνω, Κάτω, Μπροστά", "Συμβατές Μητρικές: ATX, Extended ATX, …"
  Cooler: "Socket: 1150/1151/1155/1156, 1700, AM4, AM5", "Ύψος: 155 mm"

Specs don't change, so each product page is fetched once and cached in public/data/<cat>/specs.json
({listing id: {fields…, checked}}). Each run fetches a budget of pages not seen yet, most-listed
models first; `main.py --specs-only --specs-budget N` backfills the cache without scraping.
GPU and CPU specs are per listing (partner cards differ in length; Box and Tray differ in the
cooler); for cases and coolers one page per model is enough and `share_fields` spreads it.
"""

import json
import random
import re
import time
from pathlib import Path
from typing import Callable

from selectolax.parser import HTMLParser

import http_client as http
import normalize_case
from normalize import now_iso

# Skroutz throttles product pages (502s and timeouts after ~200 quick requests), so this goes slowly
# and gives up for the run after a few failures in a row; the next run carries on. A blocked page
# (403 from GitHub's runners) is first retried by http.get, so it only counts as a failure after that.
BUDGET = 30  # product pages per category per run
PAUSE = (5.0, 8.0)  # seconds between product pages
MAX_FAILURES = 3  # consecutive errors before stopping this category for the run


def page_specs(s, url: str) -> dict[str, str]:
    r = http.get(s, url)
    out: dict[str, str] = {}
    for dt in HTMLParser(r.text).css("dl dt"):
        dd = dt.next
        while dd is not None and dd.tag != "dd":
            dd = dd.next
        if dd is not None:
            out.setdefault(re.sub(r"\s+", " ", dt.text()).strip(), re.sub(r"\s+", " ", dd.text()).strip())
    return out


def _number(text: str | None, unit: str) -> float | None:
    m = re.search(rf"(\d+(?:[.,]\d+)?)\s*{unit}\b", text or "", re.I)
    return float(m.group(1).replace(",", ".")) if m else None


def _mm(text: str | None) -> float | None:
    return _number(text, "mm")


def _watts(text: str | None) -> int | None:
    w = _number(text, "W")
    return int(w) if w else None


def _yes_no(text: str | None) -> bool | None:
    return {"ναι": True, "όχι": False}.get((text or "").strip().lower())


def _sockets(text: str | None) -> str | None:
    """"1150/1151/1155/1156, 1700, AM4, AM5" -> "AM4,AM5,LGA1150,LGA1151,…" (sorted, comma-joined).

    Mounting-compatible sockets are added: LGA1851 boards take LGA1700 coolers and AM5 boards take
    AM4 coolers (same hole spacing, per Intel and AMD).
    """
    found: set[str] = set()
    for tok in re.split(r"[,/\s]+", text or ""):
        tok = tok.strip().upper().replace("LGA", "")
        if re.fullmatch(r"\d{3,4}(-\d)?", tok):
            found.add(f"LGA{tok}")
        elif re.fullmatch(r"(AM\d\+?|FM\d\+?|STR\d|STRX\d|TR\d|SP\d)", tok):
            found.add(tok.replace("STR", "sTR"))
    if "LGA1700" in found:
        found.add("LGA1851")
    if "AM4" in found:
        found.add("AM5")
    return ",".join(sorted(found)) or None


def parse_gpu(sp: dict[str, str]) -> dict:
    return {"lengthMm": _mm(sp.get("Μήκος")), "minPsu": _watts(sp.get("Ελάχιστη Ισχύς Τροφοδοτικού"))}


def parse_cpu(sp: dict[str, str]) -> dict:
    return {"coolerIncluded": _yes_no(sp.get("Περιλαμβάνει Ψύκτρα")), "tdp": _watts(sp.get("Thermal Design Power (TDP)"))}


def parse_case(sp: dict[str, str]) -> dict:
    # "Μπροστινές Θέσεις", "Πίσω Θέσεις", "Άνω Θέσεις", "Κάτω Θέσεις", "Πλαϊνές Θέσεις": fan positions.
    positions = [int(v) for k, v in sp.items() if k.endswith("Θέσεις") and v.isdigit()]
    boards = sp.get("Συμβατές Μητρικές")
    return {
        "gpuMaxMm": _mm(sp.get("Μέγιστο Μήκος Κάρτας Γραφικών")),
        "coolerMaxMm": _mm(sp.get("Μέγιστο Ύψος Ψύκτρας Επεξεργαστή")),
        "fanSlots": sum(positions) if positions else None,
        "radiatorMounts": sp.get("Θέση Ψυγείου") or None,
        # The product page's board list beats the one guessed from the title.
        **({"maxBoard": normalize_case.max_board(boards)} if boards and normalize_case.max_board(boards) else {}),
    }


def parse_cooler(sp: dict[str, str]) -> dict:
    return {"sockets": _sockets(sp.get("Socket")), "heightMm": _mm(sp.get("Ύψος"))}


PARSERS: dict[str, Callable[[dict[str, str]], dict]] = {
    "gpu": parse_gpu, "cpu": parse_cpu, "case": parse_case, "cooler": parse_cooler,
}
PER_MODEL = {"case", "cooler"}  # one product page per model (colour variants share specs)
EMPTY = {cat: parse({}) for cat, parse in PARSERS.items()}


def enrich(cat: str, out_dir: Path, listings: list[dict], model_key, budget: int = BUDGET) -> None:
    """Fetch up to `budget` new product pages, then copy cached spec fields onto the listings."""
    parse = PARSERS.get(cat)
    if parse is None:
        return
    path = out_dir / "specs.json"
    try:
        cache = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        cache = {}

    models: dict[str, list[dict]] = {}
    for l in listings:
        models.setdefault(model_key(l), []).append(l)
    todo: list[dict] = []
    for ls in sorted(models.values(), key=len, reverse=True):  # most-listed models first
        mine = sorted((l for l in ls if l["source"] == "skroutz"), key=lambda l: l["price"])
        if cat in PER_MODEL:
            if mine and not any(l["id"] in cache for l in mine):
                todo.append(mine[0])
        else:
            todo += [l for l in mine if l["id"] not in cache]

    live = {l["id"] for l in listings}

    def save() -> None:
        kept = {k: v for k, v in cache.items() if k in live}  # forget delisted products
        path.write_text(json.dumps(kept, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    s = http.session()
    done = failures = 0
    for i, l in enumerate(todo[:budget]):
        if i:
            time.sleep(random.uniform(*PAUSE))
        try:
            cache[l["id"]] = {**parse(page_specs(s, l["url"])), "checked": now_iso()}
            done += 1
            failures = 0
        except Exception as e:
            failures += 1
            print(f"  specs {cat}: {type(e).__name__}: {str(e)[:120]}")
            if failures >= MAX_FAILURES:
                print(f"  specs {cat}: {failures} failures in a row, Skroutz is throttling; stopping for this run")
                break
        if done and done % 25 == 0:
            save()  # long backfills keep their progress if interrupted
            print(f"  specs {cat}: {done}/{min(budget, len(todo))}")
    print(f"  specs {cat}: fetched {done}/{min(budget, len(todo))} (still missing {max(len(todo) - done, 0)})")
    save()

    for l in listings:
        for k, v in EMPTY[cat].items():
            l.setdefault(k, v)
        entry = cache.get(l["id"])
        if entry:
            l.update({k: v for k, v in entry.items() if k != "checked" and v is not None})
        if cat == "cpu" and l.get("packaging") == "Tray" and l.get("coolerIncluded") is None:
            l["coolerIncluded"] = False  # a tray CPU is the bare chip
