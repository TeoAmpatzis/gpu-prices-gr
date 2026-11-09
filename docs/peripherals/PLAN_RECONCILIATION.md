# Plan reconciliation: Claude plan vs independent Codex plan (DRAFT)

Status: planning only, 2026-11-08. Two plans were produced independently from the same brief and the same repository. Codex (read-only, did not read `docs/peripherals/`) produced its plan at `scratchpad/codex-plan-1.md`. This file records where they agree, what each side changes after the comparison, and what is still open. Where this file contradicts the other five docs, **this file wins**. Legend: **[V]** verified in repo, **[A]** assumption, **[P]** proposal.

## 1. Agreed without change (both plans, independently)
- No database; "schema" = JSON files + dataclasses + TS types. Keep `/data/<category>/` storage. [V]
- Peripherals = domain **metadata**, not a storage parent. Small static registry, not a plugin framework. [P]
- Add only `monitor`. Flat URLs `/monitor`, `/monitor/<slug>`, `/compare`. No `/peripherals` landing page yet. [P]
- Monitors stay outside the compatibility engine, `Slot`, picker and builder totals; builder integration is a later, separate approval; GPU-to-monitor checks wait for GPU output data and must never convert performance doubts into incompatibility. [P]
- Comparison: pure engine independent of `src/engine/`, typed definitions **in code** (not JSON), no display-string comparison, no overall "winner", no invented benchmarks, unknown ≠ false, two unknowns ≠ equal. [P]
- Tray keeps selections per category, one visible group, never a mixed technical table. [P]
- Skroutz: no new product-page reads and no new budget for monitors. [P]
- Normalization in Python at ingestion; golden fixtures; idempotent settle; conflicts preserved, never majority-voted. [P]
- Pricing rows reuse `ownTotal`/`offerTotal`/`sortOffers`/availability/freshness; unknown shipping stays unknown. [P]

## 2. Codex findings I verified and adopt (my plan was wrong or silent)
| # | Finding | Evidence | Change |
|---|---|---|---|
| 1 | `SLOT_OF: Record<Category, Slot>` is the strongest coupling; category pages accept `pick=1`; `ModelPage` activates builder fit via `entry.parts` | `src/lib/pick.ts:11` (used in 5 places) [V] | Phase 1 replaces it with `slotOf(cat): Slot \| null`; `pick=1` rejected for categories without a slot before any picker/engine code loads |
| 2 | `share_fields` is unsafe for monitors: bools become true if **any** listing says so; other values = most common | `scraper/main.py:50-95` [V] | Monitor spec fields are **not** put in `Category.shared`. Resolution is MPN-scoped with evidence states, never majority/any-true |
| 3 | Catalogue is now **listing-level**: families expand into source listings with exact choices (`bd1:<source>:<id>`, `?source=&offer=`) | `src/lib/catalogueProducts.ts`, `productSelection.ts`, commit 19034e2 [V] | My docs described the older `ModelRow`/model-level UI (from CLAUDE.md). Compare references must be **exact selections**; see §3.2 |
| 4 | GPU/RAM/PSU "models" are spec families, not retail products | `categoryRules.ts` grouping [V] | Compare distinguishes family / exact product / source listing; listing-specific rows (e.g. GPU card length) need an exact selection |
| 5 | `yesNo` filter treats unknown as **no**: `(v==='yes') === !!get(l)` | `src/lib/categoryRules.ts:141-150` [V] | My monitor plan said unknown is "neither": wrong today. Prerequisite: tri-state yes/no/unknown semantics for monitor filters (storage DRAM already uses explicit equality) |
| 6 | Secondary range filters support one measurement per category | `RANGE_FIELDS` in `src/lib/catalogueFilters.ts` [V] | Monitors need size and refresh ranges: typed range accessors are a Phase 3 prerequisite |
| 7 | Skroutz run is `--no-shipping --specs-budget 0 --makers-budget 0`, "no shipping, specs or price history: paths robots.txt disallows"; `history.yml` still runs `main.py --history-only` (Skroutz history import) | `.github/workflows/scrape.yml:3-6,98`; `history.yml:78` [V] | CLAUDE.md is stale. My docs claimed Skroutz shipping via `shops_list` and Skroutz history for monitors: **removed**. Also an unresolved inconsistency in the repo to review (item O1) |
| 8 | `validate_skroutz.py` loops over every registered category | `scripts/checks/validate_skroutz.py:37` [V] | Source/category **capability** table; an unsupported pair is not a failed scrape |
| 9 | Shipping cache has its own `checked` time not carried on `BaseListing` | `scraper/shipping.py:113`, `src/types.ts:10` [V] | Expose optional shipping-observed time so a fresh price cannot make an old shipping estimate look fresh |
| 10 | Evidence per field is richer than my 3 states | Codex §3 | Adopt `stated / corroborated / derived / conflict / unknown` and a monitor evidence cache `public/data/monitor/spec_evidence.json` (raw, value, source URL, checkedAt, parser version); only selected provenance reaches list payloads |
| 11 | Acceptance criteria were less measurable | Codex §7 | Adopt: matching corpus ≥300 listings (≥100 true matches, ≥100 hard negatives), zero false merges, ≥95% recall of identifiable positives; core-field coverage ≥90% (size, resolution, panel, refresh) with provenance; perf: tray ≤3 KiB gz initial JS, compare table lazy, 0 monitor requests on builder load, no main-thread task >50 ms and p95 filter <200 ms on a 5,000-listing fixture (baselines measured first) |
| 12 | Tray limits | Codex §4 | Adopt: max 4 per category, max 3 groups / 12 references, one active group, no silent eviction at capacity |
| 13 | Hide-identical | Codex §4 | Adopt: hides only fully known equal rows; unknown/conflicting rows stay; separate optional control "hide rows unknown everywhere" (replaces my "also hide all-unknown") |
| 14 | Nav wording | Codex §2 | Adopt «Εξαρτήματα PC / PC Components», «Περιφερειακά / Peripherals»; mobile catalogue sheet with both groups + Builder + Compare |
| 15 | Publication vs code support | Codex §8 | Adopt: "supported by code" ≠ "published"; registry `enabled`/`visible`; never disable global data guards to admit monitors; add a monitor-specific initial minimum |
| 16 | Share URL hygiene | Codex §4 | Adopt: bounded, validated `/compare?v=1&cat=…&items=…`, duplicate params rejected, viewing a shared link never overwrites saved groups; storage key `bdCompare:v1` (replaces my key name `compare`) |

## 3. Differences resolved

### 3.1 Type mechanism for "catalogue category vs builder slot"
- Claude: split `ComponentCategory` / `PeripheralCategory`. Codex: keep `Category`, add optional `builderSlot` + type guard.
- **Resolution:** one `Category` union (registry-derived) + registry `builderSlot?: Slot` + derived type `SlotCategory = Extract<Category, Slot>`. Builder-only maps become `Record<SlotCategory, …>` (keeps exhaustiveness where it matters); generic maps stay `Record<Category, …>`. A Phase 1 spike classifies the 21 `Record<Category>` files to confirm. Both goals met: zero monitor entries in builder maps, compile-time safety kept.

### 3.2 Compare references and prices
- Claude: slugs of families + `model.cheapest`. Codex: exact selections.
- **Resolution:** a compare reference = `{cat, familySlug, selection?: {source,id}}` using the existing `bd1:` encoding. Cards (already listings) add their exact listing. A family page asks the user to pick a product when the category's rows are listing-specific. A monitor "family" = one manufacturer model code, so a monitor reference may be model-level with aggregated offers (identity established by MPN); existing categories compare source-selected products with that source's price unless identity across sources is proven.

### 3.3 Kept from my plan (Codex silent or compatible)
Monitor identity = manufacturer model code with strict fallback and a per-maker suffix table; Codex's stricter rule applies on top (unknown discriminators never bridge two known variants; suffix equivalence only when documented; fuzzy match only produces review candidates). Phase 0 recon. Adding-a-category checklist. Python single `CATEGORIES` source (glitches/merge_history import it).

## 4. Corrections to my other docs (errata)
- MONITOR_INTEGRATION_PLAN §3.3: delete "Skroutz shops_list shipping" for monitors; Skroutz contributes list prices only.
- MONITOR_INTEGRATION_PLAN §5 "yesNo treats unknown as neither": wrong; see §2 row 5.
- UNIVERSAL_COMPARISON_SYSTEM §1/§3: `ModelRow`/`ModelCard` are older names; the live catalogue renders `ProductList.tsx` over `catalogueProducts`. Buttons attach there.
- Any "Skroutz history import for monitors": removed.
- `CLAUDE.md` is stale in several places (Skroutz workflow, catalogue); code and workflows are the source of truth. A CLAUDE.md refresh would be a separate, owner-approved task.

## 5. Still open
- **O1 (owner, factual inconsistency):** `scrape.yml` says Skroutz shipping/spec/history paths are disallowed by robots.txt, while `history.yml` still schedules a history import. Not decided here; needs your review before any further Skroutz-related work.
- **O2:** D1–D8 in ARCHITECTURE_DECISIONS.md remain yours. Changes from this reconciliation: D3 = per-category groups, max 4 per group, max 3 groups; D4 adapter also needs the exact-selection rule; D2 = Skroutz lists only, no shipping/specs/history.
- **O3:** GTIN/EAN availability on the sources is unknown (Codex lists GTIN in identity; Phase 0 recon checks whether any source exposes it).
- **O4:** how many of the 21 `Record<Category>` files are generic vs slot-only (Phase 1 spike).
