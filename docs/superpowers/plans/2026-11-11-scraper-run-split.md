# Scraper Run Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make room for new categories in the shops scrape by publishing prices first and collecting spec pages in a second job, without sending one extra request to any shop.

**Architecture:** `scrape-shops.yml` becomes two jobs that run one after the other: `prices` (list pages and shipping, then a commit) and `specs` (product pages for specs, then a commit). The commit step, which today is copied in three workflows, moves unchanged into one local composite action. No Python code changes: `main.py` already has every flag the two jobs need.

**Tech Stack:** GitHub Actions (hosted `ubuntu-latest`, composite action), Python 3.12 scraper (`curl_cffi`, `selectolax`), plain Python check scripts in `scripts/checks/`.

**Spec:** There is no separate spec file. The design and the measurements behind it are in the section "Design and evidence" below; this plan is the document the owner approves (rule 3 of `docs/PROJECT-STATE.md`: `scraper/**` and `.github/workflows/**` change only with an approved plan).

## Design and evidence

### What was measured

Run `42977465164` of `scrape-shops.yml` (2026-11-11 07:09 UTC, 68 minutes, ten categories), from its own `[timing]` lines:

| Phase | Time | What sets the time |
| --- | --- | --- |
| List pages | 1,894 s (32 min) | BestPrice: 835 requests, about 2.3 s each. In every category BestPrice is the slowest source, and the sources of one category already run in parallel threads (`scraper/main.py:320`). |
| Shipping | 1,047 s (17 min) | BestPrice product pages, 60 per category, one category after the other. |
| Spec pages | 1,123 s (19 min) | BestPrice product pages, 150 per run (`specs.BUDGET`), about 7.5 s each. 1,776 monitor pages were waiting. |
| Total | 4,067 s (68 min) | The job limit is 90 minutes. Nothing is committed before the end. |

Runs before monitors existed took 40 to 50 minutes (2026-11-08 and 2026-11-09).

### What follows from it

1. The whole run is one line of requests to one shop, BestPrice. The other shops finish early and wait.
2. One job per category, in parallel, would open ten or more lines to BestPrice at the same time, each from a different GitHub address. That is ten times the load on one shop, and a block there loses the largest source. It is rejected. The same holds for running the three phases at the same time.
3. Scrapy, the reference tool for this kind of work, keeps a total limit and a per-site limit as two separate settings for the same reason: more workers help only across sites, never against one site.
4. The scraper already has the layout that reference recommends: one reader per shop (`scraper/sources/`), one set of title rules per category (`scraper/normalize_*.py`), one table of categories (`scraper/categories.py`). Moving these into one folder per category would change ten working categories and save one file edit per new category. It is not done.
5. The real weak points are two. The run is all or nothing: a failure in minute 65 throws away 32 minutes of fresh prices. And every new big category adds about 8 minutes to a job that has 22 minutes left.

### The change

- Job `prices`: list pages and shipping, with `--specs-budget 0 --makers-budget 0` (stored specs are applied again, no spec page is fetched; this is what `scrape.yml` already does for Skroutz). Then the commit. About 49 minutes today, prices are public about 19 minutes sooner than today.
- Job `specs`: `--specs-only` with the same `--only` list (so the Skroutz spec budget stays 0). Then the commit. About 20 minutes while a backlog exists, about 1 minute when the queue is empty. Runs only when `prices` succeeded.
- Both jobs are in one workflow run, so the shared concurrency group `scrape` still keeps the Skroutz workflow out until both have pushed.
- The requests to every shop are the same in number and in order as today.

### What it buys, in numbers

- A new category the size of mice (about 175 BestPrice list pages) costs about 6.6 minutes of lists and about 1.8 minutes of shipping. The `prices` job (49 minutes) has room for four such categories under 90 minutes; today's single job has room for two.
- The spec backlog of a new category no longer counts against the prices: it has its own job and its own limit.
- Vercel deploys per day go from about 6 to about 10 (the Hobby limit is 100).

### The next lever, not built now

When the `prices` job passes 75 minutes: move shipping into the second job. That needs one new flag in `main.py` (`--no-lists`: skip `scrape_category`, keep the shipping loop and `collect_specs`). It gives the lists the full 90 minutes, room for about eight more categories. It is written in the guide (Task 3), not built.

## Global Constraints

- No push to `main` without the owner's explicit yes; before any push `npm run check` and `npm run e2e` are green.
- Never force push, never rewrite `main`. Do not cancel or re-run GitHub Actions runs without asking the owner.
- Commits: identity `TeoAmpatzis <189219701+TeoAmpatzis@users.noreply.github.com>`, conventional commits, no `Co-Authored-By` line and no mention of an AI assistant.
- No new dependency (Python or npm). GitHub Actions stay pinned to commit SHAs.
- No change under `scraper/**` and none under `public/data/**` in this plan.
- At most one line of requests per shop at any time. No step of this plan may add a request to any shop.
- `history.yml` is paused and is not touched.
- Work on a new branch `ci/scrape-shops-split` made from `origin/main`.

## Review Focus

1. The `prices` job fails (no source succeeded, or the push failed): the `specs` job must not run. Pinned by the `needs: prices` check in Task 1.
2. A Skroutz run is queued while the shops run is between its two jobs: it must wait for both and then read the latest `main`. Pinned by the concurrency group and `ref: main` checks in Task 1.
3. A manual run with `allow_history_shrink` or `allow_data_drop`: both commits must carry the choice. Pinned by the inputs check in Task 1.
4. The spec queue is empty: the `specs` job must end green with "No changes" and make no commit. The commit script is moved unchanged; observed in the production run of Task 2.
5. A new source is added to one `--only` list and forgotten in the other: the spec budget of that site would stay 0 without a word. Pinned by the "same sources in both jobs" check in Task 1.

---

## File structure

| File | Action | Responsibility |
| --- | --- | --- |
| `.github/actions/commit-data/action.yml` | create | The one copy of the commit step: owner identity, history merge driver, rebase on the latest `main`, history check, push with three tries. |
| `.github/workflows/scrape-shops.yml` | modify | Two jobs, `prices` then `specs`, each ending with the action. |
| `scripts/checks/test_workflows.py` | create | Reads the two files as text and checks the rules of this plan. |
| `scripts/checks/README.md` | modify | One row for the new check. |
| `docs/ADDING-A-CATEGORY.md` | create | Every place a new category touches, the guard that catches a miss, the run-time budget, the next lever. |
| `docs/PROJECT-STATE.md`, `CLAUDE.md` | modify | The workflow description. |
| `.github/workflows/scrape.yml` | modify (Task 4, optional) | Uses the action instead of its own copy. |

---

### Task 1: Two jobs in `scrape-shops.yml`, one commit action

**Files:**
- Create: `.github/actions/commit-data/action.yml`
- Create: `scripts/checks/test_workflows.py`
- Modify: `.github/workflows/scrape-shops.yml` (header comment lines 3-4, and everything from `jobs:` on line 27 to the end)
- Modify: `scripts/checks/README.md` (one new table row)

**Interfaces:**
- Consumes: `scraper/main.py` flags as they exist today: `--only <source>` (repeatable), `--specs-budget <n>`, `--makers-budget <n>`, `--specs-only`.
- Produces: the local action `./.github/actions/commit-data` with inputs `what` (required text), `allow_shrink` (`"true"` or anything else), `drop_tag` (`"true"` or anything else) and output `data_commit` (commit SHA). Task 4 relies on these names.

- [ ] **Step 1: Make the branch**

```bash
git fetch origin
git switch -c ci/scrape-shops-split origin/main
```

- [ ] **Step 2: Write the failing check**

Create `scripts/checks/test_workflows.py`:

```python
"""The rules of the data workflows, read from the YAML text (the project has no YAML library).
Plan: docs/superpowers/plans/2026-11-11-scraper-run-split.md.
Run from the repo root: venv/Scripts/python scripts/checks/test_workflows.py"""
import re
import sys
from pathlib import Path

ROOT = Path.cwd()
SHOPS = ["bestprice", "eshop", "shopflix", "snif"]
ACTION = "uses: ./.github/actions/commit-data"
results = []


def expect(name, cond, detail=""):
    results.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + (f"  ({detail})" if detail else ""))


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(encoding="utf-8") if p.exists() else ""


def job(workflow: str, name: str) -> str:
    """The text of one job: from its own line to the next job or the end of the file."""
    jobs = workflow.split("\njobs:\n", 1)[-1]
    m = re.search(rf"^  {name}:\n(.*?)(?=^  \w[\w-]*:\n|\Z)", jobs, re.S | re.M)
    return m.group(1) if m else ""


def command(job_text: str) -> str:
    m = re.search(r"scraper/main\.py[^\n]*", job_text)
    return m.group(0) if m else ""


shops = read(".github/workflows/scrape-shops.yml")
prices, specs = job(shops, "prices"), job(shops, "specs")
prices_cmd, specs_cmd = command(prices), command(specs)

expect("scrape-shops has a prices job and a specs job", prices and specs)
expect("no other job scrapes", shops.count("scraper/main.py") == 2, f"{shops.count('scraper/main.py')} commands")
expect("prices fetches no spec page", "--specs-budget 0" in prices_cmd and "--makers-budget 0" in prices_cmd
       and "--specs-only" not in prices_cmd, prices_cmd)
expect("specs fetches no list page", "--specs-only" in specs_cmd, specs_cmd)
for label, cmd in (("prices", prices_cmd), ("specs", specs_cmd)):
    expect(f"{label} names the four shops and not Skroutz", sorted(re.findall(r"--only (\w+)", cmd)) == SHOPS, cmd)
expect("specs runs only after prices succeeded", re.search(r"^    needs: prices$", specs, re.M))
for label, text in (("prices", prices), ("specs", specs)):
    expect(f"{label} starts from the latest main", "ref: main" in text)
    expect(f"{label} has its own time limit", re.search(r"^    timeout-minutes: \d+$", text, re.M))
    expect(f"{label} commits through the shared action", ACTION in text)
    expect(f"{label} passes the owner's manual choices", "allow_shrink: ${{ inputs.allow_history_shrink }}" in text
           and "drop_tag: ${{ inputs.allow_data_drop }}" in text)
expect("the data workflows still share one queue", re.search(r"^concurrency:\n  group: scrape\n  cancel-in-progress: false$", shops, re.M))
expect("the commit step is no longer copied into the workflow", "git pull --rebase" not in shops)

action = read(".github/actions/commit-data/action.yml")
for line in (
    'git config user.email "189219701+TeoAmpatzis@users.noreply.github.com"',
    'git config merge.history.driver "python scraper/merge_history.py driver %O %A %B %P"',
    "git pull --rebase -X theirs origin main",
    "python scraper/merge_history.py check origin/main $ALLOW_SHRINK",
    "git push origin HEAD:main",
):
    expect(f"the action keeps: {line[:48]}", line in action)
expect("the action reports the data commit", action.count('echo "data_commit=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"') == 2)
expect("no co-author line in data commits", "Co-Authored-By" not in action)

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
```

- [ ] **Step 3: Run it and see it fail**

Run: `venv/Scripts/python scripts/checks/test_workflows.py`
Expected: exit code 1. `FAIL scrape-shops has a prices job and a specs job`, and every action line fails (the file does not exist yet). The two checks "the data workflows still share one queue" and "no co-author line in data commits" pass.

- [ ] **Step 4: Create the commit action**

Create `.github/actions/commit-data/action.yml`. The shell lines are the commit step of `scrape.yml` (lines 104-129), unchanged except that the message text comes from `WHAT`:

```yaml
name: Commit data
description: Commit public/data as the repo owner and push it to main without losing history (rebase on the latest main, history check, three tries).

inputs:
  what:
    description: 'What changed, for the message "chore(data): <what> <UTC date and time>"'
    required: true
  allow_shrink:
    description: '"true": let history points disappear in this run only (they are logged)'
    default: "false"
  drop_tag:
    description: '"true": tag the commit [allow-data-drop] so the next Vercel build may publish more than 30% fewer models/listings'
    default: "false"

outputs:
  data_commit:
    description: The commit that holds this run's data (HEAD when nothing changed)
    value: ${{ steps.push.outputs.data_commit }}

runs:
  using: composite
  steps:
    - id: push
      shell: bash
      env:
        WHAT: ${{ inputs.what }}
        ALLOW_SHRINK: ${{ inputs.allow_shrink == 'true' && '--allow-shrink' || '' }}
        DROP_TAG: ${{ inputs.drop_tag == 'true' && ' [allow-data-drop]' || '' }}
      run: |
        # Commit as the repo owner: Vercel Hobby blocks deploys of commits by
        # authors it cannot map to the owner's Git account (e.g. github-actions[bot]).
        git config user.name "TeoAmpatzis"
        git config user.email "189219701+TeoAmpatzis@users.noreply.github.com"
        # History files merge point by point (.gitattributes); other data files: this run wins.
        git config merge.history.driver "python scraper/merge_history.py driver %O %A %B %P"
        git add public/data
        if git diff --cached --quiet; then
          echo "No changes"
          echo "data_commit=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
          exit 0
        fi
        git commit -m "chore(data): ${WHAT} $(date -u +'%Y-%m-%d %H:%M')${DROP_TAG}"
        # Replay this commit on the latest main right before pushing, check that no history was
        # lost, push; if main moved again in between, do it again (3 tries).
        for attempt in 1 2 3; do
          git pull --rebase -X theirs origin main
          python scraper/merge_history.py check origin/main $ALLOW_SHRINK
          if git push origin HEAD:main; then
            echo "data_commit=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          echo "main moved during the push (attempt $attempt); retrying"
          sleep 10
        done
        exit 1
```

- [ ] **Step 5: Split the workflow**

In `.github/workflows/scrape-shops.yml` replace lines 3-4 (the two comment lines under `name:`) with:

```yaml
# Every source except Skroutz, on GitHub's own runners (Skroutz's Cloudflare blocks them; see scrape.yml).
# Two jobs, one after the other: prices (list pages and shipping) are committed first, spec pages after.
# Every phase is one line of requests to BestPrice, so the jobs never run side by side and there is no
# job per category (docs/superpowers/plans/2026-11-11-scraper-run-split.md).
# Add a new source: list it in --only in BOTH jobs (scripts/checks/test_workflows.py checks they agree).
```

Leave `on:`, `permissions:` and `concurrency:` as they are. Replace everything from the line `jobs:` to the end of the file with:

```yaml
jobs:
  # List pages and shipping, then the commit: prices are public before the slow spec pages start.
  # Stored specs are applied again; no spec page and no maker page is fetched here.
  prices:
    if: github.ref == 'refs/heads/main' && (github.event_name == 'schedule' || github.event_name == 'workflow_dispatch')
    runs-on: ubuntu-latest
    timeout-minutes: 90
    steps:
      # The latest main when the job starts, not the commit of the moment it was triggered: a run
      # that waited in the queue must see what the run before it pushed (2026-09-30 data loss).
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          ref: main

      - uses: actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 # v5
        with:
          python-version: "3.12"

      - run: pip install -r scraper/requirements.txt

      - name: Scrape prices
        run: python -u scraper/main.py --only bestprice --only eshop --only shopflix --only snif --specs-budget 0 --makers-budget 0

      - name: Commit data
        uses: ./.github/actions/commit-data
        with:
          what: update prices
          allow_shrink: ${{ inputs.allow_history_shrink }}
          drop_tag: ${{ inputs.allow_data_drop }}

  # Product pages for specs (the shops' and the makers'), on the data the prices job just pushed.
  # Skipped when prices failed: a blocked shop is not asked again in the same run.
  specs:
    needs: prices
    runs-on: ubuntu-latest
    # 150 BestPrice pages at about 7.5 s are 19 minutes; the rest is headroom.
    timeout-minutes: 60
    steps:
      # The latest main: it holds the commit of the prices job.
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          ref: main

      - uses: actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 # v5
        with:
          python-version: "3.12"

      - run: pip install -r scraper/requirements.txt

      - name: Collect specs
        run: python -u scraper/main.py --specs-only --only bestprice --only eshop --only shopflix --only snif

      - name: Commit data
        uses: ./.github/actions/commit-data
        with:
          what: update specs
          allow_shrink: ${{ inputs.allow_history_shrink }}
          drop_tag: ${{ inputs.allow_data_drop }}
```

- [ ] **Step 6: Run the check and see it pass**

Run: `venv/Scripts/python scripts/checks/test_workflows.py`
Expected: exit code 0, last line `24/24 passed`.

- [ ] **Step 7: Run the checks that cover the flags and the commit step**

These files are not changed; they prove the behaviour the two jobs rely on.

Run:
```bash
venv/Scripts/python scripts/checks/test_source_status.py
venv/Scripts/python scripts/checks/test_skroutz_recovery.py
venv/Scripts/python scripts/checks/test_history_git.py
venv/Scripts/python scripts/checks/test_capabilities.py
```
Expected: each ends with all tests passed and exit code 0. `test_source_status.py` holds `test_specs_only_publishes_stable_monitor_identity_without_fresh_prices` (the `--specs-only` path); `test_history_git.py` replays the commit step's rebase, history check and push race with real git.

- [ ] **Step 8: Add the check to the list of checks**

In `scripts/checks/README.md`, add this row to the table, directly under the row that starts with `| Request counts in the run log`:

```markdown
| Data workflow rules | `venv/Scripts/python scripts/checks/test_workflows.py` | `scrape-shops.yml` has a `prices` job and a `specs` job that run one after the other, name the same four shops, start from the latest `main`, share the `scrape` queue and commit through `.github/actions/commit-data` |
```

- [ ] **Step 9: Run the project checks**

Run: `npm run check`
Expected: typecheck, lint, unit tests and build all pass (no site file changed, so the result must equal the one on `main`).

- [ ] **Step 10: Commit**

```bash
git add .github/actions/commit-data/action.yml .github/workflows/scrape-shops.yml scripts/checks/test_workflows.py scripts/checks/README.md
git commit -m "ci(scrape): publish prices before spec pages in scrape-shops"
```

The message has no co-author line.

---

### Task 2: First production run

A workflow file runs only from `main`, and both jobs refuse any other branch, so the first real proof is a run on `main`. Every step that reaches GitHub waits for the owner's yes.

**Files:** none changed.

**Interfaces:**
- Consumes: the commit of Task 1.
- Produces: one green run with two data commits; the run times that Task 3 writes into the guide.

- [ ] **Step 1: Run the browser tests**

Run: `npm run e2e`
Expected: all Playwright tests pass.

- [ ] **Step 2: Ask the owner**

Say exactly what will happen: "Push `ci/scrape-shops-split` to `main` (one commit, workflow files and one check script, no site code, no data). The next shops run, or a manual one, will make two data commits instead of one. Rollback is one `git revert`." Wait for an explicit yes. Check first that no data workflow is running:

```bash
gh run list -R TeoAmpatzis/gpu-prices-gr --status in_progress --json name,databaseId
```
Expected: `[]`, or only workflows other than `scrape`, `scrape-shops`, `history`. If one of them runs, wait for it to end.

- [ ] **Step 3: Push (only after the yes)**

```bash
git fetch origin
git rebase origin/main
git push origin ci/scrape-shops-split:main
```
Expected: a fast-forward push. If it is refused because `main` moved, run the three lines again. Never use `--force`.

- [ ] **Step 4: Start one run (only with the owner's yes), or wait for the schedule at minute 43 of hours 0, 6, 12, 18 UTC**

```bash
gh workflow run scrape-shops.yml -R TeoAmpatzis/gpu-prices-gr
gh run list -R TeoAmpatzis/gpu-prices-gr --workflow scrape-shops.yml --limit 1 --json databaseId,status
```

- [ ] **Step 5: Read the result when the run has ended**

```bash
gh run view <run id> -R TeoAmpatzis/gpu-prices-gr --json jobs --jq '.jobs[] | "\(.name) \(.conclusion) \(.startedAt) \(.completedAt)"'
gh run view <run id> -R TeoAmpatzis/gpu-prices-gr --log | grep "\[timing\] run\|\[timing\] specs\|No changes"
git fetch origin && git log origin/main --oneline -4
```
Expected:
- `prices success` in about 45 to 55 minutes; `specs success` in about 20 minutes (about 1 minute and the line `No changes` when the spec queue is empty).
- In the `prices` log: `[timing] run: lists …s, specs + makers …s` where the second number is about the shipping time (about 1,050 s), not 2,100 s.
- In the `specs` log: `[timing] specs bestprice: … 150 req` or fewer.
- On `main`: `chore(data): update prices <date>` and, when specs changed, `chore(data): update specs <date>` above it. Author `TeoAmpatzis`.

- [ ] **Step 6: Check the live site after Vercel has built**

```bash
node scripts/checks/freshness.mjs
node scripts/checks/site-check.mjs
```
Expected: both exit 0.

- [ ] **Step 7: If anything is wrong, roll back (with the owner's yes)**

```bash
git revert <sha of the Task 1 commit>
git push origin HEAD:main
```
The data is safe in every case: a failed job commits nothing and the site keeps what it had.

---

### Task 3: The guide for adding a category

**Files:**
- Create: `docs/ADDING-A-CATEGORY.md`
- Modify: `docs/PROJECT-STATE.md:16`
- Modify: `CLAUDE.md:20`

**Interfaces:**
- Consumes: the two job times from Task 2 Step 5.
- Produces: nothing other tasks use.

- [ ] **Step 1: Confirm the list of places is still complete**

Run:
```bash
grep -rlE "\bmonitor\b" --include=*.py --include=*.ts --include=*.tsx --include=*.mjs --include=*.json --include=*.html scraper src scripts/checks/site-check.mjs vercel.json index.html | grep -v __pycache__ | sort
```
Expected: exactly the files named in the two tables of Step 2, plus `scraper/main.py`, `scraper/model_aliases.json` and `scraper/overrides.json` (data and comments about monitors, not places a new category must touch). If a file appears that is in neither group, open it, find why it names the category, and add a row for it.

- [ ] **Step 2: Write the guide**

Create `docs/ADDING-A-CATEGORY.md`. Replace the two times in the "Run-time budget" table with the ones measured in Task 2.

````markdown
# Adding a category

Last checked: 2026-11-11, against the monitor category (the newest one).

A category is added in three stages, each with the owner's approval: data hidden, review, visible.

## How the scraper is split

- One reader per shop in `scraper/sources/`. A reader fetches list pages and knows nothing about categories.
- One set of title rules per category in `scraper/normalize_<id>.py`. It turns a title into a product and decides which listings are the same product.
- One table of categories in `scraper/categories.py`: the shop addresses of each category and which rules it uses.

A new category adds rules and one table entry. It never adds a shop reader.

## Stage 1: data, hidden

| Place | What to add | What catches a miss |
| --- | --- | --- |
| `scraper/category_ids.py` | the id, in the order of `CATEGORIES` | `categories.py` raises at import when the two differ |
| `scraper/models.py` | the listing dataclass | the rules' tests |
| `scraper/normalize_<id>.py` | brand list, reject rules, `make_listing`, and `settle` when identity needs more than one title | `scripts/checks/test_normalize_<id>.py` with real titles and hard negatives |
| `scraper/categories.py` | the import and the `Category(...)` entry: shop addresses, `model_key`, `shared`, `rejects`, `images` | import error, `test_capabilities.py` |
| `scraper/capabilities.py` | one row per shop the category does not use, or uses for lists only | `scripts/checks/test_capabilities.py` |
| `scraper/specs.py` | only when product pages are read: the parser in `PARSERS`, the sites in `SITES`, the fields in `NEEDED`; raise `VERSION` | `scripts/checks/test_specs.py` |
| `src/lib/registry.ts` | `{ domain, enabled: true, visible: false }` | `tests/unit/registry.test.ts` compares it with `category_ids.py` |
| `src/types.ts` | the listing type | `tsc` |
| `src/lib/categoryRules.ts`, `src/lib/categories.tsx`, `src/ui/specs.ts`, `src/components/catalogue/specs.ts`, `src/components/product/keySpecs.ts`, `src/lib/ranking.ts`, `src/shell/nav.ts`, `src/shell/texts.ts` | a first, simple entry: these maps are keyed by `Category`, so `tsc` asks for every one | `tsc` |
| `src/lib/derive.ts` | `MIN_MODELS.<id>` after the first run | the build's data check |

BestPrice shows at most 800 products per list (50 pages). A bigger category is cut into slices (price in cents, or a spec filter); see `monitor` and `ram` in `categories.py`.

## Stage 2: first run and review

One run of the workflows with the category hidden. Then read `public/data/<id>/rejected.json` (every listing kept out, with its reason) and a sample of merged products. `scripts/checks/monitor_admission.py` is the model for the admission report. Nothing becomes visible before the owner has seen both.

## Stage 3: visible

| Place | What to add |
| --- | --- |
| `src/lib/registry.ts` | `visible: true` |
| the frontend files of Stage 1 | the real filters, spec rows, key specs, ranking, texts in Greek and English |
| `src/shell/nav.ts` | the id in its menu group |
| `src/shell/Home.tsx` | the id in `HOME_PERIPHERALS` (peripherals only) |
| `vercel.json` | the id in both rewrites (`/:page(...)` and `/:cat(...)/:slug`) |
| `scripts/checks/site-check.mjs` | the id in `CATS` |
| `index.html` | optional: a preload for the list file when it is large (see `/monitor`) |
| tests | `tests/unit/<id>Rules.test.ts`, `tests/unit/<id>Specs.test.ts`, `tests/e2e/<id>.spec.ts` |

Comparison needs no code: it reads the spec rows of the product page.

## Run-time budget

Measured on 2026-11-11 (run 42977465164 before the split; the two job times after it).

| Item | Cost |
| --- | --- |
| One BestPrice list page | about 2.3 s |
| Shipping, per category | about 105 s (60 product pages) |
| Spec pages | 150 per run for all categories together, about 7.5 s each: 19 minutes at most, however many categories exist |
| `prices` job today | <minutes measured in Task 2> of 90 |
| `specs` job today | <minutes measured in Task 2> of 60 |

A category with N BestPrice list pages adds about `N × 2.3 s + 105 s` to the `prices` job. Mice: about 175 pages, so about 8.5 minutes.

Rules:
1. One line of requests per shop, always. Never one job per category in parallel and never two phases at the same time: BestPrice sets the time of every phase, so that multiplies the load on one shop and risks a block.
2. Before a category is approved, add its cost to the `prices` job time. Over 75 minutes: first move shipping into the second job. That is one new flag in `scraper/main.py` (`--no-lists`: skip the `scrape_category` pass, keep the shipping loop and `collect_specs`), used by the second job in place of `--specs-only`, and `--no-shipping` added to the first.
3. After that, the next step is a third job for a group of categories (`--category`), still one after the other.
````

- [ ] **Step 3: Check the guide has no unfilled value**

Run: `grep -n "<minutes measured" docs/ADDING-A-CATEGORY.md`
Expected: no output.

- [ ] **Step 4: Update the state file**

In `docs/PROJECT-STATE.md` replace line 16:

```markdown
| `scrape-shops.yml` | BestPrice, Snif, Shopflix, e-shop.gr | `43 */6 * * *` |
```
with:
```markdown
| `scrape-shops.yml` | BestPrice, Snif, Shopflix, e-shop.gr, σε δύο jobs στη σειρά: `prices` (λίστες και μεταφορικά, commit) και μετά `specs` (σελίδες προϊόντων, commit) | `43 */6 * * *` |
```

- [ ] **Step 5: Update `CLAUDE.md`**

In `CLAUDE.md` line 20, replace the text
`` `scrape-shops.yml` = BestPrice, Snif, Shopflix, e-shop.gr at `43 */6`. ``
with
`` `scrape-shops.yml` = BestPrice, Snif, Shopflix, e-shop.gr at `43 */6`, as two jobs in a row: `prices` (lists and shipping, commit) then `specs` (product pages, commit); never one job per category in parallel (`docs/ADDING-A-CATEGORY.md`). ``

- [ ] **Step 6: Commit**

```bash
git add docs/ADDING-A-CATEGORY.md docs/PROJECT-STATE.md CLAUDE.md
git commit -m "docs: how to add a category and the scrape run-time budget"
```
Push only with the owner's yes, after `npm run check` and `npm run e2e`.

---

### Task 4 (optional, separate yes from the owner): `scrape.yml` uses the same action

Do this only after two scheduled shops runs in a row are green with the action. It removes the second copy of the commit step. `history.yml` is paused and keeps its own copy.

**Files:**
- Modify: `.github/workflows/scrape.yml:98-129`
- Modify: `scripts/checks/test_workflows.py`

**Interfaces:**
- Consumes: the action `./.github/actions/commit-data` (inputs `what`, `allow_shrink`, `drop_tag`; output `data_commit`) from Task 1.
- Produces: nothing other tasks use.

- [ ] **Step 1: Add the failing check**

In `scripts/checks/test_workflows.py`, directly above the line `action = read(".github/actions/commit-data/action.yml")`, add:

```python
skroutz = read(".github/workflows/scrape.yml")
expect("scrape.yml commits through the shared action", ACTION in skroutz and "git pull --rebase" not in skroutz)
expect("scrape.yml still checks the published commit", "id: publish" in skroutz
       and "DATA_COMMIT: ${{ steps.publish.outputs.data_commit }}" in skroutz)
```

- [ ] **Step 2: Run it and see it fail**

Run: `venv/Scripts/python scripts/checks/test_workflows.py`
Expected: exit code 1, `FAIL scrape.yml commits through the shared action`.

- [ ] **Step 3: Replace the step**

In `.github/workflows/scrape.yml` replace the whole step that starts with `- name: Commit data` and ends with the line `exit 1` (lines 98-129) with:

```yaml
      - name: Commit data
        id: publish
        uses: ./.github/actions/commit-data
        with:
          what: update prices
          allow_shrink: ${{ inputs.allow_history_shrink }}
          drop_tag: ${{ inputs.allow_data_drop }}
```

The next step keeps reading `steps.publish.outcome` and `steps.publish.outputs.data_commit`; the action gives both.

- [ ] **Step 4: Run the checks**

Run:
```bash
venv/Scripts/python scripts/checks/test_workflows.py
venv/Scripts/python scripts/checks/test_skroutz_validation.py
venv/Scripts/python scripts/checks/test_skroutz_gate.py
npm run check
```
Expected: all pass; the first ends with `26/26 passed`.

- [ ] **Step 5: Commit, then push and watch one Skroutz run with the owner's yes**

```bash
git add .github/workflows/scrape.yml scripts/checks/test_workflows.py
git commit -m "ci(scrape): scrape.yml commits through the shared action"
```
After the push, the next real Skroutz run must end green, including its step "Require fresh complete Skroutz categories in the published commit". Rollback is one `git revert`.

---

## What this plan leaves out, on purpose

- One job per category in parallel, and one folder per category: see "What follows from it".
- A generated list of category ids: `categories.py`, `tests/unit/registry.test.ts` and `tsc` already stop a mismatch.
- A per-category health report: each run already writes a table per category and source to the run summary (`main.report_sources`), a failed source raises a warning, and the Vercel build refuses a drop of more than 30%.
- Shared rules for name-based categories (mice, keyboards, headsets): written when the second such category arrives.
- The mouse category itself: its plan is parked and starts after Task 2 is green.
