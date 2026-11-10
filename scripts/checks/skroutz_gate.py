"""Decide whether a scheduled Skroutz scrape should run (the gate job of .github/workflows/scrape.yml).

The workflow wakes every few hours, but a run only goes ahead when the published Skroutz data is older than
FRESH_HOURS (normally two real scrapes a day) and the last real run did not fail less than COOLDOWN_HOURS ago
(Cloudflare blocks are not hammered). A failed run is therefore retried within hours, not a whole day later,
so the site's Skroutz data stays under its 24 h "outdated" mark. A manual run always goes ahead.

Usage in the workflow: python scripts/checks/skroutz_gate.py  (reads GITHUB_EVENT_NAME, GITHUB_REPOSITORY, GH_TOKEN)
and writes run=true|false to $GITHUB_OUTPUT. The decision itself is `decide`, tested offline.
"""
import json
import os
import subprocess
import urllib.request
from datetime import datetime, timedelta, timezone

FRESH_HOURS = 11  # younger published data: nothing to do (about two real runs a day)
COOLDOWN_HOURS = 3  # after a failed run, wait this long before trying again


def _parse(text: str | None) -> datetime | None:
    try:
        return datetime.fromisoformat((text or "").replace("Z", "+00:00"))
    except ValueError:
        return None


def decide(event: str, data_updated_at: str | None, last_conclusion: str | None, last_ended_at: str | None,
           now: datetime) -> tuple[bool, str]:
    if event != "schedule":
        return True, "manual run"
    ended = _parse(last_ended_at)
    if last_conclusion == "failure" and ended and now - ended < timedelta(hours=COOLDOWN_HOURS):
        return False, f"cooldown: the last run failed at {last_ended_at}"
    updated = _parse(data_updated_at)
    if updated and now - updated < timedelta(hours=FRESH_HOURS):
        return False, f"fresh: Skroutz data is from {data_updated_at}"
    return True, "Skroutz data is old or its age is unknown"


def _published_skroutz_time(repo: str) -> str | None:
    """When main's Skroutz data was last updated (GPU stands for every category: one run writes them all)."""
    url = f"https://raw.githubusercontent.com/{repo}/main/public/data/gpu/latest.json"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.load(r).get("sources", {}).get("skroutz", {}).get("updatedAt")
    except Exception:  # unreachable or malformed: treat as unknown, which runs the scrape
        return None


def _last_real_run(repo: str) -> tuple[str | None, str | None]:
    """Conclusion and end time of the last completed run that really ran (a skipped gate run counts as success, so it
    is not used to decide freshness, only failures matter here)."""
    out = subprocess.run(
        ["gh", "run", "list", "--repo", repo, "--workflow", "scrape.yml", "--status", "completed", "--limit", "1",
         "--json", "conclusion,updatedAt", "--jq", '.[0] | "\\(.conclusion) \\(.updatedAt)"'],
        capture_output=True, text=True,
    ).stdout.strip()
    parts = out.split(" ", 1)
    return (parts[0], parts[1]) if len(parts) == 2 and parts[0] != "null" else (None, None)


if __name__ == "__main__":
    repo = os.environ["GITHUB_REPOSITORY"]
    event = os.environ.get("GITHUB_EVENT_NAME", "")
    conclusion, ended = _last_real_run(repo)
    run, why = decide(event, _published_skroutz_time(repo), conclusion, ended, datetime.now(timezone.utc))
    print(f"gate: run={str(run).lower()} ({why})")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as f:
            f.write(f"run={str(run).lower()}\n")
