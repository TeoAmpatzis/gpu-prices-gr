# 13 — Unverified areas

Nothing in this list should be read as tested or as passing.

## Not applicable (the thing does not exist)

- Backend server, HTTP API, API contracts, request validation, rate limiting.
- Database, schema, migrations, indexes, transactions, queries.
- Authentication, sessions, passwords, authorization, roles, multi-tenant isolation.
- Payments, email, file upload, background queues, webhooks.
- Cookies, analytics, third-party scripts.

## Not tested because the environment lacked it

- **Firefox and WebKit (Safari).** Only Chromium is installed for Playwright. Installing browsers needed approval. Every browser result in this audit is Chromium on Windows.
- **Real phones and tablets.** Phone and tablet sizes were emulated in desktop Chromium. No real iOS or Android device, no real touch keyboard, no Safari address-bar behaviour.
- **Screen readers.** No NVDA, JAWS or VoiceOver pass.
- **Code coverage.** No coverage tool is configured.

## Not tested by choice, to stay non-destructive and within limits

- **The scraper was not run.** No request was sent to Skroutz, BestPrice, Snif, Shopflix, e-shop.gr or any maker's site. Findings about the scraper come from reading code and from the project's offline checks. Whether today's pages of those sites still match the parsers is unverified.
- **`robots.txt` and terms of the five sources** were not read.
- **GitHub Actions**: no workflow was started, cancelled or re-run; the Actions run history was not queried. The outage in P2-006 is inferred from commits and from the data.
- **`scripts/checks/test_history_git.py`** was not run (it executes git commands; I did not review it far enough to be sure it stays inside a temporary folder).
- **Load and stress testing** of the live site: none.
- **The live site** got 22 page loads and a few header requests. All deeper tests ran on the local build of the same commit. Differences between `vite preview` and Vercel (headers, compression, rewrites, caching, the 400 on malformed paths) were seen only where noted.
- **Vercel project settings, environment variables, deployment protection, domain settings**: not inspected (no access was used).
- **The photos repository `builddraft-images`**, its workflow and its blocklist handling: not inspected.

## Partly tested

- **Builder**: picking one part, automatic build, share link, reload. Not tested by hand or script in this audit: the full nine-step guided walk, named saved builds (save, rename, delete, the limit of 30), "Copy list" contents, undo, the second drive, fan quantity changes, the "New list" confirmation to its end. The existing suite covers several of these (53 builder tests, all passing); I did not re-verify them independently.
- **Compare**: add two products, open, reload. Not tested: the limit of 4, three categories at once, shared compare links, removing items, the tray on a phone.
- **Pick mode** (`?pick=1`): covered by the existing 16 tests only.
- **Category filters**: brand, sort, pagination, clear, source filter (in the logic script). Range sliders, the "include missing data" toggles, segment switches and per-category filters were not each exercised.
- **All ten categories** load and render at six sizes; detailed interaction was on GPU and CPU.
- **Price history chart**: drawn, ranges present. Range buttons, tooltip, keyboard arrows not exercised.
- **Greek interface**: crawl ran in Greek, journeys in English. Text quality and fit of every Greek string were not reviewed.
- **Compatibility rules**: fuzzed for crashes, message sanity, determinism and one monotonic property. The **correctness of each of the 30 rules against real hardware facts** (sockets, clearances, power tables) was not checked; the project's 81 scenarios cover that and pass, with 4 known gaps.
- **Deal detection**: the threshold bug and the home list were verified. Whether each flagged deal is a real market drop was not checked against the shops.
- **Accessibility**: scripted structure checks, keyboard paths, reflow, target size, Lighthouse. Not a WCAG 2.2 AA conformance review (see `04-FRONTEND-FINDINGS.md`, last section).
- **Performance**: one Lighthouse run per page on a local server. No field data, no repeated runs, no memory or long-session profiling.
- **Source code reading**: read closely: routing, data loading, deals, dips, filters and URL coding, share links, engine core and power rules, automatic builder, home file, error boundary, the build plugin's main path, scraper `main.py`, `http_client.py`, `merge_history.py`, the three workflows. Skimmed or not read: most UI components, `builderState.ts` (758 lines), `builderData.ts`, `categoryRules.ts`, `ranking.ts`, the other engine rule files (fit, platform, cooling, storage, balance), `search.ts`, the compare library, `sitemap.ts`, the scraper's normalizers, sources, `shipping.py`, `specs.py`, `site_history.py`, `images.py`, the makers' parsers.

## Findings whose cause is not established

- P3-005: which element shifts.
- P2-006: why the scrapes stopped on 5 November.
- P4-012: what keeps the network busy for 30 s on the live site.
- Monitors: whether the accessory rows are gone after the newer data on `origin/main`.
- Monitor source count: why Snif declares 1,056 listings and the file holds 1,054.
