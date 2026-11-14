// The data the CI tests read is an input with a version: `.ci-data-ref` holds the commit of `main` whose public/data
// the tests run on, so the same code gives the same result on any day (the scrapes change public/data every few hours;
// on 2026-11-14 that alone turned CI red five times). Scheduled CI runs skip this and test the live data.
//   node scripts/checks/pin-data.mjs            write the newest data commit of origin/main into .ci-data-ref (run it in its own PR)
//   node scripts/checks/pin-data.mjs --apply    replace public/data with the pinned commit's (CI; locally only with --force)
// A pull request that changes the shape of the data (scraper/models.py, src/types.ts, the JSON files) bumps the ref in the same PR.
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const REF_FILE = '.ci-data-ref';
const DATA = 'public/data';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

if (process.argv.includes('--apply')) {
  if (!process.env.CI && !process.argv.includes('--force')) {
    console.error(`pin-data: --apply replaces ${DATA} (a local scrape's files would be lost); use --force to do it here.`);
    process.exit(1);
  }
  const ref = readFileSync(REF_FILE, 'utf8').trim();
  if (!/^[0-9a-f]{40}$/.test(ref)) throw new Error(`${REF_FILE} must hold one full commit SHA, got "${ref}"`);
  git('fetch', '--depth=1', 'origin', ref);
  rmSync(DATA, { recursive: true, force: true }); // files added since the pinned commit must not stay
  git('checkout', ref, '--', DATA);
  git('restore', '--staged', DATA);
  console.log(`pin-data: ${DATA} is now the data of ${ref.slice(0, 8)}`);
} else {
  git('fetch', 'origin', 'main');
  const sha = git('log', '-1', '--format=%H', 'origin/main', '--', DATA);
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('no data commit found on origin/main (is this a shallow clone?)');
  writeFileSync(REF_FILE, `${sha}\n`);
  console.log(`pin-data: ${REF_FILE} = ${sha.slice(0, 8)} (${git('log', '-1', '--format=%cI %s', sha)})`);
}
