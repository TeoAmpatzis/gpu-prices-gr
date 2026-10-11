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

*(Items 2 (B4) and 3 (B5) are added as Tasks 3+ after Task 2 is complete, using Task 1–2's names.)*
