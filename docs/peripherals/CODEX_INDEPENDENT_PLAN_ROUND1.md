[V] Repository references below identify inspected code or reference-sheet content. [A] identifies an assumption or unresolved fact. [P] identifies a proposed design, rule, or acceptance criterion.

## 1) Existing architecture findings and limitations

[V] The catalog contains exactly nine categories: GPU, CPU, motherboard, RAM, storage, PSU, case, fan, and cooler. Builder slots contain those same categories, although their ordering differs. (`src/types.ts:5`, `src/lib/routes.ts:7`, `src/lib/slots.ts:6`)

[V] Persistence is static JSON, with no database in this data path. Python writes per-category snapshots, history, and enrichment caches; Vite reads these and emits compact lists, product chunks, search, manifest, and builder files. Raw scraper files are pruned from production output. (`scraper/main.py:234`, `vite-plugin-data.ts:45`, `vite-plugin-data.ts:99`, `vite-plugin-data.ts:176`)

[V] Existing reusable infrastructure includes:

- Category-aware source adapters, normalization hooks, and settlement hooks. (`scraper/categories.py:18`)
- Retention of previous listings when a source fails. (`scraper/main.py:281`)
- Shipping enrichment and cached merchant totals. (`scraper/shipping.py:118`)
- Listing-level filtering, sorting, pagination, and exact source selection. (`src/lib/catalogueFilters.ts:60`, `src/lib/productSelection.ts:8`)
- Facet workers with sliced main-thread fallback. (`src/lib/facetsClient.ts:1`)
- Product pages, offer tables, history, images, aliases, and build-version checks. (`src/components/product/ModelPage.tsx:34`, `src/lib/modelData.ts:46`)
- Shared bilingual strings, dark-mode tokens, and responsive UI. (`src/ui/strings.ts`, `src/ui/tokens.css`, `tests/unit/tokens.test.ts:31`)

[V] Catalog “models” are not consistently exact retail products. GPUs group by chip and VRAM; RAM groups by kit specifications and form factor across manufacturers; PSUs group by wattage/efficiency/form factor. Current catalog presentation expands families into individual source listings. (`src/lib/categoryRules.ts:171`, `src/lib/categoryRules.ts:258`, `src/lib/categoryRules.ts:293`, `src/lib/catalogueProducts.ts:13`)

[P] Consequently, comparison identity must distinguish **family, exact product variant, and source listing**. Comparing two GPU families cannot safely compare card dimensions; comparing RAM families cannot safely attribute a particular manufacturer’s specifications.

[V] Category configuration already exists, split between pure filtering rules and React display configuration. Category IDs additionally appear in routes, navigation, ranking, specifications, validation, and builder mappings. (`src/lib/categoryRules.ts:39`, `src/lib/categories.tsx:59`, `src/shell/nav.ts:17`, `src/lib/ranking.ts:39`)

[V] The strongest coupling is `SLOT_OF: Record<Category, Slot>`. Category pages also accept `pick=1`; product pages conditionally activate builder fit through `entry.parts`. (`src/lib/pick.ts:11`, `src/components/CategoryView.tsx:101`, `src/components/product/ModelPage.tsx:115`)

[P] Fix that boundary before exposing monitors. Adding a catalog category must not require adding a compatibility-engine category.

[V] Generic enrichment is unsuitable for sophisticated monitor facts: `share_fields` can propagate any `true`, uses majority values for selected nullable booleans, and treats lists as case-fan structures. UI spec aggregation also uses most-common values. (`scraper/main.py:50`, `src/ui/specs.ts:28`)

[V] Availability support exists in presentation, but `availabilityOf` explicitly documents that sources do not yet collect the field. Price freshness uses source timestamps; shipping-cache entries have separate `checked` timestamps that are not represented in `BaseListing`. (`src/lib/offers.ts:56`, `src/lib/offers.ts:68`, `scraper/shipping.py:113`, `src/types.ts:10`)

[V] Current workflows supersede parts of `CLAUDE.md`: Skroutz runs separately twice daily with shipping/spec collection disabled; other sources run every six hours. The Skroutz workflow says enrichment paths are robots-disallowed, while `history.yml` still schedules imports. (`.github/workflows/scrape.yml:3`, `.github/workflows/scrape.yml:98`, `.github/workflows/scrape-shops.yml:7`, `.github/workflows/history.yml:78`)

[P] Treat that inconsistency as an access-policy issue to resolve before extending collection. Existing execution does not establish permission.

## 2) Recommended Peripherals architecture

### Hierarchy and registry

[P] Use this conceptual hierarchy:

**navigation domain → category → exact product variant → specifications and source listings → observed offers**

[P] Domain should be a small category metadata attribute, initially `components | peripherals`. It should control navigation, breadcrumbs, and search grouping; it should not become a new storage partition, ingestion pipeline, pricing namespace, or engine input.

[P] Keep `/data/<category>/…` storage. Moving everything to `/data/components/...` would add migration cost without improving product identity or pricing.

[P] Introduce a small, import-light catalog registry containing:

| [P] Property | [P] Purpose |
|---|---|
| `id` | Stable category identifier |
| `domain` | Components or peripherals |
| `name`, `singular`, `searchWords` | Greek/English navigation and discovery |
| `builderSlot?` | Explicit optional builder capability |
| `enabled` / publication policy | Staged availability |
| Definition references | Filters, display specs, comparison definitions |

[P] Extend the existing configuration rather than building a plugin framework. Keep executable predicates and formatters in TypeScript; keep Python’s source configuration in Python. Test their category IDs and identity fixtures for agreement instead of introducing cross-language code generation.

[P] Add only `monitor`. Do not register keyboards, mice, headsets, speakers, or webcams until implementation begins.

[P] Preserve `Slot` and engine `PartCategory` unchanged. Replace total category-to-slot assumptions with an optional lookup and type guard. Reject or remove monitor `pick=1` before loading picker or compatibility code.

### Types and URLs

[P] Retain existing listing interfaces. Add `MonitorListing extends BaseListing`, with identity fields, an explicit product key, and typed `MonitorSpecs`. Keep `chip` as the existing common display-name adapter; do not rename every category’s field.

[P] Use `/monitor` and `/monitor/<slug>`, following existing category URLs. Add `/compare`. Preserve all existing URLs and legacy redirects.

[P] Update routes, Vercel rewrites, metadata, sitemap generation, prefetch recognition, search, and publication checks together. Existing route tests already verify rewrite coverage and disabled v2 deployments. (`src/lib/routes.ts`, `src/lib/data.ts:95`, `tests/unit/routes.test.ts:64`)

### Navigation and discovery

[P] Desktop navigation should expose **«Εξαρτήματα PC / PC Components»**, **«Περιφερειακά / Peripherals»**, and PC Builder. Components retain their existing category menu; Peripherals initially links directly to monitors, visibly labelled **«Οθόνες / Monitors»**.

[P] Keep `/parts` as the components index. Skip a peripheral landing page initially: a one-card intermediary adds a click without helping selection. Add a landing when several implemented categories or useful cross-category content justify it.

[P] On mobile, provide a compact catalog navigation sheet with separate Components and Peripherals groups, plus Builder and Comparison. Reuse existing overlay, focus, button, and token patterns.

[P] Breadcrumbs should show Home → Peripherals → Monitors → Product. The domain label can be noninteractive until a domain landing exists.

[P] Global search should include monitors by default, retain category filtering, and optionally narrow by domain. Include model codes, approved aliases, and manufacturer names; derive domain membership from category metadata.

[P] Every new label, error, accessible name, tooltip, plural, and empty state must have Greek and English text. Reuse the existing dark-only visual identity.

## 3) Monitor model, collection, matching, filters, and product page

### Contract and evidence

[P] Require valid source identity, title, URL, positive EUR price, observation time, manufacturer/model identity, and a deterministic product key for publication. Technical completeness is a launch-quality gate, not a reason to fabricate fields.

[P] Represent unknown technical facts as `null` or absent. Distinguish explicit `false`, unknown, conflict, and not applicable.

[P] “Verified” must describe evidence, not imply independent laboratory measurement. Use field states such as `stated`, `corroborated`, `derived`, `conflict`, and `unknown`, with identity-specific source references.

| [P] Group | [P] Fields and canonical representation | [P] Requirement/evidence rule |
|---|---|---|
| Identity | Manufacturer, exact model code, MPNs, GTINs, revision, region, approved aliases | Identity required; identifiers nullable individually |
| Display | Diagonal inches; width/height pixels; reduced aspect ratio | Core coverage target; aspect may be derived from pixels |
| Panel | IPS/VA/TN/OLED family; subtype such as QD-OLED separately | Core coverage; no inference from marketing names alone |
| Refresh | Native Hz; overclock Hz; mode and input restrictions | Core coverage; preserve dual-resolution modes |
| Response | Milliseconds, GtG/MPRT method, overdrive/measurement context | Optional; incomparable methods remain separate |
| Shape/density | Flat/curved; curvature radius mm; PPI | Optional; PPI derived only from known pixels and diagonal |
| Brightness/contrast | Typical SDR and peak HDR cd/m²; test window; static contrast ratio or explicit infinite state | Optional; never encode JSON `Infinity` |
| HDR/dimming | HDR input formats, certification, backlight type, local-dimming presence and zones | Optional; HDR acceptance is distinct from certification |
| Colour | Gamut standard; coverage versus volume; percentage; native bits; FRC; stated ΔE and method | Optional; retain measurement context |
| Gaming | Adaptive-sync support; FreeSync tier; G-SYNC status; VRR min/max by input/mode | Optional; certification distinct from advertised compatibility |
| Video connections | Port type, count, version, stated capabilities, DSC, supported modes | Optional; unknown version is not “latest” |
| USB/docking | USB-C data/video roles, DP Alt Mode, PD watts/direction, Thunderbolt version, hub, upstream ports, KVM | Optional; a USB-C connector proves none of the other capabilities |
| Physical | VESA patterns; height/tilt/swivel/pivot; dimensions and mass with/without stand | Optional; explicit units and configuration |
| Power | Typical/max/standby watts; supply type; optional energy-label reference | Optional; consumption separate from PD output |
| Other | Speakers, audio out, warranty duration/region/provider, OLED burn-in coverage and exclusions | Optional; burn-in terms require explicit documentary evidence |

[P] Preserve raw values, source URL, source product identifier, collection time, parser version, and normalization result in a monitor evidence cache. Publish only the selected evidence and concise provenance needed by product pages; keep the full evidence archive out of list payloads.

[P] Normalize Greek decimal commas, inch symbols, `×`/`x`, kHz/Hz where applicable, mm/cm, kg/g, and resolution aliases. Map “Full HD” only when unambiguous; do not treat “2K”, “1 ms”, or “HDR” as complete technical specifications.

[P] Keep panel subtypes, gamut coverage/volume, native/FRC bit depth, response methods, and SDR/HDR brightness separate. A normalized value without its context can be misleading.

### JSON and collection

[P] Extend the existing snapshot shape additively. The following is a structural example, with placeholders rather than invented product specifications:

```text
public/data/monitor/latest.json
{
  updatedAt,
  sources,
  listings: [{
    ...existing common listing fields,
    productKey,
    identity: { modelCode, mpn, gtin, revision, region },
    specs: { display, image, gaming, connectivity, physical, other }
  }]
}

public/data/monitor/spec_evidence.json
{
  version,
  observations: {
    "<source-qualified listing>": {
      "<field path>": [{ raw, value, sourceUrl, checkedAt, parserVersion }]
    }
  }
}
```

[P] Keep one resolved value path; do not maintain independent nested and flat copies. Filter accessors read typed fields. Build-time derivation can project only list-relevant facts and retain richer facts in existing model chunks.

[P] Add monitor normalization and spec parsing behind `Category.make_listing`, source configurations, and the current collection coordinator. Reuse shipping, images, history accumulation, source failure handling, and data guards.

[P] Begin with sources whose permitted monitor listings and specification pages have been established. Add manufacturer evidence where allowed. Keep monitor Skroutz spec reads paused; do not expand shipping/history requests merely because a category was added.

[P] Add explicit per-source category capabilities. An unsupported source must not appear as a failed monitor scrape. Update source validation to check enabled source/category pairs; it currently iterates every registered category. (`scripts/checks/validate_skroutz.py:37`)

[P] Budget enrichment across hosts and runs, prioritizing core coverage and popular products. Do not repeatedly fetch pages because a manufacturer never publishes colour accuracy or burn-in terms.

### Identification and deduplication

[P] Matching should follow deterministic stages:

1. Normalize Unicode, case, spacing, manufacturer aliases, and known marketplace boilerplate while preserving original titles.
2. Extract full model codes, MPNs, GTINs, region/revision suffixes, and variant discriminators.
3. Match exact trustworthy identifiers, checking for contradictory specifications.
4. Match exact manufacturer/model variants only when discriminators agree.
5. Use fuzzy similarity solely to generate review candidates.
6. Leave unresolved listings separate or quarantine ambiguous identity.

[P] Never strip suffixes generically. Regional variants merge only with documented equivalence covering hardware, connectors, power accessories, and relevant warranty differences. Keep size, panel, refresh mode, connector, revision, and materially different bundle variants separate.

[P] Unknown discriminators cannot bridge two known variants. A listing with no refresh information must not merge 144 Hz and 165 Hz products transitively.

[P] Resolve identity before spec propagation. Prefer exact-variant manufacturer documentation, then specific source product evidence; human overrides require source, date, and reason. Copied marketplace descriptions do not count as independent corroboration.

[P] Preserve conflicting observations. If evidence cannot resolve a fact, publish `conflict` with no filterable resolved value. Do not use majority vote, maximum refresh, or “any true” as monitor truth.

[P] Make normalization and settlement idempotent. Key changes require explicit alias/history migration; ambiguous splits must not copy an old combined price history into every new variant.

### Listing, filters, sorting, and product page

[P] Reuse the current listing presentation and identify repeated source entries clearly. All prices and filters must refer to the displayed exact source product; verified identity permits shared product facts and aggregated offers.

[P] Primary filters: price range, manufacturer, diagonal range/buckets, resolution, refresh threshold, panel, aspect, curvature. Advanced filters: HDR certification, adaptive sync, HDMI/DP/USB-C, PD threshold, KVM, VESA, stand adjustment, local dimming.

[P] Reuse `extraFilters`, URL state, active chips, worker counts, and mobile drafts. Add typed range accessors where needed; current range configuration supports only one secondary measurement per category. (`src/lib/catalogueFilters.ts:12`)

[P] Strict feature filters exclude unknown/conflicting values. Offer explicit unknown inclusion where useful. Correct generic nullable-boolean semantics before reuse: current `yesNo` treats missing values as false; storage’s DRAM filter already uses explicit equality. (`src/lib/categoryRules.ts:141`, `src/lib/categoryRules.ts:439`)

[P] Retain existing price/source/deal sorting. Add refresh and diagonal sorting through category sort definitions, with unknowns last and deterministic ties. Default monitor ordering should be transparent popularity/offer coverage with price ties; defer speculative quality/value scores.

[P] Product pages reuse headers, photos, offers, history, variants, and error states. Add monitor spec groups, evidence details, exact variant identification, comparison actions, and explicit unknowns for essential missing facts. Show no builder-fit section.

## 4) Universal comparison design

### Engine and definitions

[P] Build a pure comparison module independent of `src/engine/`. It resolves selected products, reads normalized values, computes equality/differences, and returns presentation data. It performs no compatibility evaluation and no independent pricing calculation.

[P] Define rows in typed category configuration:

```text
row id, bilingual label, group, value accessor,
value kind, canonical unit, equality rule,
applicability, formatter, optional preference direction
```

[P] Keep configuration in code. JSON-only definitions would require an expression language for applicability, compound ports, and contextual equality.

[P] Incrementally share these accessors and formatters with product specifications. Do not compare localized display strings or scrape rendered cells. Existing spec rendering has several entry points that should consume common definitions gradually. (`src/ui/specs.ts`, `src/components/catalogue/specs.ts`, `src/components/product/keySpecs.ts`)

[P] Cover all ten categories. Examples include CPU socket/cores/TDP; GPU chip/VRAM/card dimensions; RAM capacity/modules/MT/s/CL; storage capacity/interface/read/write/endurance; PSU wattage/efficiency/modularity; motherboard interfaces; case clearances; cooler dimensions/support; fan size/pack/airflow; and monitor groups above.

### Exact selections and offers

[P] Use a comparison reference containing category, family key/slug, optional canonical product ID, and optional source-qualified selection. Reuse `productSelection` encoding.

[P] Cards add their exact listing. An exact monitor model page adds its canonical variant. A broad family page asks the user to select a product before comparing product-specific facts; do not silently select whichever listing is cheapest today.

[P] Initially, existing categories may compare source-selected products with only that source’s pricing. Aggregate additional sources only where product identity is established. RAM specification equivalence alone is insufficient to combine different branded kits.

[P] Share proven product-membership logic between builder offer selection and comparison through catalog utilities where appropriate, while retaining builder-specific variant rules. Current `offersFor` depends on engine-oriented product entries and should not become a monitor dependency. (`src/lib/builderOffers.ts:30`)

### Tray, page, and mobile

[P] Recommend **four items per category**, with **three category groups/twelve references total**. Keep one active group. Adding a CPU preserves saved GPU choices; it never creates a mixed technical table.

[P] Multi-group storage supports shopping across categories but adds tray complexity. Limit the collapsed tray to active-group thumbnails/count, Compare, and group switching. At capacity, require explicit remove/replace; never evict silently.

[P] Add **«Σύγκριση / Compare»** toggles on cards and product headers, a persistent tray, and `/compare`. Provide remove, replace, clear-group, highlighted differences, and **«Απόκρυψη ίδιων / Hide identical»**.

[P] On desktop, use sticky product headers and row labels. On mobile, show two selected columns with a product selector for the remaining items; allow scrolling inside the table region. Keep row alignment, accessible headings, keyboard operation, and visible difference markers.

[P] Coordinate the tray with the builder’s bottom summary through one shell-level offset/overlay policy. Do not stack fixed controls over purchasing actions.

### Persistence, URL, and edge cases

[P] Store versioned references and harmless display snapshots in `bdCompare:v1`, separate from `pcBuild`. Handle unavailable storage, malformed JSON, migrations, and cross-tab changes. Cached prices must not be treated as current.

[P] Share only the active group through a bounded URL, for example `/compare?v=1&cat=monitor&items=...`. Validate category, item count, identifier length, and duplicate parameters. Viewing a shared comparison must not overwrite the visitor’s saved groups automatically.

[P] Load selected model chunks using one manifest version; deduplicate requests and reject mixed builds. On deployment mismatch, offer one coherent refresh; on individual failure, retain other columns and provide retry/remove.

[P] Equality operates on canonical values: normalized numbers, explicit booleans, sorted sets, and structured port capabilities. Preserve differences in measurement method, confidence, and applicability. Unknown versus false differs; two unknowns are “both unknown”, not evidence of equality.

[P] Hide-identical removes only fully known equivalent technical rows by default. Keep identity and pricing visible. Unknown/conflicting rows remain visible, with an optional separate control to hide rows unknown everywhere.

[P] Highlight differences neutrally. Higher refresh, larger size, lower response claims, OLED versus IPS, socket names, and connector counts do not establish an overall winner. Do not generate benchmark claims.

### Pricing rows

[P] Extract or expose one shared offer-summary utility used by comparison and product UI. Reuse `ownTotal`, `offerTotal`, `sortOffers`, availability, and freshness rules. (`src/lib/data.ts:62`, `src/lib/offers.ts:26`)

[P] Show item price, shipping, delivered total, merchant/source, availability, and observation time. Keep the cheapest item offer and cheapest known delivered offer distinct. Unknown shipping cannot be assumed free or establish a delivered-price winner.

[P] Add optional shipping-observation timestamps to shared output. A fresh listing price must not make an older cached shipping estimate appear freshly checked.

[P] Merchant drill-down should reuse `OffersTable` with only identity-matched listings. Label source entries accurately; the present snapshot is not a complete merchant-offer database.

## 5) Builder/peripherals position

[V] The engine accepts nine internal part categories and evaluates thirty deterministic rules; gaming balance rules are already advice. (`src/engine/types.ts:4`, `src/engine/index.ts:27`)

[P] Ship monitors and universal comparison independently of builder integration. Keep monitors outside engine types, slot files, compatibility filtering, PSU calculation, and automatic component allocation.

[P] Later, an optional “Complete your setup” section can store monitor selections separately and show three labelled amounts: PC components, peripherals, complete setup. Preserve the existing component budget; peripheral spending must not reduce it implicitly.

[P] Treat setup totals as shopping estimates. Unknown shipping propagates to an incomplete delivered total; do not invent consolidated shipping savings or quantity discounts.

[P] Defer GPU-to-monitor checks until exact card output capabilities and monitor input/mode evidence exist. Connector presence alone cannot verify resolution and refresh.

[P] A later advisory module should examine port counts, link capabilities, colour depth/chroma, timing, DSC at both endpoints, cables/adapters, USB-C lane sharing, and simultaneous-display limits. Report documented support, conditional support, or unknown.

[P] Never hide components or change deterministic engine findings through this module. Link bandwidth establishes signal feasibility, not gaming frame rates. Multi-monitor capability requires evidence about simultaneous modes, not the sum of individual port maxima.

## 6) Alternatives compared and decision log

| [P] Problem | [P] Alternatives and tradeoffs | [P] Recommendation and impact |
|---|---|---|
| Domain hierarchy | Storage parent requires path/key migration; navigation-only grouping can drift | Registry domain metadata; flat category storage |
| Persistence | Shared product/spec SQL tables require a backend; JSON equivalents are keyed snapshots and sidecars | Keep static JSON and build artifacts; no DB |
| Spec architecture | Universal untyped object weakens validation; rewriting all categories is costly | Existing per-category models plus common interfaces and typed monitor structures |
| Registry | Scattered lists preserve duplication; dynamic plugins add indirection | Small static registry extending current config |
| Normalization | Browser parsing duplicates truth; generic regex rules lose category meaning | Python ingestion normalization, build validation, shared golden fixtures |
| Comparison definitions | Hardcoded category pages duplicate UI; JSON expressions create a mini language | Typed definitions with pure accessors |
| Tray scope | Single category is simpler but discards other shopping work; unlimited groups clutter | Bounded separate groups, four columns each |
| Product identity | Family aggregation maximizes coverage but combines variants | Exact product selections; conservative cross-source aggregation |
| Builder totals | Combined budget changes existing behavior | Separate optional peripherals state and subtotals |
| Scope | Whole-catalog identity migration delays monitors and risks history | Add monitor rigor now; adapt existing categories conservatively |

[P] Prerequisite fixes are limited to category/slot separation, nullable filter behavior, exact comparison references, shared pricing summaries, publication/source capability handling, and monitor evidence reconciliation. Defer unrelated catalog rekeying and engine refactoring.

[P] No new runtime dependency, paid service, hosted database, account system, or recurring cost is required.

## 7) Tests and measurable acceptance criteria

[V] Relevant existing coverage includes route/rewrite checks, offer arithmetic, exact source selection, listing-local filters, worker fallback, model chunks, builder files, compatibility scenarios, and responsive catalog behavior. These tests were inspected, not executed. (`tests/unit/routes.test.ts`, `tests/unit/offers.test.ts`, `tests/unit/catalogueFilters.test.ts`, `tests/unit/facets.test.ts`, `tests/compat/engine-scenarios.test.ts`, `tests/e2e/catalogue.spec.ts`)

[P] Add these release gates:

| [P] Area | [P] Acceptance criterion |
|---|---|
| Classification | Exactly ten published categories; monitor only under peripherals; zero monitor engine parts or builder slots |
| Schema | Every published monitor listing passes structural validation; invalid facts become unknown/quarantined with diagnostics |
| Matching | Reviewed corpus ≥300 listings, ≥100 true matches, ≥100 difficult negative pairs; zero false merges and ≥95% recall among identifiable positive pairs |
| Variants | Every size/panel/refresh/connector/revision negative fixture remains separate; unknown identity never bridges variants |
| Normalization | All golden fixtures pass; normalization/settlement twice equals once; Python/TS identity outputs agree |
| Core coverage | ≥90% of launched monitor products have evidenced diagonal, pixel resolution, panel, and native refresh; every published fact has provenance |
| Ingestion | Every enabled source/category pair has parse, empty, partial, failure-retention, pagination, and duplicate-ID fixtures |
| Source policy | Zero requests to disabled or unapproved endpoint capabilities; no unapproved Skroutz budget increase |
| Filters | UI results and facet counts exactly match an independent fixture oracle, including boundaries and unknown policies |
| Sorting/search | Stable ties; unknowns last for numeric sorts; Greek accents, model codes, aliases, domain/category scope, and URL round-trips pass |
| Pricing | Comparison and product summaries agree to €0.01; unknown shipping, stale cache, changing prices, and unavailable offers covered |
| Comparison | All ten categories render; mixed categories separate; units/methods/booleans/conflicts/missing values behave as defined |
| Persistence | Reload, cross-tab updates, malformed storage, blocked storage, shared URLs, aliases, removal, and deployment mismatch pass |
| UI/accessibility | Greek/English at 360/390/768/1024/1440 px; no document overflow, obscured controls, focus traps, or keyboard dead ends |
| Regression | Existing category prices, grouping keys, URLs, builder selections, and engine scenario results unchanged on frozen inputs |

[P] Retain the existing ≤40 KiB gzip model-chunk ceiling and ≤8 KiB builder-index ceiling. Add provisional budgets: comparison tray core ≤3 KiB gzip additional initial JS; comparison tables load lazily; zero monitor-data requests on initial builder load. Existing size assertions are in `tests/unit/modelChunks.test.ts:287` and `tests/unit/builderFiles.test.ts:64`.

[P] Measure monitor filtering on a fixed 5,000-listing fixture and four-item comparison on a fixed mobile profile: no attributable main-thread task over 50 ms; p95 filter response below 200 ms. Establish comparable production baselines before finalizing these budgets.

## 8) Phased roadmap

### Phase 1 — Architecture and contracts

[P] **Files:** `src/types.ts`, `src/lib/{routes,pick,slots,categoryRules,categories}.ts*`, proposed `catalog.ts`, `scraper/categories.py`, validation and route tests.

[P] Separate category membership from builder capability; define monitor identity/spec/evidence contracts, comparison references, and source capabilities. Establish frozen existing-category outputs.

[P] **Migration:** additive types and capability mappings only. **Gate:** existing outputs and engine results unchanged; monitors disabled. **Risk:** hidden total mappings and casts. **Rollback:** revert application changes; no data migration required.

### Phase 2 — Monitor data

[P] **Files:** proposed `scraper/normalize_monitor.py`, `scraper/models.py`, `scraper/categories.py`, `scraper/specs.py`, `scraper/main.py`, `scraper/shipping.py`, permitted maker adapters, validation ranges/conflicts, source-validation scripts, workflows.

[P] Establish permitted source paths, fixtures, matching corpus, provenance, bounded enrichment, and monitor snapshots. Test failure retention before scheduled collection.

[P] **Migration:** create monitor snapshot/cache namespace through workflow-owned generation; preserve existing data. **Gate:** matching, coverage, policy, and schema criteria pass across three consecutive eligible runs. **Risk:** variant contamination and scrape runtime. **Rollback:** disable monitor collection; retain evidence for diagnosis.

### Phase 3 — Monitor UI

[P] **Files:** `vite-plugin-data.ts`, `src/lib/{derive,slug,search,searchResults,filterUrl,catalogueFilters,ranking,pageMeta,sitemap}.ts`, shell navigation/texts, catalog/product components, spec definitions, `vercel.json`.

[P] Publish compact monitor lists and product chunks; add navigation, filters, product evidence, offers, and search.

[P] **Migration:** additive monitor fields and routes. Existing list format can remain v2 if encoding is unchanged; bump contracts only when decoding becomes incompatible.

[P] **Gate:** monitor publication minimum established from accepted inventory; complete chunks; bilingual/responsive/pricing tests pass. **Risk:** enabling an empty category blocks builds under current guards. **Rollback:** disable monitor publication/navigation together, preserving the other nine categories.

### Phase 4 — Universal comparison

[P] **Files:** proposed `src/lib/compare/{types,definitions,resolve,rows,state}.ts`, `src/components/compare/`, shared offer summaries, `ProductList.tsx`, `ProductHeader.tsx`, `App.tsx`, routes/rewrites.

[P] Implement pure comparison and exact references first; then all category definitions, tray, page, persistence, and sharing. Technical equality and pricing should be tested before UI integration.

[P] **Migration:** introduce a separate versioned storage key; no `pcBuild` rewrite. **Gate:** all ten categories and error states pass together. **Risk:** broad family prices presented as exact products. **Rollback:** disable comparison entry points and route; leave catalog data intact.

### Phase 5 — Optional builder integration

[P] **Files:** separate proposed setup store/summary components, existing builder review/purchase presentation, share serialization, optional display-link advice module.

[P] Proceed only after the owner chooses setup-budget semantics and data supports useful advice.

[P] **Gate:** component totals, engine outputs, automatic builds, and initial network payload remain unchanged. **Rollback:** disable setup integration; preserve internal builds.

### Phase 6 — Release verification

[P] Testing belongs in every phase; this phase integrates frozen-data regression, current-data checks, accessibility, performance, source budgets, and deployment rehearsals.

[P] Keep readers backward compatible before enabling new writers. Distinguish “supported by code” from “published”; do not activate monitor publication merely by extending `Category`.

[P] Never disable global data guards to admit monitors. Preserve existing drop/history checks and add a monitor-specific initial minimum.

[P] Require owner approval for deployment, retaining `deploymentEnabled.v2=false` until explicitly changed. Existing protection is in `vercel.json:3`. Rollback must restore a coherent application/data deployment, not mix cached artifact versions.

[P] Validate ingested URLs against source hosts and allowed schemes; never fetch user-provided URLs. Bound shared-state inputs, render source text as text, and retain safe external-link behavior. Rich evidence belongs in lazy chunks, not every listing or the global shell.

## 9) Product-owner decisions

| [P] Decision | [P] Recommended answer |
|---|---|
| Is Peripherals a storage parent? | No; category domain metadata for UX |
| Initial peripheral landing? | Skip; navigate directly to monitors |
| Compare families or products? | Exact products; explicit variant selection |
| Multi-category tray? | Yes, separate bounded groups; four items each |
| Incomplete monitor specs? | Publish identified products with unknowns; enforce catalog coverage gate |
| Regional variant merging? | Only with documented equivalence |
| Default monitor recommendation score? | Transparent popularity/coverage initially |
| Additional Skroutz requests? | None pending permitted-access and budget resolution |
| Peripherals in builder? | Optional later, separate state/budget/subtotals |
| Future categories? | Add registry/config/parser/definitions/tests when funded with implementation time; no placeholder pages |

## 10) What I could NOT verify

[A] Live monitor category URLs, source terms/robots contents, permitted access, inventory completeness, manufacturer-document availability, and warranty/burn-in applicability were not verified externally; this review stayed within repository code.

[A] Current live deployment behavior, CI results, runtime performance, and free-tier headroom were not measured. Repository workflow comments are evidence of repository intent, not independent confirmation of external behavior.

[V] `CLAUDE.md` was read first. Inspection then covered the requested architecture modules, targeted scraper/source implementations, workflows, representative JSON, and selected tests. It was not an exhaustive reading of every file.

[V] No files were modified, no skills or sub-agents were invoked, and no builds, tests, scrapes, commits, or deployments were run. Excluded directory contents were not read.