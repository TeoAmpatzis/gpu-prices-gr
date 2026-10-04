# v2 backlog

Ideas and follow-ups found during v2 work that the current phase does not ask for (ground rule 5 in CLAUDE.md). One line of reasoning each. Nothing here is built without the owner's approval; v2.0 vs v2.1 follows the plan's "Εύρος του v2.0".

| # | Added | Item | Why | Where |
| --- | --- | --- | --- | --- |
| 1 | 2026-10-04 | **Move the scraper to selectolax 1.x (lexbor backend)**: replace `from selectolax.parser import HTMLParser` (14 files) with `selectolax.lexbor.LexborHTMLParser`, compare the parsed output on saved pages (`--debug` dumps) for every source and maker before switching, then raise the cap. | selectolax 1.0 removed the Modest backend; `<1.0` (hotfix 7cf0c9d) keeps the scrape alive but freezes us on 0.4.x, which gets no fixes. Lexbor's CSS selector and text handling differ slightly, so it needs a parsing comparison, not a find-and-replace. | main, scraper (plan + approval first) |
| 2 | 2026-10-04 | ~~Cap the other Python dependencies~~ — **done** on main `efbe4b0` (`curl_cffi>=0.7,<0.17`, `Pillow>=10,<13`; rule also in main's CLAUDE.md). | The owner's rule: every dependency gets a version cap. | main |
| 3 | 2026-10-03 | ESLint 10 once `eslint-plugin-react` supports it. | ESLint 9 is end-of-life upstream; the React plugin does not support 10 yet. | v2 tooling |
| 4 | 2026-10-03 | Vite 6+ and Vitest 4 (when v2 moves off Vite 5). | Clears the dev-only `npm audit` advisories (esbuild, vite via vitest); nothing shipped is affected. | v2 tooling |
| 5 | 2026-10-04 | Run `npm run e2e` (and the Lighthouse limits of the plan) in a GitHub workflow. | The plan wants automatic checks that stop a deploy; the Phase 0 prompt said no workflow yet. | v2, later phase |
| 6 | 2026-10-04 | ~~Alert when scheduled scrapes fail or data gets old~~ — **done**: `site-check.mjs` fails when the newest data is over 12 h old (main `3c5c00e`); the owner turns on GitHub's email (Settings → Notifications → System → Actions → Email + "Only notify for failed workflows"). | The selectolax outage went unnoticed for ~15 h. | main |

## Phase 2: data validation layer — notes

Interim v1 rules added on main after the Phase 0 audit (2026-10-04). Each is a narrow, safe-direction patch; the Phase 2 validation layer ("Αποφάσεις μετά τη Φάση 0": a value that fails a check becomes unknown and never reaches the rules) must replace each one with the general mechanism and keep its test case.

| v1 rule (main) | What it patches | What Phase 2 should do instead |
| --- | --- | --- |
| `coolerHeight`: an air cooler under 30 mm is unknown (`1cadff6`, D-01) | Shop pages giving a fan's thickness as the tower's height (22 builder rows) | Plausible range per field (air cooler ≥ 30 mm, and per type), cross-source disagreement → the safer value or unknown |
| `gpuPsu` = max(card's figure, chip table) (`415d321`, D-02) | Skroutz "minimum PSU" holding the board power (134 rows raised) | Per-field plausibility (card PSU ≥ chip table − 100 W → else unknown) feeding the plan's wattage formula; keep max(card maker, chip table, formula) |
| `ownTotal`: a shipping total only when its offer is within 2% of the listing's price (`431dc10`, P-01) | `shipping.py` picking the cheapest offer *with stated shipping*, which can be another offer (1,904 of 10,284 totals hidden) | Store the offer behind each total (price, shop) in the scraper and attach shipping only to that offer; the plan's v2.0 rule "shipping only where known for the same offer" |
| `moboMemory` unknown when a board's listings disagree on DDR4/DDR5; the builder then leaves the board out (`fdea444`, owner 2026-10-04) | 5 board models: ASRock H610M-H2/M.2 and H610M-HDV/M.2 (DDR4 and DDR5 versions sold under one name), Asus Prime B840M-A-CSM, Asus Prime B860-Plus WiFi, MSI Pro B760M-P (wrong memory values) | **Versions from memory data, not names**: group a board's listings by stated memory type when they disagree (a "D5"/"DDR4" version per model), or mark the wrong values unknown — then the builder offers each version again. Keeping "D5" in names was measured to split 181 models into duplicates (e-shop adds "D5" to boards other shops name without it), so names alone can't do it (D-05, owner's decision 2026-10-04) |
