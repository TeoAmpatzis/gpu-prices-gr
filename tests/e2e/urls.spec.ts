// Real URLs (Phase 1, plan A2): every old v1 "#…" link lands on its new address with every parameter,
// deep links open directly (the preview server serves them like the host will), a v1 shared-build link
// still opens the same build, and in-site navigation keeps the browser's back button working.
import { expect, test, type Page } from '@playwright/test';

/** Open an address in a fresh document (an old link is always a new page load). */
async function open(page: Page, url: string) {
  await page.goto('about:blank');
  await page.goto(url);
}

const OLD_LINKS: [string, string][] = [
  ['/#gpu', '/gpu'],
  ['/#cpu', '/cpu'],
  ['/#mobo', '/mobo'],
  ['/#ram', '/ram'],
  ['/#storage', '/storage'],
  ['/#psu', '/psu'],
  ['/#case', '/case'],
  ['/#fan', '/fan'],
  ['/#cooler', '/cooler'],
  ['/#gpu?vram=16', '/gpu?vram=16'],
  ['/#gpu?brand=nvidia&vram=16&sort=price-asc&page=2&per=100', '/gpu?brand=nvidia&vram=16&sort=price-asc&page=2&per=100'],
  ['/#ram?type=ddr5&cap=32&kit=2&cl=30', '/ram?type=ddr5&cap=32&kit=2&cl=30'],
  ['/#storage?seg=nas&type=hdd', '/storage?seg=nas&type=hdd'],
  ['/#mobo?sock=am5&chipset=b850&wifi=yes', '/mobo?sock=am5&chipset=b850&wifi=yes'],
  ['/#psu?eff=gold&watts=850', '/psu?eff=gold&watts=850'],
  ['/#cpu?q=9800x3d&sale=1', '/cpu?q=9800x3d&sale=1'],
  ['/#case?size=midi-tower&fits=atx&window=yes&rgb=no&brand=lian-li&low=1', '/case?size=midi-tower&fits=atx&window=yes&rgb=no&brand=lian-li&low=1'],
  ['/#fan?size=120&pack=3&pwm=yes&src=skroutz&max=60', '/fan?size=120&pack=3&pwm=yes&src=skroutz&max=60'],
  ['/#cooler?type=aio&rad=360&rgb=yes&sort=discount', '/cooler?type=aio&rad=360&rgb=yes&sort=discount'],
  ['/#builder', '/builder'],
  ['/#builder?mode=quick', '/builder?mode=quick'],
  ...['use', 'cpu', 'mobo', 'ram', 'gpu', 'cooler', 'storage', 'case', 'psu', 'fan', 'review'].map((s): [string, string] => [`/#builder?step=${s}`, `/builder?step=${s}`]),
  [
    '/#builder?cpu=a&mobo=b&ram=c&gpu=d&cooler=e&storage=f&case=g&fan=h&psu=i&use=gaming&budget=1200',
    '/builder?cpu=a&mobo=b&ram=c&gpu=d&cooler=e&storage=f&case=g&fan=h&psu=i&use=gaming&budget=1200',
  ],
  ['/#about', '/about'],
  ['/#contact', '/contact'],
  ['/#privacy', '/privacy'],
  ['/#', '/'],
  // A query before the hash is dropped; the hash's parameters win (v1 ignored it too).
  ['/?x=1#gpu?vram=16', '/gpu?vram=16'],
];

for (const [from, to] of OLD_LINKS) {
  test(`old link ${from} → ${to}`, async ({ page }) => {
    await open(page, from);
    await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe(to);
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 20_000 });
  });
}

test('other hashes are in-page anchors and stay as they are', async ({ page }) => {
  for (const hash of ['#main', '#foo']) {
    await open(page, `/${hash}`);
    await expect(page.locator('main h1').first()).toBeVisible();
    expect(new URL(page.url()).pathname + new URL(page.url()).hash).toBe(`/${hash}`);
  }
});

test('an old filter link applies its filters', async ({ page }) => {
  await open(page, '/#gpu?vram=16');
  // The applied-filter chips above the list show the decoded filter.
  await expect(page.locator('main').getByText(/16\s*GB/).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  expect(new URL(page.url()).searchParams.get('vram')).toBe('16');
});

for (const deep of ['/gpu?vram=16', '/ram?type=ddr5&cap=32', '/builder?step=case', '/storage?seg=nas', '/about', '/parts']) {
  test(`deep link ${deep} opens directly`, async ({ page }) => {
    const response = await page.goto(deep);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 20_000 });
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(deep);
  });
}

test('a v1 shared build opens the same build on Review', async ({ page }) => {
  // A real model key from today's data: the first CPU the builder offers.
  await open(page, '/builder?step=cpu');
  const firstCard = page.locator('main li.card').first();
  await firstCard.waitFor({ timeout: 20_000 });
  const cpuName = (await firstCard.locator('h3, .font-semibold').first().innerText()).trim();
  await firstCard.getByRole('button', { name: /^(Επιλογή|Choose)$/ }).click();
  // The builder's own share link (v2 form), turned back into the v1 form an old message would hold.
  const share = await page.evaluate(() => {
    const raw = localStorage.getItem('pcBuild');
    const cpu = raw ? (JSON.parse(raw) as { cpu?: string }).cpu : undefined;
    return cpu ? `/#builder?cpu=${encodeURIComponent(cpu)}` : null;
  });
  expect(share).not.toBeNull();
  await page.evaluate(() => localStorage.removeItem('pcBuild'));
  await open(page, share!);
  await expect.poll(() => new URL(page.url()).pathname).toBe('/builder');
  await expect(page.locator('main').getByText(cpuName).first()).toBeVisible({ timeout: 20_000 });
});

test('in-site navigation keeps back and forward', async ({ page }) => {
  await open(page, '/');
  await page.locator('header button[aria-controls]').first().click();
  await page.locator('header a[href="/ram"]').click();
  await expect(page).toHaveURL(/\/ram$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/ram$/);
});

test('a model address opens its category searched (until Phase 3)', async ({ page }) => {
  await open(page, '/gpu/rtx-5070-12gb');
  await expect.poll(() => new URL(page.url()).searchParams.get('q'), { timeout: 20_000 }).toBe('RTX 5070 12GB');
});

test('the skip link is the first Tab stop and moves focus to the content', async ({ page }) => {
  await open(page, '/gpu');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('href', '#main');
  await page.keyboard.press('Enter');
  await expect(page.locator(':focus')).toHaveAttribute('id', 'main');
});
