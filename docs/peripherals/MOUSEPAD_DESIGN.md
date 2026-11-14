# Mousepads: Phase 0 design (2026-11-14)

Status: research and proposal only. No scraper, site, workflow or data file has changed. Everything under "Verified" was measured on 2026-11-14 with the project's own HTTP client from this PC (probe scripts and saved pages in `local/mousepad/probe/`, ignored by git). "Assumed" and "Proposed" are marked as such. Repository state at the start: branch `feat/headphones`, whose tip is already contained in `origin/main`; working tree clean (one unrelated untracked file). The category work should start on a new branch from `origin/main`.

## 1. Verified source map

| Source | Entry point | Products | Notes |
| --- | --- | --- | --- |
| Skroutz | `/c/598/mouse_pad.html` | 6,168 | 60 cards on page 1-2, 48 later; about 128 pages. Spec line per card: `Τύπος: Gaming` / `Standard` / `Στρογγυλό` |
| BestPrice | `/cat/2793/mouse-pads.html` | 5,213 (`totalProducts`) | caps at 50 pages = 800 products per list; unsliced list shows 50 pages |
| Shopflix | Algolia facet `Mousepads*:::*/c/4743/mouse-pads` | 4,009 (8,018 facet count without the `locale:el_GR` filter) | `/c/4743/mouse-pads`; found by facet search, so it is configured, not looked up |
| Snif | `/category/1919853/` (`?page=N`) | about 1,250 (page 60 full, page 70 empty; 19 per page) | titles only |
| e-shop.gr | `ypologistes-mousepads-list?offset=N&table=PER&category=MOUSEPAD` (Greek name in iso-8859-7) | 238 on 24 pages | the landing `/mousepads` shows 8 cards and is not the list; the same list also answered for `ypologistes-mousepad-list` and `ypologistes-pontikia-mousepads-list`; `table=PER` as for mice; reader unchanged |

Total about 16,900 listings before any filtering (mice: 7,106).

### The print-on-demand flood (the finding that decides the design)

All three large sources carry thousands of near-identical print-on-demand mousepads from one seller (titles like `kpop Demon Hunters Huntrix, Mousepad ορθογώνιο 23x19cm`, `Roblox Rivals, Mousepad Στρογγυλό 20cm`, `Koupakoupa Judo Free Hugs 230mm Γκρι`, `Mouse Pad ΠΑΟ Παναθηναϊκός Στρογγυλό 20cm`). Each design appears in three shapes: rectangular 23x19 cm, round 20 cm, heart 23x20 cm.

| Source | Measured |
| --- | --- |
| BestPrice | exactly 10.80 EUR (`min=1080&max=1080`): 2,233 products, 43% of the category. Pages sampled (1, 2, 25, 49, 50) were all this pattern, none had a shop count shown |
| Shopflix | 11.50-11.99 EUR: 2,178 of 4,009 hits (54%); 956 of 1,000 sampled hits had one vendor |
| Skroutz | the tail of the popularity-sorted list (pages 50-128 sampled at 50, 100, 103, 104) is this pattern at 11.80 EUR; share not yet counted |

Real branded mousepads (Razer, Logitech, SteelSeries, Corsair, HyperX, Gembird, Genesis, Trust, Cooler Master, Hama, Esperanza, Natec) are the rest, roughly 2,000-3,000 listings per big source (derived: total minus the spike).

**Decision for the owner (D1):** keep, cap or reject these listings. They are real mousepads, but each design is one product from one seller, none has a manufacturer part number, and they would roughly double the model count and the list file. The proposal in section 8 is to reject them under a named reason (`custom-print`) by a title/shape rule, never by price, and to list the count in the data review so the owner can reverse it. Nothing is rejected until the owner decides.

## 2. Source capabilities (proposal; compare `scraper/capabilities.py`)

| Source | Lists | Specs, shipping, history |
| --- | --- | --- |
| BestPrice | yes (measured) | proposed yes: same as mice and headphones. **Not verified**: no product page was read |
| Snif | yes (measured) | proposed yes: same as mice. **Not verified** |
| Skroutz | yes (measured) | proposed `UNSUPPORTED = {SPECS, SHIPPING, HISTORY}` as for mice, headphones and monitors |
| Shopflix | yes (measured) | the same |
| e-shop.gr | yes (measured) | the same |

Skroutz's own filters give structured facts the list page does not print (verified counts in section 3), but reading them needs filtered list pages, not product pages, so it stays inside "lists only".

## 3. Verified list-page specs per source

Skroutz list spec line: only `Τύπος: Gaming | Standard | Στρογγυλό`. Titles carry the size word and a width in mm (`XXL 900mm`, `Medium 355mm`), the colour (`Μαύρο`) and often the manufacturer code (`RZ02-05491000-R3M1`, `MP-GAME-XL`).

Skroutz facets (counts of 6,168): Gaming 1,348; Standard 3,808; round 1,007; size XXL 788, XL 117, Large 266, Medium 239, Small 3,905 (the POD size); material cloth 3,147, gel 166, plastic 100, leatherette 22, glass 13 (also transparent, turquoise exist); USB port 117; wrist support 218; RGB 242; 15 colours.

BestPrice facets (page 1): brand (282 brands), size (`2989_`: small, medium, large, xlarge, xxl, xxxl, 4xl), type (`2990_`: standard, gaming), wrist rest (`2991_1`), RGB (`2992_1`). Price filter `?min=&max=` in cents works with them. BestPrice titles are often just `<brand> <series/model> <colour> <size>` (`Razer Gigantus V2 Black Medium`, `Logitech G840 Black XXL`).

Snif: titles only (`Gembird Mouse Pad Σε Μπλε Χρωμα 220x250 mm 4 mm`, `Mouse pad - Γκρι`; some have no brand).
e-shop.gr: upper-case titles with the manufacturer code (`GEMBIRD MP-GEL-BK GEL MOUSE PAD WITH WRIST SUPPORT BLACK`, `ESPERANZA EGP101R GAMING MOUSE PAD FLAME MINI`) and accessories mixed in (`HAMA 53011 3IN1 NOTEBOOK PAD WITH SCREEN SIZE 40CM`: a notebook pad, to be rejected).
Shopflix: title only; mostly `Mousepad <design> Στρογγυλό 20cm`.

**Not verified:** specification coverage per field (needs the first collection), photos per source (listing images are present on the cards for BestPrice and Skroutz; Shopflix and Snif as for mice), whether BestPrice and Skroutz product pages state material, thickness or base.

## 4. Pagination and collection workload

Measured:

- **BestPrice.** The unsliced list caps at 50 pages. Price slices in cents, pages per slice: 0-299: 13; 300-499: 15; 500-699: 13; 700-799: 7; 800-899: 30; 900-999: 21; 1000-1079 in 20-cent steps: 6 in all; 1081: 1; 1086-1099: 3; 1100-1199: 5; 1200-1499: 28; 1500-1999: 17; 2000-2499: 11; 2500-2999: 8; 3000-3999: 10; 4000-4999: 4; 5000-6999: 3; 7000-9999: 2; 10000-19999: 2; 20000+: 1. That is **about 200 list pages without the 10.80 EUR price** (mice: 176). The price 1080 (2,233 products) alone hits the cap and is not splittable by price. Combined with the standard/gaming facets it still caps (standard 1,142 products, 50 pages). Brand facets could split it (not tested). Proposed: slice by price and leave exactly 1080 out, unless D1 says to collect the print-on-demand listings, in which case the spike needs brand-facet slices and its completeness cannot be proven by page count alone.
- **Skroutz.** About 128 pages. `scraper/sources/skroutz.py` `MAX_PAGES = 100` and **raises** at the limit (`page limit reached before completion`), so a plain `/c/598/mouse_pad.html` path would fail loudly, not truncate. It needs either filtered list paths that together cover everything (type, size, shape facets; their counts above do not sum to 6,168 because they overlap) or a raised limit for this category. The existing reader supports several `skroutz_paths` per category with tags (as mice do).
- **Shopflix.** Algolia, 1,000 hits per query, price ranges; 4,009 hits is 5 or more queries. Not a time concern.
- **Snif.** About 66 pages of 19. **e-shop.gr.** 24 pages of 10.

Estimated run time (assumed, from the 1.2-2.5 s polite delay): BestPrice about 200 pages is 7-8 minutes; Skroutz about 128 pages is 5-6 minutes in `scrape.yml`; Snif and e-shop about 90 pages are 3 minutes. Mice added about 6 minutes to the prices job and `scrape-peripherals.yml` is currently at its own allowance; the real runtime is measured in the first local collection, not assumed here.

## 5. Proposed data model

(`models.py` and `src/types.ts` need the owner's approval.) `MousepadListing` like `MouseListing`; every unstated spec is `None`:

- Identity: `id source title url price shopCount brand chip scrapedAt partNumber colour reject identityTitle`.
- Classification: `type` (Gaming | Standard), `size` (Small | Medium | Large | XL | XXL | XXXL | 4XL, as stated), `shape` (Rectangular | Round | Heart | Other), `extended` (desk mat, from the words "desk mat", "extended", "XXL" only when stated).
- Dimensions in mm: `widthMm heightMm thicknessMm`, set only when the title or a source states them. Greek and English forms: `900mm`, `90x40cm`, `220x250 mm 4 mm`, `23x19cm`. A listing that only says "XL" gets no dimension. A single value such as `900mm` (Skroutz) is the long side, not a pair: it is stored as `widthMm` only when the source states it as the width, otherwise kept as `lengthMm`-less text in the spec line (decide in Phase 1 from the fixtures).
- Surface: `surface` (Cloth | Plastic | Glass | Leatherette | Silicone | Gel | Hybrid), from Skroutz's material facet or explicit title words only; `Gel` for a wrist rest is `wristRest`, not `surface`.
- Features: `rgb`, `wristRest`, `usbPort`, `wirelessCharging`, `antiSlip`, `stitchedEdges`. All tri-state. Candidates dropped for now because no source was seen stating them: `powerplayCompatible`, `detachableCable`, `washable`, `baseMaterial`, `waterResistant`; added only if the data review shows a stated share worth a filter.

## 6. Proposed identity rules

- Model key: `names.model_key(chip)` as for mice; `chip` = brand + series/model + size token (+ `Round`/shape where the shape differs). **Size is part of the key**: `Razer Gigantus V2 Medium`, `Large` and `XXL` are three models. Colour is not part of the key (an offer of one model, shown by a colour selector like `MouseColours.tsx`). A different generation (V1, V2, V3) or surface (Cloth vs Hard) is a different model.
- A manufacturer part number joins listings of the same model when titles differ; two different part numbers inside one key are an `identity-conflict` and the listings stay apart. `settle()` is deterministic and idempotent, as in `normalize_mouse.py`.
- Reject reasons: `not-mousepad` (mice, trackpads, notebook pads, wrist rests alone, skates, keyboard-only mats), `bundle`, `used`, `no-identity`, `identity-conflict`, and (D1) `custom-print`.
- `normalize_mouse.py` stays untouched: it rejects mousepads as `not-mouse`, which remains correct, and a test pins both directions.

## 7. Registry and workflow plan (no change made)

- Category id `mousepad` appended last in `scraper/category_ids.py` and `src/lib/registry.ts` (`domain: peripherals`, no `builderSlot`), first `enabled:false, visible:false`.
- `--category mousepad` is added to the two calls in `.github/workflows/scrape-peripherals.yml` and `--skip-category mousepad` to the two in `scrape-shops.yml`, in one reviewed change, after the first local run time is measured. The mice CLI list there is `monitor, mouse, headphones` today. Timeouts stay unchanged unless the measurement says otherwise; if it does, I report the numbers and propose, not change.
- Skroutz goes through `scrape.yml` as for every category (no change in that file for category selection).

## 8. Data size and performance (assumed)

Per-model cost for mice was about 44 bytes gzip. With the custom-print rejection I expect roughly 2,500-4,500 models (assumption, not measured); without it roughly 3,500-7,500. The 300 KB list limit no longer exists (removed 2026-11-14); the rule that remains is Lighthouse mobile 90+ and JS 110 KB. Measured in Phase 2 and reported, not assumed.

## 9. Risks and open decisions

1. **D1** (above): print-on-demand listings.
2. Skroutz's 100-page limit versus about 128 pages: filtered paths versus a raised limit for this category (a change to `skroutz.py`).
3. BestPrice cannot cover the 10.80 EUR price in one slice; completeness for that price would need brand facets.
4. Part numbers are present for the branded products (e-shop, Skroutz titles) but not for the print-on-demand ones, and many Snif/BestPrice titles have no part number: identity there rests on brand + series + size.
5. Size words are not uniform: Skroutz uses XXLarge/XLarge/Large/Medium/Small; BestPrice adds xxxl and 4xl; the shops also use `Extra Large`, `L`, `XXL 900mm`. The normalizer must map them and a width/height conflict with the size word is a rejection or a `None`, never a guess.
6. Gel is both a wrist-rest construction and a surface in Skroutz's facet: both fields stay separate.
7. Unmeasured: spec coverage, photo coverage, shipping on product pages, generated JSON size, runtime, e-shop.gr's `robots.txt` question (open for all e-shop lists, see `docs/PROJECT-STATE.md`).

## 10. What I propose next

After the owner's answer to D1 and the Skroutz path decision: a new branch from `origin/main`, then the disabled scaffold, `normalize_mousepad.py` with fixtures from the pages already saved under `local/mousepad/probe/`, and one isolated local collection under `local/mousepad/` for the data review (Phase 2). No push, no workflow run, no change to `public/data/`.

## 11. Phase 1 decisions (2026-11-14, branch `feat/mousepad`, nothing pushed)

- **Registered but not enabled.** `mousepad` is in `CATEGORY_IDS` and `CATEGORIES`; the site registry has no entry yet, so it is invisible. Workflows are untouched: `scrape-peripherals.yml` and `scrape-shops.yml` do not know it.
- **Capabilities.** `UNSUPPORTED` = {SPECS, SHIPPING, HISTORY} for Skroutz, e-shop.gr and Shopflix, as proposed in section 2. BestPrice and Snif stay on the defaults; no product page was read.
- **Print-on-demand is rejected as `custom-print`** (owner decision). Detected by seller (Koupakoupa, Tstudio, OEM), by catalogue markers ("δώρο για", "με δυνατότητα προσθήκης ονόματος", "Rubber Diameter 20cm") and, for titles with no maker, by the fixed shapes 20 cm round, 23x19, 23x20, 22x18. Shopflix additionally excludes Koupakoupa at the source (`Category.shopflix_exclude`, a generic field) so the list fits Algolia's 1,000-hit window.
- **Skroutz** uses three disjoint facet paths (Gaming, Standard, round) because one path is 128 pages and the reader raises at 100.
- **BestPrice** is cut into 18 price slices that skip exactly 10.80 EUR, the print-on-demand price (2,233 products).
- **Identity** = maker + model + size; colour is a variant; a stated size or part number is never overruled by a code that merely contains "XL". Part number joins a bare-part title to the one named model; two named models for one part is `identity-conflict`.
- **`normalize_mouse.py` is untouched.** `normalize_mousepad.py` copies its brand table (dropping `cm`, the mouse table's Cooler Master alias, which is a unit here) and never writes to it; a test asserts pads are still `not-mouse` and that the mouse table is unchanged.
- **Tests.** `test_normalize_mousepad.py` (15), `test_mousepad_pipeline.py` (3, stubbed sources, real trial titles in `fixtures/mousepad-titles.json`), `test_capabilities.py` updated.
- **Results of the trial** are in `MOUSEPAD_DATA_REVIEW.md`, with the open decisions.

## 12. Phase 3 scaffold (2026-11-14, nothing published)

- Registry: `mousepad: { domain: 'peripherals', enabled: false, visible: false }`. Disabled means the build ignores it (no data read, no page, no menu, no sitemap entry); the `vercel.json` rewrites exist so the routes resolve once it is switched on.
- Filters (`MOUSEPAD_RULES` in `src/lib/categoryRules.ts`): size pills (small to XXXL), vendor, Gaming, RGB, wrist rest, minimum length, colour. Each reads only what a title states. Not offered, because the trial states them for under 4% of the listings: shape, surface, thickness, USB, wireless charging, anti-slip, stitched edges (the model page shows them when stated).
- Table columns: size, dimensions. Spec rows and model page rows: `src/ui/specs.ts`. Greek and English strings throughout.
- Ranking: popularity 0.7, price 0.3, no quality score. List rows skip the shop title and rarely stated specs (`LIST_SKIP_BY_CATEGORY`). `MIN_MODELS` is 1,700 (half of the trial's 3,432), used only once enabled.
- Comparison uses the existing engine; no PC Builder slot; the compatibility engine is untouched.
- Tests: `tests/unit/mousepadRules.test.ts` (pills, filters, address round trip, registry). `npm run check` passes (typecheck, lint, 89 test files, build).
- Not done: a preview with data (needs an isolated worktree so `public/data/` stays untouched), the e2e spec, Lighthouse, the workflow edits.

## 13. Phase 3 and 4 results (2026-11-14)

The category stays disabled and hidden in this repository (`REGISTRY.mousepad` is `enabled: false, visible: false`).

**Preview with data.** A copy of the repository was made outside the project (`BuildDraft-mousepad-preview`, not under version control, with `.vercel` and `.env.local` removed). In the copy only, the registry entry was switched to `enabled: true, visible: true` and the saved trial listings of 2026-11-14 were run through the real pipeline (`main.scrape_category`, sources stubbed) into the copy's `public/data/mousepad`. The result is 5,470 kept listings in 3,432 models, 7,039 rejects. This repository's `public/data` was not touched.

**What was checked in the copy.**
- `tests/e2e/mousepad.spec.ts`: 4 published-state tests pass (list with a Compare button on every row in both languages and no overflow at 360 px, size pills and stated-only filters that survive reload and back, model page with offers and no PC-builder block, global search finds a pad and the builder never offers one). The hidden-state test is skipped there and passes here, where the category is hidden.
- The whole Playwright suite ran against the copy: 333 passed, 1 failed. The failure is `builder-gate` `f-guided-1366-en` (`North XL RC` no longer matches a case in the current data). It fails the same way in this repository with mousepads disabled, so it is not caused by this work.
- Comparison of two pads works through the existing engine (maker, size, dimensions, gaming, price rows), with no console errors.
- Lighthouse (local production preview, 3 runs each, mobile and desktop) for `/mousepad` against `/mouse`: mobile 99 / 99 / 99 against 95 / 98 / 95, LCP about 2.0 s for both; desktop 100 for both; accessibility, SEO and best practices 100; CLS 0.
- Main bundle `index` is 77.6 KB gzipped, unchanged by the category (budget 110 KB).

**Found and fixed.** The sidebar search placeholder "Gigantus V2, QcK Heavy" was cut off; it is now "Gigantus V2, QcK".

**Rows are listings.** Like mice, the list shows one row per listing (5,458 rows for 3,432 models); the model page groups the family. This is the existing catalogue behaviour, not a mousepad choice.

**Workflows.** `--category mousepad` was added to both `scrape-peripherals.yml` jobs and `--skip-category mousepad` to both `scrape-shops.yml` commands. `scripts/checks/test_workflows.py` expected exactly three peripheral categories and now expects four. No timeout was changed and no workflow was run. Trial times per source (parallel, one category): BestPrice 412 s, Skroutz 295 s, Snif 143 s, Shopflix 66 s, e-shop.gr 48 s. The four shops add about 7 minutes to the peripherals job; Skroutz adds about 5 minutes to `scrape.yml`, which scrapes every category.

**Not done (Phase 5).** Product photos (the images job needs the category's `image_urls.json` first), the owner's go-ahead to enable and publish, and the first scheduled scrape on GitHub.
