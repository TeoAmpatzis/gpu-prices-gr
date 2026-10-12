# Engine: Owner's Decisions of 2026-10-12 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the owner's answers on the step-2 engine tables: AMD CPUs get a whole-build estimate from AMD's stated TDP, AM4 BIOS verdicts become a quiet note / a warning, AM5 600-series membership is sourced if AMD's page names it, and the card minPsu check keeps only its board-power condition.

**Architecture:** Small changes to existing modules: `src/engine/data/cpuPower.ts` (new `kind: 'TDP'` rows for AMD), `src/engine/rules/power.ts` (label), `src/engine/data/bios.ts` + rule 13 in `src/engine/rules/platform.ts` (two new verdicts), `src/data/validate/ranges.ts` (one condition removed). Reports in `docs/phase2/` are regenerated.

**Tech Stack:** TypeScript (strict), Vitest 3, `vite-node` scripts. No new dependencies.

**Spec:** the owner's message of 2026-10-12 (below, verbatim) + `docs/superpowers/plans/2026-10-11-engine-tables.md` (its Global Constraints still apply).

> 1. AMD: don't skip the estimate. Use AMD's stated TDP as the CPU figure (it can only lower the estimate, never cause a false error). Label it "TDP (AMD gives no PPT)".
> 2. Yes, if AMD's AM5 chipset page lists B650/X670/A620 as 600 series, cite that page as the source.
> 3. AM4 "may need a BIOS update": show it as a quiet note, not a warning. Pairs AMD marks "X": warning ("AMD lists this as not supported"), not unknown.
> 4. Keep only "below board power + 100 W". Drop the "chip maker's figure − 100 W" condition: a card maker's own lower figure is a real statement.

## Global Constraints

- Worktree `C:\Users\Teo\Desktop\PROJECTS\buildcraft-v2`, branch `v2`. Never touch `C:\Users\Teo\Desktop\PROJECTS\Gpu price comparison`. Never edit `public/data/**`.
- Commit locally only. **Never push.** No `Co-Authored-By` line, no mention of Claude.
- No new dependencies. `npm run check` passes at the end of every task. Compat scenarios: 64, 0 failures. Scenario files are never edited except a `why` text that states a figure which changed (say which).
- **Hallucination rule (owner):** every value read from an official page downloaded during the work; never memory or search snippets; omitted if absent; nothing derived. AMD's specifications table `https://www.amd.com/en/products/specifications/processors.html` counts as official for each chip's own record. Fetch with `curl.exe -s -L -m 60 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" -o <file> <url>` (intel.com: `-A "curl/8.0"`); archive.org `id_` snapshot of the exact amd.com URL only if live amd.com refuses (comment the row). Save downloads under `.superpowers/sdd/2026-10-12-engine-owner-decisions/pages/` (git-ignored).
- Engine messages `{el, en}`, Greek in the "εσύ" style; no message claims more than its source.
- **Controller rulings (2026-10-12):**
  - AM4 cells "Selective Beta BIOS update needed" say *needed* (not "may"), so they stay `update` (warning). Only AM4 `✓` (covered by the page-wide "support may require a BIOS upgrade") becomes the quiet note.
  - AM5's caveat "(A BIOS update may be required for Ryzen 8000 and 9000 series processors on 600 series boards.)" is specific to those generations and series, so where AMD's page names the 600-series members, those pairs are `update` (warning).

## Review Focus

1. The TDP figure must never raise the estimate above what a PPT would: only `kind: 'TDP'` for AMD, read from AMD's own "Default TDP"; Intel stays PL2. Test.
2. A `not-listed` AM4 pair gives a **warning**, never an error: "Only compatible" must not hide the board. Test with `candidateErrors`.
3. The note for AM4 `may-update` must not count as a warning anywhere (summary counts). Test.
4. With the second minPsu condition gone, the Sparkle B570 "170 W" is still rejected (below 150 + 100) and an RX 550 "250 W" is kept. Test.

---

### Task 1: minPsu check keeps only the board-power condition

**Files:** Modify `src/data/validate/ranges.ts` (`minPsuFloor` / `gpu-minpsu-plausible`), `tests/unit/validate.test.ts`; regenerate `docs/phase2/validation-report.md`, `docs/phase2/psu-before-after.md`.

- [ ] **Step 1: Tests first:** B570 (board power 150) minPsu 170 → rejected; RX 550 (board power 50, maker 400) minPsu 250 → kept; a chip with `makerPsuW` but no `boardPowerW` → not checked (no floor). Update any test that asserted the old `makerPsuW − 100` behaviour. Run → FAIL.
- [ ] **Step 2: Implement:** floor = `boardPowerW + 100` when the chip's row has `boardPowerW`, else no check. Run tests → PASS.
- [ ] **Step 3:** `npm run validation:report`, `npm run psu:before-after`; note in the task report how many listings the check rejects now (was 14).
- [ ] **Step 4:** `npm run check`; commit `fix(data): card minPsu check keeps only the board-power floor (owner)`.

### Task 2: AMD TDP as the CPU figure in the power estimate

**Files:** Modify `src/engine/data/cpuPower.ts` (kind `'TDP'`, AMD rows), `tests/unit/engine/cpuPower.test.ts`, `src/engine/rules/power.ts` (label), `tests/unit/engine/rules.test.ts`; possibly `why` of S62 (its text says the formula is unknown for AMD); regenerate `docs/phase2/cpu-power-coverage.md`, `docs/phase2/psu-before-after.md`.

**Interfaces:** `CpuPowerRow.kind: 'PL2' | 'PPT' | 'TDP'`. `PowerPart.label` for a TDP CPU: el "TDP (η AMD δεν δίνει PPT)", en "TDP (AMD gives no PPT)". The rule 14 message names the CPU figure with that label when it went into the estimate.

- [ ] **Step 1: Rows.** Download AMD's specifications table (and product pages only where a chip isn't in the table); for every AMD desktop chip in the coverage list (AM5, AM4, consumer) read its own "Default TDP" (record field, e.g. `defaultTdp`) → row `{ models, kind: 'TDP', watts, source, checked }` (group models only when each record states the same TDP; comment quoting the record name). A chip without a stated TDP stays uncovered with the reason.
- [ ] **Step 2: Tests first:** integrity — Intel models only `PL2`, AMD models only `TDP` (no `PPT` rows exist; keep the type); `powerEstimate` for a Ryzen 5 7600 build uses its TDP and labels it; the owner's example 9950X + RTX 5090 + 1000 W is still a **warning** (now via level 4 with the TDP estimate — assert the level-4 text); an AMD build with no maker figure and a PSU below the TDP-based formula → error (estimate). Run → FAIL.
- [ ] **Step 3: Implement** label + any type changes. Run unit + compat tests → PASS (fix `why` texts that state "formula unknown for AMD"; never `expected`).
- [ ] **Step 4:** regenerate coverage and the PSU report — the AMD reference build now exists (most-listed AM5/AM4 consumer CPU with a TDP row); `npm run check`; commit `feat(engine): AMD's stated TDP as the CPU figure in the power estimate (owner)`.

### Task 3: AM4 note/warning verdicts and AM5 600-series source

**Files:** Modify `src/engine/data/bios.ts` (`BiosVerdict` + AM4 mapping + AM5 rows if sourced), `src/engine/rules/platform.ts` (rule 13 levels/messages), `tests/unit/engine/bios.test.ts`, `tests/unit/engine/rules.test.ts`, `tests/unit/engine/candidate.test.ts`, `tests/compat/engine-scenarios.test.ts` (`KNOWN_GAPS` per the engine's new answers, with reasons); regenerate `docs/phase2/bios-coverage.md`.

**Interfaces:** `BiosVerdict = 'ok' | 'update' | 'may-update' | 'not-listed' | 'unsupported'`. Rule 13: `ok` → pass (current wording), `update` → warning (current wording), **`may-update` → note** (el "Η AMD σημειώνει ότι η υποστήριξη ίσως χρειάζεται ενημέρωση BIOS· έλεγξε τη λίστα της μητρικής." / en "AMD notes that support may require a BIOS update; check the board's CPU list."), **`not-listed` → warning** (el "Η AMD δηλώνει αυτόν τον συνδυασμό ως μη υποστηριζόμενο." / en "AMD lists this as not supported." + fix: check the board maker's CPU support list), `unsupported` → error (unused).

- [ ] **Step 1: AM5 source search.** Download amd.com pages that could name the 600-series members (e.g. AMD's AM5 chipset page again, "AMD 600 Series chipsets" / chipset product pages, AM5 CPU product pages' "Supported Chipsets" sections with series names). If an amd.com page lists B650/B650E/X670/X670E/A620 **as 600 series** (the words must be on the page next to the names), add rows `ryzen-8000`, `ryzen-8000g`, `ryzen-9000` × those chipsets → `update`, quoting both the membership text and the caveat; and if a page names the 800-series members the same way, `ryzen-8000/8000g/9000` × them → `ok` with the "every AM5 board is compatible" quote. Also add `ryzen-7000 × B650/B650E → ok` if a page names them as AM5 chipsets. If no page names them, change nothing on AM5 and say what you searched.
- [ ] **Step 2: Tests first:** AM4 `✓` pair → rule 13 **note** with the new text; `X` pair (e.g. X570 + Ryzen 3 1200) → **warning** "AMD lists this as not supported" and `candidateErrors` does not return it; SB pair → warning; summary counts a `may-update` finding as a note; AM5 rows per Step 1. Run → FAIL.
- [ ] **Step 3: Implement** the verdicts, the AM4 mapping (`✓` → `may-update`, SB → `update`, `X` → `not-listed`, quotes: page fragments + for `✓` the CHIPSET FEATURES sentence, for `X` the row as printed + "Additional hardware combinations may be available…" sentence), rule 13 levels. Run unit + compat → PASS; update `KNOWN_GAPS` S01/S03/S04 R13 per what the engine answers now (never edit scenarios).
- [ ] **Step 4:** regenerate `docs/phase2/bios-coverage.md`; `npm run check`; commit `feat(engine): AM4 BIOS note/warning per AMD's table, AM5 600-series sourced if AMD names it (owner)`.
