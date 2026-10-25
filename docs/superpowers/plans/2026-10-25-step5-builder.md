# Roadmap Step 5 (Phase 4): the new PC builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task (owner's rule 4: one builder and a separate reviewer per task, reviewer OK before each commit, local
> commits only). Steps use checkbox (`- [ ]`) syntax for tracking. **Nothing starts before the owner's OK on this
> plan.** Tasks marked **[OWNER OK]** stop at the named point and wait.

**Goal:** one builder on the v2 compatibility engine (rules 1–30), with a free part list ("Quick list") and a guided
walk over the same list, Recommended that follows the use and the budget left, an automatic build per budget priced
from today's data (B6 tiers), real PSU products (ATX / SFX / SFX-L), several drives and fans with a quantity, a shop
choice per part, several named saved builds, one Review / Copy list / share link, and the 32 test-drive findings
fixed or listed "not now" with a reason.

**Architecture:**
- **One engine.** `src/engine` (rules 1–26 today, 27–30 added in Task 5) decides every fit, warning and note. v1's
  rules in `src/lib/builder.ts` (`checks`, `rate`, `buildNotes`, `requiredWatts`, `GPU_PSU`, `FIT_LABEL`) are deleted;
  what is left of that file is data shaping (`usable`, `slotModels`, `fitContext`) and moves to
  `src/lib/builderData.ts`. Candidate checks run in the existing pick worker (`pickChecker.createChecker`, `full`
  verdicts), the same path pick mode and the product page use. Labels come from findings (`src/lib/fitLabel.ts`).
- **One list, two ways to walk it.** `PartList` (Quick list) is the base; `Guided` shows one line of it at a time
  with its picker. Both use the same `Picker`, `Review`, Copy list and share link. One order everywhere:
  CPU → board → RAM → GPU → cooler → storage → case → PSU → fans (`SLOTS` in `slots.ts`). Fans are chosen inside
  the case step (optional, with a quantity) and listed last.
- **Bytes (rule 11).** `/builder` no longer downloads `builder.json` (279 KiB gzip today, 20 KiB under the limit) on
  first load. The first screen (use + budget) needs only `/data/builder/index.json` (≈ 3–6 KiB: build date, the
  cheapest build per use for "costs at least X € today", the GPU chip length ranges for rule 6). Each step's parts
  are their own file `/data/builder/<slot>.json`, fetched when the step or picker opens (the next step prefetched in
  idle time); shop links and search titles stay in `/data/builder/<slot>-extra.json`, fetched on the first search
  or link. Automatic builds are computed **at build time** on a budget grid (`/data/builder/auto.json`, fetched when
  a budget is set). Shop choice reads the product page's model chunks (`data/<cat>/model/<nn>.json`) on demand.
- **Data errors behind wrong fits** are handled twice: a general v2 rule at build time (Task 2, values that rest on
  one shop's page and disagree with another page, with the model's other listings or with their class become
  unknown = "Fit not verified"), and `overrides.json` entries on main for the named products, through the backend
  queue (Task 15, owner OK per push).

**Tech Stack:** React 18 + TypeScript (strict) + Vite 5 + Tailwind 3, Vitest 3, Playwright. No new dependencies.

**Spec:**
- The owner's step 5 prompt (answers 1–14 and the bullets), copied in
  `.superpowers/sdd/2026-10-25-step5-plan/brief.md`;
- `docs/phase4/builder-test-drive.md` (32 findings, worker's view);
- `docs/PROJECT-STATE.md` (rules 1–11, roadmap step 5 row: guided + free list, B6 tiers, recommendations per budget,
  rules 27–30, C8–C9; Phase 4 gate);
- `docs/redesign-v2.md` "PC Builder: ροή και λειτουργίες", "Κανόνες συμβατότητας", "Κατανάλωση και τροφοδοτικό",
  "Σύστημα προτάσεων: ισορροπημένα builds ανά budget";
- `docs/phase2/plan.md` §B6 (tiers) and §B11 answers (10/10: tier sources);
- `docs/superpowers/plans/2026-10-11-v2-plan-improvements.md` C8, C9, C10;
- `docs/v2-backlog.md` Phase 4 gate criteria (motion check Home → Builder; dialog and toast on a real page, #15);
- measurements for this plan: `.superpowers/sdd/2026-10-25-step5-plan/report.md` (the planner's reply, saved by the
  controller; the planner's own write of that file was blocked by the harness). The numbers this plan uses are
  repeated in the tasks.

## Global Constraints

- Worktree `C:\Users\Teo\Desktop\PROJECTS\builddraft-v2`, branch `v2`. The shell starts in the frozen v1 folder
  `C:\Users\Teo\Desktop\PROJECTS\Gpu price comparison`: **every command uses `git -C <v2>`, absolute paths or
  `Set-Location <v2>;` in the same command**; never edit, run git or fixers in v1. Never edit `public/data/**`.
  `builddraft-product-merge` is read only. `builddraft-scraper-fixes` (branch `a3-queue`) is touched only by Task 15,
  under the backend-queue rules (PROJECT-STATE rule 1).
- Commit locally only. **No push of v2, no `Co-Authored-By`, no mention of Claude.** Identity TeoAmpatzis
  <189219701+TeoAmpatzis@users.noreply.github.com>. Keep each file's line endings. No GitHub workflow is started or
  re-run by any task (rule 9).
- Before every commit: `npm run check` (typecheck, lint 0 errors, unit tests, build with the data check). UI tasks
  also `npm run e2e`. Compat scenarios: 0 failures; the count of passes / known gaps / unknowns is in the commit
  message when it changes.
- Every visible string is `{el, en}` (`src/ui/builderStrings.ts` for the builder, the file an area already uses
  elsewhere). Dark theme only. 360 px and 1366 px: no horizontal overflow, every link and button ≥ 44 px (`tap`).
- Values come from the data or from official pages downloaded in the task (source URL + date per row). Nothing from
  memory. Each new table states, per row, the page it was read from.
- Routing: `/builder` stays; its parameters live after `?` (`history.replaceState`). Old `/#builder?…` links keep
  redirecting through `routes.legacyTarget`.
- **Rule 11:** `/builder` first-paint JS ≤ 110 KB gzip and first-load data ≤ 300 KB gzip (fonts apart; chunks and
  data fetched after the first paint not counted, as decided 12/10). Lighthouse median of 3: phone ≥ 90, desktop
  ≥ 95, CLS 0 (owner's step 5 targets). Each UI task states its gzip delta.
- A part is **hidden only on a real "no"**: an engine error of a hiding rule (`pickHide.HIDE_RULES`, rule 14 only
  with basis `stated`). "Fit not verified" parts rank below verified ones; the reason is said **once per step**, not
  on every card.
- One part order everywhere: `SLOTS = ['cpu','mobo','ram','gpu','cooler','storage','case','psu','fan']`.
- The privacy page stays true to the code (`src/content/pages.ts`, `PRIVACY_UPDATED` in `src/lib/site.ts`).
- v2 reads the scraper's existing files (`latest.json`, `specs.json`, `scraper/model_aliases.json`) and never changes
  their schema. New **build-time** file types (`/data/builder/*`, `/data/aliases.json`) go into `src/types.ts`; this
  plan's approval covers them (same rule as step 4). Any scraper change is a Task 15 item with its own owner OK.

## Review Focus

1. **A saved build or share link whose keys changed** (Q6 cooler/case/fan renames, a CPU saved as `chip|?` before
   the box-cooler table, a PSU saved as "650W Gold ATX" before PSU products, a graphics card listing that is gone):
   it opens with the renamed part, or names the missing part ("Το τροφοδοτικό «650W Gold» δεν πωλείται πια") —
   never a silent drop. Tests in Tasks 1 and 8.
2. **A budget below the cheapest build for the use:** the start screen and the auto build say plainly "A gaming PC
   with 32 GB costs at least X € today" with today's figure; no auto build is returned over budget without saying
   so. Test in Task 10.
3. **A step's file that fails or is slow on a phone:** the step shows a retry, the other steps and the summary keep
   working, no skeleton stays forever, the total never counts a part whose price is not loaded as 0. Test in Task 6.
4. **Two writers of the saved build** (a category page's "Add to build" in another tab while named builds are open,
   or pick mode's `setPart`): the second drive, fan quantity, chosen shops and the named-builds list survive. Test in
   Task 8.
5. **A chosen shop offer that is gone after a data update:** the line falls back to the model's cheapest offer with
   a notice, the total stays the sum of the shown prices, Copy list names the shop actually used. Test in Task 13.

---

### Task 0: Merge origin/main into v2 (local)

**Files:** merge commit; `src/lib/pick.ts` (`NOT_IN_DATA`), `tests/unit/pick.test.ts` (guard expectations),
`docs/phase2/validation-report.md` (regenerated).

origin/main is at `87daea0` (2026-10-25), 45 commits ahead of v2's merge base `c977ae7`; 6 code commits
(`e09763b`, `e4d0c68`, `d8bfaed`, `ac84dfb`, `acfb84c`, `800830f`), the rest data. Main's non-data changes: 26 files
under `scraper/`, `scripts/checks/`, `.github/workflows/history.yml`, plus `src/lib/derive.ts` and `src/types.ts`.

**Conflict expectations:**
- `src/lib/derive.ts`: main changed the `V2_ONLY` line (adds `atx3`, `bays35`, `bays25`, `usbCFront`) and its
  comment; v2 rewrote the surrounding comment ("Not in list.v2.json either"). Resolve: v2's comment, **main's
  list**.
- `src/types.ts`: main adds `PsuListing.atx3`, `CaseListing.bays35/bays25/usbCFront`. Expected to merge cleanly or
  with a small hunk; keep both sides.
- Everything under `scraper/`, `scripts/checks/test_*.py`, `.github/`: v2 never changed them, no conflict.
- `public/data/**`: main's side wins (`git checkout --theirs` for any data conflict; v2 never edits data).

- [ ] `git -C <v2> fetch origin` then `git -C <v2> merge --no-ff origin/main`; resolve as above.
- [ ] The NOT_IN_DATA guard test fails as designed when fields gain values: move `bays35`, `usbCFront` (case) and
  `atx3` (psu) out of `NOT_IN_DATA` (measured on main's data 25/10: `bays35` 50.5% of case models, `usbCFront`
  52.0%, `atx3` 701 of 3,947 PSU listings; `m2Gen` still 0, stays).
- [ ] `npm run validation:report` (rejected values listed), `npx tsx scripts/checks/data-equivalence.test.mts`,
  `npm run check`, `npm run e2e`, compat scenarios (expect 64 run, 0 failures).
- [ ] Commit `Merge remote-tracking branch 'origin/main' into v2` (+ a separate `fix(pick): …` commit for the
  NOT_IN_DATA move if the merge commit should stay pure).
- [ ] **Re-merge before the gate (Task 16):** Q6 (242 case/fan/cooler aliases) goes live on main 26/10; merge
  origin/main again so the alias table and data include it.

### Task 1: Renamed keys reach saved builds and share links (aliases at build time)

**Files:** modify `vite-plugin-data.ts` (write `/data/aliases.json` from `scraper/model_aliases.json`),
`src/data/modelAliases.ts` (records from the file; validation stays), `src/lib/buildStore.ts` (`resolveKey`),
`src/lib/modelData.ts` (slug aliases from the file); create `src/lib/aliases.ts` (`loadAliases`); `src/types.ts`
(`AliasFile`); tests `tests/unit/aliases.test.ts`, `tests/unit/buildStore.test.ts`.

**Interfaces:**
```ts
interface AliasFile { v: 1; builtAt: string; cats: Record<Category, AliasRecord[]> } // AliasRecord from modelAliases.ts
loadAliases(builtAt: string): Promise<{ keys: Record<Category, Record<string,string>>; slugs: Record<Category, Record<string,string>> }>
// resolveKey gains slot-specific fallbacks, used only when the key is unknown and no alias matches:
resolveKey(slot, key, known, aliases?, fallback?: (slot: Slot, key: string) => string | null)
  : { key: string; status: 'ok' | 'renamed' | 'missing' }
```
- The file is loaded only when a stored or shared key is not known (rare path), so neither the builder's nor the
  product page's first paint pays for it (today the aliases would add ≈ 3 KB gzip of JS if imported).
- Slugs: `modelSlug(cat, key)` (src/lib/slug.ts) for both old and new keys; `validateAliases` rejects cycles,
  duplicates and self-aliases at build time (the build fails).
- CPU fallback: `chip|?` → `chip|true`, then `chip|false` (a CPU saved before the box-cooler table, Task 3).
  PSU fallback (Task 7 provides `psuGroupFallback`): an old spec-group key ("650W Gold ATX") → the cheapest current
  product of that group, status `renamed`, with a notice (Task 8).

- [ ] Failing tests: main's current `scraper/model_aliases.json` (28 RAM aliases today; 242 case/fan/cooler more
  after Q6) produces records whose old keys all resolve to current keys; a cycle in a fixture fails the build step;
  `resolveKey('cpu','Ryzen 5 7600|?', …)` → `|true` when only that exists; an unknown key → `missing`.
- [ ] Implement; product page `/cooler/<old-slug>` redirects to the new slug (e2e on a real Q6 alias after the
  re-merge; until then a fixture).
- [ ] `npm run check` + e2e → commit `feat(data): model aliases from main's alias file for saved builds and links`.

### Task 2: "Fit not verified" when a value rests on one page that others contradict (general rule)

**Files:** create `src/data/validate/conflicts.ts`; modify `src/data/validate/index.ts` (second pass after ranges),
`vite-plugin-data.ts` + `src/lib/derive.ts` (read each category's `specs.json` at build time; not shipped),
`scripts/validation-report.ts` (new section), `src/types.ts` (cooler build-time field `socketsTitle`); tests
`tests/unit/conflicts.test.ts` (fixtures cut from main's data).

**The rule (all four parts measured on main's data of 25/10, see report.md):**

| Id | When | Then | Models affected now |
| --- | --- | --- | --- |
| G1 | Two shop product pages (`specs.json`) of one model state the same measurement and differ by more than the tolerance (case `gpuMaxMm` > 50 mm, case `coolerMaxMm` > 20 mm, cooler `heightMm` > 20 mm), after the plausible ranges | the value becomes unknown instead of the scraper's `SAFER` minimum (until a maker page or an override settles it) | case `gpuMaxMm` 32; `coolerMaxMm` 0; cooler `heightMm` 0 (its 9 disagreements are 25 mm fan widths the ranges already drop) |
| G2 | A value outside its class's typical range and not confirmed by two agreeing pages: case `gpuMaxMm` < 230 mm in a Midi/Full Tower (Midi p1 = 250 mm); case `maxBoard` ATX/E-ATX in an "SFF / Cube", or E-ATX in a "Mini Tower" | unknown (rule 5 then uses its size-class estimate, rule 6 says "not verified") | case `gpuMaxMm` 6; `maxBoard` 19 |
| G3 | A model's listings disagree on a non-shared fit value (case `maxBoard`, board `formFactor`) | unknown; except a board whose name says "ITX" (not "mATX") → `Mini ITX` | case `maxBoard` 102; board `formFactor` 41 (2 corrected by the name rule, 39 unknown; 15 of the 41 were ties today) |
| G4 | A shop title of the model names a socket (AM4, AM5, 1200, 1700, 1851) that the cooler's `sockets` field lacks | that socket goes to `socketsTitle`; rule 10 (Task 5) answers unknown ("the shop's title says AM4, the spec page doesn't: check") instead of an error that hides | coolers 59 of 1,486 with sockets (AM4 28, LGA1200 26, AM5 17, LGA1700 13, LGA1851 3) |

Totals, as share of the models that state the value: case `gpuMaxMm` 38 of 2,025 (1.9%), case `maxBoard` 121 of
2,350 (5.1%), board `formFactor` 39 of 1,172 (3.3%), cooler sockets 59 of 1,486 (4.0%). Five of the six named
errors are caught: H9 Flow (G1 459/200), 3200D RS (G1 400/180), SG13B-Q Cube (G2), B550M-ITX/ac (name rule),
Assassin X 120 Refined SE (G4 AM4). **Not caught:** Deepcool AK400 97 mm (one page, in range; air-cooler p25 is
92 mm, so no class rule can tell it from a low-profile cooler) → override (Task 15).

**Interfaces:**
```ts
type ConflictCheck = { id: 'G1'|'G2'|'G3'|'G4'; cat: Category; field: string };
interface Conflict { check: ConflictCheck['id']; cat: Category; model: string; field: string; values: unknown[]; action: 'unknown' | 'corrected' | 'title-socket' }
conflicts(cat: Category, latest: Latest, specs: Record<string, Record<string, unknown>>): { latest: Latest; conflicts: Conflict[] }
```
- Runs after `validateLatest` ranges, on the model level (grouping as `groupModels`), in `enforce` mode like A4/A5.
  Report-only mode exists for the first run (`VALIDATION_MODE`), the report lists every conflict.
- `specs.json` is read at build time only (it is a scraper output in `public/data`, unchanged; not copied to dist).

- [ ] Failing tests from real cut-outs: `nzxth9flow` → `gpuMaxMm` null; `nzxth9flow2025` keeps 459;
  `corsair3200drs` → null; `corsair3200drssmoke` keeps 400; `silverstonesugosg13bqcube` → `maxBoard` null;
  `silverstonesugo16cube` keeps Mini ITX; `asrockb550mitxac` → `Mini ITX`; `thermalrightassassinx120refinedse` →
  `socketsTitle` "AM4"; `deepcoolak400zerodarkplus` untouched (155).
- [ ] Implement; validation report section "Conflicts" with the four counts above recomputed on the merged data.
- [ ] Compat scenarios unchanged (they use their own frozen fields); data-equivalence script still passes for
  prices/lows.
- [ ] `npm run check` → commit `feat(data): values one page states against another page, the model or its class become unknown`.

### Task 3: Box CPUs with a cooler in the box (official table)

**Files:** create `src/engine/data/cpuBox.ts`, `scripts/phase4/cpu-box-coverage.ts` (+ npm script
`cpu-box:coverage`), `docs/phase4/cpu-box-coverage.md`; modify `src/lib/derive.ts` (apply to Box listings),
`src/engine/index.ts` (export); tests `tests/unit/engine/cpuBox.test.ts`.

**Today (main 25/10):** 1,489 CPU listings; packaging × coolerIncluded = Tray/false 923, Box/null 241, unknown/null
233, unknown/false 52, unknown/true 38, Tray/true 2, **Box/true 0**. Desktop Box listings with `coolerIncluded`
null: **214 listings, 147 chips** (families: Ryzen 5000 25, 7000 20, 8000 9, 9000 21, 3000/4000 10; Core 12th–14th
94, Core Ultra 200S 23, Pentium/Celeron 7, others 4).

**Sources, confirmed on 25/10:**
- AMD product page (e.g. `https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600.html`,
  downloaded): field **"Thermal Solution (PIB)"** = "AMD Wraith Stealth", and **"Product ID Boxed"**
  (`100-100001015BOX`) / **"Product ID Tray"** (`100-000001015`). The task reads "Thermal Solution (PIB)" per chip;
  a value naming a cooler → `true` + its name; a "not included" value → `false`; field absent → no row.
- Intel `intel.com/.../sku/<id>/.../specifications.html` (fetched for i5-12400): the served page states only
  **"Thermal Solution Specification: PCG 2020C"**, a thermal design class, **not** the boxed cooler; the boxed part
  number and included cooler sit in the page's "Ordering & Compliance" section, which the fetch did not return.
  The task looks for an intel.com page that states the boxed SKU's included thermal solution (ordering section, or
  Intel's boxed-processor pages); if none can be downloaded, Intel Box rows stay unknown and the gap goes to the
  owner (question 5). PCG is never read as "cooler included".

**Interfaces:**
```ts
interface CpuBoxRow { models: string[]; cooler: string | null /* null = the page says none in the box */; field: string; source: string; checked: string }
export const CPU_BOX: CpuBoxRow[];
export function boxCooler(chip: string): { included: boolean; cooler: string | null; source: string } | undefined;
```
- Rows match chips **exactly as in the data** (same convention as `cpuMemory.ts`); one row per page, `models` only
  the chips that page names.
- Applied in derive to listings with `packaging === 'Box'` and `coolerIncluded === null` only: Tray stays `false`,
  unknown packaging stays unknown, a stated shop value is never overwritten (a disagreement goes to the coverage
  report). The builder key becomes `chip|true` / `chip|false` (Task 1's CPU fallback keeps old `chip|?` keys).
- Expected families to check (the page decides each value): Ryzen 3000G/4000/5000 non-X and G, 7000 non-X, 8000G,
  9000 non-X; Core 12th–14th non-K, Core Ultra 200S non-K, Pentium/Celeron. Coverage target: every Box chip with
  ≥ 2 listings, reported per family.

- [ ] Download the pages (polite, 2–4 s apart, saved under the session scratchpad, not committed); write rows with
  source + date; an independent reviewer re-downloads ≥ 10 rows.
- [ ] Failing tests: 8600G Box, 7600 Box → `coolerIncluded true` with the page's cooler name; 7600X Box → per its
  page; i5-14400 Box → per the Intel source or unknown; a Tray listing never changes; rule 11 then passes with no
  cooler for the 8600G (finding #7) and the cooler step is optional.
- [ ] Coverage report; `npm run check` → commit `feat(engine): box coolers from AMD/Intel product pages`.

### Task 4: Performance tiers (B6)

**Files:** create `src/engine/data/tiers.ts`, `scripts/phase4/tier-coverage.ts` (+ npm script `tiers:coverage`),
`docs/phase4/tier-coverage.md`; tests `tests/unit/engine/tiers.test.ts`.

- Our own gaming tier 1–10 per CPU chip and per GPU chip at 1080p / 1440p / 4K, plus CPU cores (from the data;
  threads only where the source page states them), with source + date per row (`docs/phase2/plan.md` §B6, owner's
  answer 5 of 10/10: **Tom's Hardware 2026 CPU and GPU hierarchies plus one more independent source per chip family;
  where they disagree by more than one tier, the chip has no tier and goes on a list for the owner**). Only our tier
  is stored, never their tables or text.
- Gate (B6): a tier for every desktop CPU chip and consumer GPU chip in the most-listed quarter (49 + 16 when B6 was
  measured; recounted on merged data in the coverage report). Chips without a tier stay offered, never auto-picked.

**Interfaces:**
```ts
type Res = '1080p' | '1440p' | '4k';
interface TierRow { chips: string[]; kind: 'cpu' | 'gpu'; tier: Record<Res, number>; sources: { url: string; checked: string }[] }
export function tierOf(kind: 'cpu' | 'gpu', chip: string, res: Res): number | undefined;
```
- [ ] Fetch the sources (polite), write rows, coverage per quarter; reviewer re-checks ≥ 10 rows per kind against
  the pages.
- [ ] Failing tests: lookup by exact chip; a chip on the disagreement list → undefined; every row has ≥ 2 sources.
- [ ] `npm run check` → commit `feat(engine): CPU and GPU performance tiers (B6)`.

### Task 5: Engine — rules 27–30 and the owner's step 5 rule changes

**Files:** create `src/engine/rules/balance.ts`; modify `src/engine/types.ts` (`RuleId` to 30, `Context.use`),
`src/engine/index.ts`, `src/engine/rules/fit.ts` (rules 10, 16), `src/engine/rules/power.ts` (rule 14 margin),
`src/engine/tables.ts` (balance table, VRAM minimums); scenarios `tests/compat/scenarios/s65-…` onwards; tests
`tests/unit/engine/rules.test.ts`, `tests/compat/engine-scenarios.test.ts`; `src/lib/pick.ts` `NOT_IN_DATA`/guard.

**Interfaces:**
```ts
interface Context { chipLengths?; bios?; use?: { kind: 'gaming' | 'everyday' | 'creating' | 'unsure'; res?: Res } }
```
- **Rule 27** (warning): gaming, CPU tier below the allowed band for the card at the resolution (redesign table:
  1080p min = card tier, 1440p card − 1, 4K card − 2). **Rule 28** (warning): gaming with a CPU under 6 cores.
  **Rule 29** (note): card VRAM below the resolution minimum (redesign: 1080p 8 GB, 1440p 12 GB, 4K 16 GB).
  **Rule 30** (note): CPU tier above the band's maximum (1080p card + 2, 1440p card + 2, 4K card + 1): "the same
  money on the card gives more FPS". No tier for either chip → the rule says nothing (no unknown note: tiers are
  advice, not compatibility). None of 27–30 hides a part.
- **Rule 14 (owner answer 8):** reaching the card maker's figure when the whole-build formula is at or below it is
  a **pass** ("fits"); the +10% "tight" warning applies only when the formula decides. Below the formula but at or
  above the maker's figure stays a warning; below the maker's figure an error with basis `stated` (hides). Scenario
  **S25 changes from warning to pass** (650 W card figure, formula 550 W); S59/S62 keep their levels; a 9950X3D +
  RTX 5090 (minPsu 1000, 31 listings on main) + 1000 W PSU is a warning, never hidden (finding #3). The duplicated
  reason text of #3 (psu–gpu and psu–cpu) cannot happen: rule 14 is one finding.
- **Rule 16 (owner answer 8):** today a Mini Tower counts as a "Tower" and passes an ATX PSU (Fractal Terra, finding
  #2). New behaviour depends on the owner's answer to question 2 (case PSU types). With the recommended option A:
  "small case" = stated `maxBoard` Mini ITX or size "SFF / Cube" (184 case models, 385 listings on main) → ATX PSU
  = **unknown** ("small case: check that it takes an ATX power supply"), SFX/SFX-L = note "probably fits (estimate)";
  Midi/Full Tower → ATX pass (estimate) as today, SFX/SFX-L note "check the case takes it (often with a bracket)";
  Mini Tower with a larger board → ATX note "probably fits (estimate)". A small case never shows "fits" for an ATX
  PSU. Scenario S49 keeps "note"; new S6x for Terra + ATX (unknown) and Terra + SFX (note).
- **Rule 10:** a socket in `socketsTitle` only (Task 2 G4) → unknown, not error.
- **Rule 11:** a `coolerIncluded` from the box-cooler table has basis `stated` (the maker's page) — message names the
  cooler ("Ο επεξεργαστής έχει στο κουτί AMD Wraith Stealth").

- [ ] New scenarios (real parts from merged data, one file each): S65 7600 + RTX 5090 at 1080p (27 warning), S66
  4-core gaming CPU (28), S67 8 GB card at 1440p (29), S68 9950X3D + RTX 5060 at 1080p (30), S69 Terra + ATX PSU
  (16 unknown), S70 Terra + SFX PSU (16 note), S71 Assassin X 120 Refined SE + AM4 CPU (10 unknown), S72 8600G Box
  without cooler (11 pass), S73 9950X3D + 5090 + 1000 W (14 warning, not hidden).
- [ ] Failing tests first; implement; every old scenario keeps its level except S25 (owner answer 8, noted in the
  commit message).
- [ ] `npm run check` → commit `feat(engine): rules 27-30, PSU maker figure fits, small cases never fit ATX, title sockets`.

### Task 6: Builder data in per-step files (first load ≈ 5 KiB)

**Files:** modify `src/lib/derive.ts` (`builderFiles` replaces `builderFile`; `manifest`, `checkData`),
`vite-plugin-data.ts` (write `data/builder/index.json`, `data/builder/<slot>.json`, `data/builder/<slot>-extra.json`;
stop writing `builder.json`, `builder-extra.json`, `builder-storage.json` — build outputs, never committed),
`src/types.ts` (`BuilderIndex`, `BuilderSlotFile`, `BuilderExtraFile`); create `src/lib/builderFiles.ts`; tests
`tests/unit/builderFiles.test.ts`, `scripts/checks/data-check.test.mts`.

**Interfaces:**
```ts
type Res = '1080p' | '1440p' | '4k';                                   // engine/data/tiers.ts (Task 4)
type UseKind = 'gaming' | 'everyday' | 'creating' | 'unsure';
type UseKey = 'gaming-1080p' | 'gaming-1440p' | 'gaming-4k' | 'everyday' | 'creating' | 'unsure';
interface BuilderIndex {
  v: 2; builtAt: string;
  slots: Record<Slot, { rows: number; bytes: number }>;       // for skeleton counts and the data check
  chipLengths: Record<string, ChipLengths>;                     // rule 6 estimates (today's fitContext, from gpu rows)
  minimum: Partial<Record<UseKey, { total: number; parts: Partial<Record<Slot, string>> } | null>>; // Task 10 fills it
}
interface BuilderSlotFile { v: 2; builtAt: string; cols: string[]; rows: unknown[][] } // engine fields + display fields
interface BuilderExtraFile { v: 2; builtAt: string; urls: Record<string, string>; titles: Record<string, string> }
loadIndex(): Promise<BuilderIndex>
loadSlot(slot: Slot, builtAt: string): Promise<Model<SlotListing[Slot]>[]>   // memoised, ?v=<builtAt>, one retry
loadExtra(slot: Slot, builtAt: string): Promise<BuilderExtraFile>
prefetchSlot(slot: Slot, builtAt: string): void                              // idle time, after the first paint
```
- Rows carry exactly the engine fields of `pick.PART_FIELDS` (one source of truth with pick mode and compat chunks)
  plus name, price, `ship` (Task 7), `pop`, `img`, `drop`.
- `checkData`: a slot with no rows fails the build (as today); a slot file whose model count falls > 30% below the
  live manifest fails it.
- [ ] Failing tests: the rows of every slot file regroup to the same models as today's `builder.json` for the same
  input (equivalence on merged data, storage included); `index.json` ≤ 8 KiB gzip; a failed `loadSlot` rejects
  once, a retry succeeds, the memo does not keep the failure.
- [ ] Bytes table per file in the commit message (v2 `dist` of 19/10: cpu 7.8, mobo 28.4, ram 6.9, gpu 32.5,
  cooler 62.6, case 89.2, fan 47.5, psu 4.4 KiB gzip inside `builder.json` = 279.1 KiB).
- [ ] The UI side of Review Focus 3 (retry button, other steps unaffected, a line with no loaded price never counts
  as 0 in the total) is tested in Task 11's e2e with a route that fails `case.json` once.
- [ ] `npm run check` → commit `perf(builder): one data file per step, index file for the first screen (rule 11)`.

### Task 7: Builder rows — real PSU products, one card per CPU, GPU twins, shipping, junk filters

**Files:** create `src/lib/builderData.ts` (moved from `builder.ts`: `usable`, `slotModels`, `fitContext`,
`storageType`; new `psuProductKey`, `psuGroupFallback`, `gpuTwinKey`), `scripts/phase4/psu-products.mts` (report);
modify `src/lib/derive.ts`, `src/lib/categories.tsx` (PSU builder grouping only; the category page `/psu` keeps its
spec groups); tests `tests/unit/builderData.test.ts` (real titles).

- **PSU products (owner answer 8, finding #4):** the builder's PSU choice is a product = maker + series words +
  watts, from the titles at build time (no scraper field). First estimate on main's data with a simple title rule:
  3,947 listings → 183 spec groups today → **≈ 2,635 products, 714 on 2+ sites, 120 with no series words** (those
  stay one product per listing). The task refines the rule on real titles (e.g. "Corsair RM850e", "Asus ROG Thor
  III 1200", "MSI MAG A850GL PCIe5") and reports products, twins across sites and wrong merges checked by hand on
  50 random products.
  `psuGroupFallback("650W Gold ATX")` → the cheapest current product with 650 W, Gold, ATX (old saved builds, v1
  share links).
- **Form factors (answer 8, finding #1):** `usable.psu` = ATX, SFX, SFX-L (SFX-L = formFactor SFX with "SFX-L" in a
  title: 22 listings). Main today: ATX 3,744, SFX 133, SFX-L 22, TFX 39, Flex 9 listings. TFX/Flex stay out (no case
  data says which takes them).
- **CPU card (finding #15):** one card per chip; its versions (Box with the named cooler / Box / Tray) are rows
  inside the card, each with its price; the candidate key stays `chip|coolerIncluded`.
- **GPU twins (finding #16):** cards stay per listing (lengths differ per card), but listings of the same partner +
  chip + VRAM whose short title key (`titles.titleKey`) is equal are one card (cheapest kept, others become its
  offers). The real fix is a `card` field from the scraper (B7 schema, approved 10/10, never built) → question 9.
- **Price incl. shipping where known (answer 11):** each row's price is its cheapest listing by `total` where
  `ownTotal` (data.ts) is known, else by price; the row carries `ship` (null = not known) and the UI says "με
  μεταφορικά / incl. shipping" only when known.
- **Junk (finding #21):** cooler rows whose model name is an accessory ("μετατροπέας", "adapter", "bracket",
  "mounting kit", "βάση") are not usable — the task reports the matched names before excluding them.

- [ ] Failing tests from real titles; equivalence for the other slots; the PSU report.
- [ ] `npm run check` → commit `feat(builder): real PSU products incl. SFX/SFX-L, one card per CPU, GPU twins, shipping-aware price`.

### Task 8: Build store v2 — second drive, fan quantity, chosen shops, named builds, share link

**Files:** modify `src/lib/buildStore.ts`, `src/lib/slots.ts` (order: `…,'case','psu','fan'`), `src/content/pages.ts`
(privacy: new key `pcBuilds`), `src/lib/site.ts` (`PRIVACY_UPDATED`); create `src/lib/share.ts`,
`src/lib/savedBuilds.ts`; tests `tests/unit/buildStore.test.ts`, `tests/unit/share.test.ts`,
`tests/unit/savedBuilds.test.ts`.

**Interfaces:**
```ts
interface StoredBuild {
  parts: Partial<Record<Slot, StoredPart>>;
  storage2?: StoredPart;                       // answer 13: a second drive
  fanQty?: number;                             // 1–12, packs of the chosen fan product
  offers?: Partial<Record<Slot | 'storage2', string>>; // chosen listing id per line (answer 11)
  use?: UseKind; res?: Res; budget?: number;
}
// localStorage `pcBuild` stays the active build (pick mode and product pages read it); unknown keys round-trip.
interface SavedBuilds { v: 1; active: string | null; builds: Record<string, { name: string; savedAt: string; build: StoredBuild }> } // localStorage `pcBuilds`, ≤ 30 builds
encodeShare(b: StoredBuild, names: Partial<Record<Slot | 'storage2', string>>): string   // /builder?v=2&cpu=…&n.cpu=…
decodeShare(params: URLSearchParams): { build: StoredBuild; names: Partial<Record<Slot | 'storage2', string>>; version: 1 | 2 } | null
```
- Old formats keep working: a v1/v2 `pcBuild` without the new keys reads as before; v1 share links
  (`/#builder?cpu=…` → `legacyTarget`) and v2 links without `v=2` decode as version 1. `use=gaming` from an old link
  maps per question 6 (recommended: gaming 1080p).
- A part a link names but the data no longer has (finding #22): shown as "Δεν πωλείται πια: <name>" with the name
  from `n.<slot>` (v2 links) or the slot + key (old links), and a link to the step.
- Named builds (answer 12): save as, rename, duplicate, delete, open; the active one is mirrored to `pcBuild` on
  every change; a write from pick mode (`setPart`) updates the active named build too. Side-by-side compare =
  backlog.
- [ ] Failing tests: round-trip of every field; `setPart('cpu', …)` keeps `storage2`, `fanQty`, `offers`; a v1 link
  with a gone GPU listing names it; a share link never overwrites the saved build until the user changes something
  (today's rule `followSavedBuild`); 31st named build refused with a message; storage full → the build still works
  in memory (no throw).
- [ ] Privacy text el + en for `pcBuilds` (what it holds, that it stays in the browser); `PRIVACY_UPDATED` = the
  commit date.
- [ ] `npm run check` → commit `feat(builder): second drive, fan quantity, chosen shops, named builds, share link v2`.

### Task 9: The builder on the engine — labels, statuses, candidate checks; v1 rules removed

**Files:** create `src/lib/fitLabel.ts`, `src/lib/builderEngine.ts`; modify `src/lib/pickChecker.ts` (context with
`chipLengths` and `use` in the request), `src/lib/pickProtocol.ts`, `src/lib/pick.worker.ts`; **delete**
`src/lib/builder.ts` rules part, `src/lib/wizard.ts` (`SHARES`, `optional`, `sorter` replaced), `src/lib/fans.ts`
checks (the fan plan moves to `src/lib/fanPlan.ts`), `src/components/builder/{Guided,QuickList,Summary,Review,FanAdvice,parts}.tsx`
replaced in Tasks 11–13 — **deletions need the owner's OK (question 12)**; `tests/compat/v1-adapter.ts` gets a frozen
test-only copy of v1's rules (`tests/compat/v1-rules.ts`) so the v1 report still runs; tests
`tests/unit/fitLabel.test.ts`, `tests/unit/builderEngine.test.ts`.

**Interfaces:**
```ts
type Label = 'fits' | 'likely' | 'unverified' | 'check' | 'no';
interface ActiveBuild {                              // the builder's in-memory build (rows loaded from the step files)
  parts: { [S in Slot]?: Model<SlotListing[S]> }; storage2?: Model<StorageListing>; fanQty: number;
  offers: Partial<Record<Slot | 'storage2', string>>; use: UseKind | null; res: Res | null; budget: number | null;
}
labelOf(findings: Finding[], partKey: string): { label: Label; worst?: Finding; other?: Slot }  // names the other part (#19)
toParts(build: ActiveBuild): Part[]                    // storage + storage2 as two parts, fan with quantity
optionalSlot(slot: Slot, findings: Finding[]): { optional: boolean; why?: Text }   // from rules 11/12, both modes (#8)
buildStatus(findings, missing: Slot[]): { kind: 'missing' | 'error' | 'warning' | 'ok'; counts: Record<Label, number> } // (#18)
stepReason(verdicts: Map<string, Verdict>): Text | null   // the one "not verified" reason of a step (#14)
```
- Label mapping: pass basis stated/maker-list → fits; pass/note basis estimate → likely; unknown → unverified;
  warning → check; error → no (hidden only when `hides`). Rules 26 (always a note) and 27–30 never change a label;
  they are listed as notes.
- Candidate checks: the step's candidates go to the worker with the active build (`checkAll`, `full: true`); the
  picker shows verdicts as they arrive; ranking puts `unverified` after `fits`/`likely` (owner answer 1–4).
- [ ] Failing tests: H9 Flow + RTX 5090 342 mm → unverified (after Task 2), not hidden; 7500F without GPU → GPU step
  required in **both** modes; 8600G Box → cooler optional; empty build → status `missing` with the list (C8), never
  "Όλα ταιριάζουν"; a case line whose only non-fit is the fan check says "fans" (#19); M.2 drive with a board
  without `m2Slots` (96% of boards today) → unverified, reason said once.
- [ ] Bytes: worker chunk delta (engine already there); Builder chunk loses v1 rules (≈ −6 KiB gzip `builder.ts`).
- [ ] `npm run check` + e2e → commit `refactor(builder): fits, warnings and statuses from the v2 engine; v1 rules removed`.

### Task 10: Recommended by use and budget left; automatic build per budget (build time)

**Files:** create `src/lib/recommend.ts`, `src/lib/autoBuild.ts`, `src/lib/useMinimums.ts`; modify
`src/lib/derive.ts` + `vite-plugin-data.ts` (write `data/builder/auto.json`, fill `index.json.minimum`),
`src/types.ts` (`AutoFile`); tests `tests/unit/recommend.test.ts`, `tests/unit/autoBuild.test.ts`,
`scripts/checks/auto-build.test.mts` (grid on real data).

- **Uses:** gaming (1080p / 1440p / 4K), everyday, creating, not sure (= gaming 1080p for minimums). Minimums from the
  redesign table (`useMinimums.ts`, values listed for the owner, question 6): everyday 6 cores + iGPU, 16 GB, 500 GB
  NVMe; gaming 1080p 6 cores, 8 GB VRAM, 16 GB (32 GB preferred), 1 TB NVMe; 1440p 6 cores, 12 GB VRAM, 32 GB, 1 TB;
  4K 8 cores, 16 GB VRAM, 32 GB, 2 TB; creating 8 cores, 32 GB, 2 TB.
- **Automatic build (answer 5–6), at build time from today's prices:** per platform (AM5 + DDR5, AM4 + DDR4, LGA1851
  + DDR5, LGA1700 + DDR5/DDR4) the cheapest base that meets the minimums and passes the engine (board, RAM, NVMe,
  case, cooler when the CPU has none in the box); the rest goes to CPU + GPU: every pair with tiers that fits the
  money left after the PSU it needs, passes rule 27's band at the resolution and has no engine error or warning
  except notes; the best GPU tier wins, then CPU tier, then price. PSU = the cheapest product ≥ max(maker figure,
  formula) with a known maker and a stated efficiency. Fans per the fan plan when the case has none in the box.
  Grid: 400–5,000 € in 50 € steps × 6 uses (558 builds) → `auto.json` (keys as indexes into one key table; estimate
  ≤ 25 KiB gzip, measured in the task). A budget between grid points uses the step below.
- **Can't buy (answer 6):** `index.json.minimum[use]` = the cheapest build that meets the use's minimums. When the
  budget is lower, the start screen and the summary say: "Ένα gaming PC 1440p με 32 GB κοστίζει σήμερα τουλάχιστον
  X € / A 1440p gaming PC with 32 GB costs at least X € today" with a button "Δες αυτό το build / See that build".
- **Recommended (answer 5, finding #5):** per step a target price = the auto build's price for that line, scaled to
  what is left after the chosen parts. Order: (A) meets the use minimum and costs ≤ 115% of the target; (B) meets it
  but costs more; (C) below the minimum; within each group CPU/GPU by tier at the resolution then price, RAM by
  capacity then €/GB, storage NVMe first for the first drive then €/TB, PSU by watts ≥ need then efficiency then
  price, others by `ranking.ts` score; `unverified` after verified inside each group. **A PSU with no stated
  efficiency or an unknown maker is never first** (answer 8). No budget: groups by minimum only.
- **Over budget (finding #6):** the summary shows the budget bar with each line's share and "+N € over the plan for
  this part" on the lines that broke it.
- [ ] Failing tests: Recommended CPU top differs between everyday 500 € and gaming 3,500 € on real data; GPU top for
  everyday has no card or the cheapest that meets "none"; grid check on real data: every auto build ≤ its budget,
  0 engine errors/warnings, gaming ≥ 6 cores, PSU ≥ recommended, rule 27 band OK; budgets under the minimum return
  `null` + the minimum.
- [ ] `npm run check` → commit `feat(builder): Recommended by use and budget left, automatic build per budget from today's prices`.

### Task 11: Builder shell — start screen, part list, guided walk, summary bar, phone layout

**Files:** create `src/components/builder/{Start,PartList,GuidedWalk,StepHeader,SummaryBar,SavedBuildsMenu}.tsx`,
`src/ui/builderStrings.ts`; modify `src/components/Builder.tsx`; tests `tests/e2e/builder.spec.ts`.

- **Start screen (answer 7):** use (+ resolution for gaming) and budget with quick picks, then three buttons: "Φτιάξ'
  το για μένα / Build it for me" (auto build → part list), "Βήμα-βήμα / Step by step" (guided), "Λίστα εξαρτημάτων /
  Part list" (Quick list). The "costs at least X €" line appears as soon as use and budget are set.
- **Part list:** one line per part in the order of `SLOTS` (+ second drive line after storage, fans with quantity
  last), each with photo, name, key specs, price (+ "με μεταφορικά" when known), shop, label, actions (change,
  remove, shop choice). Lines for chosen parts load their step files after the first paint (skeleton meanwhile).
- **Guided:** a compact header "Βήμα 2/9 · Μητρική" with ‹ › and a step list on tap (C9); one summary line of guide
  text + "Περισσότερα / More" (C10); the measurement notice collapsed to one line after the first time (C9); the
  picker below. Fans are a section of the case step ("Ανεμιστήρες κουτιού (προαιρετικό)").
- **Summary bar:** total, budget bar, status (`missing` neutral list with checkmarks — C8 —, then errors, warnings),
  recommended PSU W; phones: fixed bottom bar, details open upward, the page gets bottom padding so nothing sits
  under it (finding #24).
- **360 px (answer 10, finding #23):** on every step the first product card (or the chosen part) starts above the
  fold with the bottom bar shown; asserted by e2e (top of the first card + bar height ≤ 780).
- [ ] e2e at 360 and 1366, el and en: start → auto build → part list; guided walk to Review; the first card above
  the fold on every step; no horizontal overflow; every control ≥ 44 px.
- [ ] Bytes: `/builder` first-paint JS ≤ 105 KiB (≥ 5 KiB margin), first-load data = `index.json` only.
- [ ] `npm run check` + e2e → commit `feat(builder): start screen, part list and guided walk on one list`.

### Task 12: The step picker (shared by both modes)

**Files:** create `src/components/builder/{Picker,PartCard,CpuCard,PsuCard,FanPlanPanel,ShopChoice}.tsx`; modify
`src/lib/search.ts` (or the picker's own search helper); tests `tests/unit/pickerSearch.test.ts`,
`tests/e2e/builder.spec.ts`.

- Toolbar: search, sort (Recommended / Price / Value), chips "Μόνο συμβατά / Only compatible" (on), "Μόνο
  επιβεβαιωμένα / Verified only", "Εντός budget / Within budget"; 24 per "Περισσότερα"; the step's single "not
  verified" reason above the cards (#14).
- Search (#32): a number with a unit ("650W", "32GB", "1TB", "120mm") matches whole numbers only ("650W" ≠ "1650W").
- CPU card (#15): versions inside the card. PSU card (#4): maker + model, watts, efficiency (or "χωρίς δηλωμένη
  απόδοση / no stated efficiency"), form factor, ATX 3.x when stated, modular when known.
- Storage: second drive line (answer 13); a first drive that is an HDD gets the note "Ένας σκληρός δίσκος ως δίσκος
  συστήματος είναι αργός· για το σύστημα διάλεξε SSD / An HDD as the system drive is slow; choose an SSD for the
  system" (#17); M.2/SATA checks through rules 17/18/20 (#26; board coverage 3.6% M.2 slots, 3.3% SATA ports
  today, so mostly "not verified", said once).
- Fans in the case step (answer 9, #13): the fan plan (`fanPlan.ts`, today's v1 logic: 2 front + 1 rear, high power
  3 + 1 + 2, minus fans in the box) shown as "Πρόσθεσε 3 × 120 mm / Add 3 × 120 mm"; packs matching the plan's size
  first; a quantity stepper (1–12 packs); a note when the chosen fans are fewer than the plan; rule 21/22 labels.
- Shop choice (answer 11): "Άλλο κατάστημα / Other shop" opens the model's offers from its product-page model chunk
  (on demand, no first-load bytes); the chosen offer's price is the line's price; "fewest shops / one shop" is not
  built (backlog: shops known for about a third of listings, B8 not on main).
- Pickers on phones open in the bottom sheet above the bar (#24).
- [ ] Failing tests (search whole numbers; plan packs; fewer-fans note); e2e for each card type at 360/1366.
- [ ] `npm run check` + e2e → commit `feat(builder): one picker for both modes with CPU, PSU and fan plan cards and shop choice`.

### Task 13: Review, Copy list, share link

**Files:** create `src/components/builder/{Review,CopyList,PowerBreakdown}.tsx`, `src/lib/copyList.ts`; tests
`tests/unit/copyList.test.ts`, `tests/e2e/builder.spec.ts`.

- One Review for both modes: every line with photo, exact product name **and variant** (the chosen listing's title),
  price, shop (link ≥ 44 px, #25), label naming the other part when not "fits" (#19); missing lines link to their
  step; total = sum of shown prices; prices' date; the engine's messages in three groups (errors, warnings, notes)
  with their fix; BIOS note from rule 13 / the B5 table (answer 13); power estimate with per-part breakdown and the
  recommended PSU.
- Copy list (#27): one line per part "Κατηγορία: <title> — <price> — <shop> — <URL of the chosen listing>", total,
  date, share link.
- Share link + reload: the same build after reload and in a fresh context; the chosen offers travel in the link.
- [ ] Failing tests: Copy list names the variant (Montech XR white vs black) and the PSU's maker + model; a gone
  chosen offer falls back with a notice and the total is still the sum (Review Focus 5).
- [ ] `npm run check` + e2e → commit `feat(builder): one Review with Copy list, share link, power and BIOS notes`.

### Task 14: Texts and formats sweep, layout and motion

**Files:** `src/ui/builderStrings.ts`, `src/components/BuildGuide.tsx` (guide texts per step), `src/lib/i18n.ts`
(`plural`), `src/lib/format.ts` (one price format, ranges included); tests `tests/unit/i18n.test.ts`.

- Board step text of its own: chipset, size, M.2, Wi-Fi (#29); one price format in English ("€245–315", "€22.02
  left") and Greek ("245–315 €") (#30); singular/plural for every count ("1 θέση", "1 θέσεις" never) (#31).
- `node scripts/checks/layout-audit.mjs` on `/builder` (start, every step, Review, Quick list) at
  1920/1366/1024/768/360, el/en: 0 issues; `scripts/checks/motion-check.mjs` Home → Builder passes (Phase 4 gate);
  the dialog and the toast pass it on `/builder` (backlog #15).
- [ ] `npm run check` + e2e → commit `fix(builder): own board text, one price format, plurals; layout and motion checks`.

### Task 15: Backend queue items on main (each: owner OK before push)

Run in `C:\Users\Teo\Desktop\PROJECTS\builddraft-scraper-fixes` (branch `a3-queue`), one item at a time, after the
items already waiting in the queue (PROJECT-STATE rule 1). Each item: offline before/after on main's data, Python
test, **owner OK, push**, then the next scheduled scrape green with "history check: nothing lost" and an accepted
Vercel build. No workflow is started by hand.

- **Q-B1 overrides.json (recommended, question 4):** entries with values read from the makers' own pages, downloaded
  in the task: NZXT H9 Flow (`nzxth9flow`) `gpuMaxMm`; Corsair 3200D RS (`corsair3200drs`) `gpuMaxMm`; Deepcool
  AK400 family heights now 97 mm from Skroutz pages (`deepcoolak400`, `deepcoolak400wh`, `deepcoolak400zerodark`,
  `deepcoolak400digitalpro`); SilverStone Sugo SG13B-Q (`silverstonesugosg13bqcube`) `maxBoard`; Thermalright Assassin
  X 120 Refined SE (`thermalrightassassinx120refinedse`) `sockets`. Current values per listing in report.md. One
  push, run log line `[<cat>] override …: … on N listings` checked for every entry.
- **Q-B2 board "-ITX" (optional):** `normalize_mobo` takes Mini ITX when the name says "-ITX" even with a chipset "M"
  suffix (Shopflix/Snif "B550M-ITX / ac Mini ITX" read as Micro ATX: `asrocka520mitxac`, `asrockb550mitxac`). v2's
  Task 2 name rule already corrects both; this fixes the source.
- **Q-B3 GPU `card` field (optional, question 9):** emit `normalize.card_key` as `card` on GPU listings (B7 schema,
  approved 10/10, never built) so the builder shows one card per product across sites. Schema change on main.
- **Q-B4 included fans (optional):** overrides for the most-listed cases with no fan data (24 of the top 50 by
  listings today, e.g. Asus ProArt PA401, Fractal Meshify 3, be quiet! Pure Base 600, Corsair 3500X, Phanteks XT Pro
  Ultra), from the makers' pages (finding #20).

### Task 16: Step 5 gate (Phase 4 gate)

**Files:** create `scripts/phase4/builds.mjs` and `scripts/phase4/drive.mjs` (from
`.superpowers/sdd/2026-10-20-builder-test-drive/work/`, new selectors, same builds a–g), `tests/e2e/builder-gate.spec.ts`,
`docs/phase4/gate.md`, `docs/phase4/perf/*`; screenshots to `docs/phase4/screens/` (**local only**: added to
`.git/info/exclude`, never committed); PROJECT-STATE diff for approval.

- [ ] Re-merge origin/main (Task 0's last step) so Q6 aliases and current data are in.
- [ ] Builds a–g (cheap gaming 700, mid gaming 1,300, high-end 3,500 Ryzen 9 + RTX 5090, Mini-ITX 1,200, everyday
  500, Intel creating 2,000, AM4 900) in Guided and Quick list at 1366 and 360, el and en, a screenshot per step.
  Each run asserts: no wrong error/warning (expected findings per build written in `builds.mjs`, e.g. c: rule 14
  warning not error; d: Terra + SFX PSU note, no "fits" with ATX; e: no cooler needed for the 8600G Box), total =
  sum of the lines, share link opens the same build in a fresh context, Copy list text has every line with its
  variant and URL, reload keeps the build.
- [ ] Re-run all 32 findings: each "fixed" (with the screenshot) or "not now" (the reason from the table below).
- [ ] Lighthouse median of 3: `/builder` (empty), `/builder` with build b saved, `/builder?step=case` — phone ≥ 90,
  desktop ≥ 95, CLS 0; bytes per rule 11 (`scripts/phase3/measure-pick.mjs bytes`); compat scenarios 0 failures;
  `npm run e2e`; layout audit 0; motion check.
- [ ] Gate report, PROJECT-STATE diff, backup (`scripts/backup-v2.ps1`), short report to the owner.

---

## Findings and owner answers → tasks

| # | Finding (test drive 20/10) | Task | Note |
| --- | --- | --- | --- |
| 1 | No SFX PSU can be chosen | 7, 5 | ATX + SFX + SFX-L offered; rule 16 per question 2 |
| 2 | Terra + ATX PSU "fits" | 5 | Never "fits" in a small case (option per question 2) |
| 3 | 1000 W hidden for 9950X3D + 5090; text twice | 5, 9 | Rule 14 warning, not hidden; one finding, one text (S73) |
| 4 | PSU spec groups, junk first, Copy list "650W Gold" | 7, 10, 13 | Real products; no-efficiency/no-maker never first |
| 5 | Recommended ignores use and budget | 10 | Target per line from today's prices |
| 6 | Budget hints below prices, "0,00 € left", no culprit | 10, 13 | Real-price split, "costs at least", over-budget lines |
| 7 | Box CPUs: cooler "not stated" | 3, 9 | Official table; cooler step optional |
| 8 | Quick list "optional" differs from Guided | 9, 11 | One `optionalSlot` from the engine |
| 9 | H9 Flow 200 mm hides the 5090 | 2, 15 | G1 → not verified; Q-B1 override |
| 10 | Assassin X 120 Refined SE hidden on AM4 | 2, 5, 15 | G4 title socket → unknown; Q-B1 |
| 11 | B550M-ITX/ac "Micro ATX" | 2, 15 | Name rule; Q-B2 optional |
| 12 | AK400 97 mm / SG13 "ATX" / 3200D RS 180 mm | 15, 2 | AK400 override only (no rule catches it); SG13 G2; 3200D G1 + override |
| 13 | Fans: one product, no quantity | 12 | Quantity, plan packs, fewer-than-plan note |
| 14 | Needless "not verified" | 9, 12 | `bays35` used (50.5% of case models), ranked below, reason once |
| 15 | Box and Tray twice | 7, 12 | One CPU card with versions |
| 16 | Duplicate products | 7 (GPU), not now (storage) | GPU twins merged in v2, `card` field Q-B3; storage names = B9 batch 2 on main |
| 17 | HDD as only drive, no note | 12, 10 | Note + SSD first for the first drive |
| 18 | "Όλα ταιριάζουν" with parts missing | 9, 11 | Status `missing` first (C8) |
| 19 | Case label from the fan check | 9, 13 | Label names the other part |
| 20 | Included fans unknown (XT Pro Ultra) | 15 (Q-B4, optional) | Else not now: 24 of the top 50 cases lack fan data; maker parsers = scraper work |
| 21 | Quick list: cheapest-first junk, no sort/Review | 11, 12, 7 | Same picker/Review; accessory filter |
| 22 | Share link drops a gone part silently | 8 | Named, with link to the step |
| 23 | 360 px: first product below the fold | 11 | C9/C10; e2e asserts on every step |
| 24 | Picker under the phone bar | 11, 12 | Sheet above the bar; page padding |
| 25 | 24 px price/shop links | 13, 14 | `tap` ≥ 44 px; layout audit |
| 26 | Storage has no fit label | 9, 12 | Rules 17/18/20; low board coverage said once |
| 27 | Copy list: no PSU brand, wrong variant link | 13 | Chosen listing's title and URL |
| 28 | Steps vs summary order | 8, 11 | One `SLOTS` order |
| 29 | Board step repeats CPU text | 14 | Own text |
| 30 | English price formats mixed | 14 | One format |
| 31 | "1 θέσεις" | 14 | `plural` |
| 32 | "650W" finds "1650W" | 12 | Whole-number search |

| Owner answer (step 5 prompt) | Task |
| --- | --- |
| 1–4: hidden only on a real "no"; not verified ranked below, reason once per step; use `bays35`, `m2Slots`, `m2Gen`, `sataPorts` | 9, 12 (rules 17–20 already read them; `m2Gen` has no values yet) |
| 5–6: Recommended follows use + budget left; automatic build (B6 tiers) by today's prices; "costs at least X € today" | 4, 10 |
| 7: one order everywhere; use + budget on the first screen; fans optional in the case step with a quantity | 8, 11, 12 |
| 8: v2 engine only; PSU maker figure = fits, below estimate = warning, never hidden; SFX/SFX-L; small case + ATX never "fits"; case PSU options as a question; real PSU products; no-efficiency/no-maker never first | 5, 7, 9, 10; question 2 |
| 9: fan quantity, plan-matched packs, fewer-than-plan note | 12 |
| 10: 360 px first product visible; pickers never under the bar; ≥ 44 px | 11, 12, 14, 16 |
| 11: cheapest incl. shipping where known; shop per part; "fewest shops / one shop" → backlog | 7, 12; backlog (merchant known for ~1/3 of listings, B8 not on main) |
| 12: named saved builds + privacy page; compare → backlog | 8; backlog |
| 13: second drive; M.2/SATA checks; gone parts named; BIOS note from B5; no OS/monitor/peripherals | 8, 9, 12, 13; OS/monitor/peripherals not built |
| 14: other builders = ideas only, nothing copied | all (no data, text or design taken) |
| Bullet: map all 32 findings and answers | this section |
| Bullet: six data errors re-checked, fix each, general rule with numbers | 2, 15; numbers in report.md |
| Bullet: box-cooler table from downloaded AMD/Intel pages | 3 |
| Bullet: one engine, Review, Copy list, share; old links/builds keep working (incl. Q6) | 1, 8, 9, 13 |
| Bullet: merge origin/main first; rule 11 budgets; Lighthouse phone ≥ 90, desktop ≥ 95 | 0, 6, 11, 16 |
| Bullet: Playwright gate a–g, 1366 + 360, el + en, screenshots local, assertions, 32 findings re-run | 16 |
| Bullet: subagent tasks; name what needs the owner's OK | this plan; list below |
| Roadmap row: rules 27–30, C8–C9 (and C10) | 5, 11 |
| Not in the owner's answers, from the redesign, **not now**: "already bought" marking, build price history chart, undo, three auto-build variants (economy / balanced / upgrade), 2 RAM kits, shipping rules per shop | backlog: the owner's answers don't ask for them; each costs bytes or data we don't have (shipping rules per shop) |

## Needs the owner's OK

| What | Task | Kind |
| --- | --- | --- |
| This plan (one approval for step 5, rule 4) | all | approval |
| Case PSU-type option (A/B/C/D, question 2); option B = a new hand table (rule 3 exception) | 5 | decision / rule 3 |
| General "single-source fit" rule G1–G4 and its numbers (question 3) | 2 | decision |
| Tier sources (B6) as decided 10/10, chips without agreement listed for the owner (question 7) | 4 | confirm |
| Intel box coolers if no intel.com page states them (question 5) | 3 | decision |
| Uses, resolution and minimums table (question 6) | 5, 10 | decision |
| PSU products built in v2 from titles (question 8); GPU twins (question 9) | 7 | decision |
| New localStorage key `pcBuilds` + privacy text (approved in answer 12) | 8 | done by the plan |
| Scenario S25 warning → pass (owner answer 8) | 5 | done by the plan |
| **Deleting** the v1 builder files in v2 (`src/lib/wizard.ts`, the rules in `src/lib/builder.ts`, `src/lib/fans.ts` checks, `src/components/builder/{Guided,QuickList,Summary,Review,FanAdvice,parts}.tsx`; question 12) | 9, 11–13 | deletion |
| Each backend push on main: Q-B1 overrides (question 4), Q-B2 normalizer, Q-B3 GPU `card` field (schema change), Q-B4 fan overrides | 15 | push / scraper / schema |
| Workflow runs: none started by any task; the scheduled scrapes after each push are only checked | 15 | — |
| Gate report + PROJECT-STATE diff | 16 | approval |

## Open owner questions

Recommendation after each arrow.

1. "My own complaints: [ADD OR DELETE THIS LINE]" was left unfilled. → If nothing to add, the plan stands; anything
   added becomes a row in the findings table before work starts.
2. Case PSU types (below). → A now, plus B for the ~25 most-listed small cases.
3. General rule G1–G4 (Task 2): 38 case GPU limits, 121 case board sizes, 39 board sizes, 59 cooler sockets become
   "not verified". → Yes, enforced in v2 at build time.
4. Q-B1 overrides on main (H9 Flow, 3200D RS, AK400 × 4 keys, SG13B-Q, Assassin X 120 Refined SE), one push. → Yes;
   AK400 can only be fixed this way.
5. Intel box coolers: intel.com's served spec page names only the PCG thermal class. → Only an intel.com page that
   states the boxed SKU's cooler counts; else Intel Box CPUs stay "cooler not stated" and are listed for you.
6. Gaming by resolution (1080p / 1440p / 4K) with the redesign's minimums (Task 10). → Yes; an old "gaming" opens as
   1080p; "not sure" uses the 1080p minimums.
7. Tier sources (B6): Tom's Hardware 2026 + one more per family; disagreements → no tier, listed for you. → Confirm.
8. Real PSU products built in v2 from titles (≈ 2,600 from 3,947 listings); old "650W Gold" builds open with the
   group's cheapest current product and a notice. → Yes.
9. One graphics card per product: v2 merges equal short titles now; main's `card` field (B7) later. → Yes, Q-B3 later.
10. Two storage lines; RAM stays one kit. → Yes.
11. One automatic build per budget (400–5,000 € in 50 € steps × 6 uses); three variants not now. → Yes.
12. Delete the old builder files in v2 (list in "Needs the owner's OK"). → Yes.
13. TFX/Flex PSUs (39 + 9 listings) stay out of the builder. → Yes.

**Question 2 — cases have no PSU-type field (rule 3). Options:**
- **A (recommended now): size rule, 0 bytes, no data change.** Small = stated Mini ITX or "SFF / Cube" (184 models,
  385 listings): ATX PSU → "Fit not verified" with the reason, SFX/SFX-L → "probably fits". Towers as today. Honest
  but never confirms a small case; some ITX towers that take ATX (e.g. larger Mini-ITX towers) show "not verified".
- **B: A + a hand table for the ~25 most-listed small cases** (`src/engine/data/casePsu.ts`, ATX / SFX / SFX-L from
  the makers' pages, source per row, like rule 25). Needs the owner's rule-3 approval for one more table; ≈ 1 KiB in
  the worker chunk; one research task (~25 pages); turns the most-bought small cases into stated fits/errors.
- **C: a scraper field `psuForms` on cases** from the makers' pages main already reads (Lian Li, Fractal, Corsair,
  Thermaltake). Schema + scraper change through the backend queue; coverage only for those makers (maker fields reach
  ~3% of case models today), days of scrapes.
- **D: keep today's estimate** (a Mini Tower passes ATX). Contradicts answer 8; listed for completeness.

## Owner decisions 25/10 (binding; they override the task text above)

The plan is **APPROVED** (rule 4: one approval for step 5). Answers to the open questions:

1. No complaints beyond the test drive; the plan stands.
2. **Option A + B.** Task 5 adds `src/engine/data/casePsu.ts`: each row (ATX / SFX / SFX-L taken) is read from the
   maker's page the task downloads, with its source URL and date per row (~25 most-listed small cases).
3. G1–G4 enforced in v2 at build time (Task 2).
4. Q-B1 overrides: yes, values from the makers' pages with source URLs. It joins the main backend queue **after Q6
   and Q7**, one push at a time, owner OK per push.
5. Intel: only an intel.com page that names the boxed cooler counts; otherwise "not stated", and the list goes to
   the owner (Task 3 report).
6. Gaming by resolution with the redesign's minimums: yes.
7. **Tiers (Task 4): at least two independent sources must agree, or the chip gets no tier** (listed for the owner).
   Credit the sources on the site (a line where tiers are used and on the About page, el + en). Tiers are our own
   grouping; no site's table or text is copied. **No TechPowerUp.** Values only from pages actually downloaded.
8. Real PSU products from titles: yes.
9. GPU twins merged in v2: yes; **the Task 7 reviewer opens the pages of 10 merged pairs** and confirms each.
10. Two storage lines, one RAM kit: yes. 11. One automatic build per budget: yes. 12. Deleting the old builder files
    in v2: yes (git keeps the history). 13. TFX/Flex out: yes.

Additions:
- **Budget range (Task 10): 400 € up to at least 10,000 €** (build c costs 8,575 € today). Above the top of the
  range: no automatic build, with a plain message (el + en).
- **Per-step files (Tasks 6, 11, 16):** preload the next step's file while the buyer is on the current one; measure
  the step change on a throttled phone (time until the products show) and report it at the gate.
- **Task 15** items go into the same main queue (rule 1): Q6 → Q7 → Q-B1 overrides → the rest. **Q-B3 (the GPU
  `card` schema field) needs its own separate owner OK** when it is reached.
- Execution: subagent-driven to the gate (builder + separate reviewer per task, reviewer OK before each commit).
  Stop only for push, workflow runs, schema/scraper changes, deletions outside v2, or owner-only decisions.
