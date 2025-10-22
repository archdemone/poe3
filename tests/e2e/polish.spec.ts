import { test, expect } from '@playwright/test';

const base = 'http://localhost:5173';

test('Polish self-test route renders overlay and has no console errors', async ({ page }) => {
  const messages: string[] = [];
  page.on('pageerror', (e) => messages.push('pageerror:' + e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') messages.push('console:' + msg.text()); });

  await page.goto(`${base}/#__polish?overlay=1`);

  await expect(page.locator('#renderCanvas')).toHaveCount(1);
  await expect(page.locator('#polish-overlay')).toHaveCount(1);

  await page.waitForTimeout(500);
  expect(messages.join('\n')).toBe('');
});
