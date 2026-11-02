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
  // Budget chips in whole euros, the sign on the language's side (task 14, #30).
  b1500: { el: '1.500 €', en: '€1,500' },
  b1000: { el: '1.000 €', en: '€1,000' },
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

/** Start → gaming, 1500 € → "Build it for me": a real build in the part list (saved in `pcBuild`). */
async function autoBuild(page: Page, lang: Lang) {
  await fresh(page, lang, '/builder');
  await page.getByRole('button', { name: new RegExp(`^${TEXT.gaming[lang]}`) }).click();
  await page.getByRole('button', { name: TEXT.b1500[lang], exact: true }).click();
  const auto = page.getByRole('button', { name: TEXT.buildForMe[lang] });
  await expect(auto).toBeEnabled({ timeout: 20_000 });
  await auto.click();
  for (const line of ['cpu', 'mobo', 'ram', 'gpu', 'storage', 'case', 'psu']) {
    await expect(page.locator(`[data-line=${line}] .font-semibold`).first()).toBeVisible({ timeout: 20_000 });
  }
}

/** Review's total and the sum of its lines' shown prices. */
const reviewSums = (page: Page) =>
  page.evaluate(() => ({
    total: Number(document.querySelector<HTMLElement>('[data-review-total]')?.dataset.reviewTotal),
    sum: [...document.querySelectorAll<HTMLElement>('[data-review-line] [data-price]')].reduce((s, e) => s + Number(e.dataset.price), 0),
  }));
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}'));

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
        await page.getByRole('button', { name: TEXT.b1500[lang], exact: true }).click();
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

      test('one Review in both modes: every line, total = sum of the shown prices, messages, power; 44 px, no overflow', async ({ page }) => {
        test.setTimeout(120_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await autoBuild(page, lang);
        for (const url of ['/builder?mode=quick', '/builder?step=review']) {
          if (url.includes('review')) await page.goto(url);
          for (const line of ['cpu', 'mobo', 'ram', 'gpu', 'storage', 'case', 'psu']) {
            await expect(page.locator(`[data-review-line=${line}] [data-price]`), `${url} ${line}`).toBeVisible({ timeout: 20_000 });
          }
          // The PSU is named by maker + model, then the picker card's specs (task 12 review #4).
          await expect(page.locator('[data-review-line=psu]')).toContainText(/ · \d+ W · /);
          await expect(page.locator('[data-messages]')).toBeVisible({ timeout: 20_000 });
          await expect(page.locator('[data-power]')).toContainText(/≥ \d+ W/);
          const { total, sum } = await reviewSums(page);
          expect(Math.abs(total - sum), url).toBeLessThan(0.011);
          await expect(page.locator('#share-link')).toHaveValue(/\/builder\?v=2&/);
          expect(await noOverflow(page), url).toBe(true);
          if (phone) expect(await shortControls(page), url).toEqual([]);
        }
        expect(errors).toEqual([]);
      });
    });
  }
}

test('"Clear build" empties every line, the second drive included, and the fan quantity goes back to 1', async ({ page }) => {
  await fresh(page, 'en', '/builder?mode=quick');
  for (const line of ['cpu', 'storage2', 'fan']) {
    await page.locator(`[data-line=${line}] button`).filter({ hasText: 'Choose' }).click();
    await page.getByRole('dialog').getByRole('button', { name: TEXT.choose.en, exact: true }).first().click();
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

for (const width of [360, 1366]) {
  test.describe(`shared picker ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test('CPU versions, PSU fields, storage, case and fan cards share the toolbar and preserve selections', async ({ page }) => {
      test.setTimeout(180_000);
      await fresh(page, 'en', '/builder?mode=quick');
      for (const line of ['cpu', 'psu', 'storage', 'storage2', 'case', 'fan']) {
        await page.locator(`[data-line=${line}]`).getByRole('button', { name: 'Choose', exact: true }).click();
        const dialog = page.getByRole('dialog');
        const picker = dialog.locator(`[data-picker=${line}]`);
        await expect(picker.locator('li.card').first()).toBeVisible({ timeout: 20_000 });
        await expect(picker.getByRole('button', { name: 'Only compatible', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expect(picker.getByRole('combobox')).toBeVisible();
        if (line === 'cpu') await expect(picker.locator('[data-card=cpu] ul li.card').first()).toBeVisible();
        if (line === 'psu') await expect(picker.locator('[data-card=psu]').first()).toContainText(/\d+ W/);
        if (line === 'fan') await expect(dialog.locator('[data-fan-plan]')).toBeVisible();
        expect(await noOverflow(page)).toBe(true);
        if (width === 360) expect(await shortControls(page)).toEqual([]);
        await picker.getByRole('button', { name: 'Choose', exact: true }).first().click();
        await expect(dialog).toHaveCount(0);
        await expect(page.locator(`[data-line=${line}]`).getByRole('button', { name: 'Change', exact: true })).toBeVisible();
      }
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}'));
      expect(saved.storage).toBeTruthy();
      expect(saved.storage2).toBeTruthy();
      await page.locator('[data-line=fan]').getByRole('button', { name: 'One pack more' }).click();
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}').fanQty)).toBe(2);
    });

    test('chosen CPU offer updates the line and total in both modes, survives reload, and loads only on demand', async ({ page }) => {
      test.setTimeout(120_000);
      const chunks: string[] = [];
      page.on('request', (request) => { if (/\/data\/cpu\/model\//.test(request.url())) chunks.push(request.url()); });
      await fresh(page, 'en', '/builder?step=cpu');
      const picker = page.locator('[data-picker=cpu]');
      await expect(picker.locator('li.card').first()).toBeVisible({ timeout: 20_000 });
      expect(chunks).toEqual([]);
      await picker.getByRole('textbox').fill('Ryzen 5 7600');
      await picker.getByRole('button', { name: 'Choose', exact: true }).first().click();
      const choice = picker.locator('[data-shop-choice=cpu]');
      await choice.getByRole('button', { name: 'Other shop', exact: true }).click();
      const offers = choice.locator('button[aria-pressed]');
      await expect.poll(() => offers.count()).toBeGreaterThan(1);
      const price = await offers.last().locator('.font-semibold').innerText();
      await offers.last().click();
      await expect(offers.last()).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('main aside').first()).toContainText(price);
      expect(chunks.length).toBeGreaterThan(0);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}'));
      expect(saved.offers.cpu).toBeTruthy();
      await page.goto('/builder?mode=quick');
      const line = page.locator('[data-line=cpu]');
      await expect(line).toContainText(price, { timeout: 20_000 });
      await page.reload();
      await expect(line).toContainText(price, { timeout: 20_000 });
      expect(await noOverflow(page)).toBe(true);
    });
  });
}

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
    // A restored case first tries its product chunk, then the catalogue fallback.
    await page.route(/\/data\/(?:builder\/case\.json|case\/model\/\d+\.json)/, (route) => (fail ? route.abort() : route.fallback()));
    fail = false;
    // Find a case key through the builder itself: choose one in the part list, then reload with its file failing.
    await fresh(page, 'en', '/builder?mode=quick');
    await page.locator('[data-line=case] button').filter({ hasText: 'Choose' }).click();
    await page.getByRole('dialog').getByRole('button', { name: TEXT.choose.en, exact: true }).first().click();
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

test('CPU step pages by card: "Show more" counts the cards left and disappears once all are shown', async ({ page }) => {
  await fresh(page, 'en', '/builder?step=cpu');
  const cards = page.locator('[data-picker=cpu] [data-card=cpu]');
  await expect(cards.first()).toBeVisible({ timeout: 20_000 });
  const more = page.locator('[data-picker=cpu]').getByRole('button', { name: /^Show more \(\d+\)$/ });
  while (await more.count()) {
    const before = await cards.count();
    const left = Number((await more.innerText()).match(/\d+/)![0]);
    await more.click();
    await expect(cards).toHaveCount(before + Math.min(left, 24));
  }
});

for (const width of [360, 1366]) {
  test.describe(`share link and reload ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test('the share link opens the same build in a fresh context (chosen offer, second drive, fan quantity); reload keeps it; Copy list', async ({ page, browser }) => {
      test.setTimeout(180_000);
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await autoBuild(page, 'en');
      // A second drive, fans × 3 and another shop for the CPU.
      await page.locator('[data-line=storage2]').getByRole('button', { name: 'Choose', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Choose', exact: true }).first().click();
      await expect(page.locator('[data-line=storage2] .font-semibold').first()).toBeVisible({ timeout: 20_000 });
      const fanChoose = page.locator('[data-line=fan]').getByRole('button', { name: 'Choose', exact: true });
      if (await fanChoose.count()) {
        await fanChoose.click();
        await page.getByRole('dialog').locator('[data-picker=fan]').getByRole('button', { name: 'Choose', exact: true }).first().click();
      }
      for (let i = 0; i < 12 && (await stored(page)).fanQty !== 3; i++) {
        const more = ((await stored(page)).fanQty ?? 1) < 3;
        await page.locator('[data-line=fan]').getByRole('button', { name: more ? 'One pack more' : 'One pack fewer' }).click();
      }
      expect((await stored(page)).fanQty).toBe(3);
      const choice = page.locator('[data-shop-choice=cpu]');
      await choice.getByRole('button', { name: 'Other shop', exact: true }).click();
      const offers = choice.locator('button[aria-pressed]');
      await expect.poll(() => offers.count(), { timeout: 20_000 }).toBeGreaterThan(1);
      await offers.last().click();
      await expect(offers.last()).toHaveAttribute('aria-pressed', 'true');
      const offerId = (await stored(page)).offers.cpu as string;
      expect(offerId).toBeTruthy();

      const review = async (p: typeof page) => {
        await expect(p.locator('[data-review-line=storage2] [data-price]')).toBeVisible({ timeout: 20_000 });
        await expect(p.locator('[data-review-line=fan]')).toContainText('3 ×');
        await expect(p.locator('[data-review-line=cpu] [data-offer-notice]')).toHaveCount(0, { timeout: 20_000 });
        return {
          cpu: await p.locator('[data-review-line=cpu] [data-price]').getAttribute('data-price'),
          ...(await reviewSums(p)),
        };
      };
      const before = await review(page);
      expect(Math.abs(before.total - before.sum)).toBeLessThan(0.011);
      const link = await page.locator('#share-link').inputValue();
      const q = new URL(link).searchParams;
      expect(q.get('v')).toBe('2');
      expect(q.get('o.cpu')).toBe(offerId);
      expect(q.get('storage2')).toBeTruthy();
      expect(q.get('fanQty')).toBe('3');
      expect(q.get('use')).toBe('gaming');
      expect(q.get('budget')).toBe('1500');
      expect(q.get('n.cpu')).toBeTruthy();

      // Copy list: one line per part, "Category: title — price — shop — URL", total, date, the share link last.
      await page.locator('[data-copy=list]').click();
      const text = await page.evaluate(() => navigator.clipboard.readText());
      const lines = text.split(/\r?\n/); // the Windows clipboard gives CRLF
      expect(lines[0]).toBe('BuildDraft.gr · My build');
      for (const name of ['Processor', 'Motherboard', 'Graphics card', 'Storage', 'Second drive', 'Case', 'Power supply']) {
        expect(lines.find((l) => l.startsWith(`${name}: `)), name).toMatch(/ — .+ — .+ — https?:\/\//);
      }
      expect(lines.find((l) => l.startsWith('Case fans: '))).toMatch(/^Case fans: 3 × /);
      expect(lines.some((l) => l.startsWith('Total: '))).toBe(true);
      expect(lines.some((l) => l.startsWith('Prices of '))).toBe(true);
      expect(lines[lines.length - 1]).toBe(link);

      // Reload: the same build.
      await page.reload();
      expect(await review(page)).toEqual(before);

      // A fresh browser context: the same build from the link, the visitor's own saved build untouched.
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      await ctx.addInitScript(() => localStorage.setItem('lang', 'en'));
      const other = await ctx.newPage();
      await other.goto(link);
      expect(await review(other)).toEqual(before);
      expect(await other.evaluate(() => localStorage.getItem('pcBuild'))).toBeNull();
      expect(await noOverflow(other)).toBe(true);
      if (width === 360) expect(await shortControls(other)).toEqual([]);
      await ctx.close();
    });
  });
}

test('a chosen shop offer that is gone falls back to the cheapest with a notice; the total is the sum of the shown prices (Review Focus 5)', async ({ page }) => {
  test.setTimeout(120_000);
  await autoBuild(page, 'en');
  await page.evaluate(() => {
    const b = JSON.parse(localStorage.getItem('pcBuild') ?? '{}');
    localStorage.setItem('pcBuild', JSON.stringify({ ...b, offers: { ...b.offers, case: 'skroutz:no-such-offer' } }));
  });
  await page.reload();
  await expect(page.locator('[data-review-line=case] [data-offer-notice=missing]')).toBeVisible({ timeout: 20_000 });
  const { total, sum } = await reviewSums(page);
  expect(Math.abs(total - sum)).toBeLessThan(0.011);
  // The saved choice is kept (not silently dropped).
  expect((await stored(page)).offers.case).toBe('skroutz:no-such-offer');
});

test('a chosen shop offer whose product file fails says so with a retry, counts the cheapest, and the retry loads it (Review Focus 3)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 }); // the phone's 44 px rule for the retry
  await autoBuild(page, 'en');
  const cheapest = await page.locator('[data-review-line=case] [data-price]').getAttribute('data-price');
  await page.evaluate(() => {
    const b = JSON.parse(localStorage.getItem('pcBuild') ?? '{}');
    localStorage.setItem('pcBuild', JSON.stringify({ ...b, offers: { ...b.offers, case: 'skroutz:no-such-offer' } }));
  });
  // Keep the product chunk unavailable through sparse restoration and the chosen-offer load;
  // the case catalogue still restores its cheapest row. Only the user's retry restores this route.
  let fails = true;
  await page.route('**/data/case/model/*.json*', (route) => (fails ? route.abort() : route.fallback()));
  await page.reload();
  const line = page.locator('[data-review-line=case]');
  await expect(line.locator('[data-offer-notice=failed]')).toContainText("Couldn't load the shop you chose", { timeout: 20_000 });
  expect(await line.locator('[data-price]').getAttribute('data-price')).toBe(cheapest);
  const { total, sum } = await reviewSums(page);
  expect(Math.abs(total - sum)).toBeLessThan(0.011);
  const retry = line.getByRole('button', { name: TEXT.retry.en });
  expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  fails = false;
  await retry.click();
  // Loaded now: the made-up offer is not in it, so the line says it is gone (never while the file was failing).
  await expect(line.locator('[data-offer-notice=missing]')).toBeVisible({ timeout: 20_000 });
  expect((await stored(page)).offers.case).toBe('skroutz:no-such-offer');
});

test('a part the data no longer has is named, from a saved build and from a v2 link (finding #22)', async ({ page }) => {
  await fresh(page, 'en', '/builder?mode=quick', { gpu: 'skroutz:no-such-card' });
  await expect(page.locator('[data-gone]')).toContainText('No longer sold: skroutz:no-such-card (Graphics card)', { timeout: 20_000 });
  await page.goto('/builder?v=2&gpu=skroutz:no-such-card&n.gpu=Old%20Card%208GB');
  await expect(page.locator('[data-gone]')).toContainText('No longer sold: Old Card 8GB', { timeout: 20_000 });
});

test('saved builds: save, rename, duplicate, delete with confirmation; open asks when the current build is unsaved; "Build it for me" keeps a named build', async ({ page }) => {
  test.setTimeout(120_000);
  await autoBuild(page, 'en');
  const dialog = page.getByRole('dialog');
  const menu = () => page.locator('[data-saved-builds]').click();
  const item = (name: string) => dialog.locator(`[data-saved-build="${name}"]`);
  await menu();
  await dialog.getByRole('button', { name: 'Save as new' }).click();
  await dialog.getByLabel('Name').fill('Gaming A');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved: Gaming A')).toBeVisible();
  await menu();
  await expect(item('Gaming A')).toContainText('open');
  await item('Gaming A').getByRole('button', { name: 'Rename' }).click();
  await dialog.getByLabel('Name').fill('Gaming B');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await menu();
  await item('Gaming B').getByRole('button', { name: 'Duplicate' }).click();
  await menu();
  await expect(dialog.locator('[data-saved-build]')).toHaveCount(2);
  await item('Gaming B (2)').getByRole('button', { name: 'Delete' }).click();
  await expect(dialog.locator('[data-confirm]')).toContainText('Gaming B (2)');
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Deleted: Gaming B (2)')).toBeVisible();
  // The current build (the deleted copy's) is no longer saved under a name: opening another asks first.
  await menu();
  await item('Gaming B').getByRole('button', { name: 'Open' }).click();
  await expect(dialog.locator('[data-confirm]')).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Opened: Gaming B')).toBeVisible();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('pcBuilds') ?? '{}'));
  const named = Object.values((await saved()).builds as Record<string, { name: string; build: unknown }>);
  expect(named.map((b) => b.name)).toEqual(['Gaming B']);
  // "Build it for me" with a named build open: asked, then the named build stays as saved.
  await page.getByRole('button', { name: 'Use and budget' }).click();
  await page.getByRole('button', { name: TEXT.b1000.en, exact: true }).click();
  const auto = page.getByRole('button', { name: TEXT.buildForMe.en });
  await expect(auto).toBeEnabled({ timeout: 20_000 });
  // The budget picked just now is an edit of the open build; the automatic build must not change it any further.
  const keep = JSON.stringify(Object.values((await saved()).builds as Record<string, { build: unknown }>)[0].build);
  await auto.click();
  await expect(dialog).toContainText('The parts of "Gaming B" stay saved');
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect.poll(() => new URL(page.url()).search).toBe('?mode=quick');
  const after = await saved();
  expect(after.active).toBeNull();
  expect(JSON.stringify(Object.values(after.builds as Record<string, { build: unknown }>)[0].build)).toBe(keep);
  expect((await stored(page)).budget).toBe(1000);
});
test('"Build it for me" stops when the browser refuses to close the open named build, and says so', async ({ page }) => {
  test.setTimeout(120_000);
  await autoBuild(page, 'en');
  const dialog = page.getByRole('dialog');
  await page.locator('[data-saved-builds]').click();
  await dialog.getByRole('button', { name: 'Save as new' }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(/^Saved: /)).toBeVisible();
  const before = await stored(page);
  await page.getByRole('button', { name: 'Use and budget' }).click();
  const auto = page.getByRole('button', { name: TEXT.buildForMe.en });
  await expect(auto).toBeEnabled({ timeout: 20_000 });
  // The named builds' store refuses writes from now on (storage full).
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === 'pcBuilds') throw new DOMException('full', 'QuotaExceededError');
      set.call(this, k, v);
    };
  });
  await auto.click();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText("Your browser didn't allow saving")).toBeVisible();
  expect(await stored(page)).toEqual(before);
  expect(new URL(page.url()).search).not.toBe('?mode=quick');
});

test('"Save as new" in a shared view keeps a shared part the data no longer has', async ({ page }) => {
  await fresh(page, 'en', '/builder?v=2&gpu=skroutz:no-such-card&n.gpu=Old%20Card%208GB');
  await expect(page.locator('[data-gone]')).toContainText('No longer sold: Old Card 8GB', { timeout: 20_000 });
  await page.locator('[data-saved-builds]').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Save as new' }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(/^Saved: /)).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuilds') ?? '{}'));
  const [b] = Object.values(saved.builds as Record<string, { build: { parts: Record<string, { key: string }> } }>);
  expect(b.build.parts.gpu.key).toBe('skroutz:no-such-card');
});

test('Copy list waits for the shop links, and says when they failed', async ({ page }) => {
  test.setTimeout(120_000);
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/data/builder/*-extra.json*', async (route) => {
    await held;
    await route.abort();
  });
  await autoBuild(page, 'en');
  const list = page.locator('[data-copy=list]');
  await expect(page.locator('[data-links=loading]')).toHaveText('Loading shop links…', { timeout: 20_000 });
  await expect(list).toBeDisabled();
  release();
  await expect(page.locator('[data-links=missing]')).toBeVisible({ timeout: 20_000 });
  await expect(list).toBeEnabled();
});
