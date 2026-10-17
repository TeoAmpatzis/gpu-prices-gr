# Roadmap Step 4 (Phase 3): Product page + category-page speed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task (owner's rule 4: one builder and a separate reviewer per task, local commits). Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** every model gets its own page at `/<cat>/<slug>` (shops by total price, price history, fit with the saved
build, variants, alternatives, full specs), and the category pages get their bytes and first-load blocking time down
(`/case` data under the 300 KiB rule with room to grow, facet counts off the first paint), so the whole Phase 3 gate
can pass.

**Architecture:**
- The product page never loads a category's `list.json` or the 1.5–17 MB `history.json`. The build writes **model
  chunks**: `data/<cat>/model/<nn>.json` (256 per category, FNV-1a of the model's **slug**, the same hash function
  as `compatChunks.chunkOf`, so the address alone names the file), each holding, for its models (keyed by slug), the listings with URLs, the full daily history (dips marked),
  the imported low, the engine part fields, and precomputed variants and alternatives (keys, names, cheapest prices,
  photo ids). One request of ~5–20 KB gzip per page.
- Model addresses already exist (`modelSlug`, `routes.ts` kind `model`); today `ModelRedirect` opens the category
  searched. It becomes `ModelPage` (lazy chunk). Renamed keys (B9 on main) reach the page through one alias table
  (`src/data/modelAliases.ts`, built from main's `scraper/model_aliases.json` once that exists): an old slug
  redirects with `history.replaceState`, saved builds resolve through `buildStore.resolveKey` (already takes
  `aliases`).
- Fit with the saved build reuses the step 3 pick machinery: the engine runs in `pick.worker.ts` through
  `pickChecker.createChecker`, with the build parts from `buildStore` (refreshed through compat chunks when stale,
  `pickBuild.planBuild`).
- Category pages: `list.json` loses the per-model photo path map (`img`, 31 KiB gzip on `/case`) for a photo bitset;
  `hist` gets a compact encoding; facet counts move to a worker started after the first paint.

**Tech Stack:** React 18 + TypeScript (strict) + Vite 5 + Tailwind 3, Vitest 3, Playwright. No new dependencies.

**Spec:**
- `docs/redesign-v2.md` "Σελίδα προϊόντος" (8 parts) and the phases table (Phase 3 row and its gate);
- `docs/v2-backlog.md` "Gate criteria added at the Phase 1 gate" (Phase 3: time to first product vs v1, keyboard
  reach, real model pages), #12 (Compare = v2.1), #17 (skip to results);
- `docs/PROJECT-STATE.md` (rules 1–11; owner answers 17/10: keep 300 KiB, trims that keep prices / all-time low /
  week change equal, facet counts after first paint, RAM lone "2");
- `docs/phase2/gate.md` "Where B9 goes" (B9 before the step 4 gate);
- companion plan `docs/superpowers/plans/2026-10-17-main-backend-queue.md` (B9 and the rest of main's queue).

## Global Constraints

- Worktree `C:\Users\Teo\Desktop\PROJECTS\buildcraft-v2`, branch `v2`. **Every command `cd`s there first; v1
  (`C:\Users\Teo\Desktop\PROJECTS\Gpu price comparison`) must stay clean** (`git -C <v1> status --short
  --untracked-files=no` empty after every task). Never edit `public/data/**`.
- Commit locally only, never push, no `Co-Authored-By`, no mention of Claude. Keep each file's line endings.
- Before every commit: `npm run check` (typecheck, lint 0 errors, unit tests, build with the data check). UI tasks
  also `npm run e2e`. Compat scenarios stay 64 with 0 failures.
- Every UI string `{el, en}` (`src/ui/strings.ts` or the file the area already uses). Dark only. 360 px and 1366 px:
  no horizontal overflow, tap targets ≥ 44 px (`tap`).
- Values come from the data or fetched official pages, never memory.
- Routing: the existing addresses stay. New behaviour only on `/<cat>/<slug>` (already reserved).
- **Byte rule 11:** per page first-paint JS ≤ 110 KB gzip, data ≤ 300 KB gzip (fonts reported apart; code that loads
  after the first paint not counted). The product page's own target: data ≤ 60 KB.
- Normal category pages keep the same prices, all-time-low badges, week change, sale badges and sort order as before
  the byte changes (checked by `scripts/checks/data-equivalence.test.mts` plus new unit tests).
- New build-file types go into `src/types.ts` (build-time files only; the scraper's JSON is unchanged). This plan's
  approval covers them; any change to the scraper's output schema is not in this plan.

## Review Focus

1. A model whose key was renamed (B9) or that is no longer listed: the old address redirects to the new one, or shows
   "no longer available" with a link to its category — never a blank page or a crash. Test in Task 5.
2. GPU pages are chip pages ("RTX 5070 12GB") with many cards: "Add to build" belongs to a card (offer row), not the
   chip; CPU Box/Tray (cooler in the box) keeps the pick page's key. Test in Task 8.
3. Equal results after the byte trims: the same photo for every model, the same all-time low and week change on the
   build day and the next. Test in Task 2.
4. Facet counts arriving after the first paint must not shift the layout (CLS 0) and must not show stale counts for
   the filters now active (a newer request cancels the older). Test in Task 3.
5. A model with one listing, no history, no photo or no shipping data still renders every section with an honest
   empty state ("no price history yet", "shipping not known"). Test in Task 6.

---

### Task 1: RAM short titles without the lone "2" (owner 17/10)

**Files:** `src/lib/titles.ts`, `src/components/ModelRow.tsx` (passes the RAM option), `tests/unit/titles.test.ts`,
`tests/unit/titles-data.test.ts`.

**Interfaces:** `TitleOptions.phrases?: RegExp` (global): removed from each title before it is split into words.
`RAM_TITLE: TitleOptions = { phrases: /(?:με\s+)?\b\d+\s+modules?\b|\bmodules?\b/giu }` exported from `titles.ts`
(no `\b` before Greek letters: in JavaScript `\b` only knows ASCII word characters, so "με" is matched as plain
text).

- [ ] Failing tests from real titles: `'Kingston Fury Beast 32GB DDR4 με 2 Modules 2x16GB & Ταχύτητα 3200 για Desktop'`
  must not leave a lone `2`; `'Patriot Viper Elite 5 16GB DDR5'` keeps `5` (series name); `titleKey` of two titles
  that differ only in "με 2 Modules" is equal.
- [ ] Implement; ModelRow passes `RAM_TITLE` for `ram`.
- [ ] Data test: count short RAM titles ending in a lone digit that is not in the model's own title words after
  "Modules" removal: 0 (report the number before: the scratch scan found 23 in the first 40 lines).
- [ ] `npm run check` + e2e → commit `fix(ui): RAM short titles drop "με N Modules" (C5)`.

### Task 2: `list.json` bytes — breakdown and trims that change nothing shown

**Files:** create `scripts/phase3/list-bytes.mts`; modify `src/lib/derive.ts` (`listFile`), `src/lib/columns.ts`
(decoding), `src/lib/images.ts`, `src/components/ProductPhoto.tsx` (or the photo component in use),
`src/types.ts` (`ListFile`), `scripts/checks/data-equivalence.test.mts`; tests `tests/unit/listFile.test.ts`.

Breakdown of `/case/list.json` today (gzip of each part alone, 17/10): rows 190.4 KiB (6,869 listings × 20 columns),
`hist` 54.2, `img` 31.0, `imported` 10.1, header < 0.3 → 287 KiB on the page.

**Interfaces:**
- `list-bytes.mts <cat|all>` prints, per category, gzip KiB of `cols`, `rows`, each column of `rows` alone, `hist`,
  `img`, `imported`, other — before and after (reads `dist/data`).
- `ListFile.photos: string` (base64 bitset over the model keys of the file in sorted order; bit set = photo exists)
  replaces `img`. `images.ts`: `photoId(cat, key): string` = first 12 hex of SHA-1(`${cat}\0${key}`) (a small sync
  SHA-1 in `src/lib/sha1.ts`, ~40 lines, test vectors from RFC 3174), `productImage(cat, key, has)`.
- `ListFile.hist` compact form: per model `[firstDayIndex, ...pairs]` with day offsets from a file-level
  `histBase: 'YYYY-MM-DD'` and prices in cents (`number[]`); source and import flag kept only where `reduceHistory`
  output has them. Decoder `decodeHist(file): Record<string, DailyLow[]>` returns exactly `reduceHistory`'s points.

Steps:
- [ ] Write `list-bytes.mts`; record the "before" table for all 9 categories in the task's commit message and in
  `docs/phase3/step4-bytes.md`.
- [ ] Failing tests: (a) for every model key of each category's real data, the new photo lookup gives the same path as
  today's `img[key]` (or none); (b) `decodeHist(encode(x))` deep-equals `x` for every model of every category;
  (c) the SHA-1 test vectors.
- [ ] Implement both; extend `data-equivalence.test.mts` to compare old vs new list files through the browser's code
  path: same `allTimeLow`, week change, sale and photo per model on the build day and the next.
- [ ] Measure again: target `/case` data ≤ 255 KiB (≥ 45 KiB room). If below target, report the next candidates from
  the column breakdown (e.g. per-listing `title`/`merchant`/`shipping` moved to the expanded row's chunk) **without
  doing them** (owner decides).
- [ ] `npm run check` + e2e → commit `perf(data): photo bitset and compact history in list.json (rule 11)`.

### Task 3: Facet counts in a worker after the first paint

**Files:** create `src/lib/facets.worker.ts`, `src/lib/facetsClient.ts`; modify `src/components/CategoryView.tsx`,
`src/components/FilterBar.tsx`, `src/lib/facets.ts` (memoise per model sale / all-time low between the passes);
tests `tests/unit/facets.test.ts`, `tests/e2e/facets.spec.ts`.

**Interfaces:** `facetsClient.request(cat, filters, version): Promise<FacetCounts | null>` (null = superseded).
The worker loads the category's `list.json` itself (same URL with `?v=`, from the HTTP cache) once, then answers
`{filters, id}` with `{id, counts}`; requests carry an increasing id, older answers are dropped. Started from
`afterFirstPaint` (`src/lib/paint.ts`). Fallback: no Worker / worker error / no answer in 10 s → today's
main-thread `facetCounts` in idle slices (`pickBuild.runSliced`).

- [ ] Failing unit test: worker protocol (pure handler function) gives the same `FacetCounts` as `facetCounts` for 20
  random filter states per category on real data; a superseded request returns null.
- [ ] Implement; until counts arrive, options show without numbers and are **not** greyed (no option disabled by a
  missing count); count text has a fixed width so nothing moves when it fills in (CLS 0).
- [ ] e2e: `/case` loads, counts appear, a filter click updates counts, the selected option is never disabled.
- [ ] Measure `/case` phone (3 runs): TBT and score before/after in the commit message.
- [ ] `npm run check` + e2e → commit `perf(filters): facet counts in a worker after the first paint`.

### Task 4: Model chunk files (build-time)

**Files:** modify `src/lib/derive.ts` (new `modelChunks(input, cat)`), `vite-plugin-data.ts` (write
`data/<cat>/model/<nn>.json`, include in the publishing check: every current model is in exactly one chunk),
`src/types.ts` (`ModelChunk`, `ModelEntry`); create `src/lib/modelData.ts` (`loadModel(cat, key)`); tests
`tests/unit/modelChunks.test.ts`.

**Interfaces:**
```ts
interface ModelEntry {
  key: string; chip: string; slug: string;
  listings: BaseListing[];            // all fields incl. url, scrapedAt
  history: DailyLow[];                 // full history.json points of the model
  dips: string[];                      // dates of implausibleDips (C6), so the chart marks them
  imported: Imported[string] | null;
  part: Record<string, unknown> | null;  // toPart(slot, model).fields when the category is a builder slot
  variants: { key: string; slug: string; label: string; price: number }[];
  alternatives: { kind: 'cheaper' | 'value'; key: string; slug: string; chip: string; price: number; img: boolean }[];
}
interface ModelChunk { v: 1; builtAt: string; sources: Latest['sources']; models: Record<string, ModelEntry> } // by slug
```
- `modelChunkOf(slug) = chunkOf(slug) % 256` (`chunkOf` from `compatChunks.ts`, FNV-1a).
- Variants (same product, other sizes): GPU same chip other VRAM; storage same vendor + series other capacity; RAM
  same type + speed + form factor other kit; PSU same efficiency other wattage. Others: none.
- Alternatives: `cheaper` = up to 3 models of the same pill group (`cfg` group) and the same variant family rules
  above, cheaper now; `value` = up to 3 models within ±10% of the price with a higher `value.ts` score (only
  categories that have a value function). "Next tier" waits for B6 tiers (step 5): not in this task.
- [ ] Failing tests: chunk of a model = `modelChunkOf(slug)`; every current model exactly once; a model's `history`
  equals `history.json[key]`; variants never include the model itself; sizes: largest chunk per category ≤ 40 KiB
  gzip (report all).
- [ ] Implement; `loadModel` memoised, `?v=<builtAt>` like detail/history.
- [ ] `npm run check` → commit `feat(data): model chunk files for product pages`.

### Task 5: Model addresses, aliases and the not-found state

**Files:** create `src/data/modelAliases.ts` (`MODEL_ALIASES: Record<Category, Record<string, string>>`, empty until
B9 batches land; filled from main's `scraper/model_aliases.json` by a build step once it exists — see the backend
plan, item Q5); modify `src/lib/routes.ts` (doc), `src/shell/CategoryPage.tsx` (`ModelRedirect` → lazy
`ModelPage`), `src/lib/buildStore.ts` callers pass `MODEL_ALIASES[cat]`; tests `tests/unit/routes.test.ts`,
`tests/e2e/model.spec.ts`.

**Interfaces:** `resolveModel(cat, slug): Promise<{kind:'ok', entry: ModelEntry} | {kind:'moved', slug} |
{kind:'gone'}>` in `src/lib/modelData.ts`: an aliased old key's slug → `moved` (no request); else the chunk
`modelChunkOf(slug)` is fetched and the entry looked up — no `list.json` and no slug index needed.
- [ ] Failing tests: current slug → ok; aliased old key's slug → moved (address replaced, no history entry); unknown
  slug → the 404 page; a slug of a model delisted since the last build → "no longer available" with a link to the
  category (the chunk has no entry).
- [ ] Implement; e2e at 360 and 1366.
- [ ] `npm run check` + e2e → commit `feat(product): model addresses, aliases and not-found state`.

### Task 6: Product page — header and shops table

**Files:** create `src/components/product/{ModelPage,ProductHeader,OffersTable}.tsx`, strings in
`src/ui/strings.ts`; tests `tests/e2e/model.spec.ts`, `tests/unit/offers.test.ts`.

- Header: photo (320 px), full name, 4–5 key specs (the category's table columns that have a value, same order as the
  table), lowest total ("με μεταφορικά" only when the offer's own total is known — `ownTotal` in data.ts), button
  "Στο κατάστημα / To the shop" (the cheapest offer's URL, `rel="noopener nofollow"`), "Πρόσθεσε στο build / Add to
  build" (Task 8 wires it; hidden for categories that are not builder slots). "Σύγκριση" is v2.1 (backlog #12): not
  shown.
- Offers table sorted by total, then price: source badge + merchant when known, price, shipping ("—" + tooltip
  "not known" when null), total, availability column **only when any listing has it** (none until B8), checked =
  the source's `updatedAt` as "πριν από 3 ώρ. / 3 h ago". Phones: cards, same order.
- Page title `<h1>` = name; `document.title` = "<name> · BuildDraft.gr"; breadcrumbs Category › Name.
- [ ] Failing tests: order by total with unknown shipping after known ones of the same price; a one-listing model; no
  photo → icon; Greek/English strings.
- [ ] Implement; layout audit at 1920/1366/1024/768/360 (no overflow).
- [ ] `npm run check` + e2e → commit `feat(product): header and offers table`.

### Task 7: Product page — price history

**Files:** `src/components/product/PriceHistory.tsx`, `src/components/PriceChart.tsx` (range prop), tests
`tests/unit/priceSummary.test.ts`.

- Range buttons 30 d / 90 d / 1 y / All (default 90 d); all-time low marked (same `allTimeLow` rule as the list,
  imported low included, dips ignored — `dips.ts`); sentence "Η τιμή είναι 8% κάτω από τη διάμεσο 90 ημερών / 8%
  below the 90-day median" only with ≥ 30 daily points in those 90 days, else "Not enough history yet".
- [ ] Failing tests: median and percentage on fixed series; dips excluded; < 30 points → no sentence.
- [ ] Implement → `npm run check` + e2e → commit `feat(product): price history with ranges and median summary`.

### Task 8: Product page — fit with your build, add / replace

**Files:** `src/components/product/BuildFit.tsx`, reuse `pickChecker.createChecker`, `pickBuild.planBuild`,
`buildStore.setPart`, `pick.toPart`; tests `tests/unit/buildFit.test.ts`, `tests/e2e/model.spec.ts`.

- Shown only when the saved build has at least one part. "Ταιριάζει / Fits", or each error/warning of the engine
  with its text (e.g. card 340 mm vs case 330 mm), plus "Πρόσθεσε / Add" or "Αντικατάστησε το <part> / Replace
  <part>". GPU: the check and the button are per offer row (card), since the builder picks cards; CPU keeps the
  pick page's Box/Tray key.
- [ ] Failing tests: GPU add writes the card key (listing id); a stale saved part is refreshed (A7) before the check;
  rule 14 basis "stated" vs estimate shown as on the pick page.
- [ ] Implement → `npm run check` + e2e → commit `feat(product): fit with your build, add or replace`.

### Task 9: Product page — variants, alternatives, specs, "found a mistake?"

**Files:** `src/components/product/{Variants,Alternatives,SpecGroups,ReportError}.tsx`, `src/ui/specs.ts` (groups:
general, dimensions, power, connections); tests `tests/unit/specGroups.test.ts`.

- Variants in one line of chips (current one selected); alternatives as two short lists ("Ίδιο, φθηνότερα / Same,
  cheaper", "Καλύτερη αξία / Better value"); specs in groups with each value as the data has it.
- **Source tag per spec value: the data does not say which value came from a shop and which from the maker**
  (shops, makers and overrides merge before `latest.json`). Shown now: "εκτίμηση / estimate" only for the GPU chip
  length estimate. Per-value sources need a scraper field — owner decision (listed in the report), not done here.
- "Βρήκες λάθος; / Found a mistake?" = `mailto:` `CONTACT_EMAIL` with the model name and address in the subject.
- [ ] Tests → implement → `npm run check` + e2e → commit `feat(product): variants, alternatives, specs, report a mistake`.

### Task 10: Links into the product page + keyboard reach

**Files:** `src/components/ModelRow.tsx` (the name becomes a link to the page; the chevron keeps the quick expand),
`src/components/FilterBar.tsx` (skip link "Μετάβαση στα αποτελέσματα / Skip to results", backlog #17),
`src/lib/search.ts` (global search results open the product page); tests e2e +
`node scripts/phase1/keyboard-walk.mjs` run.
- [ ] e2e: Enter on a row name opens the page; Back returns to the list with its filters and scroll; keyboard walk:
  first product reached in ≤ 5 key presses after the skip link (today 26).
- [ ] `npm run check` + e2e → commit `feat(product): links from lists and search, skip to results`.

### Task 11: Step 4 gate (Phase 3 gate)

**Files:** `docs/phase3/step4-gate.md`, `docs/phase3/perf/step4/*`, `scripts/phase3/measure-pick.mjs` (add product
pages), PROJECT-STATE diff for approval.
- [ ] Lighthouse median of 3, phone + desktop: `/gpu`, `/case`, `/storage`, `/case?pick=1` (b), `/builder`, and
  product pages `/gpu/<popular>`, `/case/<popular>`, `/storage/<popular>`. Gate: phone ≥ 90 everywhere, desktop 100
  (network-only misses explained per run), CLS 0, accessibility 100.
- [ ] Bytes (rule 11) for the same pages.
- [ ] Time to first product vs v1 (`scripts/phase1/content-timing.mjs`, v1 built from `origin/main` in a temporary
  worktree under the session scratchpad, removed afterwards): GPU ≤ 1.84 s, cases ≤ 3.93 s.
- [ ] Keyboard walk ≤ 5; layout audit 0 issues; e2e green; compat scenarios 64 / 0 failures.
- [ ] B9 batches 1–5 live on main and their aliases in `MODEL_ALIASES` (else the gate report says "waiting for B9").
- [ ] Gate report, PROJECT-STATE diff, backup, short report to the owner.
