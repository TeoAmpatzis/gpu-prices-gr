// The shell's keyboard and motion behaviour (Phase 1, plan A4/A5): the Tab order through the header, a
// visible focus outline on every stop, the Εξαρτήματα menu's keys, the search combobox's keys, and
// reduced motion turning every shell animation off.
/* global document, getComputedStyle */
import { expect, test, type Page } from '@playwright/test';

// Greek, the site's default for Greek browsers (the test browser is English).
test.beforeEach(({ page }) => page.addInitScript(() => localStorage.setItem('lang', 'el')));

/** What has focus now: a short description plus whether it shows the focus outline. */
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { name: 'body', outline: false };
    const cs = getComputedStyle(el);
    const name = el.getAttribute('aria-label') || el.getAttribute('href') || el.textContent?.trim().slice(0, 30) || el.tagName;
    const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
    const ring = /rgb/.test(cs.boxShadow) && cs.boxShadow !== 'none';
    return { name, outline: outline || ring };
  });

test('desktop header: Tab order, visible focus on every stop', async ({ page }) => {
  await page.goto('/');
  await page.locator('main h1').waitFor();
  const stops: { name: string; outline: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab');
    stops.push(await focused(page));
  }
  // Skip link, logo, Εξαρτήματα, search, PC Builder, language, then the page's own search.
  expect(stops.map((s) => s.name)).toEqual([
    '#main',
    'BuildDraft.gr, αρχική σελίδα',
    'Εξαρτήματα',
    expect.stringMatching(/Αναζήτηση/),
    '/builder',
    'Switch to English',
    expect.stringMatching(/Αναζήτηση/),
  ]);
  for (const s of stops) expect(s, s.name).toMatchObject({ outline: true });
});

test('Εξαρτήματα menu: ↓ opens it on the first link, Esc closes it back to its button', async ({ page }) => {
  await page.goto('/');
  await page.locator('main h1').waitFor();
  const btn = page.locator('header button[aria-controls]');
  await btn.focus();
  await page.keyboard.press('ArrowDown');
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  // The first link of the first group (Βασικά: CPU, boards, RAM, graphics cards, storage).
  await expect(page.locator(':focus')).toHaveAttribute('href', '/cpu');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('href', /^\/\w+$/);
  await page.keyboard.press('Escape');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(btn).toBeFocused();
  // Enter opens it too; picking a link goes there and closes it.
  await page.keyboard.press('Enter');
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await page.locator('header a[href="/ram"]').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/ram$/);
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
});

test('search combobox: typing lists suggestions, ↓ moves, Enter opens, Esc closes', async ({ page }) => {
  await page.goto('/');
  await page.locator('main h1').waitFor();
  // The header's search box for desktop widths (the tablet one sits in a row hidden here).
  const box = page.locator('header input[role=combobox]:visible');
  await box.focus();
  await page.keyboard.type('rtx 50');
  const options = page.locator('header [role=listbox] [role=option]');
  await expect(options.first()).toBeVisible({ timeout: 10_000 });
  await expect(box).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown');
  const active = await box.getAttribute('aria-activedescendant');
  expect(active).toBeTruthy();
  await expect(page.locator(`[id="${active}"]`)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(box).toHaveAttribute('aria-expanded', 'false');
  await expect(box).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(options.first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/(gpu|cpu)\?q=/);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('shell animations compute to 0 s', async ({ page }) => {
    await page.goto('/');
    await page.locator('main h1').waitFor();
    await page.locator('header button[aria-controls]').click();
    const panel = page.locator('header .ui-enter-pop');
    await expect(panel).toBeVisible();
    const durations = await page.evaluate(() => {
      const pop = document.querySelector('header .ui-enter-pop')!;
      const chevron = document.querySelector('header button[aria-controls] svg')!;
      return [getComputedStyle(pop).animationDuration, getComputedStyle(chevron).transitionDuration];
    });
    expect(durations).toEqual(['0s', '0s']);
  });
});
