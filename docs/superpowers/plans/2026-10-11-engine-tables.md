# Engine Tables (roadmap step 2: rule 25, B4, B5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the compatibility engine three hand-made, source-cited tables so its rules work on real builds: official memory speed per CPU (rule 25), power figures for the PSU formula (rule 14, B4), and chipset × CPU generation BIOS support (rule 13, B5).

**Architecture:** Typed TypeScript data modules in `src/engine/data/` (not `src/engine/tables/`, which would sit next to the existing `src/engine/tables.ts` file and make `'../tables'` imports ambiguous). Each row carries the official URL it was read from and the date. Rules import the tables directly; the engine stays pure (no fetch, no React). Items run in order 1 → 2 → 3 because B4 needs CPU power figures per model and B5 needs the generation key from item 1.

**Tech Stack:** TypeScript (strict), Vitest 3, `vite-node` for scripts. No new dependencies.

**Spec:** `docs/phase2/plan.md` §B3 (rules 13, 14, 25), §B4 (power), §B5 (BIOS); `docs/redesign-v2.md` "Κατανάλωση και τροφοδοτικό" and rule 13; owner's decisions of 2026-10-11 (below).

## Global Constraints

- Worktree `C:\Users\Teo\Desktop\PROJECTS\buildcraft-v2`, branch `v2`. Never touch `C:\Users\Teo\Desktop\PROJECTS\Gpu price comparison`. Never edit `public/data/**`.
- Commit locally only. **Never push.** Conventional commits, **no `Co-Authored-By` line, no mention of Claude.** Git identity already configured.
- No new dependencies. `npm run check` passes at the end of every task. No new lint suppressions.
- **Hallucination rule (owner, verbatim): "every value must be read from its source page fetched during the work, never from memory. If a value can't be found on an official page, leave it out (unknown)."**
  - "Fetched during the work" = downloaded in this task, either with the WebFetch tool (load it with ToolSearch `select:WebFetch` if it's deferred) or, when WebFetch times out (it does on amd.com, 2026-10-11), with `curl.exe -s -L -m 40 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" -o <file> <url>`, saving the raw HTML under `.superpowers/sdd/2026-10-11-engine-tables/pages/` (git-ignored) as evidence; the value is read from that file's text. WebSearch may be used only to *find* an official URL; a search snippet is never a source of a value.
  - Intel pages download with `-A "curl/8.0"` when the Chrome user agent is refused (Task 2). AMD's specifications table `https://www.amd.com/en/products/specifications/processors.html` counts as an official page for each chip's own record. If live amd.com refuses downloads (Akamai 403), a `https://web.archive.org/web/2026id_/<exact amd.com URL>` snapshot may be read instead; `source` stays the amd.com URL and the row gets a comment `// read from web.archive.org snapshot <timestamp>` (controller ruling, 2026-10-11).
  - Official = the maker's own site only: `amd.com`, `intel.com` (incl. `ark.intel.com`), `nvidia.com`, and for B5 the chipset/CPU maker's or the board maker's own support pages. Not Wikipedia, TechPowerUp, retailers, reviews.
  - Every row stores `source` (the exact URL fetched) and `checked` (`'2026-10-11'` or the day it was fetched).
  - If a page doesn't show a value (e.g. Intel shows no 4-stick speed, or the page needs JavaScript and WebFetch sees no spec), that value is **omitted**. Never derive one value from another (no "4-stick = 2-stick minus X", no "PPT = 1.35 × TDP" unless the official page states that figure for that model).
  - The task report lists every URL fetched and, per row, the exact text on the page each value came from (a short quote).
- **Reviewer rule (owner):** the task reviewer fetches the source of **at least 10 rows per table (all rows if fewer)** and compares every value of those rows with the page.
- Model names in the tables are the CPU/GPU chip names **exactly as in the data** (`public/data/cpu/latest.json` `chip`, e.g. `Ryzen 5 7600`, `Ryzen 7 9800X3D`, `Core i5-14600KF`, `Core Ultra 7 265K`; GPU `chip`, e.g. `RTX 5070`). Lookup is case-insensitive with spaces collapsed.
- Engine messages are `{el, en}`, Greek with "εσύ", like the existing rules in `src/engine/rules/`.
- **B4 rule (owner, verbatim): "if the PSU is at or above the card maker's figure but below the formula, that is a warning, not an error (e.g. 9950X + RTX 5090 + 1000 W: NVIDIA says 1000 W). Error only when below the maker's figure, or below the formula when the maker gives none. Update S62 to match."** The owner sees the before/after PSU report before the builder uses the formula.

## Review Focus

1. A CPU whose name is not in the table (e.g. an EPYC, or a new model) gives rule 25 **unknown**, never a guessed speed. Test in Task 1.
2. A RAM kit of the other DDR type than the CPU's table row (DDR4 kit, DDR5-only CPU row) gives **unknown** for rule 25 (rule 2 deals with the mismatch). Test in Task 1.
3. More than 2 sticks uses the 4-stick value; when the row has no 4-stick value, rule 25 is **unknown**, not the 2-stick value. Test in Task 1.
4. Name matching is exact (after case/space normalisation): `Core i5-14600K` must not match a `Core i5-14600KF` row or the reverse. Test in Task 1.
5. A row without a source URL, or with a non-official domain, fails a table-integrity test. Test in Task 1 (and it covers every later row).

---

### Task 1: CPU memory table schema, lookup, rule 25, Ryzen 7000 rows

**Files:**
- Create: `src/engine/data/cpuMemory.ts`
- Modify: `src/engine/rules/platform.ts` (`rule25`, lines ~104–116)
- Modify: `tests/unit/engine/rules.test.ts` (the rule 25 block, lines ~220–224)
- Modify: `tests/compat/scenarios/s58-ram-faster-than-official.json`
- Create: `tests/unit/engine/cpuMemory.test.ts`

**Interfaces:**
- Produces (exact names; Tasks 2 and later items use them):

```ts
// src/engine/data/cpuMemory.ts
export type CpuGeneration =
  | 'ryzen-3000' | 'ryzen-4000g' | 'ryzen-5000' | 'ryzen-5000g' | 'ryzen-7000' | 'ryzen-8000g' | 'ryzen-9000'
  | 'intel-10' | 'intel-11' | 'intel-12' | 'intel-13' | 'intel-14' | 'core-ultra-200s';
export interface MemorySpeed { sticks2?: number; sticks4?: number } // MT/s as the page states it (our data calls it MHz)
export interface CpuMemoryRow {
  models: string[];            // chip names exactly as in the data
  generation: CpuGeneration;   // our classification from the page's series name (used by B5)
  memory: { DDR4?: MemorySpeed; DDR5?: MemorySpeed };
  source: string;              // exact official URL fetched
  checked: string;             // 'YYYY-MM-DD'
}
export const CPU_MEMORY: CpuMemoryRow[];
export const OFFICIAL_DOMAINS: string[]; // ['amd.com', 'intel.com']
export function cpuRow(name: string): CpuMemoryRow | undefined;      // case-insensitive, spaces collapsed, exact model match
export function officialSpeed(name: string, type: 'DDR4' | 'DDR5', sticks: number): { mhz: number; sticks: 2 | 4; source: string } | null;
// sticks ≤ 2 → sticks2; sticks > 2 → sticks4; missing value → null
```

- Rows whose page states different speeds for single- and dual-rank modules: store the **lower** of the two for that stick count (our data doesn't know ranks; the lower one never wrongly says "within official support"), and say so in the report.

**Rule 25 after this task:** for each RAM part: `sticks` = sum over all RAM parts of `modules × quantity` (if any RAM part has no `modules`, unknown); `type` = that part's `type`; `official = officialSpeed(cpu.name, type, sticks)`. `null` official or `null` speed → unknown (message names what's missing: the CPU isn't in the table / no official speed for that DDR type / no official speed for N sticks). Speed ≤ official → pass; faster → note (same XMP/EXPO fix text). Messages say the stick count, e.g. "επίσημα έως 5200 MHz με 2 μονάδες" / "officially up to 5200 MHz with 2 sticks". The `officialMemMhz` field is no longer read anywhere.

- [ ] **Step 1: Fetch the Ryzen 7000 pages.** For every `Ryzen … 7xxx` desktop chip in `public/data/cpu/latest.json` (socket AM5; e.g. `Ryzen 5 7600`, `Ryzen 5 7600X`, `Ryzen 7 7700`, `Ryzen 7 7700X`, `Ryzen 7 7800X3D`, `Ryzen 9 7900`, `Ryzen 9 7900X`, `Ryzen 9 7900X3D`, `Ryzen 9 7950X`, `Ryzen 9 7950X3D` — use the list in the data, not this one), fetch its amd.com product page and read the memory specification (DDR5 speed for 2 and 4 modules, per rank if given). Write the quotes into the report. Group models with identical values and the same page type into one row only if each model's own page was fetched (`source` = one of them; list the others' URLs in the report).
- [ ] **Step 2: Write the failing tests.**
  - `tests/unit/engine/cpuMemory.test.ts`: integrity — every row has ≥1 model, a `source` whose host ends with an `OFFICIAL_DOMAINS` entry, `checked` matching `/^\d{4}-\d{2}-\d{2}$/`, at least one speed, positive integers, `sticks4 ≤ sticks2` when both exist; no model appears in two rows. Lookup — `cpuRow('ryzen 5  7600')` finds the `Ryzen 5 7600` row; `cpuRow('Ryzen 5 7600X')` does not return the `Ryzen 5 7600` row (and vice versa); `cpuRow('EPYC 4124P')` undefined; `officialSpeed` returns `sticks: 2` for 1 and 2 sticks and `sticks: 4` for 3 and 4; returns null for a missing 4-stick value and for a type the row lacks.
  - `tests/unit/engine/rules.test.ts` rule 25 block (replace the two `officialMemMhz` tests): with the real `Ryzen 5 7600` row (read the numbers from `cpuRow`, don't hard-code them): 2 sticks at the 2-stick speed → pass; 2 sticks 1 MHz faster → note; 4 sticks at the 2-stick speed → note if the 4-stick value is lower, unknown if the row has no 4-stick value; a DDR4 kit → unknown; `EPYC 4124P` → unknown; RAM part without `modules` → unknown.
  - Run: `npx vitest run tests/unit/engine/cpuMemory.test.ts tests/unit/engine/rules.test.ts` → FAIL.
- [ ] **Step 3: Implement** `cpuMemory.ts` (types, `OFFICIAL_DOMAINS`, the fetched Ryzen 7000 rows, `cpuRow`, `officialSpeed`) and the new `rule25`. Run the two test files → PASS.
- [ ] **Step 4: S58.** In `tests/compat/scenarios/s58-ram-faster-than-official.json`: remove `officialMemMhz` from the CPU's `fields`, remove `syntheticFields` and the `note`, set `"synthetic": false`; keep `expected` unchanged; rewrite `why` with the fetched value and its URL ("AMD lists DDR5-<n> for the Ryzen 5 7600 with 2 modules (<url>, fetched 2026-10-11); 6000 MHz runs only with EXPO/XMP"). **Only if** the fetched 2-module DDR5 value is below 6000; otherwise stop and report NEEDS_CONTEXT (the scenario would then be wrong). Run `npx vitest run tests/compat` → PASS, and the printed totals still add up to 64.
- [ ] **Step 5: Full check, then commit.** `npm run check` passes. `git add` the five files; `git commit -m "feat(engine): official memory speed table (Ryzen 7000) for rule 25"`.

---

### Task 2: Fill the CPU memory table + coverage report

**Files:**
- Modify: `src/engine/data/cpuMemory.ts` (rows only)
- Create: `scripts/phase2/cpu-memory-coverage.ts`
- Modify: `package.json` (one script: `"cpu-memory:coverage": "vite-node scripts/phase2/cpu-memory-coverage.ts"`)
- Create (generated, committed): `docs/phase2/cpu-memory-coverage.md`

**Interfaces:**
- Consumes: Task 1's `CPU_MEMORY`, `cpuRow`, `CpuMemoryRow`, `CpuGeneration`.

- [ ] **Step 1: Coverage script first** (so progress is measurable). Reads `public/data/cpu/latest.json`; takes listings with socket `AM5`, `AM4`, `LGA1700`, `LGA1851`, excluding chips matching `/EPYC|Xeon|Threadripper|Opteron/i`; groups by `chip` with listing count; writes `docs/phase2/cpu-memory-coverage.md` (deterministic, no timestamp): totals per socket (chips, covered, uncovered), then per socket a table of chips sorted by listing count desc then name: chip, listings, covered yes/no, generation, DDR4 2/4, DDR5 2/4 (— when omitted), source host. Run it: today only Ryzen 7000 is covered.
- [ ] **Step 2: Fill rows**, most-listed chips first, per the hallucination rule: amd.com product pages for Ryzen 3000/4000G/5000/5000G/7000/8000G/9000 desktop; intel.com / ark.intel.com product pages for Core 12th/13th/14th gen (LGA1700, incl. F/K/KF/T and Pentium/Celeron on LGA1700) and Core Ultra 200S (LGA1851). The goal is every chip in the coverage list; a chip whose official page can't be fetched or doesn't state the memory speed stays uncovered, with the reason in the report (e.g. "ARK page needs JavaScript; no spec in fetched HTML"). Intel pages usually state one "Max Memory Speed" per DDR type and no 4-DIMM figure: store it as `sticks2` only.
- [ ] **Step 3: Regenerate the coverage file**, run `npx vitest run tests/unit/engine` → PASS (integrity test covers all new rows).
- [ ] **Step 4: Full check, then commit.** `npm run check` passes. Commit the four files: `git commit -m "feat(engine): official memory speeds for desktop CPUs + coverage report"`.

---

---

## Item 2 — B4: power formula (Tasks 3–5)

**Decisions for item 2 (controller, 2026-10-12, from the owner's rules):**
- "Card maker's figure" `makerW` = the larger of the card's own stated minimum PSU (`minPsu`, validated) and the **chip maker's** stated system-power figure (NVIDIA "Required System Power", AMD "Recommended PSU", Intel's if stated). Both are makers' figures; the owner's example ("NVIDIA says 1000 W") is the chip maker's.
- The formula `formulaW` = ⌈(card board power + CPU power limit + 50 W board + 5 W per RAM stick + 8 W per drive + 3 W per fan + 5 W AIO pump) × 1.3 / 50⌉ × 50 (plan §B4). With no graphics card the card term is 0. If the card's board power or the CPU's power limit isn't in the tables, `formulaW` is **null** (never a guess).
- CPU power limit: Intel "Maximum Turbo Power" (PL2) from its intel.com page; AMD "PPT" **only** where an official amd.com page states it for that model, or states the PPT for that model's TDP class while the model's own page states its TDP. In the second case cite both URLs in a comment and list it in the report. Never compute 1.35 × TDP.
- **S59 changes too** (14700K + RTX 5070 Ti + 750 W, card maker 750 W, formula 850 W): by the owner's rule it is a warning, the same case as S62. Ruling recorded; reported to the owner.
- v1's `V1_GPU_PSU` table and its +100 W bump (no source) are no longer used by rule 14. `v1RecommendedPsu` stays exported for the before/after report.

### Task 3: GPU power table + coverage

**Files:**
- Create: `src/engine/data/gpuPower.ts`
- Create: `tests/unit/engine/gpuPower.test.ts`
- Create: `scripts/phase2/gpu-power-coverage.ts`; Modify: `package.json` (`"gpu-power:coverage": "vite-node scripts/phase2/gpu-power-coverage.ts"`)
- Create (generated, committed): `docs/phase2/gpu-power-coverage.md`

**Interfaces (produces):**

```ts
// src/engine/data/gpuPower.ts
export interface GpuPowerRow {
  chips: string[];        // GPU chip names exactly as in the data (`chip`, e.g. 'RTX 5070', 'RX 9070 XT', 'Arc B580')
  boardPowerW?: number;   // NVIDIA "Total Graphics Power", AMD "Typical Board Power (Desktop)", Intel "Total Board Power"
  makerPsuW?: number;     // NVIDIA "Required System Power", AMD "Recommended PSU", Intel's recommended PSU if stated
  source: string;         // exact official URL fetched
  checked: string;        // 'YYYY-MM-DD'
}
export const GPU_POWER: GpuPowerRow[];
export const GPU_OFFICIAL_DOMAINS: string[]; // ['nvidia.com', 'amd.com', 'intel.com']
export function gpuPowerRow(chip: string): GpuPowerRow | undefined; // case-insensitive, spaces collapsed, exact
```

- [ ] **Step 1: Coverage script first.** Reads `public/data/gpu/latest.json`; consumer chips only (exclude what the site calls workstation: reuse the GPU category's own `pro` test from `src/lib/categories.tsx` if it can be imported under vite-node, else exclude `/RTX PRO|RTX A\d|\bAda\b|^T\d|Quadro|Radeon PRO|Arc Pro/i` and say so); groups by `chip` with listing counts; writes `docs/phase2/gpu-power-coverage.md` (deterministic): totals, then per brand a table: chip, listings, covered, board power, maker PSU, source host.
- [ ] **Step 2: Failing tests** in `tests/unit/engine/gpuPower.test.ts`: integrity (≥1 chip, official domain, date format, at least one of the two figures, positive integers, no chip in two rows); exact lookup (`'rtx  5070'` finds `RTX 5070`; `RTX 5070` ≠ `RTX 5070 Ti` both ways; unknown chip undefined). Run → FAIL.
- [ ] **Step 3: Fill rows**, most-listed first, per the hallucination rule (nvidia.com product/spec pages, amd.com graphics product pages, intel.com Arc pages). A chip with no fetchable official figure stays uncovered with the reason. Run tests → PASS; regenerate coverage.
- [ ] **Step 4:** `npm run check` → passes. Commit the files: `git commit -m "feat(engine): official GPU board power and system PSU table + coverage"`.

### Task 4: CPU power limit table + coverage

**Files:**
- Create: `src/engine/data/cpuPower.ts`
- Create: `tests/unit/engine/cpuPower.test.ts`
- Create: `scripts/phase2/cpu-power-coverage.ts`; Modify: `package.json` (`"cpu-power:coverage": "vite-node scripts/phase2/cpu-power-coverage.ts"`)
- Create (generated, committed): `docs/phase2/cpu-power-coverage.md`

**Interfaces (produces):**

```ts
// src/engine/data/cpuPower.ts
export interface CpuPowerRow {
  models: string[];       // CPU chip names exactly as in the data; several only if each model's page states the same figure
  kind: 'PL2' | 'PPT';    // Intel "Maximum Turbo Power" / AMD "PPT"
  watts: number;
  source: string;         // exact official URL (for a TDP-class PPT: the PPT page; the model page URL in a comment)
  checked: string;
}
export const CPU_POWER: CpuPowerRow[];
export function cpuPowerRow(name: string): CpuPowerRow | undefined; // same matching as cpuRow
```

- [ ] **Step 1: Coverage script** (same CPU list and exclusions as `scripts/phase2/cpu-memory-coverage.ts`; reuse its code by importing a shared helper or copying the 10-line chip-list part — say which). Writes `docs/phase2/cpu-power-coverage.md`.
- [ ] **Step 2: Failing tests** in `tests/unit/engine/cpuPower.test.ts`: integrity (official domains = `OFFICIAL_DOMAINS` from cpuMemory.ts, date, positive integer watts, kind matches brand: Intel models → PL2, Ryzen → PPT; no model in two rows); exact lookup incl. a real K/KF pair. Run → FAIL.
- [ ] **Step 3: Fill rows.** Intel: "Maximum Turbo Power" from each model's intel.com page (Task 2's downloads in `.superpowers/sdd/2026-10-11-engine-tables/pages/` were fetched during this work and may be re-read; download any missing). AMD: per the decision above; if no official page states PPT, AMD models stay uncovered with the reason. Run tests → PASS; regenerate coverage.
- [ ] **Step 4:** `npm run check` → passes. Commit: `git commit -m "feat(engine): official CPU power limits (PL2/PPT) table + coverage"`.

### Task 5: Power estimate, rule 14, scenarios, before/after PSU report

**Files:**
- Modify: `src/engine/tables.ts` (add `POWER` constants), `src/engine/rules/power.ts` (`powerEstimate`, `rule14`), `src/engine/index.ts` (export `powerEstimate` and its types)
- Modify: `tests/unit/engine/rules.test.ts` (rule 14 block)
- Modify: `tests/compat/scenarios/s62-psu-9950x-5090-1000w.json`, `tests/compat/scenarios/s59-*.json` (expected rule 14 → `warning`, `why` rewritten with the owner's rule)
- Modify: `tests/compat/engine-scenarios.test.ts` (`KNOWN_GAPS`: remove or update the R14 entries the new rule settles, each change with its reason)
- Create: `scripts/phase2/psu-before-after.ts`; Modify: `package.json` (`"psu:before-after": "vite-node scripts/phase2/psu-before-after.ts"`)
- Create (generated, committed): `docs/phase2/psu-before-after.md`

**Interfaces (produces):**

```ts
// src/engine/tables.ts
export const POWER = { boardW: 50, perStickW: 5, perDriveW: 8, perFanW: 3, pumpW: 5, headroom: 1.3, roundToW: 50 } as const;

// src/engine/rules/power.ts
export interface PowerPart { key: string; label: Msg; watts: number }
export interface PowerEstimate {
  parts: PowerPart[];          // per-part breakdown (card, CPU, board, RAM, drives, fans, pump)
  totalW: number | null;       // null when the card's board power or the CPU's limit is unknown
  formulaW: number | null;     // ⌈totalW × headroom / roundToW⌉ × roundToW
  makerW: number | null;       // max(card minPsu, chip makerPsuW), null when neither
  makerFrom: 'card' | 'chip' | null;
  missing: Msg[];              // what kept totalW null, for messages
}
export function powerEstimate(b: Build): PowerEstimate;
```

Rule 14 levels (owner's rule):
1. `makerW` and `formulaW` both null → unknown (as today).
2. `makerW` ≠ null and watts < `makerW` → **error**, basis `stated`.
3. `makerW` = null and watts < `formulaW` → **error**, basis `estimate`.
4. `makerW` ≠ null, `formulaW` ≠ null, `makerW` ≤ watts < `formulaW` → **warning**, basis `estimate` ("reaches the maker's figure but not the estimate for the whole build").
5. Otherwise R = max of the non-null figures; watts ≤ R × (1 + `MARGIN.psuShare`) → warning (tight); else pass. Basis `stated` when `makerW` ≥ `formulaW` (or formula null), else `estimate`.
Messages `{el, en}` name the figures, e.g. "Τροφοδοτικό 1000 W· ο κατασκευαστής ζητά 1000 W, η εκτίμηση για όλο το build είναι 1200 W." and, when `formulaW` is null, why (from `missing`).

- [ ] **Step 1: Failing tests** (rules.test.ts rule 14 block, numbers read from the tables, not hard-coded): each of the 5 levels; the owner's example 9950X + RTX 5090 + 1000 W → warning (if the 9950X has no PPT row, the test still expects warning via level 5 and says so); a card whose chip isn't in `GPU_POWER` → formula null, maker figure from `minPsu` only; no card + an Intel CPU with a PL2 row → formula from CPU + rest; `powerEstimate` breakdown sums to `totalW`; quantities (2 RAM kits × modules, storage quantity, fan pack × quantity, AIO pump). Run → FAIL.
- [ ] **Step 2: Implement** `POWER`, `powerEstimate`, new `rule14`. Run the unit tests → PASS.
- [ ] **Step 3: Scenarios.** Update S62 and S59 (`expected` rule 14 `warning`; `why` cites the owner's rule and the figures the engine now uses). Run `npx vitest run tests/compat`; for every R14 entry in `KNOWN_GAPS` that no longer holds, remove it (or update it with the new engine answer and a reason) — list every change in the report. Totals still add up to 64.
- [ ] **Step 4: Before/after PSU report.** `scripts/phase2/psu-before-after.ts`: builds the builder's GPU rows the way `scripts/validation-report.ts` does (validated data, `builderFile`), and for each consumer card row computes (a) v1's figure `v1RecommendedPsu(card, undefined)`, (b) `makerW`, (c) `formulaW` and the recommended PSU (max of maker and formula) for two reference builds: the most-listed Intel desktop CPU with a PL2 row, and the most-listed AMD desktop CPU with a PPT row (skip with a note if none), each with 2 RAM sticks, 1 NVMe drive, 3 fans, an air cooler. Writes `docs/phase2/psu-before-after.md` (deterministic): the reference builds, a summary (cards whose recommendation rises / falls / stays vs v1, per reference build), the 20 largest changes, and the full table sorted by chip then card. Run it twice: no diff.
- [ ] **Step 5:** `npm run check` → passes. Commit: `git commit -m "feat(engine): whole-build power estimate and rule 14 per owner's rule + PSU report"`.

*(Item 3 (B5) is added as Tasks 6+ after Task 5.)*
