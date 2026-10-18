# Main backend queue (A3 rest, RAM speed, SAFER limits, B9, B8) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Every item changes the
> live scraper on `main`: **one item at a time, each with the owner's OK before its push**, the next only after the
> previous item's first scheduled scrape is green with "history check: nothing lost", `[<cat>/<source>]` counts close
> to the last 2–3 runs and an accepted Vercel build (PROJECT-STATE rule 1).

**Goal:** finish the backend changes the v2 pages need — clean model groups (B9) before the product page makes model
keys public, RAM speeds right in model names, out-of-range specs rejected before the scraper's "safer value" merge,
and the offer behind each total (B8) — without losing price history.

**Architecture:** all code goes on branch `a3-queue` (worktree
`C:\Users\Teo\AppData\Local\Temp\claude\C--Users-Teo-Desktop-PROJECTS-Gpu-price-comparison\7b006064-1e2b-4010-a268-f00c81da5c05\scratchpad\a3`),
rebased onto `origin/main` before each push, one commit per item. Renames of model keys go through one code-owned
file, `scraper/model_aliases.json`, which both the scraper (to move price history to the new key) and v2's build (to
redirect old product addresses and resolve saved builds) read.

**Tech Stack:** Python 3.12 (curl_cffi, selectolax — capped versions), the existing `scripts/checks/*.py` test
scripts (no pytest), `scripts/checks/renormalize_diff.py` for offline before/after.

**Spec:** `docs/phase2/plan.md` B8, B9 and the plausible-range table; `docs/phase2/gate.md` "Where B9 goes";
`docs/phase2/validation-report.md`; `docs/PROJECT-STATE.md` rule 1 and "Εκκρεμότητες".

## Global Constraints

- Never commit or push from v1's folder; never push `public/data` from a local run; never `Co-Authored-By`.
- Each item: Python tests on **real titles / saved pages** (fixtures under `scripts/checks/fixtures/`), `py_compile`
  of `scraper/`, offline before/after on the current `public/data` (`renormalize_diff.py`), a short report in
  `docs/phase3/backend/<item>.md` (on v2), then **ask the owner** before the push. Workflow runs with
  `allow_history_shrink` / `allow_data_drop`: ask first (rule 9).
- No new Skroutz page reads (rule 10). Python dependencies keep their upper bounds.
- Scraper output schema changes (new fields) only where an item says so, each named in its question to the owner.

## Review Focus

1. A model key renamed by a batch keeps its price history (moved to the new key, same-day rule of
   `merge_history.py`), and `merge_history.py check` does not refuse the push for points that moved. Test in Q5.
2. A batch that merges two models changes the merged model's cheapest price only to the lower of the two; it never
   drops listings. Each report lists listings per model before/after.
3. Real series names ending in digits ("Viper Elite 5", "Aegis 5") are not read as speeds or counts. Test in Q3.
4. A shop value outside the plausible range is dropped before `SAFER`, so a wrong 3.502 mm clearance can no longer
   beat a right 350 mm one. Test in Q4.
5. A scrape that fails mid-way after a rename leaves `model_aliases.json` and history consistent (the alias file is
   code, the fold is idempotent). Test in Q5.

---

### Q1–Q2: A3 #3 and #4 (already built, waiting)

- Q1 `9b85143` PSU ATX 3.x from titles and BestPrice URLs. Q2 `da944a6` case drive bays and front USB-C.
- Each: rebase, tests, ask, push, watch the next scheduled scrape (report).

### Q3: RAM speed in model names — one change with B9 batch 4

The RAM speed fix (PROJECT-STATE "Εκκρεμότητες") and B9 batch 4 (speed from Shopflix "με Ταχύτητα 3600") both
change `normalize_ram` speeds. **Done as one commit**, so RAM models are renamed and their history moved once.

**Files:** `scraper/normalize_ram.py`, `scripts/checks/test_normalize_ram.py` (new, real titles from
`public/data/ram/latest.json`), `scraper/model_aliases.json` (entries from the before/after).
- Speeds: Shopflix "με Ταχύτητα N" read as MT/s; e-shop "60000MHz"-style typos and any value outside DDR4 1,600–5,333
  / DDR5 4,000–10,000 MT/s (phase2/plan.md range table) → speed unknown (the model name has no speed) instead of a
  wrong one; DDR5 "2400/2800" (the real clock, not MT/s) → ×2 only when the title says MHz **and** the doubled
  value is a JEDEC/XMP speed in the range, else unknown. Lenovo DDR4/DDR5 titles from the validation report as
  fixtures.
- [ ] Failing tests from real titles → implement → `renormalize_diff.py ram ram` before/after (models merged/split,
  listings moved, history points affected) → aliases → report → **ask** → push → workflow run with
  `allow_history_shrink` (**ask**) → watch.

### Q4: Plausible ranges before `SAFER` (proposal — owner OK on this plan item first)

**Files:** `scraper/ranges.py` (new: the same table as v2's `src/data/validate/ranges.ts`, one line each with the
v2 id), `scraper/specs.py` (drop an out-of-range value per site before `SAFER` picks the safer one; log
`[<cat>] range: <field> <value> from <site> dropped`), `scripts/checks/test_ranges.py`.
- Test: Spire U20M case with BestPrice `gpuMaxMm` 3.502 and Skroutz 350 → 350 survives (today `SAFER` keeps the
  smaller: 3.502); a cooler 25 mm "height" (fan thickness) → dropped below the 30 mm rule.
- v2 keeps its own check (`enforce`); a later v2 test compares the two tables once v2 merges main.

### Q4b: Wrong imported Skroutz lows (owner 18/10 — own plan + owner OK before push)

Owner: "find which Skroutz product gives 115.43 and why it lands in these models (site_history.py, spec-grouped
models take the 3 cheapest Skroutz products). Add the fix to the main backend queue after the SAFER item, with its
own plan and my OK before push."

Findings so far (controller, 18/10, read-only on main's data):
- The same imported `low` is shared by 3+ models in every category: 378 models in all (gpu 6, cpu 13, mobo 37,
  ram 20, storage 49, psu 9, case 50, fan 127, cooler 67). Values repeat ACROSS categories (369.59 € in cpu ×10,
  mobo ×13, storage ×14; 24 € in fan ×30, storage ×24, cooler ×12, case ×9, psu ×9; 47.55 € in ram ×13 and case
  ×11; 37.05 € in fan and cooler), so it is not one product of a spec group: it hits single-product categories too.
- Where the point is still inside the 365 days of `history.json`, many sit on the same day: 369.59 € on
  2025-09-10 for 9 CPU models, 115.43 € and 47.55 € on 2025-09-10 too. Lead: Skroutz's `price_graph` series
  carries bogus values on some dates (a Skroutz-side glitch), and `enrich` takes `min(past)` over the whole series
  without any plausibility check.
- Next: fetch the `price_graph` of 2–3 affected products (existing request type, within the daily history budget;
  no new Skroutz page kinds) and confirm the bogus points; then the fix = drop implausible imported points before
  `min(past)` (the C6 dip rule, `dips.ts` logic ported to Python, plus a cross-model check) and re-import the
  affected models' `low` once (`history.yml` input or a one-off reset of their `history_imported.json` entries —
  ask before any workflow run). v2 already ignores a low shared by 3+ models in a category (step 4, owner 18/10).
- Owner 18/10: the fix also removes the bad imported daily points (`"i": 1`) from `history.json`, so the push
  needs a scrape/history run with `allow_history_shrink`. Plan it with an **offline before/after on a copy of main's
  history files: points removed per category** (and models whose imported `low` changes), and **ask the owner
  before the push and before the run**.

### Q5: Key aliases and history fold (needed by every B9 batch)

**Files:** `scraper/model_aliases.json` (new, code-owned like `overrides.json`: `{cat: {oldKey: newKey}}`),
`scraper/main.py` (`update_history` folds an aliased key's points into the new key once: same-day → our own scraped
point beats an imported one, lower price between two of the same kind; then removes the old key),
`scraper/site_history.py` (`history_imported.json` entries follow the alias), `scraper/merge_history.py` (`check`
treats a point moved to its alias target as present), `scripts/checks/test_aliases.py`.
- Tests: fold is idempotent (running twice = once); a chain A→B, B→C resolves to C; a cycle (A→B, B→A, or longer)
  is rejected at load with an error naming the keys; an alias to a key that already has history merges with the
  same-day rule; `check` passes when points moved, fails when a point really vanished; an alias to a key that does
  not exist yet still moves the history (the new key appears on the next scrape).
- **Before the first push that renames anything (owner 17/10):** run the fold offline on a copy of main's current
  `public/data/*/history.json` (+ `history_imported.json`) files: points before = points after (minus the 365-point
  trim), and `merge_history.py check` against the copy passes. Report both numbers per category.
- v2 side (step 4 plan, Task 5): the build reads `scraper/model_aliases.json` (after v2 merges main) into
  `MODEL_ALIASES`.

### Q6–Q9: B9 grouping batches (each: offline before/after, owner OK, aliases, `allow_history_shrink` run)

- Q6 batch 1: coolers / fans / cases — drop BestPrice/Shopflix Greek descriptors ("Διπλού/Τριπλού Ανεμιστήρα 120mm",
  "Μονού", "Παθητική"), Greek look-alike capitals via `_latin` (as boards), "The Tower 300" = "Tower 300"; keep "RGB"
  in the Lian Li O11 Dynamic EVO RGB name and delete its `overrides.json` entry (the root fix named there).
- Q7 batch 2: storage — non-integer TB as GB ("2400GB"); interface / form factor in the key where one model mixes
  SATA/SAS or M.2/U.2/2.5".
- Q8 batch 3: Skroutz family cards take the title of the variant whose price and link are kept.
- (Batch 4 = Q3.)
- Q9 batch 5: board DDR4/DDR5 versions grouped by the stated memory type, replacing the `fdea444` rule.

### Q10: B8 offers (data structure change — ask before building)

- New listing fields `availability: 'in-stock' | 'days' | 'order' | null` and `offerPrice` from the shops pages
  `shipping.py` already opens; e-shop.gr availability from its list. Coverage stays partial (~36% of listings with a
  known shop). v2 shows availability only where known (product page Task 6 column appears by itself).

## Timing

Each item waits for the previous item's first scheduled scrape (every ~6 h, often started late). Ten items ≈ 3–5
days at best. Step 4's gate needs Q5–Q9 live (B9 batches 1–5).
