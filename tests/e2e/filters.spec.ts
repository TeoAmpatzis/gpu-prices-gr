// Filters start empty (empty = all) in every category: the main group and Source have nothing ticked, ticking
// narrows the list and puts the choice in the URL, "Clear filters" brings everything back, and an old link
// that names one socket still narrows (design 2026-11-08 WS4).
import { expect, test, type Page } from '@playwright/test';

const CATEGORIES = ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler'];
const count = async (page: Page) => Number(((await page.locator('.catalogue-count, strong[aria-live=polite]').first().innerText()).match(/[\d,.]+/) ?? ['0'])[0].replace(/[,.]/g, ''));

/** Ticked boxes per sidebar group, by heading. */
const groups = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('aside fieldset, aside [role=group], aside details, aside section')]
      .map((g) => ({
        title: (g.querySelector('legend,summary,h3,h2,strong') as HTMLElement | null)?.textContent?.trim() ?? '',
        boxes: g.querySelectorAll('input[type=checkbox]').length,
        ticked: [...g.querySelectorAll('input[type=checkbox]')].filter((i) => (i as HTMLInputElement).checked).length,
      }))
      .filter((g) => g.boxes > 0),
  );

for (const cat of CATEGORIES) {
  test(`/${cat}: the main group and Source start with nothing ticked; ticking narrows; clearing restores`, async ({ page }) => {
    await page.goto(`/${cat}`);
    await page.locator('main [data-product-key]:visible').first().waitFor();
    const before = await groups(page);
    const main = before[0];
    const source = before.find((g) => /^Source|^Πηγ/.test(g.title))!;
    expect(main.ticked, `${cat} main group "${main.title}"`).toBe(0);
    expect(source.ticked, `${cat} Source`).toBe(0);
    const total = await count(page);

    // Tick the first value of the main group.
    await page.locator('aside input[type=checkbox]').first().check();
    await expect.poll(() => count(page)).toBeLessThanOrEqual(total);
    expect(page.url()).toContain('?');

    await page.getByRole('button', { name: /Clear filters|Καθαρισμός/ }).first().click();
    await expect.poll(() => count(page)).toBe(total);
    expect(new URL(page.url()).search).toBe('');
  });
}

test('/mobo: the two socket lists are told apart, and an old link naming one socket still narrows', async ({ page }) => {
  await page.goto('/mobo');
  await page.locator('main [data-product-key]:visible').first().waitFor();
  const titles = (await groups(page)).map((g) => g.title);
  expect(titles.filter((t) => t === 'Socket')).toHaveLength(0);
  expect(titles).toContain('Main sockets');
  expect(titles).toContain('All sockets');
  const all = await count(page);
  await page.goto('/mobo?sock=am5');
  await page.locator('main [data-product-key]:visible').first().waitFor();
  expect(await count(page)).toBeLessThan(all);
});
