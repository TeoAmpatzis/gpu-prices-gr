**1. Decisions**

Verdicts apply to the reconciliation’s controlling text; superseded proposals are excluded.

| Item | Verdict |
|---|---|
| 2.1 | **AGREE.** Guard picker activation before its dynamic import (`src/components/CategoryView.tsx:73`). |
| 2.2 | **AGREE-WITH-CHANGE.** Also bypass monitor field overwrites in `specs.apply`; preserve title/page observations before resolution. Avoiding `Category.shared` alone is insufficient (`scraper/specs.py:417`, `scraper/main.py:176`). |
| 2.3 | **AGREE.** Catalogue expansion preserves individual source listings (`src/lib/catalogueProducts.ts:16`). |
| 2.4 | **AGREE.** GPU/RAM/PSU grouping keys describe families (`src/lib/categoryRules.ts:176`, `:263`, `:298`). |
| 2.5 | **AGREE.** Explicit tri-state predicates are required; current `yesNo` coerces missing values (`src/lib/categoryRules.ts:149`). |
| 2.6 | **AGREE.** Extend the range contract through URL state, filtering and facets, beyond replacing `RANGE_FIELDS` (`src/lib/filterUrl.ts:96`). |
| 2.7 | **AGREE-WITH-CHANGE.** Explicitly exclude monitors from Skroutz **shipping and history operations**, including scheduled runs. Removing those features from the docs does not prevent automatic imports (`scraper/main.py:346`, `:352`). |
| 2.8 | **AGREE.** Capabilities must distinguish list collection, specs, shipping and history; one source/category boolean cannot express “lists only.” |
| 2.9 | **AGREE.** Shipping observation time must survive into derived payloads and drive shipping freshness independently. |
| 2.10 | **AGREE-WITH-CHANGE.** Specify derived evidence fields in both catalogue payloads and model chunks. An ingestion cache alone cannot serve product-page conflicts: ungenerated raw files are removed (`vite-plugin-data.ts:191`). |
| 2.11 | **AGREE-WITH-CHANGE.** Measure coverage and recall against a frozen sample of raw eligible source listings, including normalization rejects. Fix device/browser conditions for performance thresholds. |
| 2.12 | **AGREE.** |
| 2.13 | **AGREE.** |
| 2.14 | **AGREE.** |
| 2.15 | **AGREE.** |
| 2.16 | **AGREE.** |
| 3.1 | **AGREE.** Keep genuinely generic maps generic; category presentation maps such as `FILL` still need monitor support (`src/components/product/keySpecs.ts:36`). |
| 3.2 | **AGREE-WITH-CHANGE.** Explicitly label historical/deal statistics as **family-level**, or omit them for exact selections. Selecting one listing does not make existing history product-specific (`src/lib/deals.ts:98`, `src/components/product/ModelPage.tsx:174`). |
| 3.3 | **AGREE-WITH-CHANGE.** Override MONITOR §4.1(6): conflicting specs under one proven manufacturer+MPN produce field conflicts, not automatic identity splits. Split only with evidence of distinct variants; quarantine unresolved identity cases. Resolve identity after enrichment and before writing identity-dependent outputs (`scraper/main.py:291`, `:294`, `:303`). |

**2. Factual errors remaining**

These survive the reconciliation; already-corrected names, storage keys, unknown-filter behavior and Skroutz claims are omitted.

- **RECONCILIATION §2 row 2 overgeneralizes `share_fields`.** Tri-state booleans use majority only to fill gaps; measurement fields use `SAFER`; list fields have another policy. “Booleans become any-true; others most-common” is incomplete (`scraper/main.py:63`, `:71`, `:83`).

- **ARCHITECTURE §2(2), COMPARISON §1 and DECISIONS D4 conflate presentation with stored data.** Existing listings already expose typed numeric, enum and nullable boolean fields. What is missing is a common comparison definition, not typed source values (`src/types.ts:37`, `:94`, `:226`). The reconciliation correctly rejects display-string comparison.

- **ARCHITECTURE §1.1, COMPARISON §§4/7 and ROADMAP Phase 2 name outdated output paths.** The catalogue file is `list.v2.json`; builder output comprises an index and per-slot files, rather than `builder.json`. Product pages use model chunks (`vite-plugin-data.ts:140`, `:142`, `:152`, `:154`).

- **COMPARISON §5 equates availability with “offers exist.”** Existing availability means an explicitly collected availability string; absent data stays unknown and the column remains hidden (`src/lib/offers.ts:60`, `:66`).

- **COMPARISON §1 and ROADMAP Phase 4 locate `PRIVACY_UPDATED` incorrectly.** It lives in `src/lib/site.ts:15`, imported by `src/content/pages.ts:5`, not `src/shell/site.ts`.

- **MONITOR §3.3 says shipping fees are read from the page with unknown preserved.** For e-shop, shipping is instead hardcoded to zero above €90, without checking a monitor-specific fee (`scraper/shipping.py:159`). The bulky-item caveat therefore needs an implementation consequence.

- **MONITOR §1’s “50-page cap” is not the implemented scraper limit.** The implementation allows 80 pages (`scraper/sources/bestprice.py:16`, `:85`). Any separate source-side 50-page limit remains unverified by repository code.

**3. Important omissions**

- **Enrichment cannot rescue rejected listings.** MONITOR §2.4 drops listings lacking size/resolution, but BestPrice normalizes and discards records before product-page collection (`scraper/sources/bestprice.py:29`, `:38`; `scraper/main.py:197`). Define a staging/rejection-report path so coverage targets cannot be satisfied merely by discarding incomplete products.

- **Evidence delivery needs a build contract.** Define how raw observations become resolved values, conflict alternatives and provenance in model chunks. Include parser-version invalidation and checks that displayed states correspond to the displayed values. Existing `specs.apply` overwrites fields; the build prunes raw caches.

- **Comparison needs one coherent build snapshot.** Load all selected products against the same `builtAt`; handle deployment mismatch with a whole-table retry/error state. Existing model loading supports an expected build and validates it (`src/lib/modelData.ts:46`, `:62`); the comparison contract does not specify its use.

- **Shipping reuse needs explicit uncertainty handling.** `_usable` checks price drift but imposes no age limit (`scraper/shipping.py:97`). Show stale shipping separately, and leave monitor shipping unknown where the generic e-shop assumption has not been established.

**4. Remaining disagreements, ranked**

1. **Identity:** automatic splitting on conflicting specs must yield to proven identity plus conflict/quarantine handling.
2. **Evidence:** prevent destructive ingestion overwrites and specify evidence delivery through derived files.
3. **Source limits:** enforce monitor operation capabilities in shipping/history execution, including scheduled workflows.
4. **Historical claims:** distinguish family history/deal evidence from exact selected-product facts.
5. **Acceptance validity:** include rejected eligible listings in coverage/recall denominators and define enrichment staging.
6. **Shipping certainty:** verify the e-shop monitor rule and expose independently stale shipping.
7. **Snapshot consistency:** require a shared `builtAt` across comparison columns.
8. **Performance reproducibility:** specify device/browser conditions for the adopted thresholds.

Other reviewed decisions have no remaining disagreement.

**5. Riskiest assumption:** source titles and the unchanged BestPrice enrichment budget provide enough reliable manufacturer-code evidence to achieve both ≥95% matching recall and ≥90% core-field coverage without false merges.