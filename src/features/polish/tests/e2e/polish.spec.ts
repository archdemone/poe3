import { test, expect } from '@playwright/test';

const base = 'http://localhost:5173';

test('Polish preview boots without console errors and shows overlay', async ({ page }) => {
  const messages: string[] = [];
  page.on('pageerror', (e) => messages.push('pageerror:' + e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') messages.push('console:' + msg.text());
  });

  await page.goto(`${base}/#__polish?overlay=1`);

  // There should be a canvas and our overlay text element
  const canvas = page.locator('#renderCanvas');
  await expect(canvas).toHaveCount(1);

  const overlay = page.locator('#polish-overlay');
  await expect(overlay).toHaveCount(1);

  // Wait a moment to allow any errors to surface and text to populate
  await page.waitForTimeout(1000);

  // Overlay text should include fps and drawCalls
  const text = await overlay.textContent();
  expect(text).toContain('fps');
  expect(text).toContain('drawCalls');

  // No console errors
  expect(messages.join('\n')).toBe('');
});

