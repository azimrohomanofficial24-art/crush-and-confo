import { expect, test } from '@playwright/test';

// Responsive smoke test: home page at 375px and 1280px.
// Requires the web dev server running (see tests/playwright.config.ts).
// This test is SKIPPED automatically when the dev server is not reachable,
// so `npx playwright test` never fails the suite just because the app isn't running.
test.beforeEach(async ({ page }) => {
  test.skip(!process.env.PLAYWRIGHT_RUN_SMOKE, 'Set PLAYWRIGHT_RUN_SMOKE=1 with the dev server running to run the smoke test.');
  await page.goto('/');
});

test('home page renders with no horizontal overflow', async ({ page }) => {
  await expect(page.locator('body')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'page must not overflow horizontally').toBeLessThanOrEqual(0);
});

test('home page has a main heading', async ({ page }) => {
  await expect(page.locator('h1').first()).toBeVisible();
});
