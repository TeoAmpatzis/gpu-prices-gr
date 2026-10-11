# Data Validation (A4 + A5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At site-build time, find measured values outside a plausible range (e.g. a case "takes cards up to 3.502 mm") so they can become "unknown" instead of reaching the compatibility rules. First run is **report-only**: nothing in the site's data changes until the owner approves the ranges.

**Architecture:** A pure module `src/data/validate/` (ranges table + `validateLatest`) runs inside `derive()` in `vite-plugin-data.ts`, between reading each category's `public/data/<cat>/latest.json` and writing `list.json` / `builder.json`. The scraper's files are never changed. A mode constant (`'report'` now, `'enforce'` after approval) decides whether rejected values are set to `null` in the derived files. A script writes `docs/phase2/validation-report.md` for the owner.

**Tech Stack:** TypeScript (strict), Vite 5 data plugin, Vitest 3, `vite-node` (ships with Vitest; no new dependency).

**Spec:** `docs/phase2/plan.md` §B2 (validation layer); `docs/superpowers/plans/2026-10-11-v2-plan-improvements.md` A4, A5; owner's changes of 2026-10-11 (cooler minimum 15 mm, case cooler limit minimum 25 mm).

## Global Constraints

- Work in the worktree `C:\Users\Teo\Desktop\PROJECTS\buildcraft-v2`, branch `v2`. Never touch `C:\Users\Teo\Desktop\PROJECTS\Gpu price comparison` (v1).
- Commit locally only. **Never push.** Commit messages are conventional commits with **no `Co-Authored-By` line and no mention of Claude**. The git identity is already configured; don't change it.
- **No new dependencies** (package.json `dependencies`/`devDependencies` unchanged).
- Never edit `public/data/**` (scraper-owned data).
- Every task ends with `npm run check` passing (typecheck + lint + test + build). No new lint suppressions.
- Report mode must leave every derived file exactly as it is today: report mode changes nothing but the console log and the report.
- Ranges are inclusive at both ends. A value is checked only when it is a finite `number`; `null`/`undefined` is "not stated" and not counted.
- Ranges, exact (owner-approved 2026-10-11, adjusted against real data the same day):

| Check id | Category | Field | Applies when | Min | Max | Unit | Enforce? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `cooler-height` | cooler | `heightMm` | always | 15 (Tasks 1–2) → **30** (Task 3, owner 2026-10-11) | 200 | mm | yes |
| `case-gpu-max` | case | `gpuMaxMm` | always | 100 | 700 | mm | yes |
| `case-cooler-max` | case | `coolerMaxMm` | always | 25 | 250 | mm | yes |
| `gpu-length` | gpu | `lengthMm` | always | 100 | 400 | mm | yes |
| `psu-watts` | psu | `watts` | always | 150 | 3000 | W | **no** (report only: `watts` is not nullable) |
| `ram-ddr4-speed` | ram | `speed` | `type === 'DDR4'` | 1600 | 5333 | MHz | yes |
| `ram-ddr5-speed` | ram | `speed` | `type === 'DDR5'` | 4000 | 10000 | MHz | yes |
| `ram-cas` | ram | `cas` | always | 5 | 60 | CL | yes |
| `cpu-tdp` | cpu | `tdp` | always | 10 | 500 | W | yes |
| `mobo-max-memory` | mobo | `maxMemoryGB` | always | 4 | 16384 | GB | yes |

- Review band (Tasks 1–2 only; **removed in Task 3** by the owner's decision "under 30 mm = unknown"): `cooler-height-low` = cooler `heightMm` ≥ 15 and < 30. Note text: "Real low-profile coolers are 21–27 mm, but shop pages also give a fan's 25 mm thickness as the tower height (audit D-01, v1 ignores < 30 mm). Owner decides."

## Review Focus

1. A real extreme value at the edge (Thermaltake AX700 case at 630 mm, Akasa AK-CC6609EP01 cooler at 21.8 mm) must be kept. Test in Task 1.
2. `enforce` must not mutate the scraper's objects (the dev server re-derives from cached inputs). Test in Task 1.
3. A non-nullable field (`psu.watts`) must never be set to `null`, even in `enforce`. Test in Task 1.
4. Report mode must produce byte-identical derived data. Task 2 checks it by comparing `dist/data` before and after.
5. The report must be deterministic: the same data gives the same file (no "generated now" timestamp). Test/verify in Task 2.

---

### Task 1: Validation module and unit tests

**Files:**
- Create: `src/data/validate/ranges.ts`
- Create: `src/data/validate/index.ts`
- Test: `tests/unit/validate.test.ts`

**Interfaces:**
- Consumes: `Category`, `BaseListing`, `Latest` from `src/types.ts`; the engine's `evaluate` and its test helpers' pattern from `tests/unit/engine/rules.test.ts` (read that file for how a `Part` is built and how a rule's status is read; copy its small helpers into the new test if they aren't exported).
- Produces (exact names, used by Task 2):

```ts
// src/data/validate/ranges.ts
import type { Category } from '../../types';
export interface RangeCheck {
  id: string;            // e.g. 'case-gpu-max'
  cat: Category;
  field: string;         // listing field name, e.g. 'gpuMaxMm'
  min: number;           // inclusive
  max: number;           // inclusive
  unit: string;          // 'mm' | 'W' | 'MHz' | 'CL' | 'GB'
  applies?: (l: Record<string, unknown>) => boolean; // e.g. RAM speed per DDR type
  reportOnly?: true;     // never set to null, even in 'enforce'
}
export interface ReviewBand { id: string; cat: Category; field: string; min: number; below: number; note: string } // min ≤ v < below
export const RANGES: RangeCheck[];       // the table in Global Constraints, in that order
export const REVIEW_BANDS: ReviewBand[]; // the one band in Global Constraints

// src/data/validate/index.ts
import type { BaseListing, Category, Latest } from '../../types';
export type ValidationMode = 'report' | 'enforce';
export const VALIDATION_MODE: ValidationMode = 'report';
export interface Rejection { check: string; cat: Category; id: string; title: string; chip: string; field: string; value: number }
export interface ValidationResult<L extends BaseListing> {
  latest: Latest<L>;             // report: the input object itself; enforce: a new object
  rejections: Rejection[];       // same in both modes
  stated: Record<string, number>; // per check id: listings where the value was a finite number
}
export function validateLatest<L extends BaseListing>(cat: Category, latest: Latest<L>, mode: ValidationMode): ValidationResult<L>;
```

Behaviour of `validateLatest`:
- Runs every `RANGES` entry whose `cat` matches, on every listing in `latest.listings`, in listing order. `applies` false → not checked, not counted.
- `'report'`: returns `latest` unchanged (the same object reference).
- `'enforce'`: returns `{ ...latest, listings }`, where a listing with at least one enforced rejection is a shallow copy with each rejected field set to `null`. Other listings are the same objects. A `reportOnly` check adds a rejection but never changes the value. The input is never mutated.

- [ ] **Step 1: Write the failing tests** in `tests/unit/validate.test.ts`. Build tiny `Latest` fixtures inline (`{ updatedAt: '2026-10-11T00:00:00Z', sources: {}, listings: [...] }`, listings with only the fields used, plus `id`, `title`, `chip`; cast through `unknown` where the type needs more fields). Tests:
  1. `case-gpu-max`, enforce: Spire U20M `gpuMaxMm: 3.502` → `null`; Thermaltake AX700 `630` kept; one rejection `{check: 'case-gpu-max', value: 3.502}`.
  2. Report mode: the same fixture → `result.latest` is the input object (`toBe`), Spire still `3.502`, rejections the same as in enforce.
  3. Inclusive bounds: `gpuMaxMm` 100 and 700 kept, 99.9 and 700.1 rejected.
  4. RAM speed per type: DDR4 6400 rejected (`ram-ddr4-speed`), DDR5 6400 kept, DDR5 2400 rejected (`ram-ddr5-speed`), DDR3 1333 not checked (not in `stated` of either speed check).
  5. Cooler: 21.8 kept, 12 rejected, `null` skipped and not counted in `stated['cooler-height']`.
  6. Enforce does not mutate: deep-copy the fixture before calling (`structuredClone`) and expect the input to still equal the copy after.
  7. `psu-watts` is report-only: `watts: 3500` → a rejection, but in enforce the returned listing still has `watts: 3500`.
  8. Engine end-to-end: a case listing `{ gpuMaxMm: 3.502, size: 'Midi Tower', maxBoard: 'ATX' }` → after enforce, a case `Part` built from the validated listing plus a card `Part` with `lengthMm: 300` gives rule 6 status `'unknown'`. The same case built from the **unvalidated** listing gives `'error'` (this proves the fix matters).
  9. Table integrity: `RANGES` ids are unique and every `min < max`.

- [ ] **Step 2: Run them and see them fail**
  Run: `npx vitest run tests/unit/validate.test.ts`
  Expected: FAIL (module `src/data/validate` not found).

- [ ] **Step 3: Implement** `ranges.ts` (the table and the band, values copied exactly from Global Constraints) and `index.ts` (`validateLatest` as specified; `Number.isFinite` for "stated").

- [ ] **Step 4: Run the tests and see them pass**
  Run: `npx vitest run tests/unit/validate.test.ts`
  Expected: 9 tests PASS.

- [ ] **Step 5: Full check, then commit**
  Run: `npm run check` → passes.
  `git add src/data/validate/ranges.ts src/data/validate/index.ts tests/unit/validate.test.ts`
  `git commit -m "feat(data): plausible-range validation module (report mode)"` (no Co-Authored-By line).

---

### Task 2: Wire into the data build, report script, first report

**Files:**
- Modify: `vite-plugin-data.ts` (`derive()`, lines ~66–87)
- Create: `scripts/validation-report.ts`
- Modify: `package.json` (one script line)
- Create (generated, committed): `docs/phase2/validation-report.md`

**Interfaces:**
- Consumes (from Task 1): `validateLatest`, `VALIDATION_MODE`, `RANGES`, `REVIEW_BANDS`, `Rejection`, `ValidationResult` from `src/data/validate/index.ts` and `ranges.ts`.
- Produces: `npm run validation:report`; the report file.

- [ ] **Step 1: Snapshot today's derived data** (for the byte-identity check): `npm run build`, then copy `dist/data` to a temporary folder outside the repo (e.g. `%TEMP%\dv-before`).

- [ ] **Step 2: Wire `derive()`.** For each category, before anything uses `input.latest`, run `const v = validateLatest(cat, input.latest, VALIDATION_MODE)`. Use `v.latest` everywhere `input.latest` was used (`latest[cat]`, `listFile(cat, { ...input, latest: v.latest }, …)`, `detailFile`). After the loop, log one line: `[data] validation (<mode>): <N> value(s) out of range — <cat> <n>, …` (categories with 0 omitted; `none` if N is 0).

- [ ] **Step 3: Verify report mode changes nothing.** `npm run build`, then compare every file in `dist/data` with the snapshot. The only allowed difference is the `builtAt` value (and anything derived from the build time). Write the comparison method and the result in the report file of this task. If anything else differs, fix it before going on.

- [ ] **Step 4: Write `scripts/validation-report.ts`.**
  - Reads `public/data/<cat>/latest.json` for every category in `CATEGORY_IDS` (`src/lib/categories.ts`; skip a missing file).
  - Runs `validateLatest(cat, latest, 'report')`.
  - Writes `docs/phase2/validation-report.md` (English, plain markdown):
    1. Title, one paragraph on what this is ("values outside the plausible range; in report mode nothing is changed on the site; the owner approves the ranges before `VALIDATION_MODE` becomes `'enforce'`"), and the data times: each category's `latest.updatedAt` (no "generated at" time, so the file is deterministic).
    2. A summary table, one row per `RANGES` entry: check id, field, range with unit, enforced or report-only, values stated, out of range, distinct models out of range (by `chip`).
    3. Per check with rejections: up to 10 examples, sorted by `chip` then `id`: chip, value, title (cut to 80 chars), listing id.
    4. Per `REVIEW_BANDS` entry: its note, then every distinct `chip` in the band with its value(s) and number of listings, sorted by chip (up to 60 rows, then "… and N more").
  - Add to `package.json` scripts: `"validation:report": "vite-node scripts/validation-report.ts"`. First check that `npx vite-node --version` works (it comes with Vitest). If it doesn't, stop and report NEEDS_CONTEXT; don't add a dependency.

- [ ] **Step 5: Generate and check determinism.** Run `npm run validation:report` twice. The second run must leave `git diff docs/phase2/validation-report.md` empty after the first run's output is staged. Sanity-check the content: `case-gpu-max` lists Spire U20M at 3.502; `cooler-height` lists values under 15 (e.g. Akasa Alucia H4i 12, Inter-Tech A-45 13); the review band lists coolers from 15 to < 30.

- [ ] **Step 6: Full check, then commit**
  Run: `npm run check` → passes.
  `git add vite-plugin-data.ts scripts/validation-report.ts package.json docs/phase2/validation-report.md`
  `git commit -m "feat(data): run range validation in the data build (report mode) + report"` (no Co-Authored-By line).

---

## After the plan (not a task here)

The owner reads `docs/phase2/validation-report.md` and approves the ranges (and decides the 15–30 mm cooler band). Only then does a separate, owner-approved change set `VALIDATION_MODE = 'enforce'` and decide whether the v1 patch `MIN_AIR_COOLER_MM = 30` (`src/lib/builder.ts`, `src/engine/tables.ts`) changes.

**Owner's decisions, 2026-10-11 (after the first report):** ranges approved; cooler heights under 30 mm are unknown, same as v1 (so `cooler-height` becomes 30–200 and the 15–30 band is no longer needed); PSU max 3000 W must include 3000; switch to `'enforce'` approved → Task 3.

---

### Task 3: Switch to enforce

**Files:**
- Modify: `src/data/validate/ranges.ts` (`cooler-height` min 15 → **30**; remove `ReviewBand` and `REVIEW_BANDS`: the owner's decision makes the band redundant, the range itself now rejects 15–30)
- Modify: `src/data/validate/index.ts` (`VALIDATION_MODE = 'enforce'`)
- Modify: `scripts/validation-report.ts` (text follows the mode; drop the band section; add a before/after section)
- Modify: `scripts/checks/data-equivalence.test.mts`, `scripts/checks/builder-coverage.mts` (read validated data the same way the build does)
- Modify: `tests/unit/validate.test.ts`
- Regenerate (committed): `docs/phase2/validation-report.md`
- Leave unchanged: `MIN_AIR_COOLER_MM = 30` in `src/lib/builder.ts` and `src/engine/tables.ts` (now the same value as the range; they stay as guards for data that doesn't pass through the build, e.g. synthetic engine test parts).

**Interfaces:**
- Consumes: Task 1's `validateLatest`, `RANGES`, `VALIDATION_MODE`; `builderFile` from `src/lib/derive.ts`; `fromColumns` from `src/lib/columns.ts`.
- Produces: no new exports (removes `ReviewBand`/`REVIEW_BANDS`; nothing outside `scripts/validation-report.ts` and the test imports them — check with a search).

- [ ] **Step 1: Tests first** (`tests/unit/validate.test.ts`):
  - Update the cooler test: 21.8 is now **rejected** (`cooler-height`), 30 kept, 29.9 rejected, 200 kept, 200.1 rejected.
  - New: `psu-watts` 3000 is **not** a rejection, 3000.1 is (still report-only: value unchanged).
  - New: `VALIDATION_MODE` equals `'enforce'`.
  - New: builder data: the Spire U20M case ends up with `gpuMaxMm: null` in the builder row. Run `builderFile` from `src/lib/derive.ts` on a minimal fixture whose case listings include Spire U20M `gpuMaxMm: 3.502` validated in enforce mode, and expect that case's row to have `gpuMaxMm === null` (decode with `fromColumns`). If the builder's `candidates()` makes a fixture impractical, test instead `caseGpuMax` (`src/lib/builder.ts`) on the model from `slotModels('case', validated listings)`, and say which in the report.
  - Remove the band test if one exists.
  Run: `npx vitest run tests/unit/validate.test.ts` → the new/changed tests FAIL.
- [ ] **Step 2: Implement** the range and mode changes; remove the band; run the test file → PASS.
- [ ] **Step 3: Equivalence and coverage scripts.** In `scripts/checks/data-equivalence.test.mts` and `scripts/checks/builder-coverage.mts`, wherever a category's raw `latest.json` is read for derivation, pass it through `validateLatest(cat, latest, VALIDATION_MODE)` first (both sides of the equivalence comparison, so it keeps comparing like with like). Run each the way `scripts/checks/README.md` says; both must still pass/run. Record the commands and output in the report.
- [ ] **Step 4: Report script.**
  - The intro paragraph and the summary's "Mode" column follow `VALIDATION_MODE`: in `'enforce'`, say that the listed values are treated as "not stated" on the site (list.json, builder.json); keep `psu-watts` labelled report-only.
  - Add one sentence under the RAM speed sections: "RAM model names keep the speed the scraper read (e.g. "60000MHz"); the fix for the names is in the scraper (queued for main)."
  - Remove the review-band section.
  - New section "Builder rows changed": run `builderFile` on the raw data and on the validated data (all categories), decode both, and for each `RANGES` check whose field exists in builder rows, count the rows (by `id`) whose value of that field differs, with up to 10 examples (chip, before → after). A check whose field is not in builder rows says "not a builder field".
  - Still deterministic (no timestamps). Run `npm run validation:report` twice; the second run leaves no diff.
- [ ] **Step 5: Build and check the shipped data.** `npm run build`; then confirm in `dist/data/builder.json` (decoded) that the Spire U20M case row has `gpuMaxMm` null, and in `dist/data/case/list.json` that its listing's `gpuMaxMm` is null. Record how you checked. The build's log line now says `validation (enforce)`.
- [ ] **Step 6: Full check, then commit.** `npm run check` passes. Commit only the files listed above: `git commit -m "feat(data): enforce range validation (owner-approved ranges)"` (no Co-Authored-By line).
