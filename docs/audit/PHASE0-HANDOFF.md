# v2 Phase 0 — handoff (2026-10-03, session interrupted by usage limit)

Read this, then the original Phase 0 prompt (the owner will paste it again) and docs/redesign-v2.md.

## Done
- **A1** branch `v2` from origin/main (4c65539), pushed. `vercel.json` has `"git": {"deploymentEnabled": {"v2": false}}` (only key added). Checked with `gh api repos/TeoAmpatzis/gpu-prices-gr/commits/v2/status` and `/deployments?ref=v2`: no Vercel status/deployment on the v2 head (main's head has "Vercel: Deployment has completed"). Vercel CLI is not installed. Re-check after each push.
- Plan moved to `docs/redesign-v2.md` (its roadmap/gates section was an embedded block lost in the Markdown export → plan feedback).
- **A3** `npm run typecheck` (tsconfig.json + tsconfig.tests.json): **0 errors**.
- **A4** ESLint 9 flat config (`eslint.config.js`: @eslint/js + typescript-eslint + react + react-hooks v7 recommended). Baseline on v1: **39 errors, 6 warnings** (61 files) — list in docs/audit/baseline/eslint-baseline.txt. Recorded as ESLint bulk suppressions (`eslint-suppressions.json`), so `npm run lint` passes and fails only on new errors; `npm run lint:baseline` shows all. (ESLint 9 is EOL upstream; eslint-plugin-react doesn't support 10 yet → backlog.)
- **A5** Vitest 3.2 (last version supporting Vite 5), `npm test`. **A6** @playwright/test + Chromium, `npm run e2e` (playwright.config.ts builds + serves on 4174) — **no e2e test written yet**. **A7** `npm run check` script exists — **not run yet**.
- npm audit: main had 7 (6 high braces, 1 esbuild, dev-only); v2 has 9 (+2 moderate via vitest→vite 5). Nothing shipped.
- Baseline bundle hashes before tooling: docs/audit/baseline/bundle-baseline.tsv — compare after `npm run build`.
- **B1** 64 scenarios in tests/compat/scenarios/ (format: tests/compat/scenario.ts; frozen from real builder data by scripts/audit/compat-freeze.mjs + compat-drafts.mjs). v1 adapter tests/compat/v1-adapter.ts (calls v1's slotModels/rate/buildNotes). Results: docs/audit/compat-results.md/json (vitest file snapshots). **Totals: 64 scenarios — 46 correct, 5 wrong, 13 not checked by v1; 99 rule results — 66 correct, 5 wrong, 28 not checked.** Wrong: S09 (AIO 360 vs case ≤280 → v1 "not verified", plan error), S18 (unknown box cooler → v1 error, plan warning), S33 (3×140 fans, maker lists 2×140 → v1 note), S35 (Kolink HF Mesh fanSlots=1 → v1 "incompatible"), S59 (i7-14700K + 5070 Ti + 750 W → plan formula 850 W, v1 750 W passes).
- **Picker ("Only compatible") check**: scripts/audit/picker-audit.mjs, results docs/audit/picker/. P1–P5, P8 exact (hidden = greyed = independent oracle). P6: bad fanSlots hides 563/1720 fan packs. **P7 bug: RTX 5080 + 550 W PSU chosen → CPU step "0 shown · 359 incompatible hidden"** (psu–cpu check rates every CPU "no"; screenshot P7-cpu-only-compatible-on.jpg).
- **B2** started: scripts/audit/builder-flows.mjs. Flow g1 (guided full build) ran OK in el/en × 1366/360 → docs/audit/builder/builder-flows-g1_g2.json + screenshots (g2 had a selector bug, now fixed, not re-run). Not yet reviewed.

## Findings so far (for docs/audit-v1.md)
1. **S1 candidate** — case `fanSlots` undercounts: scraper/specs.py `parse_case` sums only position values that are pure digits (`v.isdigit()`; hypothesis: "3 x 120mm" skipped). Kolink Observatory HF Mesh fanSlots=1 though its titles say 6 fans included; 25 Midi/Full towers with fanSlots<3 and no maker data (Corsair 3500X, 9000D, Lian Li DAN A3, be quiet Pure Base 600…) → v1 hides 502–563 fan packs as incompatible. Fix idea: treat contradictory/implausible fanSlots (< included fans, <3 for towers) as unknown.
2. **S2** — PSU too small makes every CPU "incompatible" (P7); also the innocent CPU gets an "Incompatible" label and the clash is counted twice (two error notes, PSU tooltip duplicates the reason).
3. Plan vs v1 wattage: plan formula +100 W vs v1 for S59 and S62 (others equal). Reference TBP/PPT values in tests/compat/v1-report.ts are recalled, not fetched.
4. v1 has no margin warnings (rules 6/8/14), no BIOS rule (13), no quantities, no rule 22 warning (fan advice text only).
5. Data notes for B3: RAM kit "DDR5 64GB (2×32GB) 60000MHz"; duplicates "WD SN7100 1TB" vs "WD Black SN7100 1TB", "Lian Li O11 Dynamic Mini V2" in 3 sizes, "Gaming Lian Li O11 Dynamic Mini", "Logic AM-DART-PRO-0000-10"; Shopflix "σε Κουτί με Ψύκτρα" CPU with coolerIncluded=null; Box CPUs with real box coolers (Ryzen 5 7600, i5-14400F) mostly "not stated".
6. Plan feedback: margin wording of rules 6/8/14 ambiguous (assumed "within N of the limit → warning"); colour table puts "Likely fits" under warning but rules treat estimates as notes; "F" CPUs ≠ no cooler (12400F/14400F boxes include one; K/KF don't); roadmap/gates missing from the export.

## Still to do
- **Subagents B3 (data quality) and B4 (UX) were still running** when the session stopped. Their files are NOT committed: docs/audit/data-quality.md, docs/audit/data/, scripts/audit/data-quality/, docs/audit/ux.md, docs/audit/ux/, scripts/audit/ux-*.mjs (some had lint errors). Check whether they are complete; finish or re-run.
- B2: re-run `node scripts/audit/builder-flows.mjs <url> docs/audit/builder g2,g3,q1,s,c,w,st,n,m`, review results/screenshots, record failures.
- B5 Lighthouse (local preview, 3 runs, median; every category, product details, builder both modes; JS/data sizes) — run alone, nothing else using the CPU.
- B6: the owner's own list was left as the placeholder — ask the owner.
- A2: run `npm run dev` (http://localhost:5174/) and `npm run preview:local` (http://localhost:4173/), confirm both load. A6: add a smoke e2e test. A7: run `npm run check`, compare bundle hashes with the baseline.
- Write the "v2 redesign" section in CLAUDE.md (ground rules 1–7 from the prompt + commands), docs/v2-backlog.md (ESLint 10, Vite 6+/Vitest 4 for audit advisories), and docs/audit-v1.md (structure in the prompt). S1 issues: list with minimal fix, do not fix.
- Audit preview server: `npm run build`, copy `dist` to a scratch folder, `npx vite preview --outDir <folder> --port 4180 --strictPort` (picker/flows scripts use it; data dir = <folder>/data).
