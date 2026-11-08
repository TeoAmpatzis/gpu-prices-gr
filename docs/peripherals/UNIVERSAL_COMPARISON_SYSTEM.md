# Universal comparison system (DRAFT for owner approval)

Status: planning only. **Read PLAN_RECONCILIATION.md first: it overrides this document on compare references (exact `bd1:` selections), tray limits (4 per category, 3 groups), hide-identical, and the storage key `bdCompare:v1`.** Legend: **[V]** verified in repo/live site, **[A]** assumption, **[P]** proposal.

## 1. Starting point [V]
- No comparison feature exists. `/compare` is reserved, deferred to v2.1 by the owner (`docs/v2-backlog.md` #12); `nav.ts` lists Σύγκριση only when its page exists. This plan is the "v2.1 compare", now widened to monitors.
- Spec knowledge today is **formatted text**: `src/ui/specs.ts` (`SPECS`, `specGroups`) returns `{label, value}` strings per category; `keySpecs.ts` picks table columns; filters use per-category `extraFilters` with `test()` (`categories.tsx`, `categoryRules.ts`). A missing value is left out of a spec group, not shown as "—" (`SpecGroups.tsx`).
- Prices: `offers.ts` (`offerTotal`, `sortOffers`, `isUnusual`), `data.ts` (`ownTotal`, `formatPrice`, `timeAgo`), `PriceCell.tsx` (`isStale`). A model carries `cheapest` and `listings`.
- A model page resolves moved (alias) and removed models (`modelData.ts`, `ModelPage`).
- Storage in the browser is limited to documented localStorage keys; the privacy text must list any new one and `PRIVACY_UPDATED` change (`src/shell/site.ts`, CLAUDE.md).
- No dependency is needed: nothing here requires a library.

## 2. Architecture [P]

### 2.1 Data-driven definitions, generic engine (brainstorm Q3)
Recommendation: **definitions are plain TypeScript data objects; the engine is generic code with no category names in it.** A JSON file is not needed because definitions contain small functions (`get`), and tests/types give the safety JSON would lack. Pure category-specific logic per category was rejected: it re-creates today's problem (nine copies).

```
SpecDef {
  id         'refresh'                    stable key; also used for filters/URL where applicable
  group      'display'|'image'|'gaming'|'connectivity'|'physical'|'other'   (category lists its own groups)
  label      Text {el,en}
  kind       'number' | 'enum' | 'bool' | 'set' | 'text'
  unit       'Hz' | 'in' | 'mm' | 'W' | 'GB' …          (display unit; canonical unit stored)
  get        (m: Model) => SpecValue                    reads listing fields; never invents
  format     (v, lang) => string
  equal      (a, b) => boolean                          default by kind; overridable (synonyms)
  rank       null | 'higher' | 'lower'                  default null (see 2.4)
  tier       'key' | 'detail'                           key = always visible, detail = collapsible
}
SpecValue = { state: 'stated' | 'conflict' | 'unknown', v?: number|string|boolean|string[] }
```
Each category supplies `SpecDef[]` (monitor natively; existing nine via an adapter, 2.2). The same list feeds the product page spec groups, the monitor filters and the comparison table, so a spec is defined once.

### 2.2 Existing nine categories (decision D4) [P]
- **Option A (recommended for first release):** adapter over today's `specGroups(cat, listings, lang)` strings. Rows = union of labels of the compared products, in the first product's order; a product missing a label shows "—". "Differs" = string inequality. No ranking. Cheap, no change to existing categories, honest about what the data states.
- **Option B:** typed `SpecDef`s for every existing category. Better diff (units, tolerances, "best") but ~9 categories × ~10 fields of new, unit-tested definitions; touches code the builder also reads. Deferred; can be done one category at a time later without changing the engine.
Monitors are native `SpecDef` from day 1 (they are new, so no rework).

### 2.3 Comparison engine [P]
Pure functions in `src/lib/compare/` (new, lazy chunk):
- `buildTable(cat, models, defs, lang) → { rows: Row[], summary }` where `Row = { def, cells: SpecValue[], differs: boolean, allUnknown: boolean }`.
- `differs`: values compared with `def.equal`; `unknown` vs `stated` counts as a difference, but two `unknown`s do not.
- `hideIdentical` filter: removes rows where all cells are `stated` and equal, or all unknown.
- `priceRows(models) → Row[]` built on `offers.ts` (see 5).
No server API: this is a static site; "API" means this module's functions plus the URL contract in 4.

### 2.4 Ranking, "better", highlights [P]
Default: **highlight differences only, never rank.** A cell is marked "differs", not "best". `rank` is set only where a direction is objective for the buyer and the unit is the same kind: price, shipping, delivered total (lower), and later maybe refresh rate/brightness with a visible "higher = more" note, off by default. Never ranked: panel type, HDR labels, adaptive-sync brand, ports lists, size, resolution, color gamut standards, response time across `GtG` vs `MPRT` (not comparable; shown with its kind and not diffed against the other kind). No benchmark or "gaming score" is invented.

## 3. UI workflows [P]
Follow `src/ui/` tokens, dark only, 44 px tap targets on touch, EL/EN via `Text`.

1. **Add-to-compare control**: a checkbox-style toggle "Compare" on each product row/card (`ModelRow`/`ModelCard`) and a button on the product page header (`ProductHeader`). Disabled with a tooltip when the tray is full. Not shown for a category with no `SpecDef`s.
2. **Tray**: a sticky bar at the bottom of the viewport (above the footer, never covering the builder's phone summary bar: on `/builder` the tray is hidden) listing selected products (photo + name + remove ×), a "Compare (N)" button, "Clear". Appears when ≥1 selected; one line on phones with a count and thumbnails.
3. **Page** `/compare`: header with category name, "Share link", "Clear".
4. **Table (desktop ≥1024 px)**: first column = spec labels (sticky), one column per product, product header cell with photo, name, cheapest price, "Remove" and "Replace" (opens a category-restricted search). Groups collapsible; `tier:'detail'` rows start collapsed.
5. **Highlighted differences**: a differing row gets a subtle token background and a marker (not colour alone: icon + text for accessibility, as the contrast rules require).
6. **"Hide identical specifications"** toggle (default off; state in URL `?diff=1`).
7. **Remove / replace**: remove updates tray and URL; replace swaps one slot.
8. **Merchant and price block** at the top of the table (see 5).
9. **Phones (<1024 px)**: the label column stays sticky and products scroll sideways with scroll-snap, two visible at a time; or, below 480 px, a per-spec vertical list ("Refresh rate: A 165 Hz · B 144 Hz") with the same highlight. Max products kept equal to desktop so the URL means one thing.

### 3.1 Maximum products [P]
**4.** Reasoning: four columns fit 1280 px with a 17 rem label column; the BuildDraft PC part tables are already dense; more columns force horizontal scroll on desktop. Phones show two at a time. PCPartPicker-style tools commonly allow a small handful [A]; not verified.

### 3.2 Tray scope: one category or several (decision D3)
| Option | Behaviour | For | Against |
|---|---|---|---|
| A. One category at a time | Adding from another category asks "Start a new comparison? (clears Monitors)" | simplest; never a misleading table | people comparing a GPU and a monitor shop lose the first list |
| **B. Several groups, one visible (recommended)** | Selections kept per category; tray shows category tabs only when ≥2 non-empty; `/compare?cat=…` shows one group | nothing lost; no cross-category table | slightly more state and UI |
| C. One mixed table | Everything in one table | one place | rejected: GPU vs monitor rows are meaningless |
Cross-category rule for all options: **a technical table is built per category only.** Price rows could be shown across categories but are not in scope.

## 4. State and persistence [P]
- **localStorage key `compare`** (new): `{ v: 1, groups: { monitor: ['lg-27gr95qe-b', …], gpu: […] } }` (slugs, not objects). Reads/writes wrapped in try/catch; page works without it. Add to the privacy policy list and bump `PRIVACY_UPDATED` in the same change (CLAUDE.md rule).
- **URL is the sharable truth**: `/compare?cat=monitor&m=slug1,slug2,slug3&diff=1`. Opening a link renders from the URL without touching the saved tray (like the builder's shared link behaviour [V: CLAUDE.md "Review / share"]); a "Save to my tray" action copies it in.
- Slugs validated against `/data/<cat>/list.json` chunks; unknown/removed slug → placeholder column "This product is no longer listed" with remove; alias slugs resolve to the canonical one (`slugLookup`, `modelData.ts` [V]).
- Max 4 enforced on read and on write (extra slugs ignored).
- Cross-tab sync via the `storage` event (small).
- Add a `/compare` entry to `routes.ts` (`Route` kind `compare`), `APP_SEGMENTS`, `vercel.json` rewrite (test-checked by `routes.test.ts`), sitemap exclusion (`sitemap.ts`: compare pages are not indexable; `noindex` meta via `pageMeta.ts`).

## 5. Pricing comparison [P] (reuse, no new maths)
Rows, per product: lowest listed price (`model.cheapest.price`), shipping and delivered total (`ownTotal`/`offerTotal`, unknown stays "unknown"), merchant of the lowest delivered total, number of shops, availability (offers exist), freshness (`timeAgo`/`isStale` from the category's source times in the manifest), deal badges (`dealPct`, `lowestSince`). Rule: a row that differs because one shipping cost is unknown shows "unknown", and the delivered-total "winner" marker is shown only when both totals are known. `isUnusual` offers keep their warning. Nothing is recalculated in the compare module.

## 6. Handling of difficult data [P]
| Case | Behaviour |
|---|---|
| Different units (in vs cm, W vs kW, GB vs TB) | each `SpecDef` stores a canonical unit; `get` converts; display unit by language/locale convention |
| Missing spec | `unknown` cell "—" with tooltip "not stated by the shops"; never filled in |
| Equivalent terms | `equal` uses a synonym table per def (e.g. `FreeSync Premium` ⊃ `FreeSync`: shown as different but with a "includes" note; `HDMI 2.1` vs `HDMI 2.1a`: equal for the `hdmi` set only if the def says so) |
| Conflicting data | `conflict` state; cell shows both values with a "sources disagree" tag |
| Product variants (size/Hz/capacity) | different models; "Variants" of the same family offered on the product page, and "Replace with a variant" in the compare header |
| Booleans | tri-state: yes / no / unknown; "no" only if a source says no (as `biosFlashback: null = not stated` [V]) |
| Numbers | compared exactly after unit conversion; tolerance only where the def sets one (e.g. dimensions ±1 mm) |
| Non-rankable | only "differs" |
| Category with <2 products in tray | "Add one more product" state |
| Products from different categories | impossible in one table (3.2) |

## 7. Performance and delivery [P]
Lazy-loaded `compare` chunk (like Builder and PriceChart [V: `React.lazy` use]); tray bundle small and loaded with the first category page only when the first "Compare" is pressed (no first-paint cost, respects the paint-order rule in CLAUDE.md). The compare page loads the category's existing `list.json` (browser-cached) and per-model detail on demand. No new network calls at load.

## 8. Tests [P]
Unit: engine (`buildTable`, `differs`, `hideIdentical`), each `SpecDef` `get/format/equal` with golden inputs (unit conversion, unknown vs stated, conflicts), tray reducer (add, remove, max 4, category switch, persistence read/write with corrupt data), URL encode/decode round trip, slug validation, `routes.test.ts` additions. Component: tray, toggle, table highlight (accessible marker). E2E (Playwright): add 2 monitors → tray → compare page → diff highlight → hide identical → remove → share link opens the same table → removed-product placeholder; GPU vs monitor cannot mix; 360 px layout audit; EL/EN; keyboard operation. Regression: all category pages unchanged (e2e `catalogue`, `filters`, `facets`), no change in first-load bytes on category pages (bundle check), privacy page lists `compare`.
Acceptance criteria: IMPLEMENTATION_ROADMAP.md Phase 4.
