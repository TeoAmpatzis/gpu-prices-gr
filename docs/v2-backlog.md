# v2 backlog

Ideas and follow-ups found during v2 work that the current phase does not ask for (ground rule 5 in CLAUDE.md). One line of reasoning each. Nothing here is built without the owner's approval; v2.0 vs v2.1 follows the plan's "Εύρος του v2.0".

| # | Added | Item | Why | Where |
| --- | --- | --- | --- | --- |
| 1 | 2026-10-04 | **Move the scraper to selectolax 1.x (lexbor backend)**: replace `from selectolax.parser import HTMLParser` (14 files) with `selectolax.lexbor.LexborHTMLParser`, compare the parsed output on saved pages (`--debug` dumps) for every source and maker before switching, then raise the cap. | selectolax 1.0 removed the Modest backend; `<1.0` (hotfix 7cf0c9d) keeps the scrape alive but freezes us on 0.4.x, which gets no fixes. Lexbor's CSS selector and text handling differ slightly, so it needs a parsing comparison, not a find-and-replace. | main, scraper (plan + approval first) |
| 2 | 2026-10-04 | Cap the other Python dependencies: `curl_cffi>=0.7` and `Pillow>=10` have no upper bound (e.g. `curl_cffi>=0.7,<0.17`, `Pillow>=10,<13`). | The owner's new rule (CLAUDE.md, Κανόνες εργασίας): every dependency gets a version cap so a new major release can't break the scrape unattended. Only selectolax was capped in the hotfix. | main, `scraper/requirements.txt` |
| 3 | 2026-10-03 | ESLint 10 once `eslint-plugin-react` supports it. | ESLint 9 is end-of-life upstream; the React plugin does not support 10 yet. | v2 tooling |
| 4 | 2026-10-03 | Vite 6+ and Vitest 4 (when v2 moves off Vite 5). | Clears the dev-only `npm audit` advisories (esbuild, vite via vitest); nothing shipped is affected. | v2 tooling |
| 5 | 2026-10-04 | Run `npm run e2e` (and the Lighthouse limits of the plan) in a GitHub workflow. | The plan wants automatic checks that stop a deploy; the Phase 0 prompt said no workflow yet. | v2, later phase |
| 6 | 2026-10-04 | Alert when scheduled scrapes fail or data gets old: turn on GitHub's "failed workflow" email for the repo owner, and/or make `site-check.mjs` fail when the newest data is older than 12 h. | The selectolax outage (3 failed scrapes, 2026-10-03 16:19 → 2026-10-04 07:06 UTC) went unnoticed for ~15 h; nothing in the repo watches for it. Free. | main (workflows/checks) |
