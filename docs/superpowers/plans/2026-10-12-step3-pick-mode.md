# Roadmap Step 3 (Phase 3): "Pick for my build" + category-page fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Category pages get a pick mode (`/<cat>?pick=1`) with "Add to build" and an engine-driven "Only compatible" filter (owner-approved `docs/phase2/step2-plan.md`, with A7, A8, A9 built in), then the approved category-page fixes C4, C6 first and C1, C2, C3, C5.

**Architecture:**
- The pick page never loads `builder.json`.
- Candidates' engine fields come from the category's own `list.json`, unified per builder model by the same functions that build `builder.json` rows (`src/lib/derive.ts` `builderRow`, made shareable).
- Parts already in the build carry their engine fields and the `builtAt` of the data they came from in `localStorage.pcBuild.compat`.
- When that `builtAt` is older than the page's data, or a part has no fields (old builds, share links), only the small chunk file holding its key is fetched: `data/compat/<slot>-<nn>.json`, 64 per slot, FNV-1a hash of the key.
- The engine (`src/engine`) decides; `src/lib/pick.ts` applies the hide rules.

**Tech Stack:** React 18 + TypeScript (strict) + Vite 5 + Tailwind 3, Vitest 3, Playwright. No new dependencies.

**Spec:**
- `docs/phase2/step2-plan.md` (approved with this step; §2–§9, incl. §9β privacy text);
- `docs/superpowers/plans/2026-10-11-v2-plan-improvements.md` A7, A8, A9, C1–C6 (approved 2026-10-11; owner: "C4 and C6 first");
- `docs/redesign-v2.md` "PC Builder: ροή" ("Επιλογή" opens the category page with "Μόνο συμβατά").

## Global Constraints

- Worktree `C:\Users\Teo\Desktop\PROJECTS\buildcraft-v2`, branch `v2`; never touch `C:\Users\Teo\Desktop\PROJECTS\Gpu price comparison`; never edit `public/data/**`.
- Commit locally only, **never push**, no `Co-Authored-By`, no mention of Claude. Keep each file's line endings (`git diff --numstat` must equal `--ignore-cr-at-eol` for every file before committing).
- No new dependencies. Each task ends with `npm run check` green; compat 64 scenarios, 0 failures; for UI tasks also `npm run e2e`.
- Every UI string is `{el, en}` in `src/ui/strings.ts` (or the file the area already uses); never hard-coded Greek in components. v2 is dark-only. Phones at 360 px must work (no horizontal overflow, tap targets ≥ 44 px).
- Routing unchanged except the new query parameters `pick=1` and `compat=0` (kept by `filterUrl`).
- The normal category page (no `pick`) must stay byte-for-byte the same in behaviour and data downloads; the current builder (`/builder`) keeps working with old and new `pcBuild` data and gets no link to `pick=1` (step 5 does that).
- **Hide rules (step2-plan §4):** "Only compatible" hides a candidate only for an **error** of rules **1, 2, 3, 5, 6, 8, 10, 16**, and of **14 only with basis `stated`**. Never for warnings, notes or unknown. Rules **11 and 12 never hide** when the other part (cooler / graphics card) is missing — a separate constant with its own test. Use `candidateErrors` from `src/engine/index.ts` (it already ignores clashes the candidate didn't cause).
- Engine context in pick mode: `{ bios: biosSupport }` plus `chipLengths` built from the GPU category data when available.
- **Byte budget (A8, owner-approved definition to record in PROJECT-STATE):** per page, **JS ≤ 110 KB gzip** and **data ≤ 300 KB gzip** at first load, fonts reported but not counted (plan `redesign-v2.md` table). Fallback decided now: the pick-mode code is a lazy chunk loaded after the first paint.
- Privacy page: replace the `pcBuild` item with the §9β text of `docs/phase2/step2-plan.md` (el + en verbatim) and set `PRIVACY_UPDATED` to the commit day.

## Review Focus

1. A saved part whose data changed after it was saved (its `builtAt` older than the page's data) is checked with the new values, not the stored ones (A7). Test.
2. A saved or shared key that no longer exists stays visible as "no longer available" instead of vanishing, and never breaks the page (A9). Test.
3. "Only compatible" never hides a CPU because the PSU is too small for the card (C-01), and never for warnings/notes/unknown. Test with real engine calls.
4. Old `pcBuild` (keys only) and the current builder still work: `/builder` restores the same parts after the pick page wrote `compat`. Test.
5. `?pick=1` survives every filter change, sort change and page change; `compat=0` too. Test.

---

### Task 1: Build store (`pcBuild`) with engine fields, `builtAt` and missing parts (A7, A9)

**Files:** Create `src/lib/buildStore.ts`, `tests/unit/buildStore.test.ts`; modify `src/lib/builderState.ts` (read/write through `buildStore`, keep its behaviour).

**Interfaces (produces):**

```ts
// src/lib/buildStore.ts
import type { Slot } from './builder';
export interface StoredPart { key: string; fields?: Record<string, unknown>; builtAt?: string }
export interface StoredBuild { parts: Partial<Record<Slot, StoredPart>>; use?: string; budget?: number }
/** localStorage `pcBuild`: { <slot>: key, use?, budget?, compat?: { <slot>: { fields, builtAt } } } — old files (keys only) stay valid. */
export function readBuild(): StoredBuild;
export function writeBuild(b: StoredBuild): void;             // writes keys at top level (as today) + `compat`
export function setPart(slot: Slot, part: StoredPart | null): void; // read-modify-write + notify
export function onBuildChange(fn: () => void): () => void;     // same-tab listeners + the `storage` event
```

- `builderState.ts` keeps its exact behaviour (tests that exist must pass unchanged), but its `readSaved`/`writeSaved` go through `buildStore`, and `writeSaved` **preserves** `compat` entries for parts whose key didn't change (drops them for changed/removed slots).
- A9 (safe half now): `readBuild` returns every stored key, also ones the data no longer has; the caller decides. The alias list of Phase 1 A2.3 (`slugs.json`) does not exist yet (it comes with the product page, step 4). Add `resolveKey(slot, key, known: Set<string>, aliases?: Record<string,string>): { key: string; status: 'ok' | 'renamed' | 'missing' }` to `buildStore.ts`, used by the pick page. `aliases` is optional and unused until step 4. Test all three statuses.
- Tests: old format (keys only) reads; new format round-trips; `setPart` notifies a listener; builderState's write keeps `compat` for unchanged slots and drops it for a changed slot; storage unavailable (throwing `localStorage`) → empty build, no crash.
- [ ] TDD steps: tests → FAIL → implement → PASS → `npm run check` → commit `feat(builder): build store with engine fields and data date (A7, A9 base)`.

### Task 2: Engine parts from category data, shared with builder rows

**Files:** Modify `src/lib/derive.ts` (export the per-model field unification used by `builderRow` as `slotFields(slot, model)`), create `src/lib/pick.ts` (first part: `toPart`), `tests/unit/pick-parts.test.ts`.

**Interfaces:**

```ts
// src/lib/derive.ts
export function slotFields<S extends Slot>(slot: S, m: Model<SlotListing[S]>): Record<string, unknown>; // the engine fields builderRow writes (socket, memory, formFactor, ramSlots, maxBoard, gpuMaxMm, …)
// src/lib/pick.ts
import type { Part } from '../engine';
export const SLOT_OF: Record<Category, Slot>;          // category id → builder slot (identity for the 9)
export function toPart<S extends Slot>(slot: S, m: Model<SlotListing[S]>): Part; // key = builder key, name = chip/title, fields = slotFields + the listing fields the engine reads (incl. `chip`)
export function usable<S extends Slot>(slot: S, m: Model<SlotListing[S]>): boolean; // re-export of builder.ts's `usable` (export it there; no logic change)
```

- Builder keys: graphics cards per card (`listing.id`), CPUs `${chip}|${coolerIncluded ?? '?'}` — reuse `slotModels` from `src/lib/builder.ts`.
- Tests: for each slot, for 20 real models (load `public/data/<cat>/latest.json`, validate with `validateLatest(cat, latest, VALIDATION_MODE)` as the build does), `toPart(...).fields` equals the matching `builder.json` row's engine fields (derive the row with `builderFile` from the same validated data). `usable` matches today's builder for every model.
- [ ] TDD → `npm run check` → commit `feat(pick): engine parts from category data, same fields as builder rows`.

### Task 3: Compat chunk files + loader (A7 refresh)

**Files:** Modify `src/lib/derive.ts` and `vite-plugin-data.ts` (emit `data/compat/<slot>-<nn>.json`), create `src/lib/compatChunks.ts` (`chunkOf`, `loadCompat`), `tests/unit/compat-chunks.test.ts`.

**Interfaces:**

```ts
// src/lib/compatChunks.ts
export const CHUNKS = 64;
export function chunkOf(key: string): number;  // FNV-1a 32-bit over UTF-8, mod CHUNKS — identical in build and browser
export function loadCompat(slot: Slot, keys: string[], builtAt: string): Promise<Record<string, { fields: Record<string, unknown> }>>; // fetches only the needed chunks, `?v=<builtAt>`, memoised
// chunk file: { v: 1, builtAt, rows: { [key]: fields } } — only the engine fields (toPart's fields)
```

- Only usable models are written. Storage stays lazy like today (its chunks are separate files anyway).
- Tests: `chunkOf` is stable (golden values for 5 keys); every key of every builder slot is in exactly its chunk; a chunk's fields equal `toPart(...).fields` for 20 keys; `loadCompat` requests only the chunks of the given keys (mock `fetch`).
- Measure and report: largest chunk per slot (gzip), total files (expect 9 × 64).
- [ ] TDD → `npm run check` → commit `feat(data): compat chunks for parts saved without fields or with old data`.

### Task 4: Pick logic — hide rules and candidate check

**Files:** Extend `src/lib/pick.ts`, create `tests/unit/pick.test.ts`.

**Interfaces:**

```ts
export const HIDE_RULES: ReadonlySet<RuleId>;        // 1, 2, 3, 5, 6, 8, 10, 14, 16
export const NEVER_HIDE_WHEN_MISSING: Readonly<Record<11 | 12, PartCategory>>; // 11 → 'cooler', 12 → 'gpu'
export function hidingErrors(build: Part[], candidate: Part, ctx: Context): Finding[]; // candidateErrors filtered by the rules above (14 only basis 'stated'; 11/12 never when that part is missing)
export function checkAll(build: Part[], slot: Slot, candidates: Part[], ctx: Context): Map<string, { hide: boolean; findings: Finding[] }>; // findings = all of the candidate's own findings (for the row), hide from hidingErrors
export const CATEGORY_RULE_SLOTS: Record<Slot, Slot[]>; // the table "Ποιες θέσεις αφορούν οι κανόνες" of step2-plan §2
```

- Tests (from step2-plan §6): hide only the listed rules; 14 with basis estimate doesn't hide; 21 shown, not hidden; 11/12 don't hide with no cooler/card (K/KF/X without cooler; F without card); C-01 (a too-small PSU doesn't hide CPUs); warning/note/unknown never hide; rule 13 `not-listed` (warning) doesn't hide a board; `CATEGORY_RULE_SLOTS` covers every rule that reads two slots (derive the list from the rule files' `one(b, …)` calls or list them, and assert).
- Performance: `checkAll` on all usable cases (≈2,600) with a full build — measure; if > 50 ms on this PC, the caller runs it in chunks after paint (Task 5) — report the number.
- [ ] TDD → `npm run check` → commit `feat(pick): hide rules and candidate check on the engine`.

### Task 5: Pick mode UI

**Files:** Modify `src/lib/filterUrl.ts` (keep `pick=1`, `compat=0`), `src/lib/data.ts` (`Filters.compat: boolean`, default true), `src/components/CategoryView.tsx` (pick bar "Επιλέγεις: <slot> · ← Πίσω στο build", candidate filtering before counts), `src/components/FilterBar.tsx` (toggle "Μόνο συμβατά (N κρυμμένα)" only in pick mode), `src/components/ModelRow.tsx` + `ModelTable.tsx` (button "Πρόσθεσε στο build" per model / per card for GPUs; non-hiding findings shown on the row; with the toggle off, hidden ones greyed with the engine's reason and no button; models `usable` = false get no button), `src/ui/strings.ts`, `src/content/pages.ts` + `src/lib/site.ts` (§9β privacy text, `PRIVACY_UPDATED`); create `src/lib/usePick.ts` (lazy: loaded via dynamic import only when `pick=1`), `tests/e2e/pick.spec.ts`, unit tests for filterUrl.

Behaviour (step2-plan §2):
- Default sort in pick mode "Τιμή ↑".
- "Add" writes the part with `toPart(...).fields` and the page's `builtAt` through `setPart`, then navigates to `/builder`; Back returns to the pick page with its filters.
- While chunks for old parts load, the bar says "Έλεγχος συμβατότητας…" and nothing is hidden.
- A part in the build that `resolveKey` marks `missing` is listed in the bar as "δεν διατίθεται πια" and is left out of the checks.

- E2E (step2-plan §6):
  - AM5 CPU in the build → `/mobo?pick=1` shows no AM4 board; toggle off → AM4 greyed with the reason;
  - Add → `/builder` shows the part; Back keeps the filters;
  - a GPU is added per card;
  - an old build (keys only) loads only chunk files, never `builder.json`;
  - 360 px works;
  - existing `smoke`, `urls`, `shell` pass.
- [ ] TDD → `npm run check` + `npm run e2e` → commit `feat(pick): pick mode on category pages (add to build, only compatible)`.

### Task 6: Budget, Lighthouse, PROJECT-STATE (A8)

**Files:** Modify `docs/PROJECT-STATE.md` (byte-budget definition), create `docs/phase3/step3-measure.md`.

- Measure gzip bytes at first load for `/mobo?pick=1`, `/cpu?pick=1`, `/case?pick=1` (typical: parts with fields; worst: old build without fields, all relevant slots chunked) against the budget; Lighthouse phone + desktop (3 runs, median, `scripts/audit/lighthouse-baseline.mjs` with the pick URLs added via its page filter or a small wrapper) for `/gpu`, `/gpu?pick=1`, `/case`, `/case?pick=1`.
- If a budget is exceeded or `/gpu?pick=1` phone < 90: stop and report (no fix without the owner). `/case` < 90 is reported (known, fix = C-items/facet counts).
- [ ] Measure → write the doc → commit `docs: step 3 pick mode measurements and byte budget (A8)`.

### Task 7: C4 — maker column and photo match the shown price

**Files:** `src/components/ModelRow.tsx` (+ the card component it uses), `src/ui/strings.ts`, unit/e2e as fits.
- The row's maker cell is headed/labelled "Φθηνότερο από" / "Cheapest from" (or the maker moves into the price cell — pick the clearer one at 360 px and 1366 px, say which). The photo is the one of the listing behind the shown price, falling back to the model photo, then the category icon.
- [ ] Tests → `npm run check` + e2e → commit `fix(ui): maker and photo follow the cheapest listing (C4)`.

### Task 8: C6 — price chart without fake drops

**Files:** `src/components/PriceChart.tsx`, a helper in `src/lib/` with unit tests.
- Points below 50% of the trailing 30-day median are left out of the line and marked (e.g. a hollow dot with the tooltip "Ασυνήθιστα χαμηλή τιμή, έλεγξε το κατάστημα" / "Unusually low price, check the shop"). The all-time-low badge ignores them (`allTimeLow` in data.ts reads the same helper).
- [ ] Tests (the RTX 5060 ~200 € dip in real history is excluded; a real 20% drop is kept) → `npm run check` → commit `fix(ui): price chart and all-time low ignore implausible one-day dips (C6)`.

### Task 9: C1, C2, C3, C5 — status line, colour dots, price change, cut titles

**Files:** `src/ui/nav.tsx` (status line / footer), `src/lib/categories.tsx` (dots), `src/ui/PriceCell.tsx` / `ModelRow.tsx` (change label, titles), `src/ui/strings.ts`.
- **C1:** one line "⚠ Κάποιες τιμές είναι παλαιότερες από 24 ώρες · Λεπτομέρειες". Details are grouped by source ("Skroutz: 9 κατηγορίες, 38 ώρ.").
- **C2:** brand/type dots neutral or indigo, never green/red.
- **C3:** "−109,60 € σε 7 ημέρες" (and en) with a tooltip.
- **C5:** listing titles drop the shared start (the chip name) or wrap to two lines.
- Screenshots at 360/1366 el/en before/after (`scripts/phase1/site-shots.mjs`).
- [ ] Tests → `npm run check` + e2e → commit `fix(ui): calm stale-data line, neutral dots, labelled price change, readable titles (C1 C2 C3 C5)`.
