# Phase 2 plan: data validation, compatibility engine, new data fields

**Status: approved by the owner on 2026-10-10, with the answers in B11 (Stop 2 in progress).** Branch `v2` at `d95751c` + merge of main `25d16a7` (data 2026-10-10 06:41 UTC). Numbers below were measured on 2026-10-10 with that data unless they say *estimate*. Evidence: `docs/phase2/probe-labels.{json,txt}` (30 product pages read on 2026-10-10, script `scripts/phase2/probe-labels.py`, summary `scripts/phase2/probe-summary.mjs`).

**In one paragraph.** Phase 2 has four parts. (1) A **validation layer** that runs when the site is built: a value that fails a check becomes *unknown* and never reaches a rule. It replaces v1's four interim patches with one mechanism and writes a report of every value it rejected. (2) **One compatibility engine** (`src/engine/`), pure TypeScript with no React. It covers rules 1–26 (27–30 come in Phase 4, owner 2026-10-10). It has three levels plus "pass", and each finding names the parts that cause it, which fixes C-01. It contains the power formula, the BIOS table and the performance tiers, and it is checked against the 64 Phase 0 scenarios. (3) **New scraper fields on main**: board M.2 slots, M.2 PCIe generation, SATA ports, max memory and BIOS Flashback; card thickness and power connector; PSU ATX 3.x; case drive bays and front USB-C; per-offer availability and the real shop. The probe shows the shops state these, mostly on Skroutz. Boards and PSUs have never had product pages read, so coverage takes days of scheduled scrapes to fill. That is why the scraper work goes **first**. (4) **Grouping fixes** that the audit assigned to Phase 2 (D-06, D-09–D-12, backlog #10). These rename or merge models, so each batch is measured offline and approved separately. **Gate:** all scenarios pass in the engine, and every desktop CPU and consumer GPU chip in the most-listed quarter has a tier.

---

## What Phase 2 changes (and what it doesn't)

| Changes | Where | Why |
| --- | --- | --- |
| New listing fields (nullable, additive) | `scraper/models.py`, `scraper/specs.py`, `scraper/shipping.py` (**main**); `src/types.ts` (**v2**) | Plan rules 4, 7, 13, 15, 17–20, 24; decision "availability and real shop" |
| Validation at build time | `src/data/validate/` (new), called from `src/lib/derive.ts` | Decision "Ορθότητα δεδομένων"; backlog table "Phase 2: data validation layer" |
| Engine, tables, tiers | `src/engine/` (new) | Plan "Κανόνες συμβατότητας", "Κατανάλωση", tiers |
| Scenario suite runs against the engine | `tests/compat/` | Phase 2 gate |
| Grouping fixes | `scraper/normalize_*.py` (**main**, separate approvals) | D-06, D-09, D-10, D-11, D-12, backlog #10, Tower 300 |

**Not in Phase 2:**
- **No visible page changes.** v1's builder keeps its own rules until Phase 4 replaces it. Category pages don't get the "Only compatible" filter or new filters until Phase 3. There is one exception, because it is the point of the validation layer: v1's builder in the v2 branch reads the *validated* values (a rejected value shows "Fit not verified" instead of a wrong "Fits").
- No recommendation system (Phase 4).
- No per-shop shipping optimisation (v2.1).
- No new categories.

---

## B1. Order of work (Stops)

The scraper fields need many scheduled runs to fill, so they start first. Everything else is v2-only and is built while the data accumulates.

| Stop | What | Branch | Your approval needed |
| --- | --- | --- | --- |
| **1** | This plan | — | **now** |
| **2** | Scraper: new fields + offer fields (B7, B8), with Python tests on saved pages; **one commit per change, each pushed only after the previous one's scrape is green** | **main** | Approved; **new Skroutz page reads need the Skroutz budget approved first** (BestPrice only until then) |
| **3** | Validation layer (B2) + its report | v2 | — |
| **4** | Engine rules 1–26 (B3), power (B4), BIOS (B5); scenarios run against the engine | v2 | — |
| **5** | Tier files (B6) + coverage check (rules 27–30: Phase 4) | v2 | — |
| **6** | Grouping fixes (B9), one batch per category: offline before/after, **then your OK per batch**, then main with `allow_history_shrink` / `allow_data_drop` | **main** | **yes, per batch** |
| **7** | Gate report: scenarios, coverage per field after the scrapes, validation report, Lighthouse unchanged | v2 | gate |

Each code commit passes `npm run check` (v2) or the Python tests + build (main), with no new lint suppressions.

---

## B2. Validation layer (build time, v2)

**Where it runs.** In `derive.ts` at build time, between reading the scraper's `latest.json` and writing `list.json` / `builder.json`. The scraper's files stay as they are. So the layer is tested in Vitest, applies to v2 only, and can be changed without a scrape. It can read the provenance it needs from the committed caches: `specs.json` holds product-page values per listing, `makers/*.json` the makers' values. With those it can tell a product page's value from a title's guess.

**Output.** For each model and field: the value the rules may use, or `null`, plus a reason code (`range`, `conflict`, `title-vs-page`, `part-number`). The reason codes stay out of the shipped JSON, except where Phase 3 needs a source marker. A build-time report, `docs/phase2/validation-report.md` (per category and check: how many values were rejected, 10 examples with titles), is regenerated by `npm run validation:report`.

**Checks (first version; each has unit tests with the audit's real cases):**

| Check | Rule | Replaces v1 patch / fixes |
| --- | --- | --- |
| Plausible range per field: air cooler height 30–200 mm, card length 100–400, case max card 120–500, case max cooler 40–250, PSU 150–2,000 W, RAM speed within its type (DDR4 1,600–5,333 MT/s, DDR5 4,000–10,000), CL 10–60, CPU TDP 10–500 W | value outside → unknown | D-01 (`1cadff6`), D-11 (60000 MHz) |
| Card PSU figure ≥ chip table − 100 W | else unknown; the rule then uses max(chip table, formula) | D-02 (`415d321`) |
| Case fan positions < fans included, or a tower with < 3 positions | positions → unknown | C-02 (Kolink Observatory) |
| Product page > maker page > title: a value stated on a product page or maker page beats one read from a title | title value dropped | D-08, Tower 300 (e-shop "MINI-ITX" titles) |
| Stated values that disagree: board size → the **largest** stated on a product/maker page; a length that differs by > 50 mm between two pages → unknown; smaller differences → the safer value (as `SAFER`) | | Tower 300 card length 280 vs 400 mm |
| Board memory DDR4 vs DDR5 in one model | v1's rule kept (unknown, board left out of the builder) until B9 splits the versions | `fdea444` |
| Case size vs board: a Mini Tower stating ATX/E-ATX, an SFF case stating ATX | board size → unknown | audit's 50 candidates |
| CPU "Tray με ψύκτρα / with Fan" | cooler included → unknown, not "no" | D-07 |
| Part-number check: a maker part number whose known prefix contradicts a field (RAM F4/F5, AX4/AX5, LD4/LD5; Gigabyte `GV-…-16G` VRAM) | field → unknown | D-04 (scraper fix stays; this catches what slips through) |
| Price shown "with shipping" only when the total belongs to the same offer | from the scraper's new offer fields (B8); until they arrive, v1's 2% rule | P-01 (`431dc10`) |

**Measured before/after:** for every check, the number of builder rows and category models whose value changes, and the replay of `tests/compat` scenarios with real products. The audit's S1 cases (AK400 G2, PNY 5070 Ti, Lexar 32GB…) become regression tests.

---

## B3. Compatibility engine (`src/engine/`, v2)

**Shape.**
- `types.ts`: `Level = 'error' | 'warning' | 'note'` (a pass is the absence of a finding, but tests can ask for `pass` per rule). A `Part` is a category, a quantity and validated fields. A `Build` is parts per slot; storage, fans and RAM can repeat.
- `Finding = { rule, level, parts: PartRef[], message: Text, fix?: Text, basis: 'stated' | 'estimate' | 'maker-list' | 'unknown' }`. Every message and fix is `{el, en}`, written with "εσύ" (Phase 1 decision) and following the glossary.
- `rules/*.ts`: one file per rule (or a small group). Each declares its id, its possible levels and the fields it reads.
- `evaluate(build, ctx) → Finding[]`, `worstLevel(findings)`, `summary(findings)` (counts per level).
- **Candidate check (fixes C-01):** `checkCandidate(slot, part, build)` = the findings that are **new** when the part is added, compared with the build without it. "Only compatible" hides a part only for an error *it* causes. A CPU is no longer hidden because the PSU is too small for the card.
- **No React, no DOM, no fetch.** Phases 3 and 4 call it from the category pages, the product page and the builder.

**Rules and data** (decisions after Phase 0 applied: margins → warning, equal counts as warning; estimate → note; a maker list alone → warning, never error; rule 11 per the decision):

| # | Rule | Levels | Data (after Stop 2) |
| --- | --- | --- | --- |
| 1 | CPU socket ≠ board socket | error | have |
| 2 | Memory type ≠ board | error | have |
| 3 | Sticks > board slots (counts kits × quantity) | error; unknown slots → note above 2 sticks | have (Skroutz "Πλήθος = N DIMM Slots" raises it) |
| 4 | Total RAM > board max | error; unknown → no finding | **new**: BestPrice "Μέγιστη Μνήμη" (5/5 sampled) |
| 5 | Board size vs case | error; estimate → note | have |
| 6 | Card length vs case | error; ≤ 10 mm margin → warning; chip estimate → note | have |
| 7 | Card thickness vs case expansion slots (small cases) | error; unknown → no finding (note only for SFF/Mini cases) | card: **new** Skroutz "Πάχος" (mm → slots); case slots: **not on shop pages** → makers only (B7) |
| 8 | Air cooler height vs case | error; ≤ 5 mm → warning | have |
| 9 | AIO radiator vs case positions | error from a shop page; **warning** from a maker list only | have |
| 10 | Cooler socket | error; unknown → note | have |
| 11 | No cooler in the box and none in the build | error; unknown → warning | have |
| 12 | No iGPU and no card | error | have |
| 13 | Board chipset older than the CPU generation | warning (+ "BIOS Flashback: ..." when stated) | **table** (B5) + **new** Flashback |
| 14 | PSU < recommended; ≤ +10% → warning | error / warning | **formula** (B4) |
| 15 | 12V-2x6 card + PSU without a native cable | note | **new**: card "Power Connectors"; PSU only "ATX 3.1 = Ναι" (proxy, `basis: estimate`) |
| 16 | ATX PSU in an SFX-only case | error; SFF case unknown → note | case PSU form: **not on shop pages** → note stays for SFF cases |
| 17 | M.2 drives > M.2 slots | error | **new** Skroutz "Πλήθος Υποδοχών M.2" (3/5) |
| 18 | SATA drives > SATA ports; M.2/SATA sharing | error / note | **new** Skroutz "Πλήθος SATA III" (5/5); sharing → always a note when both are used |
| 19 | 3.5" drives > case bays | error; unknown → note | **new**: "Εσωτερικές Θύρες/Θέσεις 3.5''" (both sites) |
| 20 | PCIe 5.0 drive, board without a PCIe 5.0 M.2 slot | note | **new** Skroutz "Τύπος M.2 = 2 Θύρες PCIe 4.0" |
| 21 | Fans > positions / size not taken | error from a shop page; warning from a maker list | have |
| 22 | Case without fans and none in the build | warning | have (thin) |
| 23 | Many fans for the board's headers | note (always, when > 3 fans) | headers not on shop pages |
| 24 | Front USB-C on the case, no header on the board | note | case: **new** ("Συνδεσιμότητα: USB-C", both sites); board header not on shop pages → note phrased as "check" |
| 25 | RAM faster than the CPU's official speed | note (XMP/EXPO) | **table**: official speed per CPU family (B4) |
| 26 | Tall RAM next to a big air cooler | note, always | — |

**Scenario updates required by your post-Phase-0 decisions:** S09 and S33 expected `error` from a maker list alone; the decision makes them `warning`. **Done 2026-10-10** (both files, with a line in `why`). No other scenario conflicts.

**Tests.**
- Each rule has unit tests: pass, each level, unknown.
- `tests/compat/engine.test.ts` runs all 64 scenarios through the engine and expects exactly the listed level per rule.
- v1's adapter and report stay, as the before picture, until Phase 4 removes v1's builder.

---

## B4. Power and recommended PSU

- `src/engine/tables/gpu-power.json`: TBP per chip, with source + date per row. It has entries for every chip in the data (78 chips). Sources: makers' spec pages (NVIDIA/AMD/Intel), never copied tables.
- `src/engine/tables/cpu-families.json`: per family/model line, PPT (AMD) / PL2 (Intel), the official memory speed (rule 25) and the generation key for B5. A single model can override its family (e.g. 14900KS).
- The formula, per the plan: card TBP + CPU PPT/PL2 + board 50 W + 5 W per stick + 8 W per drive + 3 W per fan + 5 W pump. Recommended = max(card maker's figure (validated), chip-table PSU, ⌈total × 1.3 / 50⌉ × 50). A breakdown per part is returned for Phase 4.
- Check: scenarios S12, S25–S27, S59, S62–S64 with their worked numbers. The value v1 shows today and the formula's value are compared for every builder GPU row (report: how many rise or fall, the 20 largest changes).

## B5. BIOS table (rule 13)

`src/engine/tables/bios.json` is maintained by hand. For each chipset × CPU generation it says `ok` / `update` / `unsupported`, with a source URL + date per row. Coverage: AM4 (A320…X570 × Zen 1–3/Zen 3 refresh), AM5 (600/800 series × Ryzen 7000/8000/9000), LGA1700 (600/700 × 12th–14th gen), LGA1851 (800 series). An unknown chipset or generation gives no finding (never a guess). Skroutz board pages also state "Υποστηριζόμενη Γενιά" and CPU pages "Συμβατό Chipset". Those are read as **checks against the table**: a disagreement is listed in the validation report, it doesn't decide anything.

## B6. Performance tiers

- `src/engine/tables/tiers-cpu.json` and `tiers-gpu.json` hold our own gaming tier 1–10 per chip at 1080p/1440p/4K, plus cores and threads for CPUs (threads are not in the data; plan item 16), each with source + date. They are built from several independent benchmark summaries (e.g. Tom's Hardware's 2026 CPU/GPU hierarchies, fetched and cited), storing only our tier, never their tables. The audit's provisional tiers are **not** reused.
- **Gate (decision "Επίπεδα απόδοσης"):** a tier for every chip in the most-listed quarter. Measured today: **49 desktop CPU chips** (AM5/AM4/LGA1851/1700/1200/1151, no Xeon/EPYC/Threadripper) and **16 consumer GPU chips** (workstation cards excluded, since they are not recommended). Target beyond the gate: every chip the builder offers (193 CPU, 62 GPU); the remainder is reported as coverage.
- `scripts/phase2/tier-coverage.mts` prints coverage per quarter, like the field coverage scripts.

---

## B7. New scraper fields (main) — probe results and schema

**What the shops state** (30 pages: 5 boards, 3 PSUs, 3 cases, 2 cards, 1 CPU, 1 RAM per site; most-listed products):

| Field | Skroutz label | BestPrice label | Sampled |
| --- | --- | --- | --- |
| Board M.2 slots | "Πλήθος Υποδοχών M.2" | "M.2 Θύρες" | 3/5 · 1/5 |
| Board M.2 PCIe gen | "Τύπος M.2" ("2 Θύρες PCIe 4.0") | — | 3/5 |
| Board SATA ports | "Πλήθος SATA III 6Gb/s" ("4 Port") | "SATA 3.0 Θύρες" | 5/5 · 1/5 |
| Board RAM slots (raises today's 71%) | "Πλήθος" ("2 DIMM Slots") | "Υποδοχές Μνήμης" | 5/5 · 1/5 |
| Board max memory | — | "Μέγιστη Μνήμη" ("96GB") | 5/5 |
| BIOS Flashback | "Extra" contains "Bios Flashback" | "Bios Flashback" (value is an icon) | 2/5 · 1/5 |
| Card thickness | "Πάχος" ("43 mm") | — | 2/2 |
| Card power connector | "Power Connectors" ("16-pin") | — | 1/2 |
| PSU ATX 3.x | "ATX 3.1" = Ναι | "Form Factor" = "ATX 3.1" | 3/3 · 3/3 |
| Case 3.5"/2.5" bays | "Εσωτερικές Θύρες 3.5''/2.5''" | "Εσωτερικές Θέσεις 3.5''/2.5''" | 2/3 · 3/3 |
| Case front USB-C | "Συνδεσιμότητα" contains USB-C | same | 3/3 · 3/3 |
| **Not found** | board fan headers, board USB-C header, case expansion slots, case PSU form (SFX-only), PSU native 12V-2x6 cable | | |

The not-found fields stay unknown. Rules 7, 16, 23 and 24 then give the notes in B3 (never errors). Maker pages could fill them later (ASUS/MSI/Gigabyte/ASRock boards; case makers' expansion slots). That would be a separate task → backlog, not this phase.

**Schema diff** (every field nullable; `null` = not stated; old data stays valid; `latest.json` gains keys, nothing is renamed):

| Listing | New fields | Read by |
| --- | --- | --- |
| `MoboListing` | `m2Slots: int`, `m2Gen: int` (highest PCIe gen of its M.2 slots), `sataPorts: int`, `maxMemoryGB: int`, `biosFlashback: bool` (true only when stated; never false from silence) | new `specs.parse_mobo` |
| `GpuListing` | `thicknessMm: number`, `slots: number` (thickness ÷ 20.32 rounded up to 0.5), `powerConnector: '16-pin' \| '8-pin' \| …`, `card: string` (= `normalize.card_key`, the product level Phase 1 waits for) | `specs.parse_gpu`; `card` from main.finish |
| `PsuListing` | `atx3: bool` | new `specs.parse_psu` |
| `CaseListing` | `bays35: int`, `bays25: int`, `usbCFront: bool` | `specs.parse_case` |
| every listing | `availability: 'in-stock' \| 'days' \| 'order' \| null`, `offerPrice: number` (the price of the offer behind `shipping`/`total`/`merchant`) | B8 |

The names follow the synthetic scenario fields (`maxMemoryGB`, `m2Slots`, `sataPorts`, `slots`, `powerConnector`, `atx3`, `usbCFront`). `native12v2x6`, `expansionSlots`, `psuFormFactors`, `fanHeaders` and `usbCHeader` stay in the engine's types but are not collected.

**Fetching.**
- `specs.PARSERS` gains `mobo` and `psu`. Today they have **no** product pages read: 1,601 board models (820 Skroutz + 822 BestPrice listings) and 141 PSU spec groups over 2,265 listings. For PSUs a product = maker + name, since ATX 3.x belongs to a product, not to "850W Gold".
- Existing GPU (627 pages) and case (1,559) pages were cached with parsed fields only. They are re-read once through a per-category parser `VERSION`, the way the makers' cache already works: older entries are re-read after new pages.
- **No budget increase** (150 pages per site per run). Skroutz throttles product pages and blocked at least one category list in all 7 runs measured (backlog #7), so more Skroutz requests are the wrong lever. Order inside the queue: boards first (6 rules), then cases, cards, PSUs. *Estimate:* ~2,000 pages per site → about 14 runs ≈ 3½ days without blocks. More likely 1–2 weeks. Coverage is measured at the gate either way, and the rules work on partial coverage (unknown → note).
- Not storing every raw label: specs.json would grow ~5× and is rewritten every run. Re-reading through `VERSION` is cheaper.
- Tests: `scripts/checks/test_specs.py` gets saved snippets of the probed pages (dt/dd text, not whole pages) for every new parser. They run without selectolax, using the stand-in module approach CLAUDE.md describes, because Windows blocks its DLL locally. CI runs the real parser.

## B8. Offers: availability, real shop, P-01 fixed at the source (main)

- `shipping.py` already opens, for the 60 cheapest listings per site per category per run, the page listing every shop's offer (Skroutz `shops_list`, BestPrice product page). It now records **the offer behind the total**: its price (`offerPrice`), shop (`merchant`, already there), shipping, and availability text mapped to three values. The site shows "with shipping" only when `offerPrice` is within 1 cent of the listing price, or for the offer at the listing price. That retires v1's 2% rule.
- e-shop.gr states availability in its list ("Άμεσα διαθέσιμο", "4-7 εργάσιμες"): read for every e-shop listing.
- **Coverage stays partial, and the plan should say so:** real shop known today for 36.5% of listings, shipping for 33.7%. Availability will be about the same plus e-shop.gr. The price cell shows availability and shop only when known (decision "Διαθεσιμότητα").

## B9. Grouping fixes (main, one batch at a time, each with your OK)

Each batch: offline before/after with `scripts/checks/renormalize_diff.py` (models merged/split, listings moved, history points affected), Python tests with real titles, then your OK, then a scrape with `allow_history_shrink` (+ `allow_data_drop` if a count falls).

1. Coolers/fans/cases: drop BestPrice/Shopflix Greek descriptors ("Διπλού/Τριπλού Ανεμιστήρα 120mm", "Μονού", "Παθητική"); convert Greek look-alike capitals (`_latin`, as boards do); "The Tower 300" = "Tower 300". Fixes D-09 and backlog #10. The audit counted 165 cooler twins.
2. Storage: non-integer TB as GB ("2400GB", D-06); interface and form factor in the key where a model mixes SATA/SAS or M.2/U.2/2.5" (D-12).
3. Skroutz family cards: take the title of the variant whose price and link we keep (D-10).
4. RAM speed from "με Ταχύτητα 3600" (Shopflix) and the range check at the source (D-11).
5. Board DDR4/DDR5 versions grouped by stated memory type instead of by name (the `fdea444` rule's replacement).

Changed model URLs are covered by Phase 1's alias redirects (A2.3), which apply once v2 is live.

---

## B10. Gate and checks

**Gate (plan table + decision):**
1. All 64 scenarios pass in the engine (S09/S33 updated per your decision).
2. A tier for the 49 + 16 chips above.

**Also in the gate report:**
- Field coverage after the scrapes, per field: all models / most-listed quarter / builder rows, in the audit's table format.
- The validation report.
- The power comparison.
- Lighthouse for `/gpu`, `/case`, `/builder` (mobile + desktop, 3 runs) unchanged from the Phase 1 gate within run noise.
- `npm run check`.

**Bytes.** The engine is not loaded by any page in Phase 2. Its tables (tiers ≈ 260 rows, TBP 78, CPU families ~40, BIOS ~60) are *estimated* at 6–9 KB gzip. Phases 3/4 decide whether they ship as JS or are folded into builder rows at build time, measured against the builder's 300 KB data / 110 KB JS budget. New list fields add *estimate* ≤ 3 KB gzip to `list.json` for boards and cases. `builder.json` gets only the fields the rules read (measured at Stop 3; the builder mobile score has 0–2 points of room).

---

## B11. Questions for you (my recommendation first)

**Owner's answers (2026-10-10)** — they replace the questions below:
1. **Rules 27–30: Phase 4**, not Phase 2. The engine keeps rules 1–26; scenario ids stay 1–26.
2. **Scraper changes approved**, **one commit per change on main, each with its evidence and a green scrape** before the next is pushed. **New Skroutz product-page fetches need a separate Skroutz budget approval first** (pages per run, categories, pace): until then new reads (boards, PSUs, re-reading cards and cases) run on **BestPrice only**, and the Skroutz side of every new parser is switched off.
3. **Grouping fixes: one batch at a time, each with the owner's OK** (as B9).
4. **PSU 12V-2x6: "ATX 3.x" counts as a likely yes, shown as an estimate** (`basis: 'estimate'`).
5. **Tiers: Tom's Hardware 2026 rankings plus one more source, cited per chip; where they disagree, the tier is unknown and the chip goes on a list for the owner** (not decided by me).

Also done with the approval: scenarios S09 and S33 now expect `warning` (maker list only).

1. **Rules 27–30 (CPU/card balance, cores, VRAM, over-spent CPU):** the plan lists 26 rules for Phase 2 but puts tiers in Phase 2 and the rules' use in Phase 4. → **Build them in Phase 2** as engine rules that take the use + resolution as input, with new scenarios (S65+). They're small once tiers exist, and Phase 4 then only wires them. The alternative leaves them for Phase 4.
2. **Scraper first, on main, as part of this approval** (Stop 2), so coverage fills while v2 work goes on. → **Yes.** The alternative is a separate approval for the scraper diff before Stop 2.
3. **Grouping fixes (B9) inside Phase 2**, one batch at a time with your OK each → **yes**, since the audit assigned them here. The alternative moves them to their own task after Phase 2.
4. **PSU 12V-2x6 native cable** is not stated anywhere sampled. → **Use "ATX 3.x = yes" as the proxy** for rule 15 and label it an estimate ("Τα ATX 3.x τροφοδοτικά έχουν συνήθως εγγενές βύσμα"). The alternative: rule 15 always says "check the PSU's cables" for 12V-2x6 cards.
5. **Tier sources.** → Tom's Hardware CPU and GPU hierarchies (2026) + one more independent source per chip family where they disagree, cited per row. Tell me if you prefer other sources.

## B12. Risks

- **Skroutz blocking (backlog #7)** slows the new fields. Coverage at the gate may be lower than the probe suggests. It is reported, not hidden, and rules on unknown data give notes.
- **Probe size:** 30 pages of the most-listed products. Less-listed products (older boards, small brands) probably state less. The coverage after the scrapes is the real number.
- **BestPrice's "Bios Flashback" value is an icon** (empty text). The parser reads the icon's class, verified on saved pages before shipping. If unreadable, only Skroutz's "Extra" counts.
- **Validation can hide good data:** a range that is too tight turns real values into unknown (e.g. a 28 mm real low-profile cooler). Every check's rejected values are in the report, with 10 examples, for you to look at.
- **Local Python can't import selectolax** (Windows Application Control), so parser tests run on a stand-in locally and for real only in CI. The first scrape after Stop 2 is watched run by run (`gh run view`), and its log is checked for every new field.
- **PSU and RAM are spec groups:** fields like ATX 3.x belong to one product inside "850W Gold". The engine evaluates the chosen *listing's* fields. Phase 4's builder has to let you pick a product, not a spec group, for rule 15 to mean something (noted for Phase 4).
