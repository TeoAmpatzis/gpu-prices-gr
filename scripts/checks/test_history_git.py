"""Replays the 2026-09-30 incident with real git: two workflow runs start from the same commit, one
imports history, the other scrapes; then the commit step runs. Old step must lose the import, new
step must keep both. Also: reverse order, a push race (retry), the guard, --allow-shrink.
Run from the repo root: venv/Scripts/python scripts/checks/test_history_git.py"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path.cwd()
PY = sys.executable
results = []


def git(cwd, *args, check=True):
    r = subprocess.run(["git", "-c", "core.autocrlf=false", *args], cwd=cwd, capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)}: {r.stderr}")
    return r


def expect(name, cond, detail=""):
    results.append(cond)
    print(("PASS " if cond else "FAIL ") + name + (f"  ({detail})" if detail else ""))


def setup(tmp: Path) -> Path:
    origin = tmp / "origin.git"
    git(tmp, "init", "--bare", "-b", "main", str(origin))
    seed = tmp / "seed"
    git(tmp, "clone", str(origin), str(seed))
    (seed / "scraper").mkdir()
    shutil.copy(REPO / "scraper" / "merge_history.py", seed / "scraper")
    shutil.copy(REPO / ".gitattributes", seed)
    d = seed / "public" / "data" / "gpu"
    d.mkdir(parents=True)
    shutil.copy(REPO / "public/data/gpu/history.json", d)
    shutil.copy(REPO / "public/data/gpu/history_imported.json", d)
    git(seed, "add", ".")
    git(seed, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "seed")
    git(seed, "push", "origin", "main")
    return origin


def clone(tmp: Path, origin: Path, name: str) -> Path:
    c = tmp / name
    git(tmp, "clone", str(origin), str(c))
    git(c, "config", "user.name", "t")
    git(c, "config", "user.email", "t@t")
    return c


def edit(c: Path, fn):
    p = c / "public/data/gpu/history.json"
    h = json.loads(p.read_text(encoding="utf-8"))
    fn(h)
    p.write_text(json.dumps(h, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def import_history(h):  # what the history workflow adds: 2 years for one model
    h.setdefault("RTX 9999 99GB", [])
    h["RTX 9999 99GB"] = [{"d": f"2025-{m:02d}-{d:02d}", "min": 500 + m, "source": "skroutz", "i": 1} for m in range(1, 13) for d in (1, 15)] + h["RTX 9999 99GB"]


def scrape_today(h):  # what the scrape adds: today's point for every model
    for k in h:
        h[k].append({"d": "2026-10-02", "min": 1.0, "source": "snif"})


def commit_old(c):  # the old commit step
    git(c, "add", "public/data")
    git(c, "commit", "-m", "data")
    git(c, "pull", "--rebase", "-X", "theirs", "origin", "main")
    git(c, "push", "origin", "HEAD:main")


def commit_new(c, allow_shrink=False, before_push=None):  # the new commit step (scrape.yml / history.yml)
    git(c, "config", "merge.history.driver", f'"{PY}" scraper/merge_history.py driver %O %A %B %P')
    git(c, "add", "public/data")
    git(c, "commit", "-m", "data")
    for attempt in range(3):
        git(c, "pull", "--rebase", "-X", "theirs", "origin", "main")
        chk = subprocess.run([PY, "scraper/merge_history.py", "check", "origin/main", *(["--allow-shrink"] if allow_shrink else [])],
                             cwd=c, capture_output=True, text=True)
        if chk.returncode != 0:
            return "guard-blocked", chk.stdout
        if before_push and attempt == 0:
            before_push()  # someone pushes in between: our push must fail and retry
        if git(c, "push", "origin", "HEAD:main", check=False).returncode == 0:
            return f"pushed (attempt {attempt + 1})", chk.stdout
    return "failed", ""


def origin_state(tmp, origin):
    v = clone(tmp, origin, f"v{len(list(tmp.iterdir()))}")
    h = json.loads((v / "public/data/gpu/history.json").read_text(encoding="utf-8"))
    imported = len(h.get("RTX 9999 99GB", []))
    today = sum(1 for pts in h.values() for p in pts if p["d"] == "2026-10-02")
    return imported, today, len(h)


def scenario(name, steps):
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        origin = setup(tmp)
        n_models = len(json.loads((REPO / "public/data/gpu/history.json").read_text(encoding="utf-8")))
        return steps(tmp, origin, n_models)


# 1) The incident with the OLD step: import pushed first, the stale scrape pushes after -> import lost.
def old_incident(tmp, origin, n):
    a, b = clone(tmp, origin, "a"), clone(tmp, origin, "b")
    edit(a, import_history); commit_old(a)
    edit(b, scrape_today); commit_old(b)
    imp, today, _ = origin_state(tmp, origin)
    expect("old step reproduces the loss (import wiped)", imp == 0, f"imported points left: {imp}")


# 2) Same with the NEW step: both kept.
def new_incident(tmp, origin, n):
    a, b = clone(tmp, origin, "a"), clone(tmp, origin, "b")
    edit(a, import_history); ra, _ = commit_new(a)
    edit(b, scrape_today); rb, _ = commit_new(b)
    imp, today, models = origin_state(tmp, origin)
    expect("new step keeps the import AND the scrape", imp == 24 and today == n and models == n + 1, f"import {imp}/24, today {today}/{n} scraped models, {ra}, {rb}")


# 3) Reverse order: the scrape pushes first, the stale import after.
def reverse(tmp, origin, n):
    a, b = clone(tmp, origin, "a"), clone(tmp, origin, "b")
    edit(b, scrape_today); commit_new(b)
    edit(a, import_history); r, _ = commit_new(a)
    imp, today, models = origin_state(tmp, origin)
    expect("reverse order keeps both", imp == 24 and today == n and models == n + 1, f"import {imp}/24, today {today}/{n} scraped models, {r}")


# 4) Push race: a third run pushes between our check and our push -> retry, nothing lost.
def race(tmp, origin, n):
    a, b, c = clone(tmp, origin, "a"), clone(tmp, origin, "b"), clone(tmp, origin, "c")
    edit(b, scrape_today)

    def other_push():
        edit(c, import_history)
        commit_new(c)

    r, _ = commit_new(b, before_push=other_push)
    imp, today, models = origin_state(tmp, origin)
    expect("push race: retried and both kept", r.startswith("pushed (attempt 2)") and imp == 24 and today == n and models == n + 1, f"{r}, import {imp}/24, today {today}/{n} scraped models")


# 5) Guard: a run that removes points (no conflict) is blocked; --allow-shrink pushes and logs.
def guard(tmp, origin, n):
    a = clone(tmp, origin, "a")
    victim = sorted(json.loads((a / "public/data/gpu/history.json").read_text(encoding="utf-8")))[0]
    edit(a, lambda h: h.pop(victim))
    r, log = commit_new(a)
    expect("guard blocks a push that loses history", r == "guard-blocked" and victim in log, f"{r}: {log.strip().splitlines()[0] if log else ''}")
    b = clone(tmp, origin, "b")
    edit(b, lambda h: h.pop(victim))
    r2, log2 = commit_new(b, allow_shrink=True)
    expect("allow_history_shrink pushes and logs the removal", r2.startswith("pushed") and victim in log2 and "deliberate" in log2, r2)


for name, fn in [("old", old_incident), ("new", new_incident), ("reverse", reverse), ("race", race), ("guard", guard)]:
    scenario(name, fn)
print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
