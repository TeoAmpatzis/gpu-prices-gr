# v2 Plan Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the flaws found in the v2 plan and improve it without changing its logic; then make the frontend clearer for users, based on screenshots of the current v2 build.

**Architecture:** The plan stays as it is (phases 0–5, compatibility engine first, then pages, then builder). This document lists (A) flaws with evidence, (B) optimizations, (C) frontend UX findings from screenshots, and (D) the order in which the approved items become tasks. Following the owner's rule 4 ("a two-line plan and approval before every step"), each approved item gets its own detailed task plan (failing test → code → check → local commit) when its turn comes. This document is the list to approve, not the code.

**Tech Stack:** React + TypeScript + Vite + Tailwind (v2 frontend), Vitest + Playwright (tests), Python scraper (main), GitHub Actions + Vercel Hobby.

**Spec:** `docs/redesign-v2.md` (plan of record), `docs/phase2/plan.md` (Phase 2), `docs/phase2/step2-plan.md` (step 2), `docs/PROJECT-STATE.md` (state of record; wins on conflicts).

## Global Constraints

- €0: free services only.
- Every UI string is `Text = {el, en}`. v2 is dark-only. Phones at 360 px must work.
- No commit or push to main without a newer instruction (PROJECT-STATE rule 1). v2 is never pushed until launch (rule 6). Local v2 commits have no Co-Authored-By line (rule 5).
- No new data fields (rule 3), except the approved CPU-family table.
- Every Python dependency has an upper version bound.
- Before every step: a two-line plan and the owner's approval (rule 4).

## Review Focus

1. **A wrong measurement in the data** (Spire U20M "3.502 mm") must never hide every part in "Only compatible". It becomes "unknown". Test: task A4.
2. **A real but extreme value** (Thermaltake AX700 630 mm) must not be rejected. Test: task A5.
3. **A saved build made before a data fix** must be checked with today's values, not the values saved with it. Test: task A7.
4. **A model key renamed by a grouping fix** must still open in a saved build or share link. Test: task A9.
5. **A category whose Skroutz scrape is blocked for over 24 h** must show one calm line, not a wall of warnings. Test: task C1.

---

## A. Flaws in the current plan (most serious first)

### A1. The launch plan would break the backend
**Problem.** The release plan says "v1 comes off GitHub and Vercel and v2 goes up". But the repo `TeoAmpatzis/gpu-prices-gr` holds more than v1's code. It also holds the whole backend:
- the scrape workflows (`scrape.yml` every 6 h, `history.yml` daily);
- `public/data/*/history.json`, with up to 365 days of prices and the imported Skroutz history;
- the `offers.json` / `specs.json` / `makers/*.json` caches, built up over weeks;
- the history merge driver.

The Vercel project is linked to this repo, and `gpu-prices-gr.vercel.app` is the address everyone has. Deleting the repo or the project throws all of that away.

**Fix (same logic, safer method):**
- v2 **replaces main inside the same repo**: one merge of `v2` into `main`, after a local rehearsal (B4).
- v1's code then exists only in old commits, plus a local tag `v1-final` on the owner's PC.
- The site, the workflows and the data carry on without a gap.
- The last v1 deployment stays in Vercel for 2 weeks, so "Instant Rollback" is one click; it is removed after that.
- Write this as the "Release plan" in PROJECT-STATE, replacing point 3.

**Owner decision:** choose this method (recommended) or another one.

### A2. v2 exists in one place only
**Problem.** Since `origin/v2` was deleted (2026-10-11), the only copy of 34 commits of v2 work is the folder `Desktop/PROJECTS/buildcraft-v2`. A disk failure or an accidental delete loses all of it.

**Fix (free, no push to the public repo):**
- After each work session: `git bundle create <OneDrive or USB>/buildcraft-v2-<date>.bundle --all`. One file, with the full history.
- Restore: `git clone <file>.bundle`.
- A script `scripts/backup-v2.ps1` that writes the bundle and keeps the last 5.

**Owner decision:** where the bundle goes (OneDrive / USB drive / both).

### A3. The backend freeze makes the data start late
**Problem.** Rules 1 and 3 (no commits to main, no new fields) also stopped the backend work that needs time to fill.

Four scraper commits are ready on the local branch `phase2-push`:
- `a252c37`: data age per source;
- `2ff530d`: a speed log;
- `d5f0961`: PSU ATX 3.x;
- `e2878d8`: case drive bays + front USB-C.

The Phase 2 plan estimates **1–2 weeks of scheduled runs** to fill the new fields, at 150 pages per site per run. If these go live only at launch, then for the first weeks after launch these show "unknown":
- rules 4, 15, 17–20 and 24;
- the board / case / PSU filters the plan promises.

v1 never reads these fields; they are additive and nullable.

**Fix:** allow **backend-only, additive commits on main**, one at a time, with the procedure already approved in Phase 2 Stop 2: a green scrape, the history check OK and the Vercel build accepted before the next one. v1's site doesn't change.

**Owner decision:** yes / no. If no, the plan should state that v2.0 launches with those rules as notes.

### A4. Step 2 would hide parts based on unchecked data
**Problem.** The Phase 2 plan put the data-checking layer (B2: a plausible range per field, conflicts between sources become unknown) **before** the engine, so wrong values never reach the rules. It hasn't been built (`src/data/validate/` doesn't exist), but step 2 already uses the engine to hide parts.

**Evidence (v2 data, 2026-10-11):**
- Case "Spire U20M" has `gpuMaxMm = 3.502`, a BestPrice typo. Rule 6 then gives an error for every card. With that case in a build, `/gpu?pick=1` hides **every** graphics card.
- 138 cooler listings have a height under 30 or over 200 mm. Only the under-30 one is patched, and only in v1's code.

**Fix:** a minimal version of B2 as a task **before** step 2's hiding:
- a plausible range per measured field, in `src/data/validate/ranges.ts`, applied in `derive.ts`;
- the rejected values listed in `docs/phase2/validation-report.md`;
- a unit test where the Spire U20M value becomes `null` and rule 6 gives `unknown`, not `error`.

### A5. The planned ranges reject real cases
**Problem.** B2's "case max card 120–500 mm" would turn **28 real listings** into unknown. These are big cases whose real limit is over 500 mm:
- Fractal Define 7 XL 530 mm;
- Fractal Meshify 3 XL 512 mm;
- Lian Li V3000 Plus;
- Phanteks Enthoo Pro 2;
- Thermaltake AX700 630 mm (7 listings).

**Fix:**
- Case max card **100–700 mm**.
- Every range runs in "report only" mode once first; the owner looks at the rejected examples before the range starts rejecting.
- A unit test keeps 630 mm and rejects 3.502 mm.

### A6. Three numberings, and part of Phase 2 has no place
**Problem.**
- The work is counted three ways: Phases 0–5 (`redesign-v2.md`), Stops 1–7 (`phase2/plan.md`) and Steps 1–6 (PROJECT-STATE).
- Step 6 isn't defined anywhere.
- Four parts of Phase 2 are in no step: the data checks (B2), the power formula (B4: card TBP + CPU PPT/PL2), the BIOS table (B5) and the performance tiers (B6).
- Phase 2's own gate ("all 64 scenarios pass + a tier for 49 CPU + 16 GPU chips") isn't met, yet the work has moved on to Phase 3 items.

**Fix:** one roadmap table in PROJECT-STATE:

| Step | Phase | Includes | Gate |
| --- | --- | --- | --- |
| 1 | 2 | Engine, rules 1–26 (done) | 64 scenarios run |
| 2 | 2 | Data checks (A4/A5) + CPU-family table (B1) + power formula (B4) + BIOS table (B5) | Phase 2 scenarios, report |
| 3 | 3 | "Pick for my build" mode (today's step 2) + category-page improvements (C) | Lighthouse ≥ 90, Phase 3 gate |
| 4 | 3 | Product page | Phase 3 gate |
| 5 | 4 | New builder: free part list + guided steps (owner 11/10), tiers (B6), recommendations | Phase 4 gate |
| 6 | 5 | Home, final check, rehearsal (B4), launch (A1) | Launch checklist |

**Owner decision:** approve the table (the step numbers change).

### A7. A saved build keeps old measurements
**Problem.** Step 2 stores the engine's fields in `pcBuild` when a part is added, and never refreshes them. After a data fix, a saved build keeps being checked with the wrong value forever. Examples:
- the "3.072 GB" max-memory fix;
- the Lian Li O11 EVO RGB entry in `overrides.json`;
- every grouping fix.

**Fix:**
- Store `builtAt`, the build date of the list the fields came from, next to the fields.
- When the page's `list.json` is newer, refresh only that part's fields from its small chunk file (0.2–2.1 KB), in the background.
- The "Checking compatibility…" state already exists for this.
- Test: a part saved with `gpuMaxMm: 3.502` and an old `builtAt` is checked with the new value.

### A8. The byte limit is defined two ways, with no plan B
**Problem.**
- `redesign-v2.md` sets **JS ≤ 110 KB** and **data ≤ 300 KB** separately.
- `step2-plan.md` adds everything up, fonts included, against 300 KB. That leaves a 4 KB margin, which depends on a 5 KB estimate.
- If it goes over, the plan only says "stop and revise".

**Fix:**
- Write one definition into PROJECT-STATE. Recommended: the plan's two separate limits, with fonts reported but not counted.
- Decide the fallback now: the pick-mode code loads after the first paint, since nothing needs it before then.

### A9. Renamed products break saved builds and share links
**Problem.** Phase 1 (A2.3) redirects **page URLs** when a grouping fix renames a model key; 674 board keys changed in one week. Builder keys also change: the `pcBuild` keys and `/builder?cpu=<key>` share links. Step 2 rewrites the build storage, so this is the moment to cover them.

**Fix:**
- `buildStore` maps an unknown key through the same `slugs.json` alias list. When a key has no alias, the part shows "no longer sold" instead of disappearing.
- Test: an old key → its alias opens the right part.

### A10. Docs that contradict decisions
`redesign-v2.md` still says:
- "dark/light" and "theme follows the device" (v2 is dark-only, Phase 1 decision);
- rules 27–30 in Phase 2 (owner: Phase 4);
- launch "in one step on Vercel" (now the release plan, A1).

**Fix:** an "October decisions" section at the top of `redesign-v2.md`. This closes the open item in PROJECT-STATE.

---

## B. Optimizations and additions (no change to the logic)

### B1. One CPU-family table, three uses
The approved rule 25 table is `src/engine/tables/cpu-families.json` from Phase 2 B4. In one research pass, using AMD/Intel spec pages with a source and date per row, it also fills:
- PPT/PL2 for the power formula (B4);
- the generation key for the BIOS table (B5).

This is cheaper than three separate passes.

### B2. Rule 25: speed depends on the number of sticks
The official speed is lower with 4 sticks than with 2. The table stores both: `memMhz: {"2": …, "4": …}`. The rule reads the build's stick count, and the note tells the user that XMP/EXPO is needed above the official speed. Tests: 2 sticks pass; 4 sticks at the same speed give a note.

### B3. Keep v2's data fresh
v2 is 8 data commits behind main. The local data was 37–38 h old in the screenshots, which shows the stale warnings everywhere. Routine: before each work session, `git fetch origin` and merge `origin/main` into v2. A fetch is not a push, so this is allowed.

### B4. Launch rehearsal (in step 6)
1. Clone the repo into a temporary folder.
2. Merge v2 into main there.
3. Run the scraper for one category with `--no-shipping`.
4. Run `npm run check`, `npm run e2e`, and `site-check.mjs` against the local preview (`vite preview`).
5. Delete the folder.

This is the whole cutover without any push. The blocking launch checklist gets: "the rehearsal passed".

### B5. Choose the address before launch
Links shared after launch are permanent. Options:
- keep `gpu-prices-gr.vercel.app`;
- rename the Vercel project to `builddraft` (free `builddraft.vercel.app`, with the old address kept as an alias);
- buy `builddraft.gr` (not €0, so it waits for the owner).

**Owner decision** (before step 6).

### B6. Automatic checks after launch
`npm run e2e` and Lighthouse limits in a GitHub workflow (backlog #5). This is free on a public repo, and it is the plan's "a deploy stops if a page drops below target". It starts the day v2 is on main.

---

## C. Frontend findings (screenshots 2026-10-11)

**How taken:**
- v2 `npm run build` + `vite preview`, with `node scripts/phase1/site-shots.mjs <dir> http://localhost:4173`.
- 25 shots at 1366 and 360 px, Greek and English.
- Saved in the session scratchpad; re-take with the same command.
- The data was 37 h old (B3), which exaggerates C1, but C1 also happens live whenever Skroutz is blocked (backlog #7).

| # | What the screenshot shows | Why it hurts | Improvement | Step |
| --- | --- | --- | --- | --- |
| C1 | The footer lists **every source × category** older than 24 h: about 45 orange lines on the phone home page, 10 on desktop | Looks broken; hides the footer; one blocked source floods the screen | One line: "⚠ Some prices are older than 24 h · Details". Details grouped by source ("Skroutz: 9 categories, 38 h"). The status line at the top keeps the per-source times (backlog #9) | 3 |
| C2 | A **green/red dot** before every model name (NVIDIA green, AMD red); storage types also have coloured dots | The plan reserves green/red for "fits / price down" and "error / price up". A red dot next to "RX 9070" reads as a problem | Brand dots in neutral grey or the brand colour (indigo); green/red only for meaning | 3 |
| C3 | Price change "↘109,60 €" under the price, without a time period | Reads like a discount or a "drop", not "7-day change" | "−109,60 € in 7 days" (or %) with a tooltip; same text on cards | 3 |
| C4 | The "Maker" column shows the maker of the **cheapest** listing (RTX 5060 → Asus), while the photo is a **Gigabyte** box | The row seems to describe a product it isn't | Heading "Cheapest from" or put the maker in the price cell; photo from the same listing as the price (or a neutral one) | 3 |
| C5 | In an expanded row the titles are cut where they differ ("Palit GeForce…", "Inno3D GeForce RTX 5060 8GB…") | The part that tells the cards apart is hidden | Drop the shared start (the chip name) and show the rest, or two lines | 3 |
| C6 | The RTX 5060 chart has a one-day drop to ~200 € (current 339 €) | Fake "historic low", untrustworthy chart | The chart skips points under 50% of the 30-day median (the plan's "unusually low" rule) and marks them | 3 |
| C7 | Home: **two search boxes** above the fold (header + main); tiles without a price; empty bottom half | Duplication; the tiles say little | Hide the header search on the home page; tiles "from 319 €"; the plan's trust line ("5 shops · 9 categories · updated 2 h ago") instead of the footer list | 6 |
| C8 | Empty builder: **6 orange warnings** ("Choose a CPU…") before the user has done anything; on the phone the bottom bar says "⚠ 6" | Orange = "needs action" (plan), but this is a to-do list; it scares beginners | A neutral list "Missing: CPU, board, …" with checkmarks; warnings only for real problems | 5 |
| C9 | Phone builder: the steps are bare numbers 1–11; the measurements notice (5 lines) pushes the products below the fold (no product visible at 360 px) | You can't see where you are or what's next; the products are out of view | Header "Step 2/11 · CPU" with ‹ › and a step list on tap; notice collapsed to one line "Why 'Fit not verified'?" after the first time | 5 |
| C10 | Every builder step opens with 3–4 lines of explanation | The products start low on the screen | One summary line + "More" | 5 |
| C11 | On the phone the language switch is only in the footer ("English") | English-speaking visitors don't find it | Language at the top of the phone menu | 3 |
| C12 | Names in mixed casing: "Seagate IRONWOLF 8TB" next to "Seagate IronWolf Pro 16TB" | e-shop.gr's capitals sometimes win the name; looks careless | The shown name prefers the non-all-caps form from the other shops (`derive.ts`, display only; the key doesn't change) | 3 |

**What already works well:** clear table with photos and €/TB; breadcrumbs; mega menu grouped as planned; the phone filter sheet with "Show 68 results"; honest coverage notice; one consistent price cell.

---

## D. Order of tasks once approved

Each line becomes its own detailed plan (two-line summary → approval → TDD steps → `npm run check` → local commit without Co-Authored-By):

1. **A2** backup bundle (no code risk; protects everything that follows)
2. **A6 + A8 + A10 + A1** docs: roadmap, byte limit, October decisions, release plan
3. **B3** merge `origin/main` into v2
4. **A4 + A5** minimal data checks with report-only first
5. **B1 + B2** CPU-family table (rule 25, PPT/PL2, BIOS generation)
6. **Step "pick for my build"** (today's `step2-plan.md`) with **A7 + A9** built in
7. **C1–C6, C11, C12** category pages (step 3 of the new table)
8. **C7–C10** with the builder and the home page (steps 5–6)
9. **A3** if the owner says yes: the 4 scraper commits on main, one at a time, in parallel with the above
10. **B4–B6** before and after launch
