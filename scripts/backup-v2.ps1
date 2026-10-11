# Local backup of the whole repo (v1 + v2 worktrees share one .git).
# Writes <BackupRoot>\<yyyy-MM-dd_HHmmss>\ with:
#   repo.bundle     every ref (v2, main, phase2-push, backups ...), checked with `git bundle verify`
#   untracked\<worktree folder>\...   untracked, not-ignored files of each worktree (e.g. v1 docs/archive)
#   manifest.txt    time, refs, HEAD per worktree, warnings
# Keeps the newest $Keep backups. Warns (does not stop) when a worktree has uncommitted changes.
# Restore: git clone <dir>\repo.bundle <new folder>   (then copy untracked\... back if needed)
#
#   powershell -ExecutionPolicy Bypass -File scripts/backup-v2.ps1 [-BackupRoot C:\Users\Teo\Backups\buildcraft-v2] [-Keep 5]
param(
  [string]$BackupRoot = (Join-Path $env:USERPROFILE 'Backups\buildcraft-v2'),
  [int]$Keep = 5
)
# Windows PowerShell 5.1 turns git's progress lines on stderr into errors under 'Stop', so native
# commands are checked through $LASTEXITCODE and file cmdlets get -ErrorAction Stop.
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
function Git-Ok([string]$what) { if ($LASTEXITCODE -ne 0) { throw "git failed: $what (exit $LASTEXITCODE)" } }

$repo = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$dest = Join-Path $BackupRoot $stamp
if (Test-Path -LiteralPath $dest) { throw "Backup folder already exists: $dest" }
New-Item -ItemType Directory -Force -Path $dest -ErrorAction Stop | Out-Null
$warnings = @()
$log = @("backup $stamp", "repo $repo", '')

# Worktrees from git itself, so a moved or added worktree is still found.
$list = git -C $repo worktree list --porcelain; Git-Ok 'worktree list'
$worktrees = @($list | Where-Object { $_ -like 'worktree *' } | ForEach-Object { $_.Substring(9) -replace '/', '\' })

foreach ($wt in $worktrees) {
  $name = Split-Path -Leaf $wt
  if (-not (Test-Path -LiteralPath $wt)) { $warnings += "worktree missing on disk: $wt"; continue }
  $branch = git -C $wt rev-parse --abbrev-ref HEAD
  $head = git -C $wt rev-parse --short HEAD
  $log += "worktree $name  branch $branch  HEAD $head"

  # Uncommitted = staged or modified tracked files (untracked files are copied below instead).
  $dirty = @(git -C $wt -c core.quotepath=off status --porcelain --untracked-files=no); Git-Ok "status $name"
  if ($dirty.Count -gt 0) {
    $warnings += "UNCOMMITTED CHANGES in $name ($branch): $($dirty.Count) file(s) - not in the bundle"
    $log += $dirty | ForEach-Object { "    $_" }
  }

  # Untracked, not ignored: copied with their paths.
  $raw = git -C $wt -c core.quotepath=off ls-files --others --exclude-standard -z; Git-Ok "ls-files $name"
  $files = @(($raw -join '') -split "`0" | Where-Object { $_ })
  foreach ($f in $files) {
    $src = Join-Path $wt ($f -replace '/', '\')
    $to = Join-Path (Join-Path (Join-Path $dest 'untracked') $name) ($f -replace '/', '\')
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $to) -ErrorAction Stop | Out-Null
    Copy-Item -LiteralPath $src -Destination $to -ErrorAction Stop
  }
  $log += "    untracked files copied: $($files.Count)"
}

# The bundle: every ref of the shared repository.
$bundle = Join-Path $dest 'repo.bundle'
git -C $repo bundle create $bundle --all 2>$null; Git-Ok 'bundle create'
git -C $repo bundle verify $bundle 2>$null | Out-Null; Git-Ok "bundle verify $bundle"
$refs = @(git -C $repo bundle list-heads $bundle); Git-Ok 'bundle list-heads'
$log += '', "bundle $([math]::Round((Get-Item -LiteralPath $bundle).Length / 1MB, 1)) MB, verified, $($refs.Count) refs"
$log += $refs | ForEach-Object { "    $_" }

if ($warnings.Count) { $log += '', 'WARNINGS:'; $log += $warnings | ForEach-Object { "    $_" } }
Set-Content -LiteralPath (Join-Path $dest 'manifest.txt') -Value $log -Encoding UTF8 -ErrorAction Stop

# Keep the newest $Keep complete backups (timestamp folders with a manifest, written last).
# A folder without a manifest is an interrupted run: reported, never counted or deleted.
$all = @(Get-ChildItem -LiteralPath $BackupRoot -Directory | Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}_\d{4}(\d{2})?$' })
foreach ($i in ($all | Where-Object { -not (Test-Path -LiteralPath (Join-Path $_.FullName 'manifest.txt')) })) { $warnings += "interrupted backup (no manifest), delete by hand: $($i.FullName)" }
$old = @($all | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'manifest.txt') } | Sort-Object Name -Descending | Select-Object -Skip $Keep)
foreach ($o in $old) { Remove-Item -LiteralPath $o.FullName -Recurse -Force -ErrorAction Stop; Write-Output "removed old backup $($o.Name)" }

Write-Output "Backup written: $dest"
Write-Output ($log | Where-Object { $_ -like 'worktree*' -or $_ -like '*untracked files*' -or $_ -like 'bundle*' })
foreach ($w in $warnings) { Write-Warning $w }
