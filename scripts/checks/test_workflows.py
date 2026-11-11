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
