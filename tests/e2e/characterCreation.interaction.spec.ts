import { test, expect } from '@playwright/test';

test.describe('Character Creation Interaction Tests', () => {
  test('Mouse interaction works', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.getByRole('button', { name: /new/i }).click();
    await page.waitForSelector('[data-testid="cc-root"]', { timeout: 1000 });

    // Clickable class tile
    await page.getByRole('button', { name: /Sentinel/i }).click();
    await expect(page.getByTestId('cc-confirm')).toBeDisabled(); // Still needs name/asc
  });

  test('Keyboard-only works', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.getByRole('button', { name: /new/i }).click();
    await page.waitForSelector('[data-testid="cc-root"]', { timeout: 1000 });

    // Focus class tile with Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Select first class

    // Type into name input
    await page.keyboard.type('John', { delay: 10 });
    await expect(page.getByDisplayValue('John')).toBeVisible();
  });

  test('Canvas & HUD don\'t steal input', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.getByRole('button', { name: /new/i }).click();
    await page.waitForSelector('[data-testid="cc-root"]', { timeout: 1000 });

    // Try dragging over canvas — should not rotate camera while CC open
    const canvas = page.locator('#renderCanvas');
    await canvas.hover();

    // Add instrumentation to track camera movement
    await page.evaluate(() => {
      (window as any).__sceneDbg = { cameraMoved: false };
      // Mock camera movement detection (adapt to actual camera API)
      const originalAttach = console.log;
      console.log = (...args) => {
        if (args[0]?.includes?.('camera') || args[0]?.includes?.('rotate')) {
          (window as any).__sceneDbg.cameraMoved = true;
        }
        return originalAttach(...args);
      };
    });

    await page.mouse.down();
    await page.mouse.move(100, 0);
    await page.mouse.up();

    const moved = await page.evaluate(() => (window as any).__sceneDbg?.cameraMoved ?? false);
    expect(moved).toBeFalsy(); // Camera should not move while CC is open
  });

  test('z-index / hit test sanity', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.getByRole('button', { name: /new/i }).click();
    await page.waitForSelector('[data-testid="cc-root"]', { timeout: 1000 });

    const under = await page.evaluate(() => (window as any).__hit?.(innerWidth/2, innerHeight/2));
    expect(under).toContain('data-testid="cc-root"');
  });

  test('Exit restores gameplay input', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.getByRole('button', { name: /new/i }).click();
    await page.waitForSelector('[data-testid="cc-root"]', { timeout: 1000 });

    // Fill out character creation form
    await page.getByRole('button', { name: /Sentinel/i }).click();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Select first ascendancy
    await page.keyboard.press('Tab');
    await page.keyboard.type('TestCharacter');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Confirm

    // Wait for transition to game
    await page.waitForSelector('[data-testid="cc-root"]', { state: 'detached' });

    // Now camera can rotate again
    const canvas = page.locator('#renderCanvas');
    await canvas.hover();

    await page.evaluate(() => {
      (window as any).__sceneDbg = { cameraMoved: false };
    });

    await page.mouse.down();
    await page.mouse.move(100, 0);
    await page.mouse.up();

    const movedAfter = await page.evaluate(() => (window as any).__sceneDbg?.cameraMoved ?? false);
    expect(movedAfter).toBeTruthy(); // Camera should move after CC exits
  });

  // Ensure no console errors or failed requests
  test.afterEach(async ({ page }) => {
    const errors: string[] = [];
    const requests: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('requestfailed', request => {
      requests.push(`${request.method()} ${request.url()}`);
    });

    await page.waitForTimeout(1000); // Wait for any async errors

    expect(errors).toHaveLength(0);
    expect(requests).toHaveLength(0);
  });
});
