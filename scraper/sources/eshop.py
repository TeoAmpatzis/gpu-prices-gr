"""e-shop.gr: a retailer (not an aggregator), so each listing is one of its own products.

Category lists are `<path>?offset=N&table=PER&category=<Greek name, iso-8859-7>`, 10 products
per page; the generic `ypologistes-list` path ignores `offset`, so each category has its own path.
Past the last page the site serves the last page again, so paging stops when no new product id
shows up. Pages are iso-8859-7.
Titles are upper-case with a category prefix ("VGA ASUS ...", "CPU AMD ...") that is stripped
so the shared normalizers see "<vendor> <model> ...".
"""

import re
import urllib.parse
from collections import Counter

from selectolax.parser import HTMLParser

import http_client as http
from categories import Category
from normalize import now_iso

BASE = "https://www.e-shop.gr"
PAGE_SIZE = 10
MAX_PAGES = 120
# Category words in front of the vendor ("VGA ASUS…", "ΘΗΚΗ ΥΠΟΛΟΓΙΣΤΗ DARKFLASH…"), but not the
# "COOLER" of "COOLER MASTER".
PREFIX = re.compile(
    r"^(?:(?:VGA|CPU|RAM|PSU|PC CASE|CASE|FAN|CPU COOLER|COOLER(?!\s+MASTER)|ΘΗΚΗ ΥΠΟΛΟΓΙΣΤΗ|"
    r"ΤΡΟΦΟΔΟΤΙΚΟ ΥΠΟΛΟΓΙΣΤΗ|ΣΕΤ ΑΝΕΜΙΣΤΗΡΑΚΙ ΚΟΥΤΙΟΥ|ΑΝΕΜΙΣΤΗΡΑΚΙ ΚΟΥΤΙΟΥ|ΑΝΕΜΙΣΤΗΡΑΚΙ|ΑΝΕΜΙΣΤΗΡΑΣ ΚΟΥΤΙΟΥ|"
    r"ΑΝΕΜΙΣΤΗΡΑΣ|ΨΥΚΤΡΑ ΕΠΕΞΕΡΓΑΣΤΗ|ΨΥΚΤΡΑ|ΕΝΕΡΓΗ ΨΥΞΗ ΓΙΑ ΤΟΝ ΕΠΕΞΕΡΓΑΣΤΗ|ΕΝΕΡΓΗ ΨΥΞΗ CPU|"
    # "ΜΗΤΡΙΚΗ", sometimes typed with Latin M/H/T ("MHTΡΙΚΗ ASROCK …").
    r"[ΜM][ΗH][ΤT][ΡP][ΙI][ΚK][ΗH](?:\s+ΚΑΡΤΑ)?|MOTHERBOARD)\s+)+",
    re.I,
)
# "Αμεσα διαθέσιμο", "4-7 εργάσιμες ημέρες", "Κατόπιν παραγγελίας" can be ordered; these can't.
UNAVAILABLE = re.compile(r"Εξαντλ|Μη\s*διαθέσιμ|Παύση", re.I)

availability: Counter = Counter()  # logged per run, see fetch()


def parse_price(text: str) -> float | None:
    """'359.00 €' / '1,299.00 €' (e-shop uses a dot for decimals)."""
    m = re.search(r"\d[\d,]*(?:\.\d+)?", text.replace("\xa0", " "))
    return float(m.group().replace(",", "")) if m else None


def parse(html: str, scraped_at: str, cat: Category, specs: str) -> tuple[list, set[str]]:
    """Return (listings, ids of every product box on the page, classified or not)."""
    out, ids = [], set()
    for box in HTMLParser(html).css("table.web-product-container"):
        link = box.css_first("a.web-title-link")
        price_el = box.css_first("td.web-product-price b")
        if not link or not price_el:
            continue
        href = link.attributes.get("href") or ""
        pid = re.search(r"-p-([A-Z]+\.\d+)", href)
        price = parse_price(price_el.text())
        # Availability is the first line of the buttons cell ("Αμεσα διαθέσιμο", "4-7 εργάσιμες
        # ημέρες"…); a product you can't buy has no basket button.
        buttons = box.css_first("td.web-product-buttons")
        avail_el = buttons.css_first("div") if buttons else None
        avail = re.sub(r"\s+", " ", avail_el.text()).strip() if avail_el else ""
        buyable = buttons is not None and "basket.phtml" in buttons.html
        availability[avail if buyable else f"(no basket) {avail}"] += 1
        if pid:
            ids.add(pid.group(1))
        if not pid or price is None or not buyable or UNAVAILABLE.search(avail):
            continue
        title = PREFIX.sub("", re.sub(r"\s+", " ", link.text()).strip())
        listing = cat.make_listing(
            source="eshop",
            native_id=pid.group(1),
            title=title,
            url=href,
            price=price,
            shop_count=None,  # a single shop
            scraped_at=scraped_at,
            specs=specs,
        )
        if listing:
            out.append(listing)
    return out, ids


def fetch(cat: Category) -> list:
    if not cat.eshop_categories:
        return []
    s = http.session()
    scraped_at = now_iso()
    seen: dict = {}
    availability.clear()
    for i, (path, name) in enumerate(cat.eshop_categories):
        q = urllib.parse.quote_plus(name, encoding="iso-8859-7")
        label = cat.name if len(cat.eshop_categories) == 1 else f"{cat.name}{i + 1}"
        page_ids: set[str] = set()
        for page in range(MAX_PAGES):
            if i or page:
                http.polite_sleep()
            r = s.get(f"{BASE}/{path}?offset={page * PAGE_SIZE}&table=PER&category={q}")
            r.raise_for_status()
            html = r.content.decode("iso-8859-7", "replace")
            http.dump(f"eshop_{label}_p{page + 1}.html", html)
            listings, ids = parse(html, scraped_at, cat, specs=name)
            for l in listings:
                seen.setdefault(l.id, l)
            new_ids = ids - page_ids
            page_ids |= ids
            print(f"  eshop {label} page {page + 1}: {len(ids)} products, {len(new_ids)} new, {len(listings)} kept")
            if not new_ids:
                break
    print(f"  eshop {cat.name} availability: {dict(availability.most_common(8))}")
    return list(seen.values())
