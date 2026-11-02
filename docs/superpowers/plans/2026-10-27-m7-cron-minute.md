# M7 — move the price scrape's cron minute (backend queue, main)

Audit 27/10 M7, owner decision 27/10: move the cron minute first (free, changes nothing else).

## Measured (gh run list, scheduled runs 17/10–27/10)
- `scrape.yml` cron `17 */6 * * *` (00:17, 06:17, 12:17, 18:17 UTC). GitHub **creates** the runs 3.5–5.5 h late:
  ~04:40–05:10, ~10:50–13:20, ~15:40–17:15, ~20:40–22:40. The delay is in GitHub's scheduler (run creation time),
  not in our concurrency queue: no run was cancelled.
- Days with only 3 runs: 19/10, 26/10 (GitHub dropped one; it may do so under load, documented behaviour).
- `history.yml` cron `37 3` → created 08:18–09:20.

## Change
- `scrape.yml`: `17 */6 * * *` → `43 */6 * * *` (same four hours, a minute away from the quarter-hour and the
  common :17). One line; nothing else changes (concurrency group, steps, history guard).
- `history.yml`: unchanged (it shares the concurrency group; moving both at once would hide which one helped).

## Process (PROJECT-STATE rule 1, one item at a time)
1. After Q7 is live (it is ahead in the queue). Commit on `a3-queue` in `builddraft-scraper-fixes`, rebased on the
   then-current origin/main; owner OK → push. No workflow started by hand.
2. Watch 3 days: creation delay per run and runs per day, before → after, in a 5-line report.
3. If the delay stays over ~3 h: options for the owner — (a) shift the hours so late starts land evenly, (b) a free
   external trigger calling `workflow_dispatch` (needs a GitHub token stored outside the repo: security trade-off),
   (c) accept it (the site shows the real age of the data).

## Risk
None for data: same steps, same guard. The only effect is when GitHub queues the run.
