// The builder's shell (step 5 task 11): the start screen → "Build it for me" → the part list; the guided walk down to
// Review with the first card above the fold on every step at 360 px (top of the card + the bottom bar ≤ 780); no
// sideways scroll; every control ≥ 44 px on a phone (`.tap`, below 1024 px); a step file that fails shows a retry while
// the other steps and the summary keep working (Review Focus 3). 360 and 1366 px, Greek and English.
import { expect, test, type Page } from '@playwright/test';

type Lang = 'el' | 'en';
const TEXT = {
  gaming: { el: 'Gaming', en: 'Gaming' },
  buildForMe: { el: "Φτιάξ' το για μένα", en: 'Build it for me' },
  stepByStep: { el: 'Βήμα-βήμα', en: 'Step by step' },
  choose: { el: 'Επιλογή', en: 'Choose' },
  next: { el: /^\s*(Επόμενο|Παράλειψη)\s*$/, en: /^\s*(Next|Skip)\s*$/ },
  review: { el: 'Σύνοψη', en: 'Review' },
  retry: { el: 'Δοκιμή ξανά', en: 'Try again' },
} as const;

async function fresh(page: Page, lang: Lang, url: string, build?: object) {
  await page.goto('/about');
  await page.evaluate(
    ([l, b]) => {
      localStorage.clear();
      localStorage.setItem('lang', l as string);
      if (b) localStorage.setItem('pcBuild', JSON.stringify(b));
    },
    [lang, build ?? null] as const,
  );
  await page.goto(url);
}

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/** Visible controls in the page body shorter than 44 px (phones: `.tap`); inline links inside text are exempt. */
const shortControls = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('main button, main a[href], main input, main select, main summary')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || e.closest('[hidden]')) return false;
        if (e.tagName === 'A' && e.closest('p, li') && !e.className.includes('tap')) return false;
        return r.height < 43.5;
      })
      .map((e) => `${e.tagName} "${(e.textContent ?? e.getAttribute('aria-label') ?? '').trim().slice(0, 30)}" ${Math.round(e.getBoundingClientRect().height)}px`),
  );

/** Top of the first visible product card (or the chosen part's card) + the height of the phone's bottom bar. */
const foldUse = (page: Page) =>
  page.evaluate(() => {
    const card = [...document.querySelectorAll<HTMLElement>('main li.card')].find((e) => e.getBoundingClientRect().height > 0);
    const bar = document.querySelector<HTMLElement>('main aside');
    return card ? card.getBoundingClientRect().top + (bar?.getBoundingClientRect().height ?? 0) : null;
  });

for (const size of [
  { width: 360, height: 780 },
  { width: 1366, height: 900 },
]) {
  const phone = size.width < 1024;
  for (const lang of ['el', 'en'] as const) {
    test.describe(`${size.width} px, ${lang}`, () => {
      test.use({ viewport: size });

      test('start → Build it for me → the part list with the automatic build', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await fresh(page, lang, '/builder');
        await page.getByRole('button', { name: new RegExp(`^${TEXT.gaming[lang]}`) }).click();
        await page.getByRole('button', { name: '1500 €', exact: true }).click();
        // "Costs at least X € today" as soon as use and budget are set.
        await expect(page.locator('[data-minimum]')).toBeVisible({ timeout: 20_000 });
        const auto = page.getByRole('button', { name: TEXT.buildForMe[lang] });
        await expect(auto).toBeEnabled({ timeout: 20_000 });
        if (phone) expect(await shortControls(page)).toEqual([]);
        expect(await noOverflow(page)).toBe(true);
        await auto.click();
        await expect.poll(() => new URL(page.url()).search).toBe('?mode=quick');
        // Every line of the automatic build is filled (a CPU and a card for gaming), none still loading.
        for (const line of ['cpu', 'mobo', 'ram', 'gpu', 'storage', 'case', 'psu']) {
          await expect(page.locator(`[data-line=${line}] .font-semibold`).first()).toBeVisible({ timeout: 20_000 });
        }
        await expect(page.locator('[data-not-loaded]')).toHaveCount(0);
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}'));
        expect(saved.use).toBe('gaming');
        expect(saved.budget).toBe(1500);
        expect(typeof saved.cpu).toBe('string');
        expect(await noOverflow(page)).toBe(true);
        if (phone) expect(await shortControls(page)).toEqual([]);
        expect(errors).toEqual([]);
      });

      test('the guided walk to Review, the first card above the fold on every step', async ({ page }) => {
        test.setTimeout(180_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await fresh(page, lang, '/builder');
        await page.getByRole('button', { name: TEXT.stepByStep[lang] }).click();
        for (let i = 0; i < 8; i++) {
          const card = page.locator('main li.card').first();
          await expect(card).toBeVisible({ timeout: 20_000 });
          if (phone) {
            const fold = await foldUse(page);
            expect(fold, `step ${i + 1}`).not.toBeNull();
            expect(fold!, `step ${i + 1}: card top + bar`).toBeLessThanOrEqual(780);
            expect(await shortControls(page), `step ${i + 1}`).toEqual([]);
          }
          expect(await noOverflow(page), `step ${i + 1}`).toBe(true);
          await page.locator('main li.card button:not([disabled])').filter({ hasText: TEXT.choose[lang] }).first().click();
          await page.locator('main section button').filter({ hasText: TEXT.next[lang] }).last().click();
        }
        await expect(page.locator('#step-title')).toContainText(TEXT.review[lang]);
        await expect(page.locator('#step-title')).toContainText('9/9');
        expect(await noOverflow(page)).toBe(true);
        expect(errors).toEqual([]);
      });
    });
  }
}

test('"Clear build" empties every line, the second drive included, and the fan quantity goes back to 1', async ({ page }) => {
  await fresh(page, 'en', '/builder?mode=quick');
  for (const line of ['cpu', 'storage2', 'fan']) {
    await page.locator(`[data-line=${line}] button`).filter({ hasText: 'Choose' }).click();
    await page.locator('main ul.max-h-80 li button').first().click();
    await expect(page.locator(`[data-line=${line}] .font-semibold`).first()).toBeVisible({ timeout: 20_000 });
  }
  await page.locator('[data-line=fan]').getByRole('button', { name: 'One pack more' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}'))).toMatchObject({ fanQty: 2, storage2: expect.any(String) });
  await page.locator('main aside').getByRole('button', { name: 'Clear build' }).click();
  for (const line of ['cpu', 'storage2', 'fan']) await expect(page.locator(`[data-line=${line}]`)).toContainText('—');
  await expect(page.locator('main aside')).toContainText('0 parts');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}'));
  expect(saved.storage2).toBeUndefined();
  expect(saved.cpu).toBeUndefined();
  expect(saved.fanQty).toBe(1);
});

test.describe('a step file that fails (Review Focus 3)', () => {
  test('guided: the case step shows a retry; other steps and the summary keep working; the retry loads it', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let fail = true;
    await page.route('**/data/builder/case.json*', (route) => (fail ? route.abort() : route.fallback()));
    await fresh(page, 'en', '/builder?step=case');
    const retry = page.getByRole('button', { name: TEXT.retry.en });
    await expect(retry).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('main aside')).toBeVisible();
    // Another step works meanwhile.
    await page.getByRole('button', { name: 'Next step' }).click();
    await expect(page.locator('main li.card').first()).toBeVisible({ timeout: 20_000 });
    await page.locator('main li.card button:not([disabled])').filter({ hasText: 'Choose' }).first().click();
    await expect(page.locator('main aside')).toContainText('1 part');
    // Back on the case step its file is asked again and still fails: the retry stays; then the network recovers.
    await page.getByRole('button', { name: 'Previous step' }).click();
    await expect(page.getByRole('button', { name: TEXT.retry.en })).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState('networkidle');
    fail = false;
    await page.getByRole('button', { name: TEXT.retry.en }).click();
    await expect(page.locator('main li.card').first()).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
  });

  test('part list: a saved case whose file fails is named, not counted as 0, and has a retry', async ({ page }) => {
    let fail = true;
    await page.route('**/data/builder/case.json*', (route) => (fail ? route.abort() : route.fallback()));
    fail = false;
    // Find a case key through the builder itself: choose one in the part list, then reload with its file failing.
    await fresh(page, 'en', '/builder?mode=quick');
    await page.locator('[data-line=case] button').filter({ hasText: 'Choose' }).click();
    await page.locator('main ul.max-h-80 li button').first().click();
    await expect(page.locator('[data-line=case] .font-semibold').first()).toBeVisible();
    fail = true;
    await page.reload();
    await expect(page.locator('[data-line=case]').getByRole('button', { name: /Try again/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-not-loaded]').filter({ visible: true }).first()).toContainText('Case');
    fail = false;
    await page.locator('[data-line=case]').getByRole('button', { name: /Try again/ }).click();
    await expect(page.locator('[data-line=case] .font-semibold').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-not-loaded]')).toHaveCount(0);
  });
});
