# Headphones & earphones: Phase 0 design (2026-11-14)

Status: research and proposal only. No scraper, site or data file has changed. Branch `feat/headphones` (from `origin/main` `ff222f0`). Everything under "Verified" was measured on 2026-11-14 with the project's own HTTP client from this PC (probe scripts and saved pages in `local/headphones/`, ignored by git). Everything under "Assumed" is not measured.

## 1. Verified source map

Counts are the sources' own totals for the whole category page, so they include accessories only where noted. Colour variants are separate products at BestPrice and often at Shopflix.

| Source | Category (id / path) | Products | Notes |
| --- | --- | --- | --- |
| Skroutz | `/c/1863/headphones.html` | 2,705 | on/over-ear; list spec line: form factor, ANC, quick charge |
| Skroutz | `/c/1850/Gaming_Headsets.html` | 1,776 | spec line: connection, platforms |
| Skroutz | `/c/1870/Multimedia_Headsets.html` | 622 | office/call-centre headsets (Poly, Epos, Logitech Zone) |
| Skroutz | `/c/1858/akoustika_psires.html` | 306 | wired in-ear and earbud |
| Skroutz | `/c/584/hands-free.html` | 2,622 | wired earphones, many cheap |
| Skroutz | `/c/435/hands-free-bluetooth.html` | 4,487 | TWS earbuds, open-ear, neckbands; spec line: battery hours, ANC |
| Skroutz | not used: `3521 3520 4968 6158 6160 6161` | | accessories, stands, ear pads, ear tips, cases |
| Skroutz | parent `/c/772/akoystika.html` | 19,421 | includes the accessories above, so the sub-lists are used |
| BestPrice | `/cat/8068/headphones.html` | 4,287 | |
| BestPrice | `/cat/8066/gaming-headsets.html` | 1,912 | |
| BestPrice | `/cat/8069/akoystika-pseires.html` | 333 | |
| BestPrice | `/cat/8072/akoystika-ypologisti.html` | 320 | PC headsets |
| BestPrice | `/cat/811/hands-free.html` | 3,440 | 2,595 of them under 10 EUR |
| BestPrice | `/cat/813/bluetooth.html` ("Bluetooth Handsfree") | 6,470 | TWS earbuds |
| Snif | `/category/1819012/` (Ακουστικά, under Ηχεία - Ακουστικά 181901) | about 1,500 (page 80 full, page 90 empty; 19 per page) | titles carry no spec line |
| Shopflix | `/c/1807/bluetooth-handsfree` | 5,041 | |
| Shopflix | `/c/2468/headphones` | 3,153 | |
| Shopflix | `/c/1519/handsfree-akoystika` | 2,172 | |
| Shopflix | `/c/3433/gaming-headsets` | 1,773 | |
| Shopflix | not used: `/c/3744/aksesoyar-akoustikon-bluetooth` | 2,732 | accessories |
| e-shop.gr | `ixos-eikona-akoustika-headphones-list` (`table=PER`, `category=ΑΚΟΥΣΤΙΚΑ`) | 630+ (largest offset seen) | the existing reader works on this shape |
| e-shop.gr | `tilepikoinonies-bluetooth-handsfree-list` (`table=TEL`, `category=BLUETOOTH HEADSET`) | 610+ | `table=TEL`, not `PER`: the reader hard-codes `PER` |
| e-shop.gr | `tilepikoinonies-handsfree-list` (`table=TEL`, `category=HANDSFREE`) | about 100 | |

Totals before any filtering: Skroutz 12,518, BestPrice 16,762, Shopflix 12,139, Snif about 1,500, e-shop about 1,400, so **about 44,000 listings** (mice: 7,106). The same product probably sits in several of a source's own lists (Skroutz 435 and 584, BestPrice 811 and 813): the overlap is not measured yet.

BestPrice (50-page cap, 16 per page, so at most 800 per list). Price slices measured (cents):

| List | <5 EUR | 5-9.99 | 10-19.99 | 20-29.99 | 30-49.99 | 50-99.99 | 100-199.99 | 200+ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8068 headphones | 15 | 228 | 1,460 | 808 | 627 | 430 | 246 | 471 |
| 8066 gaming | 8 | 112 | 496 | 406 | 322 | 324 | 171 | 68 |
| 813 bluetooth | 49 | 507 | 2,721 | 1,281 | 875 | 575 | 329 | 130 |
| 811 hands-free | 1,263 | 1,332 | 609 | 113 | 81 | 28 | 7 | 7 |

Slices of 1,460, 2,721, 1,281 and 875 exceed 800 and need finer slices. Full coverage is about **1,050 BestPrice list pages** (mice: 176).

Skroutz and BestPrice list pages already carry useful specs in a spec line: form factor (Over Ear / On Ear / In Ear / Earbud), ANC, connection (Bluetooth / USB / 3.5 mm), battery hours, platforms, water resistance. Snif, Shopflix and e-shop give titles only. A real product page was not read for any source.

Not verified: how much the sub-lists overlap; whether Shopflix has more headphone categories outside its 1,000 largest facets (the facet list is capped); whether Skroutz list pages from the GitHub runners behave as for mice.

## 2. Two blocking problems (need a decision before code)

**Size.** `list.v2.json` for 5,031 mouse models is 221 KB gzip against a 300 KB limit (about 44 bytes per model). 44,000 listings will group to roughly 15,000-25,000 models (not measured), which is 650-1,100 KB. The limit is a project rule and is not to be raised silently. The category has to be cut down.

**Run time.** The `scrape-shops` prices job took 60 of its 90 minutes with mice. About 1,050 BestPrice pages at the polite 1.2-2.5 s delay is about 35-50 minutes on its own, and Shopflix, Snif and e-shop add more. Skroutz would add about 210 pages (about 10 minutes) to `scrape`.

Ways to cut both (owner to choose; combine as needed):

1. **Drop the cheap wired hands-free lists**: Skroutz 584 and BestPrice 811 (6,062 products, mostly bundle-in-the-box and noname 3.5 mm earphones). Keeps over/on-ear, gaming, office headsets, TWS/Bluetooth earbuds and the "psires" (wired in-ear) lists. Wired earphones then come only from 1858 / 8069 / e-shop handsfree / Shopflix 1519 (which cannot be sliced away).
2. **A price floor** (for example 10 EUR): BestPrice has price slices, Skroutz has `price_min`, Shopflix filters `search-result-data.price`; Snif and e-shop cannot filter, so their cheap listings would be rejected by the normalizer (reason `below-floor`). Removes the noname tail.
3. **A brand allowlist** is not proposed: it would hide real products.
4. **Raising a limit** (300 KB, 90 minute timeout, 110 KB JS): not proposed.

My recommendation: 1 plus 2 (floor 10 EUR), then measure the first collection, set `MIN_MODELS` from it, and only then decide whether the file size fits. If it still does not fit, the next step is a decision for the owner, not a quiet exception.

## 3. Proposed data model (needs the owner's approval: it touches `models.py` and `types.ts`)

`HeadphonesListing` (Python dataclass and TS interface, same shape as `MouseListing`; every spec `None` = not stated, never a default):

- Identity: `id source title url price shopCount brand chip scrapedAt partNumber colour reject identityTitle`.
- Classification: `formFactor` (Over-ear, On-ear, In-ear, Earbud, Open-ear, Bone-conduction), `productType` (Headphones, Earphones, Earbuds, Headset), `gaming`, `trueWireless`.
- Connection: `connection` (Wired, Wireless, Both), `bluetooth`, `rf` (2.4 GHz dongle), `connector` (3.5mm, USB-A, USB-C, Lightning), `multipoint`.
- Audio: `anc`, `transparency`, `microphone`, `spatialAudio`, `driverMm`.
- Battery and body: `batteryHours`, `chargingCase`, `waterResistance` (IP code), `foldable`.

Fields kept out of the first version because no source lists them reliably: impedance, sensitivity, frequency response, weight, Bluetooth version, detachable microphone. They are added only when a measured coverage report says a field is stated for a useful share of models (unknown stays unknown; never "No" from silence). Whether a field becomes a filter, a card line or a product-page row is decided from the coverage in the data review, not from the type.

## 4. Proposed identity rules

- Model identity = brand + model name with colour words removed; the manufacturer part number is used when two listings state it. Colours are variants of one model (as for mice).
- Never merged: a wired and a wireless product; WH and WF families; AirPods and AirPods Pro; Galaxy Buds generations; a model with and without a stated suffix that changes hardware (for example `WH-1000XM5` and `WH-1000XM4`); gaming headsets that differ in `Wireless`/`Wired`/USB-dongle wording.
- Unknown never bridges: a listing with no stated generation or connection does not join a model that states one, unless a shared part number says so.
- `settle()`: deterministic, idempotent, runs on all listings (kept ones too), as for mice.
- Rejection reasons: `no-identity`, `not-headphones` (speakers, microphones, DACs, amplifiers, stands, cables), `accessory` (ear pads, ear tips, cases, replacement parts), `bundle`, `identity-conflict` (same part number under two names, rejected as for mice), `below-floor` if a price floor is chosen.
- Fixtures: observed titles from the saved list pages in `local/headphones/probe/` (real titles, not invented ones), in `scripts/checks/fixtures/headphones-titles.json`.

## 5. Proposed source capabilities

Same as mice and monitors: every source gives its lists; Skroutz, e-shop.gr and Shopflix give no product pages, shipping or history (`UNSUPPORTED[(source, "headphones")]`). BestPrice and Snif keep their shipping reads, limited by the existing per-run budget of 60 pages. No product-page enrichment for the first version.

Source-reader changes needed (the scraper may change without separate approval, owner 2026-11-12):

- `skroutz.py`: `MAX_PAGES = 80` is enough (largest list 4,487 / 60 = 75 pages). Paths: the six lists above; `skroutz_tags` can carry the sub-list (gaming, headset, TWS) as observations.
- `eshop.py`: `table=PER` is hard-coded; `table=TEL` is needed for two lists. Needs a per-path table value in `Category.eshop_categories` or a path that carries it.
- `shopflix.py`: facet values for the four categories above; price slicing already exists.
- `bestprice.py`: price slices (above), finer where a slice exceeds 800.
- Open item from the project state: e-shop.gr's robots.txt disallows `offset=` paging, which every e-shop list uses. Adding three e-shop lists adds to that open question; the owner has not decided it.

## 6. Site changes (follow `docs/ADDING-A-CATEGORY.md`)

`category_ids.py`, `models.py`, `normalize_headphones.py`, `categories.py`, `capabilities.py` (+ `test_capabilities.py`); `src/types.ts`, `registry.ts` (`enabled:false, visible:false` first), `categoryRules.ts`, `categories.tsx`, `ranking.ts`, `shell/nav.ts`, `shell/texts.ts`, `ui/specs.ts`, `components/catalogue/specs.ts`, `components/product/keySpecs.ts`, `derive.ts` (`MIN_MODELS`, `LIST_SKIP_BY_CATEGORY`). At release only: `vercel.json`, `site-check.mjs`, the registry test. Search, sitemap, home tiles, comparison and static pages follow the registry. Data-wide tests (`facets`, `keySpecs`, `modelChunks`) may need a headphones entry. The PC Builder, the engine and the `Slot` type are not touched.

Registry id and URL: `headphones`, `/headphones`. Greek name "Ακουστικά", English "Headphones & Earphones". Icon: Lucide `Headphones`.

## 7. Risks

1. Size and run time (section 2). Biggest risk.
2. Identity: model names are short and similar (AirPods, Galaxy Buds, JBL Tune 520BT / 525BT / 510BT); many noname products have no model name at all (expect a large `no-identity` reject count, like mice).
3. Colours as separate BestPrice products: one model with many listings; `shopCount` and offers must not double count.
4. Handsfree lists mix phone accessories (car kits, mono Bluetooth headsets): `not-headphones` reject rules needed, measured on real titles.
5. Unknown specs: no source states "No" for most features, so Yes/No filters will offer only "Yes" for most flags (as for mice).
6. e-shop robots.txt (section 5).

## 8. Plan after approval

Phase 1 (scraper and model, tests on observed titles, an isolated trial in `local/headphones/`, never `public/data/`) then Phase 2 (data review: counts per source, rejects with samples, fifty random groups, unknown share per field, expected gzip size) then Phase 3 (site) then Phase 4 (checks). The category stays `enabled:false, visible:false`. Nothing is pushed, no workflow is started and no data is published without the owner's yes.

## 9. Owner decisions (2026-11-14) and what was built

- **Scope cut.** The cheap wired hands-free lists are not read: Skroutz `c/584`, BestPrice `cat/811`, Shopflix `c/1519` and the e-shop hands-free list. Every source also has a **10 EUR floor**: BestPrice slices start at 1000 cents, and a listing below the floor from any source is rejected as `below-floor`. `settle()` decides the floor again on every run, so a listing that is on sale below 10 EUR comes back when its price recovers.
- **Data model.** Section 3 is approved as written. `HeadphonesListing` is in `scraper/models.py`; the TypeScript mirror follows in the site phase.
- **Sources read.** Skroutz `1863`, `1850`, `1858`, `1870`, `435`. BestPrice `8068`, `8066`, `8069`, `8072`, `813`, cut into 30 price slices that each stay under 50 pages (page counts measured 2026-11-14, `local/headphones/slices.json`; about 750 list pages in total). Shopflix `1807`, `2468`, `3433` (facet names read from the live facet list). Snif `1819012`. e-shop.gr two lists; the Bluetooth list needs `table=TEL`, so `eshop_categories` entries may carry a third item, the table (default `PER`).
- **Capabilities.** Like mice: lists from every source; product pages, shipping and history only from BestPrice and Snif (`scraper/capabilities.py`).
- **Identity** (`scraper/normalize_headphones.py`): model = brand + model name; colours are variants; type words, connection words, battery and ANC phrases are removed from the name. Kept in the name because they make another product: Apple's ANC version of AirPods 4 and 5 (`AirPods 4 ANC`), the plug of EarPods (`EarPods USB-C`, `Lightning`, `3.5mm`), `Plus` for a trailing `+`. A title made only of type words has no identity (`no-identity`). `settle()` rebuilds identities from the title, merges sources, rejects a part number that two names claim (`identity-conflict`) and separates wired and wireless versions only when the titles of one model state both.
- **Known limits, to review in the data review:** AirPods 3 with the MagSafe case and with the Lightning case share a model; the colour word of a title is only recognised as a colour, so a colour inside a model name (Logitech G PRO X "with Blue VO!CE") is taken out; unknown brands are rejected as `no-identity` until they are added to `BRAND_LIST`.

## 10. Data review

The first collection and its review are in `HEADPHONES_DATA_REVIEW.md`. Result: the category is not publishable as scoped (list file about 600 KB against 300 KB; `scrape-shops` would reach about 87 of 90 minutes). The owner's decision on the price floor (30 EUR recommended) is open. Normalizer changes made after the trial: extended brand list, brand refreshed in `settle()`, "both" connection no longer conflicts, a single unnamed colour word after the ear phrase is cut, "BT-02" codes kept.
