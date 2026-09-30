"""snif.gr: a price-comparison site (like Skroutz/BestPrice), smaller and with more small shops.

Category lists are `https://www.snif.gr/category/<id>/?page=N`, ~19 products per page. Every product
is a schema.org row: `tr[itemtype=…/Product]`, title `h2.perigrafes a` (href `/showproduct/<id>/<slug>`),
lowest price `span[itemprop=lowPrice][content]` ("489.00"). Past the last page the list is empty,
so paging stops when no new product id shows up.
Titles often start with the category in Greek ("Κάρτα Γραφικών Gigabyte GeForce RTX 5070 …"), which
is stripped so the shared normalizers see "<vendor> <model> …".
"""

import re

from selectolax.parser import HTMLParser

import http_client as http
from categories import Category
from normalize import now_iso

BASE = "https://www.snif.gr"
MAX_PAGES = 200
PREFIX = re.compile(
    r"^(?:(?:Κ[άα]ρτα\s+[Γγ]ραφικ[ώω]ν|VGA|Επεξεργαστής|CPU|Μητρική(?:\s+Κάρτα)?|Motherboard|"
    r"Μνήμη(?:\s+RAM)?|Τροφοδοτικό(?:\s+Υπολογιστή)?|PSU|Κουτί(?:\s+Υπολογιστή)?|Θήκη(?:\s+Υπολογιστή)?|"
    r"Ανεμιστήρας(?:\s+Κουτιού)?|Case\s+Fans?|Ψύκτρα(?:\s+Επεξεργαστή)?|Υδρόψυξη(?:\s+Επεξεργαστή)?|PCI-?E)\s+)+",
    re.I,
)
ROW = "tr[itemtype='http://schema.org/Product']"


def parse(html: str, scraped_at: str, cat: Category) -> tuple[list, set[str]]:
    """Return (listings, ids of every product row on the page, classified or not)."""
    out, ids = [], set()
    for row in HTMLParser(html).css(ROW):
        link = row.css_first("h2 a")
        price_el = row.css_first("[itemprop=lowPrice], [itemprop=price]")
        if not link or not price_el:
            continue
        href = link.attributes.get("href") or ""
        pid = re.search(r"/showproduct/(\d+)", href)
        if not pid:
            continue
        ids.add(pid.group(1))
        try:
            price = float(price_el.attributes.get("content") or price_el.text().replace(",", "."))
        except ValueError:
            continue
        title = PREFIX.sub("", re.sub(r"\s+", " ", link.text()).strip())
        listing = cat.make_listing(
            source="snif",
            native_id=pid.group(1),
            title=title,
            url=BASE + href if href.startswith("/") else href,
            price=price,
            shop_count=None,  # the list shows "from" prices only
            scraped_at=scraped_at,
        )
        if listing:
            out.append(listing)
    return out, ids


def fetch(cat: Category) -> list:
    s = http.session()
    scraped_at = now_iso()
    seen: dict = {}
    for i, cid in enumerate(cat.snif_categories):
        label = cat.name if len(cat.snif_categories) == 1 else f"{cat.name}{i + 1}"
        page_ids: set[str] = set()
        for page in range(1, MAX_PAGES + 1):
            if i or page > 1:
                http.polite_sleep()
            r = s.get(f"{BASE}/category/{cid}/" + (f"?page={page}" if page > 1 else ""))
            r.raise_for_status()
            http.dump(f"snif_{label}_p{page}.html", r.text)
            listings, ids = parse(r.text, scraped_at, cat)
            for l in listings:
                seen.setdefault(l.id, l)
            new_ids = ids - page_ids
            page_ids |= ids
            print(f"  snif {label} page {page}: {len(ids)} products, {len(new_ids)} new, {len(listings)} kept")
            if not new_ids:
                break
    return list(seen.values())
