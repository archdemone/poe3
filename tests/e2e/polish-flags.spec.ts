import { test, expect } from '@playwright/test';

const base = 'http://localhost:5173';

test('postfx flag toggles pipeline marker', async ({ page }) => {
  await page.goto(`${base}/#__polish?postfx=0&overlay=1`);
  await page.waitForSelector('#renderCanvas');
  const markers0 = await page.evaluate(() => (window as any).__polishMarkers || {});
  expect(markers0.postfx).toBeFalsy();

  await page.goto(`${base}/#__polish?postfx=1&overlay=1`);
  await page.waitForSelector('#renderCanvas');
  const markers1 = await page.evaluate(() => (window as any).__polishMarkers || {});
  expect(markers1.postfx).toBeTruthy();
});
