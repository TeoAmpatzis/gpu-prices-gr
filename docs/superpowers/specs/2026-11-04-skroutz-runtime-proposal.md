# Proposed Skroutz execution environment

Status: owner explicitly approved this setup. Repository-scoped `BuildDraftScrape` is installed as the described hidden process, with no service/startup/power change. First full production run passed; a scheduled run was later abandoned when the PC slept. Runner connectivity recovered after wake. The availability boundary below remains a real operating constraint.

## Evidence and choice

The complete local baseline collected all nine categories: 10,864 listings, 267 collection requests, zero blocked requests, in approximately 10 minutes after the initial probes. Linux, Windows and stock-browser probes on GitHub-hosted machines failed earlier. New collector validation is underway separately.

Recommendation: use the working local network for the existing scrape workflow, subject to the owner accepting the machine availability and security boundary. The documented public Products API updates merchant inventory; no authorized consumer-price feed is currently available to this project. Historical official API-access responses declined new external access, which is not a promise about current private agreements.

## Concrete proposed setup

- Register one repository-scoped Windows x64 GitHub runner for `TeoAmpatzis/gpu-prices-gr`, named `BuildDraftScrape`, with custom label `builddraft-scrape`.
- Install official GitHub runner files in `C:/Users/Teo/ActionsRunners/BuildDraftScrape`; its separate `_work` checkout will not touch the local website branch or its preview.
- Verify the official archive checksum before execution. Obtain the short-lived registration token through existing GitHub authentication without printing or persisting it in a script.
- Start it as a hidden process under the current Windows account, with Git Bash on its PATH. Do not install a Windows service, startup task or change power settings during this first cutover.
- Set `defaults.run.shell: bash` explicitly on the production job; PATH alone does not change Windows Actions' default PowerShell shell. Validate the existing publication commands with Git Bash before cutover.
- Route only the existing production scrape job to its exact self-hosted/Windows/X64/custom label set. Production job accepts scheduled/manual events on trusted `main`; diagnostic and PR jobs remain hosted.
- Retain the existing Python setup, 90-minute limit, shared history concurrency, latest-main checkout, data-only commits/rebase, history guard and new exact-commit Skroutz verification.
- Use the same approximately six-hour schedule. The PC and runner process must remain on and connected; a sleeping/offline machine cannot meet that schedule. Other sources can have different local access behavior and must be validated in the first full run.
- Initial installation has no new paid-service subscription. [GitHub documents self-hosted runners as free to use](https://docs.github.com/en/actions/concepts/runners/self-hosted-runners); local electricity, network use and the owner's uptime/maintenance responsibility remain.

An offline self-hosted runner leaves jobs queued; the 90-minute job timeout does not bound that queue wait. The shared scrape/history concurrency group can therefore delay hosted history collection too. The owner must monitor runner availability and queued runs; GitHub failure emails do not provide an immediate offline alert. This setup is unsuitable if that availability responsibility cannot be met.

## Security boundary requiring the owner's decision

A self-hosted runner executes repository workflow code on this PC, outside a sandbox, with access available to its Windows account. A separate checkout does not provide security isolation. This is a public repository, so untrusted pull-request workflows must never receive access to this runner.

Before enabling it, set fork-workflow approval to require approval for **all external contributors**, review every existing workflow for self-hosted routing, and reject external workflow changes targeting this machine. These checks reduce exposure but do not turn a personal-PC runner into a sandbox. A dedicated low-privilege machine/account is preferable if this boundary is unacceptable. No fork-approval setting will be changed without the same setup authorization.

## Rollout and rollback

1. Finish the rewritten collector's full local validation and regression/build checks.
2. Obtain the owner's approval for this concrete setup, or their choice of a dedicated machine instead.
3. Install/register and verify runner labels/status. Publish only reviewed scraper/runtime changes to main; keep website changes local.
4. Dispatch one full normal scrape. Verify all nine categories, exact published commit, history, coverage and other-store behavior.
5. Observe two consecutive scheduled full runs. Do not declare sustained recovery until their actual data passes.
6. To roll back: restore hosted routing, stop the local runner process and unregister it. Retain previous safe data and history. Do not automatically retry a demonstrably blocked environment in a loop.

Offline recovery: cancel the queued production run first to release shared concurrency, restore runner connectivity and verify it is online, then dispatch one fresh trusted-main scrape. If local availability cannot be restored, disable local routing and retain hosted collection for the healthy sources with explicit failed Skroutz status; do not claim source recovery. A durable deployment needs agreed offline notification and ownership before it can be called unattended/reliable.
