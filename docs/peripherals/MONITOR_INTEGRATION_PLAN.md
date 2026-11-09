# Monitor integration plan (DRAFT for owner approval)

Status: planning only. **Read PLAN_RECONCILIATION.md first: it corrects this document where they differ (Skroutz shipping/history for monitors removed; `yesNo` unknown semantics; evidence states; source capabilities; acceptance numbers).** Legend: **[V]** verified in repo/live site, **[A]** assumption, **[P]** proposal. See PERIPHERALS_ARCHITECTURE.md for the category/registry design this builds on.

## 1. What is unknown and must be checked before Phase 2 [V that it is unknown]
This session made no scraper request and could not open competitor pages (PCPartPicker and a guessed BestPrice monitors URL answered 403; web search found no usable Skroutz/BestPrice monitor pages). Therefore **not verified**:
- The monitor category path/id on Skroutz, BestPrice, Shopflix, Snif, e-shop.gr (`Category.skroutz_paths`, `bestprice_paths`, `shopflix_categories`, `snif_categories`, `eshop_categories`).
- Number of monitor products per source (drives slicing, BestPrice's 50-page cap of ~800 products, run time).
- How titles are written on each source and how many carry the manufacturer model code.
- Terms/robots for the monitor paths (BestPrice robots.txt read: it disallows `/compare`, `/api`, some `?pg=` combinations; monitors are not named. Not a licence review).
Phase 2 starts with a read-only **recon** step: fetch a few list pages per source the way the existing scrapers do (same client, polite delays), save the HTML under `scraper/debug/` and write findings into this file. No evasion of any block; a block means the source is skipped for monitors.

## 2. Monitor product model [P]

### 2.1 What a "model" is
Unit of grouping (= one product page, one price comparison): **one manufacturer model code** (MPN), e.g. LG `27GR95QE-B`. Monitors differ from GPUs/RAM (where our model = spec bundle across vendors): two monitors with the same size, resolution and Hz are different products when their codes differ (panel, ports, stand, warranty). So identity is by code, not by spec.

`model_key` = normalised brand + MPN (letters and digits only, upper-cased), same idea as `names.model_key` used for cases/fans/storage [V]. Greek/Latin look-alike letters are converted first, as `normalize_mobo._latin` does [V].

### 2.2 Listing record (`MonitorListing`, mirrors `src/types.ts`) [P]
Common fields as `BaseListing` (`id`, `source`, `title`, `url`, `price`, `shopCount`, `brand`, `chip`, `scrapedAt`, shipping/total/merchant, `drop`, deal fields). `brand` = manufacturer, `chip` = display name (brand + series + MPN, like mobo's `chip`). Monitor fields (all nullable except where noted; **null = not stated, never a guess**):

| Field | Type | Required for listing? |
|---|---|---|
| `mpn` | string | no; absent → model gets key from fallback (see 4.3) and a `keyed:'weak'` flag |
| `sizeIn` | number (inches, 1 decimal) | required to list |
| `resW`, `resH` | integers | required to list (else dropped as unclassifiable) |
| `hz` | number (max refresh) | optional |
| `panel` | `IPS|VA|TN|OLED|QD-OLED|Mini-LED|Other` | optional |
| `curved` | `null`/radius string (`1000R`) | optional (`flat` only if stated) |
| `aspect` | derived: `16:9`, `21:9`, `32:9`, `16:10`… | derived from res |
| `ppi` | derived from size + res | derived, never stored as a source fact |
| `respMs`, `respKind` | number, `GtG|MPRT` | optional |
| `brightnessNits`, `hdr` (`none|HDR10|HDR400|HDR600|HDR1000|DisplayHDR True Black 400…`) | | optional |
| `contrast` (`1000:1`), `localDimming` | | optional |
| `gamut` (`sRGB %`, `DCI-P3 %`, `AdobeRGB %`), `bitDepth`, `deltaE` | | optional |
| `adaptive` (`FreeSync|FreeSync Premium|FreeSync Premium Pro|G-SYNC|G-SYNC Compatible|VESA AdaptiveSync`), `vrrMin`, `vrrMax` | | optional |
| `hdmi` (`[{ver,n}]`), `dp` (`[{ver,n}]`), `usbC` (`{n, alt?, pdW?}`), `thunderbolt`, `usbHub`, `kvm` | | optional |
| `vesa` (`100x100`…), `stand` (`height|tilt|swivel|pivot`), `dimsMm`, `weightKg`, `powerW` | | optional |
| `warrantyYears`, `burnInWarranty` (bool/years) | | optional (OLED) |
| `features` (free tags: speakers, blur-reduction, KVM…) | | optional |

### 2.3 Verified / unknown states per field [P]
Each value carries a state in the cache (not on the listing): `stated` (a source says it), `conflict` (sources disagree), absent (unknown). A displayed value is always `stated` and from a documented source; `conflict` shows "sources disagree" with both values on the product page, and is excluded from filters (it appears under "Unknown" in a filter, like mobo `formConflict` today [V: `types.ts` `formConflict`]). Never derive a spec from a name pattern the source does not state, except title tokens explicitly in 3.2.

### 2.4 Required vs optional
A monitor listing is kept only if it has brand, size, resolution and a price. Everything else may be unknown. "Verified" (green tick on product page) = the value came from the maker's own page or ≥2 sources agree.

## 3. Data collection [P]

### 3.1 Sources and order
1. **Lists** from the shops already integrated (same five, same polite client). Gives title, price, URL, photo URL, sometimes a spec line (`specs` string, as Skroutz passes today [V]).
2. **Title parsing** (`normalize_monitor.py`): brand, MPN, size (`27"`, `27''`, `27 ιντσών`, `68,6cm`), resolution (`QHD`, `2560x1440`, `4K`, `UHD`, `WQHD`), Hz (`165Hz`), panel word (`IPS`, `VA`, `OLED`…), curved (`Curved`, `1000R`), adaptive sync word. Same style as the existing normalisers (regex tables, drop what cannot be classified).
3. **Product pages** on BestPrice (states many fields; icons read as Ναι/Όχι via `specs.labels` [V]) through the existing `specs.collect` queue, budget unchanged (150 pages/site/run). **Skroutz product pages stay paused** until the owner approves a budget (existing rule, `specs.PAUSED` [V]).
4. **Maker sites** (`scraper/makers/` framework [V]): optional later, one maker at a time (LG, Samsung, Dell, ASUS, MSI, Gigabyte, AOC, Philips), exact part-number match, never guesses. Not in the first release.

### 3.2 Title token rules [P]
- A token is used only when unambiguous. `144`/`165` need `Hz`; `27` alone is not a size. "QHD" and "WQHD" → 2560×1440; "UHD/4K" → 3840×2160; "FHD" → 1920×1080; "UWQHD" → 3440×1440; "5K2K" → 5120×2160. Mapping table lives in code with tests.
- Panel words and "Gaming"/"Curved" only set `panel`/`curved`; they never override a stated page value.
- Titles that advertise accessories, mounts, panels-only, "Open Box", refurbished, used, "Interactive/Touch Display for business", TVs, projectors, monitor arms: dropped (same dropping pattern as storage/mobo normalisers [V]).

### 3.3 Merchant offers, shipping, history
Unchanged: `shipping.py` per-listing best price + delivery (Skroutz `shops_list`, BestPrice product page, e-shop free from 90 €), `offers.json` cache, `site_history.py` import, deals, all-time lows [V]. A monitor needs a **shipping-cost caution**: bulky item, Greek shops often charge more (a size/weight-based fee). The existing code reads the fee from the page; unknown stays unknown [V behaviour].

## 4. Product matching [P]

### 4.1 Rules (in order)
1. **MPN equality** after normalisation = same model.
2. **MPN with regional/colour suffix**: LG `27GR95QE-B` vs `27GR95QE`; Samsung `LS27DG500EUXEN` vs `LS27DG500EU`; Dell, ASUS `-B`/`/EU`. Strip only suffixes listed in a per-maker table; unknown suffix → separate model (a wrong merge is worse than a split).
3. **No MPN**: key = brand + series name + size + resolution + Hz + panel; flagged `weak` and only merged across sources when all five agree. Otherwise stays a one-source model.
4. **Never merge** across: size, resolution, Hz, panel type, curvature, or a different MPN root, even when names look alike (`27GP850-B` vs `27GP83B-B`; `G5 27"` 144 vs 165 Hz variants; `Odyssey G5 LS27AG520` vs `LS27AG522`).
5. **Aliases**: reuse `scraper/model_aliases.json` machinery with owner-approved entries; every alias change is a reviewed commit (existing practice [V]).
6. **Conflicts**: spec disagreement between two listings of one model (e.g. size 27 vs 31.5) → treat as two models (split on the field) and write the case to a conflicts report (`tests/fixtures/conflicts` pattern exists [V]). Measurement-like fields use "take the safer value" only where the existing `SAFER` rule applies (none for monitors).

### 4.2 Source confidence for a field value
maker page > BestPrice product page > Skroutz product page (when approved) > list-page spec line > title token. Higher overrides lower only when it is `stated`; disagreement between two same-rank values = `conflict`.

### 4.3 Settle step
Monitor `settle()` (like storage's `Category.settle` [V]): MPN-bearing listing pulls a title-only listing of the same source group into its model only when brand + size + resolution + Hz + panel agree and exactly one MPN candidate exists.

## 5. Filters [P]
Follow the shared architecture: `useFilterState`, `filterUrl.ts` (URL param per filter, empty = all), `facets.ts` counts, empty-start (owner rule 2026-11-08 [V: memory/CLAUDE]). New monitor filters (pills = first group, rest `extraFilters`):

| Filter | Type | URL param |
|---|---|---|
| Brand | multi (pills) | `brand` |
| Price (max) | range | `max` (existing) |
| Size | buckets ≤24, 25–27, 28–31.5, 32–34, 35+ | `size` |
| Resolution | FHD, QHD, UWQHD, 4K, 5K+ ,Other | `res` |
| Refresh rate | ≥ threshold (60,75,100,144,165,240,360+) | `hz` |
| Panel | IPS, VA, TN, OLED family, Mini-LED | `panel` |
| Aspect | 16:9, 16:10, 21:9, 32:9 | `aspect` |
| HDR | none / any HDR / HDR400+ / HDR600+ / HDR1000+ | `hdr` |
| Adaptive sync | any / FreeSync / G-SYNC | `sync` |
| Connectivity | HDMI 2.1, DisplayPort, USB-C (any/with PD), Thunderbolt, USB hub, KVM (yes/no) | `ports` |
| Curvature | flat / curved | `curve` |
| Response ≤ ms | threshold | `resp` |
| Color gamut ≥ | threshold (sRGB/DCI-P3) | `gamut` |
| Has offers on sale / all-time low | existing chips | existing |

Rules: a filter on an unknown field **excludes** unknown models and the facet shows "Unknown (N)" so nothing silently vanishes; "yes/no" filters (`yesNo` [V]) treat unknown as neither. Facet counts use the existing deferred pass (`facetCounts`), watching the phone-score warning in CLAUDE.md (more filters = longer task; Phase 3 measures it).

Sort: Best deals (existing), Recommended (needs a `ranking.ts` config: popularity, modern = panel/Hz/res tables, price band, value = no `value()` for monitors at first), Price ↑↓, Size, Refresh rate, Resolution. **No** "best for gaming" score invented from specs.

## 6. Pages and UI [P]
- Category page `/monitor`: existing `CategoryView`; columns: size, resolution, Hz, panel, then price; card spec line (3–4 specs). Sidebar groups as above.
- Product page `/monitor/<slug>`: existing `ModelPage`; `SpecGroups` for monitors (Display, Image quality, Gaming, Connectivity, Physical, Warranty/other; empty groups omitted; unknown fields omitted, per the existing "missing value is left out" rule [V: `SpecGroups.tsx`]). **No** `BuildFit` block (not a builder slot). Add "Compare" button (UNIVERSAL_COMPARISON_SYSTEM). Variants/Alternatives: same model-code family (other sizes/Hz of one series) shown as "Variants", never merged.
- Home: monitor not shown on the home tiles until it has data and the owner approves the tile.
- Search: monitors included; hits tagged "Peripherals".
- i18n: every string in EL and EN via `Text`; both languages' labels for spec names (a glossary table is added to this doc in Phase 3).
- Design: tokens only, dark only, 44 px tap targets on touch, no new design system.

## 7. Performance, size, risks
- Volume [A]: a few thousand listings; compare `case` 5.6 MB, `ram` 3.8 MB `latest.json` [V]. Expect the same order of magnitude; build derives `list.json` columns only.
- Lighthouse rules in CLAUDE.md (paint order, no early downloads) apply: monitor chunk loads like other categories.
- Photos: monitors add images to the images repo; repo size headroom not measured.
- Skroutz load: one more category list crawl (D2). Circuit breaker unchanged [V].
- Data gate: `MIN_MODELS.monitor` set after the first real scrape; `checkData` compares with the live manifest.
- Risk: titles without MPN lead to split models (accepted, safer than a wrong merge).

## 8. Testing (monitor-specific) [P]
Unit (Python): `normalize_monitor` golden titles per source (≥60 real titles saved as fixtures, including nasty look-alikes), unit conversion, token rules, drop rules, MPN suffix table, `settle` idempotence (twice = once), no-merge rules. Unit (TS): spec formatting, filter predicates incl. unknown handling, facets, URL round trip, slug uniqueness (`routes.test.ts`), data check floors. Integration: `main.py --category monitor --no-shipping` offline from fixtures; derive output shape. E2E: `/monitor` loads, filters, deep links, product page, EL/EN, 360 px layout audit, Lighthouse not worse than `case` page. Regression: all existing suites unchanged and green; `scripts/checks/data-equivalence.test.mts` still ALL EQUAL for the nine categories.

Acceptance criteria are in IMPLEMENTATION_ROADMAP.md.
