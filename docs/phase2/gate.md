# Phase 2 gate report

2026-10-12 · worktree `buildcraft-v2`, branch `v2`, HEAD `49e9a0c` (local only, nothing pushed). Data: v2's copy of `public/data` (scrapes up to 2026-10-10), plus `main`'s current data (2026-10-12 06:12 UTC) for the new scraper fields, read without merging.

Plan: `docs/phase2/plan.md` §B10 ("All 64 scenarios pass in the engine" + "a tier for the 49 + 16 chips"; report: field coverage, validation report, power comparison, Lighthouse unchanged, `npm run check`). Roadmap: `docs/PROJECT-STATE.md` (Phase 2 = roadmap steps 1–2).

## Verdict

| Gate item | Result |
| --- | --- |
| `npm run check` | **Passes** (typecheck, lint 0 errors / 6 old warnings, 587/587 tests, build) |
| Scenarios | **Not all pass**: 50 pass, 4 known gaps, 10 unknown (data missing), **0 failures** |
| Tiers for 49 CPU + 16 GPU chips | **Not done**: moved to roadmap step 5 (Phase 4, with rules 27–30), by the A6 roadmap |
| Field coverage | Reported below. Board max memory 79% on `main`; the other new fields 0–3% |
| Validation report | **Done, enforced**: 161 values out of range across 11 checks, `docs/phase2/validation-report.md` |
| Power comparison | **Done**: `docs/phase2/psu-before-after.md` |
| Lighthouse unchanged | `/gpu` and `/builder` **within noise**; `/case` phone **89, below the 90 target** (Phase 1: 91), same page code |

**Recommendation:** close Phase 2 with the gaps written down (they need data or your decisions, not engine work), and carry two items into Phase 3:
- the `/case` phone score, which the planned facet-count fix addresses;
- the B9 grouping work (placement below).

## Scenarios (64)

`npx vitest run tests/compat` → `pass 50, gap 4 (S03, S04, S35, S45), unknown 10 (S13, S14, S15, S16, S20, S21, S22, S30, S46, S49), v1-estimate 0, note-no-basis 0, failure 0`.

| | Before Phase 2 work (10/10) | Now |
| --- | --- | --- |
| Pass | 46 | **50** |
| Known gaps | 8 | **4** |
| Unknown (data missing) | 10 | 10 |
| Failures | 0 | 0 |

No scenario result rests on v1's unsourced estimates any more ("v1-estimate 0").

Remaining gaps:
- **S03, S04** (rule 13, B650/X870 + Ryzen 9000): AMD's AM5 page never says which chipsets are "600 series" / "800 series", so the engine answers unknown by your rule.
- **S35** (rule 21): a case stating 1 fan position with 6 included fans; needs a validation check of fan positions (spec B2).
- **S45** (rule 26): always a note, by the rule's definition.

The 10 "unknown" scenarios are data the shops don't state (card length, case limits, RAM slots, drive bays…).

## Engine tables (all values from official pages fetched during the work; each re-checked by an independent reviewer)

| Table | Covered | Source | Used by |
| --- | --- | --- | --- |
| Official memory speed per CPU (`src/engine/data/cpuMemory.ts`) | 147 / 161 desktop CPUs (AM5, AM4, LGA1700, LGA1851) | amd.com, intel.com | rule 25 |
| CPU power figure (`cpuPower.ts`) | 152 / 161 (76 Intel PL2 + 76 AMD TDP, "TDP (AMD gives no PPT)") | intel.com ARK, AMD specifications table | rule 14 |
| GPU board power + chip maker's PSU (`gpuPower.ts`) | 42 / 57 consumer chips | nvidia.com, amd.com, intel.com | rule 14, validation |
| BIOS chipset × CPU generation (`bios.ts`) | 80 / 136 pairs | amd.com AM4/AM5 + Ryzen 7000 pages, intel.com articles + ARK | rule 13 |

Coverage files: `docs/phase2/cpu-memory-coverage.md`, `cpu-power-coverage.md`, `gpu-power-coverage.md`, `bios-coverage.md`.

## Data coverage per field

**Fields the rules and filters use** (audit script `scripts/audit/data-quality/coverage.mjs` on v2's data; full table `docs/phase2/gate/coverage.md`, Phase 0 baseline `docs/audit/data/coverage.md`). Main changes since Phase 0:
- **Cooler sockets** (rule 10): 33.1% → **65.1%** of models.
- **Card minimum PSU** (rule 14): 52.6% → 62.1% of models.
- **CPU TDP**: 32.3% → 31.1% (models changed; most-listed quarter 83%).
- **RAM speed**: 82.8% → 82.4%.
- **AIO radiator**: 100%.

**New Phase 2 scraper fields** (on `main`'s data of 2026-10-12; v2's copy has none of them yet):

| Field | Listings | Models | Why |
| --- | --- | --- | --- |
| Board max memory (`maxMemoryGB`, rule 4) | **79.0%** | 63.1% | BestPrice states it |
| Board M.2 slots (`m2Slots`, rule 17) | 2.8% | 3.0% | Skroutz board pages are paused (your rule); BestPrice rarely states it |
| Board M.2 PCIe gen (`m2Gen`, rule 20) | 0.0% | 0.0% | Skroutz only |
| Board SATA ports (`sataPorts`, rule 18) | 2.4% | 2.8% | same as M.2 |
| BIOS Flashback (`biosFlashback`, rule 13) | 1.7% | 3.3% | BestPrice icon, few boards |
| RAM slots (`ramSlots`, rule 3) | 83.7% | 71.5% | unchanged |
| PSU ATX 3.x, case 3.5" bays, case front USB-C | 0% | 0% | in the A3 queue, not pushed |

## Validation (enforced since `77f819d`)

`docs/phase2/validation-report.md` (`npm run validation:report`):

| Check | Range | Values stated | Rejected (→ unknown) |
| --- | --- | ---: | ---: |
| `cooler-height` | 30–200 mm | 1557 | 138 (66 models; mostly towers stored at the fan's 25 mm thickness) |
| `case-gpu-max` | 100–700 mm | 5259 | 1 (Spire U20M "3.502 mm") |
| `case-cooler-max` | 25–250 mm | 4614 | 0 |
| `gpu-length` | 100–400 mm | 1233 | 0 |
| `gpu-minpsu-plausible` | ≥ chip board power + 100 W | 922 | 12 (5 models, e.g. Sparkle B570 "170 W") |
| `psu-watts` | 150–3000 W (report only) | 3947 | 0 |
| `ram-ddr4-speed` / `ram-ddr5-speed` | 1600–5333 / 4000–10000 MHz | 2235 / 2368 | 1 / 9 |
| `ram-cas` | 5–60 | 2116 | 0 |
| `cpu-tdp` | 10–500 W | 745 | 0 |
| `mobo-max-memory` | 4–16384 GB | 0 in v2's data | 0 |

Effect on the builder data: the Spire U20M no longer hides every graphics card; 12 card PSU figures and 2 RAM rows become unknown. The RAM names still show the misread speed until the scraper fix (A3 queue #5).

## Power comparison

`docs/phase2/psu-before-after.md` (`npm run psu:before-after`). Every builder card, with v1's recommended PSU against the new rule 14, for two reference builds: Intel Core i5-12400F (PL2), and AMD Ryzen 7 7700 (TDP). Against v1, the recommendation rises for 8 cards, falls for 118, stays the same for 1,297 and can't be compared for 113. The falls are cards where a sourced figure (the card's own, or AMD's/NVIDIA's) replaces v1's unsourced chip table. The report lists the 20 largest changes and every rejected card figure. **The builder does not use the new rule yet; it waits for your review of this report.**

## Lighthouse

Method as at the Phase 1 gate: local production preview, `node scripts/audit/lighthouse-baseline.mjs`, 3 runs, median (`docs/phase2/gate/perf/lighthouse.json`). The first set ran while review agents were busy on the same PC, so `/gpu` and `/case` were re-measured on a quiet machine (second set below). The JS files are byte-identical to the Phase 1 gate (`index-4LwT0uTk.js`, `CategoryPage-DMwnkeEV.js`): Phase 2 changed no page code; the engine is not loaded by any page yet.

| Page | Phone, Phase 1 gate | Phone now (runs) | Desktop, Phase 1 | Desktop now (runs) | CLS | Accessibility |
| --- | --- | --- | --- | --- | --- | --- |
| `/gpu` | 99 (99/99/99) | **98** (97/98/98) | 100 | **100** (100/100/100) | 0 | 100 |
| `/case` | 91 (90/92/91) | **89** (89/91/89) | 100 | **99** (99/100/99) | 0 | 100 |
| `/builder` | 98 (98/98/98) | **98** (98/98/98) | 100 | **100** (100/100/100) | 0 | 100 |

`/case` on a phone: 89, with total blocking time 382 ms (Phase 1: 322 ms). That is the known cost of filter counts over 2,588 cases after `list.json` arrives. The fix is already in the plan for Phase 3 ("counts after first paint / in a worker"). It belongs to the Phase 3 gate (Lighthouse phone ≥ 90 on every category).

## What the Phase 2 plan had that is not done yet

| Plan item | State | Where it goes |
| --- | --- | --- |
| B2 validation, other checks: source conflicts, product page over title, case size vs board, part numbers, fan positions | Only the range checks and the minPsu check are built | Phase 3 (with the product page, which shows sources); S35 needs the fan-position check |
| B6 performance tiers | Not started | Roadmap step 5 (Phase 4, with rules 27–30) |
| B7 scraper fields | Max memory live; M.2/SATA/Flashback thin (Skroutz paused); ATX 3.x, bays, USB-C waiting | A3 queue on `main`, one change at a time with your OK |
| B8 offers (availability, real shop, P-01 at the source) | Not started | After the A3 queue, on `main` |
| **B9 grouping fixes** | Not started | See below |

### Where B9 goes (recommendation)

B9 is the five batches that merge duplicate products, all on `main`'s scraper, each with an offline before/after, your OK, and a scrape with `allow_history_shrink`:
1. coolers, fans and cases (Greek words, Latin look-alike letters);
2. storage (non-integer TB, interface in the key);
3. Skroutz family cards;
4. RAM speed from Shopflix titles;
5. board DDR4/DDR5 versions.

**Put it in the `main` backend queue, right after the A3 changes:** A3 #1–4 → the RAM-speed fix → **B9 batches 1–5** → B8. It runs alongside Phase 3's front-end work, and **must be finished before roadmap step 4 (the product page)**:
- **Product URLs:** B9 changes model keys, and the product page makes those keys public as `/gpu/<slug>` addresses. Every rename after that needs an alias redirect, and the shared links keep the old names.
- **Price history:** a merge joins two price histories, and the product page shows history.
- **Fixtures:** the engine scenarios and the `pcBuild` keys use model keys. Merging before Phase 4's builder keeps test fixtures and saved builds stable.

Step 3 ("pick for my build") doesn't depend on it: A9 already maps renamed keys through the alias list.

## Open decisions for the owner (from `docs/PROJECT-STATE.md`)
- **AM5 600/800-series membership:** no amd.com page names the members (searched twice). S03/S04 stay unknown unless you accept another source.
- **`docs/phase2/psu-before-after.md`:** review it before the builder uses the new rule 14.
- **A3 queue:** clean branch `a3-queue` ready (4 commits, no Co-Authored-By); push of #1 waits for your OK.
- **Already-pushed `main` commits with Co-Authored-By** (2bdc58f, 9bb9224 and older v1 commits): fixing them means rewriting `main`'s published history (not done).
