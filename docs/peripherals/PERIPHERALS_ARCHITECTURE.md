# Peripherals architecture (DRAFT for owner approval)

Status: planning only. No application code was changed. Written 2026-11-08 against branch `design/deals-rework` (origin/main 8f2b3ba at the last check).

Legend used in every document of this set:
- **[V]** verified: read in the repository or seen on the live site in this session (file given).
- **[A]** assumption: reasonable, not verified.
- **[P]** proposal: a recommendation, not a fact.

## 1. What exists today (findings)

### 1.1 There is no database and no backend [V]
The prompt speaks of databases and migrations. The platform has neither. It is a static-edge site:
- Python scrapers run on GitHub Actions and commit JSON per category to `public/data/<cat>/` (`latest.json`, `history.json`, `offers.json`, `specs.json`, `image_urls.json`) (CLAUDE.md "Data flow", `scraper/main.py`).
- The Vercel build derives smaller files (`list.json`, `detail.json`, `builder.json`, `manifest.json`, `search.json`) from them and refuses broken data (`vite-plugin-data.ts`, `src/lib/derive.ts` `checkData`, `MAX_DROP`, `MIN_MODELS`).
- Photos live in a separate repo, `TeoAmpatzis/builddraft-images` (GitHub Pages), served through a Vercel rewrite `/img/*`.

So in this plan "database schema" means: the JSON file shapes, the Python dataclasses that write them, the TypeScript types that read them, and the build-time derived files. "Migration" means a versioned change to those shapes plus a rule for old data (see ROADMAP).

### 1.2 Categories are a closed list repeated in many places [V]
There is no registry. The same nine ids (`gpu cpu mobo ram storage psu case fan cooler`) are written out by hand:

| Place | Evidence |
|---|---|
| TS union `Category` | `src/types.ts:5` |
| Route list and URL rules | `src/lib/routes.ts:7` `CATEGORY_LIST`, `APP_SEGMENTS` |
| Vercel rewrites (regex of ids) | `vercel.json` (two rewrite rules); checked by `tests/unit/routes.test.ts` |
| Menu groups, names, icons, search words | `src/shell/nav.ts` `CATS`, `GROUPS` |
| Page config (filters, columns, sort, value) | `src/lib/categories.tsx`, `src/lib/categoryRules.ts` |
| Spec line and spec groups | `src/ui/specs.ts` (`SPECS: { [C in Category]: … }`), `src/components/product/keySpecs.ts` `FILL` |
| Data-check floors | `src/lib/derive.ts:729` `MIN_MODELS: Record<Category, number>` |
| Scraper registry | `scraper/categories.py:52` `CATEGORIES` |
| Two more hand-written Python lists | `scraper/glitches.py:48`, `scraper/merge_history.py:34` (`images.py` imports `CATEGORIES`) |
| Workflow gate "nine fresh Skroutz categories" | `.github/workflows/scrape.yml:138` |

Counts: 60 files under `src/` import `Category`; 21 use `Record<Category,…>` or `[C in Category]`. This is a safety net as well as a cost: add an id to the union and `tsc` lists every place that must change.

### 1.3 The builder is a separate, narrower concept [V]
`Slot` (`src/lib/slots.ts:7`) is its own union of the same nine names. The compatibility engine (`src/engine/`, 30 rules, `CATEGORY_RULE_SLOTS`, `PART_FIELDS`) reads only slots. Adding a category to `Category` does not touch the engine unless it is also added to `Slot`. `PART_FIELDS.gpu` has no display-port fields, so GPU-to-monitor checks have no data today.

### 1.4 What each category supplies today [V]
Per category the code supplies, by hand: a Python dataclass (`scraper/models.py`), a `normalize_<cat>.py`, a `Category(...)` entry (source paths, `model_key`, shared fields), a `CategoryConfig` (title, pills, `extraFilters`, columns, sort, value), a spec-line function, spec groups, a key-spec fill list, builder slot rules (components only), `MIN_MODELS`, nav entry, rewrite rule.

### 1.5 Pricing, offers, identity are already category-agnostic [V]
- Per-listing best price + delivery: `scraper/shipping.py`, cache `offers.json`; browser side `src/lib/offers.ts`, `data.ts` `ownTotal`.
- Deals, all-time low, history: `src/lib/deals.ts`, `dips.ts`, `scraper/site_history.py`.
- Model identity: per-category `model_key` (Python, mirrored in TS), aliases (`scraper/model_aliases.json`, `src/data/modelAliases.ts`), slugs (`src/lib/slug.ts` `modelSlug`), storage's part-number `settle()` (`scraper/normalize_storage.py`).
- Product page: `src/components/product/` (`ModelPage`, `OffersTable`, `PriceHistory`, `SpecGroups`, `Variants`, `Alternatives`, `BuildFit`).
- Search: build-time `search.json` (`src/lib/search.ts`).

### 1.6 There is no comparison feature [V]
Grep for a compare tray, page or button finds nothing. Backlog item #12 (`docs/v2-backlog.md`) reserves `/compare` for v2.1; `src/shell/nav.ts` says Σύγκριση is not listed until its page exists. So this plan builds it, it does not extend it.

### 1.7 Navigation and look today [V, live site seen 2026-11-08]
Header: logo, "Parts" mega menu (two groups from `nav.ts` `GROUPS`: "Core parts", "Case, power and cooling"), global search, "PC Builder" button, EL/EN toggle. Dark only, indigo accent, tokens in `src/ui/tokens.css`. Category pages use the shared `CategoryView` (filter sidebar, deferred facet counts, bottom sheet below 1024 px). Footer: sources line, About/Contact/Privacy. Privacy text lists every localStorage key (`theme`, `lang`, `pcBuild`…) and must stay true (CLAUDE.md).

## 2. Limitations to address before adding monitors

1. **Closed category list in ~10 hand-written places** (1.2). Adding monitors by copying nine more edits works once; it will not work for keyboards, mice, headsets.
2. **Spec knowledge is formatted strings, not typed values.** `ui/specs.ts` and `specGroups` return display text. Filters use per-category `extraFilters` with `test()` functions. Nothing exposes "refresh rate = 165 (number, Hz)" to a generic engine. A comparison engine needs typed values.
3. **`Category` mixes two things**: "has a catalogue page" and "is a builder slot". Peripherals are the first category that is the former only.
4. **Workflow and data-check gates assume nine** (`scrape.yml:138`, `MIN_MODELS`).
5. **Skroutz is the fragile source** (runs through WARP, circuit breaker, no new product-page reads without an owner-approved budget; `specs.PAUSED`). A new category adds Skroutz list requests. This is an owner decision (ARCHITECTURE_DECISIONS D2).

## 3. Recommended structure

### 3.1 Domain is a grouping in config, not a database parent [P]
Answer to brainstorm question 1: **navigation + config grouping, not a data-level parent.** Reason: data is already stored per category (`public/data/<cat>/`); a parent level would add a layer nothing reads. A `domain` field on the category definition gives everything the UI needs (menus, breadcrumbs, compare rules, builder eligibility).

Conceptual hierarchy: `domain → category → model (grouped listings) → specs → offers`. Models and offers already work this way [V]; only `domain` is new.

### 3.2 One category registry (small, data-driven, in code) [P]
A `CategoryDef` per category, in TypeScript, with the Python side reading the shared parts it needs. Not a plugin system. Fields:

```
id            'monitor'                      // also the URL segment and data folder (owner rule 2026-10-04)
domain        'components' | 'peripherals'
name/one      Text {el,en}                   // as nav.ts Section today
icon, words   lucide icon, search words
builderSlot   Slot | null                    // null for peripherals
specs         SpecDef[]                      // typed fields: see MONITOR_INTEGRATION_PLAN / UNIVERSAL_COMPARISON_SYSTEM
filters       derived from SpecDef flags + a few custom
compare       derived from SpecDef flags
minModels     number                         // replaces the MIN_MODELS entry
```

Python keeps `scraper/categories.py` `CATEGORIES` as its registry and becomes the **single** list (glitches, merge_history import it instead of repeating it) [P, small prerequisite refactor].

Existing nine categories are **not rewritten** at first. They get a `CategoryDef` stub (domain `components`, existing config referenced) so the generic pieces (menu, compare, sitemap) can iterate one list. Their filters/columns stay in `categories.tsx`.

### 3.3 Type split limits the blast radius [P, to be proven by a spike in Phase 1]
```
ComponentCategory  = 'gpu'|'cpu'|…|'cooler'    // today's nine; Slot, engine, builder, FILL, rules stay keyed by this
PeripheralCategory = 'monitor'                 // grows later
Category = ComponentCategory | PeripheralCategory
```
`Record<ComponentCategory,…>` places (builder, rules, `FILL`) need no monitor entry. Generic places (routes, manifest, list loader, model page, search, sitemap, home) widen to `Category`. Which of the 21 `Record<Category>` files are generic vs component-only is **not yet classified**; Phase 1 starts with that classification.

### 3.4 URLs [P, decision D1]
Existing rule: URL segment = category id; `/ram`, `/gpu/rtx-5070-12gb` (`routes.ts`). Recommended: `/monitor` and `/monitor/<slug>` by adding `monitor` to `CATEGORY_LIST` (generic code already handles it), and **no** `/peripherals/monitor` nesting. The domain shows in the menu and breadcrumbs ("Home › Peripherals › Monitors"), not in the path. Tradeoff: nested paths express hierarchy and could host a `/peripherals` landing, but need a second route shape, new rewrites, redirect rules and sitemap logic. A `/peripherals` landing page is deferred until a second peripheral exists (an index with one tile is misleading). Vercel rewrites become generated from the registry or at least test-checked (`routes.test.ts` already checks them).

### 3.5 Reuse map

| Need | Reuse as is | Extend | New |
|---|---|---|---|
| Source fetching | `sources/*.py` take a `Category` | monitor paths/ids per source | `normalize_monitor.py`, `MonitorListing` |
| Dedup / identity | key + aliases + slug machinery | monitor `model_key` | monitor settle rules |
| Price, shipping, history, deals | all | nothing | nothing |
| Photos | `images.py` (imports `CATEGORIES`) | nothing | storage-size check (risk) |
| Category page | `CategoryView`, `FilterBar`, facets | `CategoryConfig` for monitor | monitor filters/columns |
| Product page | `ModelPage`, offers, history | `SpecGroups` for monitor | monitor key specs |
| Search | `search.json` | include monitor | domain label |
| Nav | `Header`, `MegaMenu` | second group "Peripherals" | |
| Builder / engine | unchanged | none in v1 | none (Phase 5 optional) |
| Compare | | | whole engine, tray, page |

### 3.6 Future categories (keyboards, mice, headsets…)
Adding one = one `CategoryDef` + one Python `Category` / `normalize_<cat>.py` / dataclass + source paths + SpecDefs + a spec line. No new comparison engine, no new page code. The checklist is in IMPLEMENTATION_ROADMAP "Adding a category".

## 4. Navigation [P]
- Mega menu gets a second section **Peripherals** with one item, Monitors, beside the Components groups. Label the existing section "PC Components" in the menu (today the button says "Parts").
- Mobile: the `/parts` tile page lists the two domains as two headings.
- Do not render empty future categories. Menu items come from the registry filtered by "has data" (manifest models > 0).
- Breadcrumb: Home › Peripherals › Monitors (`PageTitle`/breadcrumbs use registry `domain`).
- Add a "Compare" link only once `/compare` exists (matches the owner's 2026-10-04 rule in `nav.ts`).
- Search results show a domain tag when the hit is a peripheral.

## 5. Decisions recorded in ARCHITECTURE_DECISIONS.md
D1 URL shape · D2 Skroutz for monitors at launch · D3 tray scope · D4 comparison for the existing nine · D5 monitor spec depth · D6 Peripherals landing page · D7 builder integration · D8 registry scope.

## 6. Technical uncertainties
- Which `Record<Category>` files are generic vs component-only (unclassified).
- Monitor category ids/paths and volumes on the five sources: **not verified** (a guessed BestPrice URL answered 403 to the headless browser; no scraper request was made; no evasion attempted).
- Competitor and PCPartPicker interfaces: **not verified** (PCPartPicker answered 403; search returned no usable pages). Any statement about them in these documents is general recollection, marked [A].
- Photo repo size headroom (GitHub Pages) after adding monitors: not measured.
- Scrape duration with a 10th category: not measured (Skroutz 9 categories ≈ 12 min through WARP, from the `scrape.yml` comment).
