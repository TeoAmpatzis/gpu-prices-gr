"""Product specs from shop product pages (Skroutz, then BestPrice), for the PC builder's checks.

Both sites' product pages have a spec table (`dl` of `dt`/`dd`) with nearly the same labels:
  GPU:    "Μήκος: 290 mm" / "290mm"; Skroutz also "Ελάχιστη Ισχύς Τροφοδοτικού: 750 W"
  CPU:    Skroutz only: "Περιλαμβάνει Ψύκτρα: Ναι", "Thermal Design Power (TDP): 65 W"
  Case:   "Μέγιστο Μήκος Κάρτας Γραφικών: 392 mm"; Skroutz only "Μέγιστο Ύψος Ψύκτρας Επεξεργαστή: 180,5 mm";
          fan positions "Μπροστινές Θέσεις: 3" / "Μπροστινές Θέσεις Ανεμιστήρων: 3";
          "Θέση Ψυγείου: Άνω, Κάτω" / "Θέση Ψυγείου Υδρόψυξης: Μπροστά • Άνω";
          "Συμβατές Μητρικές: ATX, Extended ATX" / "Μέγεθος Μητρικής: ATX • micro-ATX"
  Cooler: "Socket: 1150/1151, 1700, AM4" / "Υποστηριζόμενοι Επεξεργαστές: Socket AM4 • Socket 1700";
          "Ύψος: 155 mm" / "37mm"
  Fan:    "Σύνδεση: 4-Pin PWM" / "3-Pin"; "Ροή Αέρα (Max): 77 cfm" / "Ροή Αέρα: 77cfm";
          Skroutz only "Πίεση Αέρα: 6,9 mmH₂O"
  Board:  Skroutz "Πλήθος Υποδοχών M.2: 2", "Τύπος M.2: 2 Θύρες PCIe 4.0", "Πλήθος SATA III 6Gb/s: 4 Port",
          "Extra: Bios Flashback"; BestPrice "Μέγιστη Μνήμη: 96GB", "M.2 Θύρες", "SATA 3.0 Θύρες",
          "Bios Flashback" (yes/no icon)
  SSD:    "Read Speed: 6000 MB/s" / "Ταχύτητα Ανάγνωσης: 6.000MB/s"; Skroutz only "Τύπος Κρυφής Μνήμης:
          DRAM-less", "Αντοχή Εγγραφών (TBW): 600 TBW", "Ψύκτρα: Ναι"

Specs don't change, so each page is fetched once and cached in public/data/<cat>/specs.json
({listing id: {fields…, checked}}; the id names the site). `collect` runs once per scrape, after
every category's list: one queue per site over all categories (taken in turn), and within a
category the products with the most listings first. A product is the model for cases, coolers and
fans, the card for graphics cards (normalize.card_key), chip + Box/Tray for CPUs. A product gets at
most one page per site: Skroutz first, BestPrice for products Skroutz doesn't list or whose Skroutz
page left a needed field empty. `apply` copies the cache onto the listings; main.finish then shares
the values across each product's listings (the safer value when sites disagree).
"""

import json
import random
import re
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable

from selectolax.parser import HTMLParser

import http_client as http
import normalize
import normalize_case
from normalize import now_iso

# Skroutz throttles product pages (502s and timeouts after ~200 quick requests), so pages go slowly
# and a site is given up for the run after a few failures in a row; the next run carries on. A
# blocked Skroutz page (403 from GitHub's runners) is first retried by http.get. BestPrice is a
# different host, so it runs at the same time with the same pace.
BUDGET = {"skroutz": 150, "bestprice": 150}  # product pages per run, all categories together
PAUSE = (5.0, 8.0)  # seconds between pages of one site
MAX_FAILURES = 3  # errors in a row before a site stops for this run
SAVE_EVERY = 25


def page_specs(s, url: str) -> dict[str, str]:
    return labels(http.get(s, url).text)


def labels(html: str) -> dict[str, str]:
    """A product page's spec table as {label: value}. BestPrice's yes/no features have no text, only an
    icon (`<dl data-type="yesno"><dd><span class="specs-yes|specs-no">`): they read as "Ναι" / "Όχι"."""
    out: dict[str, str] = {}
    for dt in HTMLParser(html).css("dl dt"):
        dd = dt.next
        while dd is not None and dd.tag != "dd":
            dd = dd.next
        if dd is not None:
            value = re.sub(r"\s+", " ", dd.text()).strip()
            if not value:
                value = "Ναι" if dd.css_first(".specs-yes") else "Όχι" if dd.css_first(".specs-no") else ""
            out.setdefault(re.sub(r"\s+", " ", dt.text()).strip(), value)
    return out


def _first(sp: dict[str, str], *labels: str) -> str | None:
    return next((sp[k] for k in labels if sp.get(k)), None)


def _number(text: str | None, unit: str) -> float | None:
    m = re.search(rf"(\d+(?:[.,]\d+)?)\s*{unit}", text or "", re.I)
    return float(m.group(1).replace(",", ".")) if m else None


def _mm(text: str | None) -> float | None:
    return _number(text, r"mm\b")


def _watts(text: str | None) -> int | None:
    w = _number(text, r"W\b")
    return int(w) if w else None


def _yes_no(text: str | None) -> bool | None:
    return {"ναι": True, "όχι": False}.get((text or "").strip().lower())


def _list(text: str | None) -> str | None:
    """"Μπροστά • Πίσω • Άνω" (BestPrice) -> "Μπροστά, Πίσω, Άνω" (as Skroutz writes it)."""
    return ", ".join(p.strip() for p in re.split(r"\s*[•,]\s*", text or "") if p.strip()) or None


def _sockets(text: str | None) -> str | None:
    """"1150/1151/1155/1156, 1700, AM4, AM5" or "Socket AM4 • Socket 1700" -> "AM4,AM5,LGA1150,…"
    (sorted, comma-joined).

    Mounting-compatible sockets are added: LGA1851 boards take LGA1700 coolers and AM5 boards take
    AM4 coolers (same hole spacing, per Intel and AMD).
    """
    found: set[str] = set()
    for tok in re.split(r"[,/\s•]+", text or ""):
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


def _connector(text: str | None) -> str | None:
    """"4-Pin PWM" -> "4-pin PWM", "3-Pin" -> "3-pin"; anything else as written."""
    low = (text or "").lower()
    if not low:
        return None
    if "4-pin" in low or "4 pin" in low or "pwm" in low:
        return "4-pin PWM"
    if "3-pin" in low or "3 pin" in low:
        return "3-pin"
    return text.strip()


def parse_gpu(sp: dict[str, str]) -> dict:
    return {"lengthMm": _mm(sp.get("Μήκος")), "minPsu": _watts(sp.get("Ελάχιστη Ισχύς Τροφοδοτικού"))}


def parse_cpu(sp: dict[str, str]) -> dict:
    return {"coolerIncluded": _yes_no(sp.get("Περιλαμβάνει Ψύκτρα")), "tdp": _watts(sp.get("Thermal Design Power (TDP)"))}


def _count(text: str | None) -> int | None:
    """"4 Port" / "2" / "2 DIMM Slots" -> the first whole number."""
    m = re.match(r"\s*(\d+)\b", text or "")
    return int(m.group(1)) if m else None


def _pcie_gen(text: str | None) -> int | None:
    """"2 Θύρες PCIe 4.0" / "1 Θύρα PCIe 5.0, 2 Θύρες PCIe 4.0" -> the highest generation (5)."""
    gens = [int(g) for g in re.findall(r"PCIe\s*(\d)(?:\.0)?", text or "", re.I)]
    return max(gens) if gens else None


def _gb(text: str | None) -> int | None:
    """"96GB" / "256 GB" / "2TB" -> GB."""
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(GB|TB)\b", text or "", re.I)
    if not m:
        return None
    value = float(m.group(1).replace(",", "."))
    return round(value * 1024) if m.group(2).upper() == "TB" else round(value)


def parse_mobo(sp: dict[str, str]) -> dict:
    # Skroutz: "Πλήθος Υποδοχών M.2: 2", "Τύπος M.2: 2 Θύρες PCIe 4.0", "Πλήθος SATA III 6Gb/s: 4 Port",
    # "Extra: Bios Flashback, …" (silence is not "no"); BestPrice: "Μέγιστη Μνήμη: 96GB", "M.2 Θύρες: 2",
    # "SATA 3.0 Θύρες: 8", "Bios Flashback" as a yes/no icon (labels()). Probe 2026-10-10: docs/phase2 on v2.
    extra = (sp.get("Extra") or "").lower()
    return {
        "m2Slots": _count(_first(sp, "Πλήθος Υποδοχών M.2", "M.2 Θύρες")),
        "m2Gen": _pcie_gen(sp.get("Τύπος M.2")),
        "sataPorts": _count(_first(sp, "Πλήθος SATA III 6Gb/s", "SATA 3.0 Θύρες")),
        "maxMemoryGB": _gb(sp.get("Μέγιστη Μνήμη")),
        "biosFlashback": True if "flashback" in extra else _yes_no(sp.get("Bios Flashback")),
    }


def parse_case(sp: dict[str, str]) -> dict:
    # Fan positions: "Μπροστινές/Πίσω/Άνω/Κάτω/Πλαϊνές Θέσεις" (Skroutz) or "… Θέσεις Ανεμιστήρων"
    # (BestPrice); drive bays ("Eξωτερικές Θέσεις 5.25\"", "Εσωτερικές Θέσεις 3.5''") end differently.
    positions = [int(v) for k, v in sp.items() if k.endswith(("Θέσεις", "Θέσεις Ανεμιστήρων")) and v.isdigit()]
    boards = _first(sp, "Συμβατές Μητρικές", "Μέγεθος Μητρικής")
    board = normalize_case.max_board(boards) if boards else None
    return {
        "gpuMaxMm": _mm(sp.get("Μέγιστο Μήκος Κάρτας Γραφικών")),
        "coolerMaxMm": _mm(_first(sp, "Μέγιστο Ύψος Ψύκτρας Επεξεργαστή", "Μέγιστο Ύψος Ψύκτρας")),
        "fanSlots": sum(positions) if positions else None,
        "radiatorMounts": _list(_first(sp, "Θέση Ψυγείου", "Θέση Ψυγείου Υδρόψυξης")),
        # "Πρόσθετα: Πλαϊνό Παράθυρο • RGB Lighting • Προεγκατεστημένοι Ανεμιστήρες": fans, count not stated.
        "hasFans": True if "Προεγκατεστημένοι Ανεμιστήρες" in (sp.get("Πρόσθετα") or "") else None,
        # The product page's board list beats the one guessed from the title.
        **({"maxBoard": board} if board else {}),
    }


def parse_cooler(sp: dict[str, str]) -> dict:
    return {"sockets": _sockets(_first(sp, "Socket", "Υποστηριζόμενοι Επεξεργαστές")), "heightMm": _mm(sp.get("Ύψος"))}


def parse_fan(sp: dict[str, str]) -> dict:
    return {
        "connector": _connector(sp.get("Σύνδεση")),
        "airflowCfm": _number(_first(sp, "Ροή Αέρα (Max)", "Ροή Αέρα"), r"cfm"),
        "pressureMm": _number(sp.get("Πίεση Αέρα"), r"mmH"),
    }


def _mbs(text: str | None) -> int | None:
    """"6000 MB/s" (Skroutz) / "6.000MB/s" (BestPrice, dot = thousands) -> 6000."""
    m = re.search(r"(\d[\d.]*)\s*MB/?s", text or "", re.I)
    return int(m.group(1).replace(".", "")) if m else None


def _dram(text: str | None) -> bool | None:
    """Skroutz "Τύπος Κρυφής Μνήμης": "DRAM-less" / "HMB" -> False, "DRAM" / "DDR4" -> True."""
    t = (text or "").lower()
    if not t or t == "-":
        return None
    if "less" in t or "hmb" in t:
        return False
    return True if ("dram" in t or "ddr" in t) else None


def _tbw(text: str | None) -> int | None:
    """"600 TBW" / "1.200 TB" / "1,2 PBW" -> TB written."""
    m = re.search(r"(\d[\d.,]*)\s*(PB|TB)", text or "", re.I)
    if not m:
        return None
    num = m.group(1)
    value = float(num.replace(",", ".")) if m.group(2).upper() == "PB" else float(num.replace(".", "").replace(",", "."))
    return round(value * 1000) if m.group(2).upper() == "PB" else round(value)


def parse_storage(sp: dict[str, str]) -> dict:
    # Skroutz: "Read Speed: 6000 MB/s", "Τύπος Κρυφής Μνήμης: DRAM-less", "Αντοχή Εγγραφών (TBW): 600 TBW",
    # "Ψύκτρα: Ναι"; BestPrice: "Ταχύτητα Ανάγνωσης: 6.000MB/s" (no DRAM or TBW).
    return {
        "readMBs": _mbs(_first(sp, "Read Speed", "Ταχύτητα Ανάγνωσης")),
        "writeMBs": _mbs(_first(sp, "Write Speed", "Ταχύτητα Εγγραφής")),
        "dram": _dram(sp.get("Τύπος Κρυφής Μνήμης")),
        "tbw": _tbw(sp.get("Αντοχή Εγγραφών (TBW)")),
        "heatsink": _yes_no(sp.get("Ψύκτρα")),
    }


PARSERS: dict[str, Callable[[dict[str, str]], dict]] = {
    "gpu": parse_gpu, "cpu": parse_cpu, "case": parse_case, "cooler": parse_cooler, "fan": parse_fan,
    "storage": parse_storage, "mobo": parse_mobo,
}
EMPTY = {cat: parse({}) for cat, parse in PARSERS.items()}
# Sites per category, in order of preference (BestPrice states nothing about a CPU's cooler).
SITES = {"gpu": ("skroutz", "bestprice"), "cpu": ("skroutz",), "case": ("skroutz", "bestprice"),
         "cooler": ("skroutz", "bestprice"), "fan": ("skroutz", "bestprice"), "storage": ("skroutz", "bestprice"),
         "mobo": ("skroutz", "bestprice")}
# New page reads a site may not make yet: the owner approves a Skroutz budget before Skroutz reads
# any new kind of page (v2 Phase 2 plan, 2026-10-10). Until then these categories go to the next site.
PAUSED = {"skroutz": {"mobo"}}
# A product still needs a page while one of these is unknown (air coolers also need their height;
# storage: SSDs only — an HDD's title already gives its speed and cache).
NEEDED = {"gpu": ("lengthMm",), "cpu": ("coolerIncluded",), "case": ("gpuMaxMm", "coolerMaxMm"),
          "cooler": ("sockets",), "fan": ("connector",), "storage": ("readMBs",),
          "mobo": ("m2Slots", "sataPorts", "maxMemoryGB")}
# Measurements the builder checks, and which of two disagreeing values is the safe one to assume
# (sites, or a site and the maker): the longer card / taller cooler / higher PSU minimum, the
# smaller case clearance.
SAFER = {"lengthMm": max, "minPsu": max, "heightMm": max, "gpuMaxMm": min, "coolerMaxMm": min}
# Workstation/server parts the builder never offers.
NOT_DESKTOP = re.compile(r"^(RTX PRO|RTX A\d|RTX \d+ (Ada|\(Pro\))|T\d+$|Quadro|EPYC|Xeon|Ryzen Threadripper)")


def product_key(cat: str, model_key) -> Callable[[dict], str]:
    if cat == "gpu":
        return lambda l: normalize.card_key(l) or l["id"]
    if cat == "cpu":
        return lambda l: f"{l['chip']}|{l['packaging']}" if l.get("packaging") else l["id"]
    return model_key


def _needs(cat: str, ls: list[dict]) -> bool:
    if cat == "storage" and (ls[0].get("media") == "HDD" or ls[0].get("tier") == "Server"):
        return False  # HDD titles say enough; server drives aren't for the builder
    fields = NEEDED[cat] + (("heightMm",) if cat == "cooler" and ls[0].get("type") == "Air" else ())
    return any(all(l.get(f) is None for l in ls) for f in fields)


def queue(cat: str, listings: list[dict], cache: dict, model_key) -> dict[str, list[dict]]:
    """Per site, the listings whose page to fetch, most-listed products first."""
    key = product_key(cat, model_key)
    products: dict[str, list[dict]] = {}
    for l in listings:
        if not NOT_DESKTOP.match(l["chip"]):
            products.setdefault(key(l), []).append(l)
    listed = Counter(model_key(l) for l in listings)
    out: dict[str, list[dict]] = {site: [] for site in SITES[cat]}
    for ls in sorted(products.values(), key=lambda ls: (-len(ls), -listed[model_key(ls[0])])):
        if not _needs(cat, ls):
            continue
        fetched = {l["source"] for l in ls if l["id"] in cache}
        sources = {l["source"] for l in ls}
        for site in SITES[cat]:
            if site in fetched or site not in sources or cat in PAUSED.get(site, ()):
                continue
            out[site].append(min((l for l in ls if l["source"] == site), key=lambda l: l["price"]))
            break  # one site at a time: BestPrice only once Skroutz has been tried (or has none)
    return out


def _load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def collect(cats: list[tuple[str, Path, list[dict], Callable]], budget: dict[str, int] | None = None) -> None:
    """Fetch new product pages for every category: (name, out dir, listings, model key) each."""
    budget = budget or BUDGET
    lock = threading.Lock()
    caches = {name: _load(out_dir / "specs.json") for name, out_dir, _, _ in cats if name in PARSERS}
    live = {name: {l["id"] for l in listings} for name, _, listings, _ in cats}

    def save() -> None:
        with lock:
            for name, out_dir, _, _ in cats:
                if name in caches:
                    kept = {k: v for k, v in caches[name].items() if k in live[name]}  # forget delisted products
                    (out_dir / "specs.json").write_text(json.dumps(kept, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # One queue per site: the categories take turns, each most-listed first.
    per_cat = {name: queue(name, listings, caches[name], model_key)
               for name, _, listings, model_key in cats if name in PARSERS}
    queues: dict[str, list[tuple[str, dict]]] = {}
    for site in budget:
        lists = [[(name, l) for l in q.get(site, [])] for name, q in per_cat.items()]
        queues[site] = [item for row in zip_longest_all(lists) for item in row]
        waiting = Counter(name for name, _ in queues[site])
        print(f"  specs {site}: {len(queues[site])} products waiting {dict(waiting)}; budget {budget[site]}")

    def work(site: str) -> None:
        s = http.session()
        done, failures, got = Counter(), 0, Counter()
        for i, (name, l) in enumerate(queues[site][: budget[site]]):
            if i:
                time.sleep(random.uniform(*PAUSE))
            try:
                entry = PARSERS[name](page_specs(s, l["url"]))
            except Exception as e:
                failures += 1
                print(f"  specs {site}/{name}: {type(e).__name__}: {str(e)[:120]}")
                if failures >= MAX_FAILURES:
                    print(f"  specs {site}: {failures} failures in a row, stopping for this run")
                    break
                continue
            failures = 0
            with lock:
                caches[name][l["id"]] = {**entry, "checked": now_iso()}
            done[name] += 1
            got[name] += any(entry.get(f) is not None for f in NEEDED[name])
            if sum(done.values()) % SAVE_EVERY == 0:
                save()
        print(f"  specs {site}: fetched {dict(done)}, with the needed measurement {dict(got)}")

    with ThreadPoolExecutor(max_workers=len(budget)) as pool:
        list(pool.map(work, [site for site in budget if queues[site] and budget[site] > 0]))
    save()


def zip_longest_all(lists: list[list]) -> list[list]:
    """[[a1, a2], [b1]] -> [[a1, b1], [a2]]: one from each list in turn."""
    rows = []
    for i in range(max((len(x) for x in lists), default=0)):
        rows.append([x[i] for x in lists if i < len(x)])
    return rows


def apply(cat: str, out_dir: Path, listings: list[dict]) -> None:
    """Copy the cached spec fields onto the listings (fields not stated stay None)."""
    if cat not in PARSERS:
        return
    cache = _load(out_dir / "specs.json")
    for l in listings:
        for k, v in EMPTY[cat].items():
            l.setdefault(k, v)
        entry = cache.get(l["id"])
        if entry:
            l.update({k: v for k, v in entry.items() if k != "checked" and v is not None})
        if cat == "cpu" and l.get("packaging") == "Tray" and l.get("coolerIncluded") is None:
            l["coolerIncluded"] = False  # a tray CPU is the bare chip
        if cat == "fan" and l.get("connector") == "4-pin PWM":
            l["pwm"] = True
