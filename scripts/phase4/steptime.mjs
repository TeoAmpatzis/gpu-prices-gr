/* global document */
// Phase 4 gate (step 5 task 16; owner addition 25/10): step change on a throttled phone — the time from tapping Next
// until the next step's first product card shows. Profile of scripts/phase1/content-timing.mjs: 412 px, CPU 4× slower,
// 150 ms latency, 1.6 Mbit/s down, 750 kbit/s up, Greek. Opens /builder?step=cpu, then per step: choose the first
// card, stay `waitMs` on the step (idle time: the next step's file preloads; 0 = tap Next at once), tap Next.
// Same method as the task 11 measurement (.superpowers/sdd/2026-10-25-step5-builder/task-11-steptime.mjs).
//   node scripts/phase4/steptime.mjs http://localhost:4173 [waitMs=3000] [runs=3]
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const WAIT = Number(process.argv[3] ?? 3000);
const RUNS = Number(process.argv[4] ?? 3);
const names = ['cpu', 'mobo', 'ram', 'gpu', 'cooler', 'storage', 'case', 'psu'];
const all = [];
const browser = await chromium.launch();
for (let run = 0; run < RUNS; run++) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });
  await ctx.addInitScript(() => localStorage.setItem('lang', 'el'));
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const times = {};
  let t0 = Date.now();
  await page.goto(BASE + '/builder?step=cpu');
  await page.locator('main li.card').first().waitFor({ timeout: 60000 });
  times.cpu = Date.now() - t0;
  for (let i = 0; i < 7; i++) {
    await page.locator('main li.card button:not([disabled])').filter({ hasText: 'Επιλογή' }).first().click();
    await page.waitForTimeout(WAIT);
    const title = await page.locator('#step-title').innerText();
    t0 = Date.now();
    await page.locator('main section button').filter({ hasText: /^\s*(Επόμενο|Παράλειψη)\s*$/ }).last().click();
    await page.waitForFunction((t) => document.querySelector('#step-title')?.textContent !== t, title);
    await page.waitForFunction(() => [...document.querySelectorAll('main li.card')].some((e) => e.getBoundingClientRect().height > 0));
    times[names[i + 1]] = Date.now() - t0;
  }
  all.push(times);
  console.log(`run ${run + 1}: ${names.map((n) => `${n} ${times[n]}`).join(' · ')} ms`);
  await ctx.close();
}
await browser.close();
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(`median (wait ${WAIT} ms): ${names.map((n) => `${n} ${median(all.map((t) => t[n]))}`).join(' · ')} ms (cpu = first card after load)`);
