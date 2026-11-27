import { defineConfig, devices } from '@playwright/test';

// Responsive smoke test config. The web dev server must be running first:
//   npm run dev          (Vite, apps/web — Agent A)
// then:  npx playwright test --config tests/playwright.config.ts
// Base URL can be overridden:  PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test ...
// Browsers are NOT installed by `npm install`; run `npx playwright install chromium` once.
export default defineConfig({
  testDir: '.',
  testMatch: ['smoke.spec.ts'],
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile-375', use: { ...devices['iPhone SE'], viewport: { width: 375, height: 667 } } },
    { name: 'desktop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  // No webServer entry on purpose: the dev server belongs to Agent A's app and
  // its port/command are defined there. Start it manually before running this.
});
