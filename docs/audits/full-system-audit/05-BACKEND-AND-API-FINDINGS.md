# 05 — Backend and API findings

The project has **no backend server and no API**. Nothing accepts requests, so API contracts, request validation, rate limits, authentication and authorization on endpoints do not exist to audit. This file covers what plays the backend's role: the Python scraper, the GitHub Actions workflows and the build step.

Method: code reading plus the project's own offline checks (23 Python scripts, all exit 0, more than 500 assertions). **The scraper itself was not run**, because a run sends hundreds of requests to third-party sites and writes `public/data`. See `13-UNVERIFIED-AREAS.md`.

What reads well: every Skroutz request goes through one retry helper with a time cap and a per-host circuit breaker (`scraper/http_client.py`); a failed source keeps its previous listings and is marked `ok: false`; workflow inputs reach shell steps through `env:` variables, not inline `${{ }}` in `run:` (no script-injection path found); history files have a three-way merge driver and a push guard; both scrape workflows share one concurrency group.

---

## [P2-006] The scrape stopped for three days and nothing raised an alarm

- **Category:** Operations / monitoring
- **Severity:** P2
- **Confidence:** High for the gap; the cause was not established
- **Status:** Confirmed
- **Affected files:** `.github/workflows/scrape.yml`, `.github/workflows/scrape-shops.yml`; data `public/data/*/history.json`
- **Affected functionality:** Price freshness, price history, deal detection (the 30-day window lost two days).
- **Problem:** No price commit exists between 2026-11-05 06:36 UTC and 2026-11-08 08:53 UTC. The history has no own points on 11-06 and 11-07 in the categories checked.
- **Evidence:** `git log origin/main --since=2026-11-05 --until=2026-11-08` shows "update prices 2026-11-05 06:36", then "import price history 2026-11-07", then "update prices 2026-11-08 08:53". GPU own history points per day: 11-05: 96, **11-06: 0, 11-07: 0**, 11-08: 96. The commits of 11-08 ("run BestPrice, e-shop, Shopflix and Snif on GitHub runners", "run the Skroutz scrape … through Cloudflare WARP") suggest the earlier runner arrangement had stopped working. The repository contains no notification step, no uptime check and no "data is stale" test in CI. The site itself does warn visitors when a source is older than 24 hours.
- **Steps to reproduce:** The git command above.
- **Expected behavior:** The owner hears within hours that scrapes have stopped.
- **Actual behavior:** Silence until someone looks.
- **Root cause:** No alerting.
- **Recommended solution:** A small scheduled workflow that fails when the live `manifest.json` is older than about 14 hours. GitHub emails the owner on a failed scheduled workflow, at no cost.
- **Alternative solutions:** A free external uptime monitor on a "freshness" URL.
- **Regression risks:** None.
- **Verification plan:** Run the check against a manifest with an old date.
- **Estimated effort:** Small

---

## [P3-007] A corrupt data file is read as "empty", and files are written in place

- **Category:** Backend / data safety
- **Severity:** P3
- **Confidence:** Medium (code reading; not reproduced)
- **Status:** Probable
- **Affected files:** `scraper/main.py:44-48` (`load_json`), `scraper/main.py:135`, `:179`, `:244`, `:345`, `:424` (`write_text`)
- **Affected functionality:** `latest.json`, `history.json`, caches.
- **Problem:** `load_json` returns the default for a missing file **and** for invalid JSON. A history file cut short by a killed job would be treated as no history and rewritten with only today's points. Writes use `Path.write_text` directly, so a job killed mid-write (the 90-minute timeout) can leave such a file.
- **Evidence:** `except (FileNotFoundError, json.JSONDecodeError)` at line 47. Mitigations that exist: the working tree is thrown away at the end of a job, so a half-written file is committed only if the commit step runs after the damage; `merge_history.py check` refuses a push that loses history days; the Vercel build refuses a drop above 30%.
- **Steps to reproduce:** Not reproduced. In a scratch copy: truncate `public/data/gpu/history.json`, run `main.py --category gpu --no-shipping`.
- **Expected behavior:** The run stops with an error on a corrupt file.
- **Actual behavior (expected from the code):** History starts again from empty; the push guard is the only thing that stops it.
- **Root cause:** One `except` for two different situations.
- **Recommended solution:** Catch only `FileNotFoundError`; let invalid JSON stop the run. Write to a temporary file and rename.
- **Alternative solutions:** Keep the behaviour and log loudly.
- **Regression risks:** A corrupt optional cache would now stop a run instead of being rebuilt; decide per file.
- **Verification plan:** A Python check with a truncated file.
- **Estimated effort:** Small

---

## [P3-011] Skroutz is collected through a proxy and a browser disguise chosen to get past its bot protection

- **Category:** Compliance / operational risk
- **Severity:** P3
- **Confidence:** High for the facts; the legal weight is not for this audit to judge
- **Status:** Confirmed
- **Affected files:** `.github/workflows/scrape.yml:77-90`, `scraper/http_client.py` (`impersonate="chrome"`, `SCRAPER_PROXY`)
- **Affected functionality:** The largest source of prices (about half of the cheapest prices come from Skroutz).
- **Problem:** Skroutz's Cloudflare protection blocks the scraper from GitHub's addresses. The workflow installs Cloudflare WARP and sends requests through it, with a Chrome TLS fingerprint. That is circumvention of an access control the site put there on purpose. The risks: the source can disappear overnight; terms of service; reputation.
- **Evidence:** Workflow lines cited; commit "protect the WARP IP's reputation: breaker, cooldown, twice-daily Skroutz"; CLAUDE.md's anti-bot notes.
- **Steps to reproduce:** Read the workflow.
- **Expected behavior:** A source the site is allowed to use, or a documented decision to accept the risk.
- **Actual behavior:** No written decision found in the repo.
- **Root cause:** No official data feed in use.
- **Recommended solution:** Owner's decision. Options: ask Skroutz for permission or a feed; keep the current approach with the low request rate and write the risk down; or make the site work well without Skroutz.
- **Alternative solutions:** As above.
- **Regression risks:** Not applicable.
- **Verification plan:** Not applicable.
- **Estimated effort:** Small to record the decision

The `robots.txt` files of the five sources were not fetched, so compliance with them is unverified.

---

## [P4-007] GitHub Actions and Python packages are not pinned to exact versions

- **Category:** Supply chain
- **Severity:** P4
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `.github/workflows/*.yml` (`actions/checkout@v4`, `actions/setup-python@v5`, `actions/upload-artifact@v4`), `scraper/requirements.txt`, `.github/workflows/scrape.yml:77-79`
- **Affected functionality:** Jobs that hold `contents: write` on the repository.
- **Problem:** Actions are referenced by moving tags. Python packages have ranges and no lock file or hashes. The WARP client is installed from an apt repository at run time.
- **Evidence:** Files cited. All three are official actions, which keeps the risk low.
- **Steps to reproduce:** Read the files.
- **Expected behavior:** Commit-SHA pins for actions; a locked requirements file.
- **Actual behavior:** Tags and ranges.
- **Root cause:** Convenience.
- **Recommended solution:** Pin actions to SHAs; generate `requirements.lock` with hashes and install from it.
- **Alternative solutions:** Accept for official actions only.
- **Regression risks:** Pins need occasional manual updates.
- **Verification plan:** A green scheduled run.
- **Estimated effort:** Small

---

## [P4-008] The build quietly weakens its own checks when a remote file is unreachable

- **Category:** Build pipeline
- **Severity:** P4
- **Confidence:** Medium (code reading)
- **Status:** Probable
- **Affected files:** `vite-plugin-data.ts` (`imageLookup`, `liveManifest`, `LIVE_SITE`), `src/lib/derive.ts:725` (`checkData`)
- **Affected functionality:** Publishing.
- **Problem:** (1) If the photo index cannot be fetched, the build publishes a site with no photos. (2) If the live manifest cannot be fetched, the "no more than 30% fewer" check falls back to fixed minimums of half the 2026-10-01 counts. (3) The 30% rule compares with the previous build only, so several consecutive 29% drops would all pass. (4) The live address is hard-coded.
- **Evidence:** Function bodies as read; not triggered in this audit (the build ran with both files reachable).
- **Steps to reproduce:** Build with the network blocked.
- **Expected behavior:** The build fails, or says clearly that it published with weaker checks.
- **Actual behavior (from the code):** Publishes.
- **Root cause:** Chosen so that an outage elsewhere never blocks a price update.
- **Recommended solution:** Keep the last good photo index in the build cache and reuse it; treat an unreachable live manifest as a failed check unless `DATA_CHECK=off`.
- **Alternative solutions:** Keep and document.
- **Regression risks:** A GitHub Pages outage would block deploys.
- **Verification plan:** Build with `IMAGES_INDEX` set to an unreachable address.
- **Estimated effort:** Small

---

## Checked, no finding

- Concurrency between workflows: one group, `cancel-in-progress: false`, rebase plus guard before push, three tries. A wiped-history incident (2026-09-30) is covered by `merge_history.py` and its tests (pass).
- `merge_history.py check` compares which days exist, not their values. A changed value on an existing day would pass. Low risk; noted only.
- Price parsing (`parse_price`, Greek format) has tests that pass.
