# 09 — Dead code and technical debt

Method: an import graph of every `.ts`/`.tsx` file, starting from `src/main.tsx`, `vite-plugin-data.ts` and `vite.config.ts` (static imports, dynamic imports, worker URLs). 208 files in `src/`, 204 reachable. Plus text searches. Nothing was deleted.

---

## [P4-005] About 670 lines of the earlier list UI are no longer used

- **Category:** Dead code
- **Severity:** P4
- **Confidence:** High for the three unreachable files; medium for `ModelRow.tsx` (its types are still imported)
- **Status:** Confirmed
- **Affected files:** `src/components/ModelTable.tsx` (108 lines), `src/components/Pagination.tsx` (96), `src/components/SortHelp.tsx` (49), `src/components/ModelRow.tsx` (420; only `import type { RowPick, RowExtra }` remain, from `CategoryView.tsx:18`, `PickView.tsx:25`, `ProductList.tsx:13`), `src/lib/data.ts:356-357` (unused parameters `_history`, `_imported`), `src/lib/data.ts:126` (unused parameter `_ls`), `src/lib/data.ts:370` (`lowOf`, read only by the dead components)
- **Affected functionality:** None at run time; the bundler drops them.
- **Problem:** The catalogue moved to `components/catalogue/ProductList.tsx`. The old table, its row, its pagination and its help popover stayed. They still hold an older, unchecked version of the "lowest" badge logic, which misled this audit for a while and can mislead the next reader.
- **Evidence:** Import graph output: `ModelTable.tsx`, `Pagination.tsx`, `SortHelp.tsx` unreachable from the app, the tests and the scripts. Search for imports of `ModelRow`: three `import type` lines and the dead `ModelTable.tsx:8`.
- **Steps to reproduce:** Search the repo for `from './ModelTable'`.
- **Expected behavior:** One list implementation.
- **Actual behavior:** Two, one unused.
- **Root cause:** Left over from the catalogue rework.
- **Recommended solution:** Move the two types to a small types file; delete the four files and the unused parameters. Requires the owner's approval (deletion).
- **Alternative solutions:** Leave them and add a header comment "unused".
- **Regression risks:** Low; `npm run check` and the e2e suite will show any missed import.
- **Verification plan:** `npm run check`, e2e.
- **Estimated effort:** Small

---

## [P3-006] The project's own state documents describe a past state

- **Category:** Documentation debt
- **Severity:** P3
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `docs/PROJECT-STATE.md`, `CLAUDE.md`, `CHANGELOG.md`, `package.json` (`name`)
- **Affected functionality:** Anyone, human or AI assistant, who starts work from these files.
- **Problem:** `docs/PROJECT-STATE.md` calls itself the master state file, is dated 2026-10-17, and says v2 exists only locally and was never pushed. v2 is merged and live (package version 2.0.0). `CLAUDE.md`, which says "kept current so you don't need to re-explore the repo", still states that v2 is not deployed, describes hash routes, a theme toggle, eight then nine tabs, and has no mention of monitors, compare, the WARP-based Skroutz workflow or the two-workflow split. `CHANGELOG.md` places the engine in `src/engine/rules.ts` (the code is `src/engine/rules/*.ts`) and gives the share link as `/builder?b=...` (the code writes `/builder?v=2&cpu=…`). The package is still named `gpu-prices-gr`.
- **Evidence:** The files; `src/lib/share.ts`; test J06's copied link `…/builder?v=2&cpu=Ryzen+7+9800X3D%7Cfalse&n.cpu=…`.
- **Steps to reproduce:** Read the first screen of each file.
- **Expected behavior:** State files match the code.
- **Actual behavior:** Weeks behind, with rules ("never deploy v2") that no longer apply.
- **Root cause:** Fast change between 2026-10-17 and 2026-11-10 without a documentation pass.
- **Recommended solution:** Rewrite the "current state" sections once; move history to an archive file; state one place as authoritative.
- **Alternative solutions:** Delete `PROJECT-STATE.md` and keep only CLAUDE.md.
- **Regression risks:** None.
- **Verification plan:** A reader new to the repo checks five facts against the code.
- **Estimated effort:** Medium

---

## Debt register (measured, no separate finding)

| Item | Measure |
|---|---|
| ESLint errors suppressed in `eslint-suppressions.json` | 32 in 5 files: 23 `no-explicit-any`, 4 `react-hooks/refs`, 3 `react-hooks/set-state-in-effect`, 1 `no-empty`, 1 `no-irregular-whitespace` |
| Type escapes in `src/` | 44 `as unknown as`; 4 lines with `any`, `@ts-ignore`, `@ts-expect-error` or `eslint-disable` |
| `TODO` / `FIXME` / `HACK` markers in `src/` and `scraper/` | 0 |
| `console.*` calls in `src/` | 0 |
| Largest source files | `lib/derive.ts` 816 lines, `lib/builderState.ts` 758, `lib/builderData.ts` 504, `lib/categoryRules.ts` 491, `lib/categories.tsx` 476 |
| v1 compatibility adapter kept for tests | `tests/compat/v1-adapter.ts`, `v1-rules.ts`, `v1-report.ts` (project notes say they "can go" once v2's engine replaced v1's; it has) |
| Dev-only component catalogue | `src/preview/*` (554 lines in one file); confirmed absent from the live site |
| Bug register in the repo | `docs/superpowers/plans/2026-11-10-monitors-and-compare-launch.md` lists B1–B8, among them a Thermaltake maker parser broken by the maker's site move and a `scraper/tests` discovery that runs 0 tests. Not re-verified here. |
| Major versions behind | vite 5 (current 8), vitest 3 (5), eslint 9 (10), tailwind 3 (4), TypeScript 5.9 (7), React 18 (19). None is urgent on its own; see P3-004 for the security side. |
| Untracked file in the repo root | `UNIVERSITY_PROJECT_PRESENTATION_GUIDE.md` (existed before the audit; not touched) |

## Architecture notes

- `derive.ts` holds list building, history reduction, builder files, twin merging, manifest and the publishing check in one 816-line module. It is well tested, so the risk is readability, not correctness.
- Thresholds for deals live in three modules (see P3-003). One module for "price signals" would remove that class of bug.
- The page re-checks a decision the build already made (P2-001). Decide once, in the build.
