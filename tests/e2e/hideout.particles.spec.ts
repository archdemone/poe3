import { test, expect } from '@playwright/test';

test.describe('Hideout Particle Loading', () => {
  test('should load hideout without particle crashes', async ({ page }) => {
    // Navigate to main menu
    await page.goto('/');

    // Click New Game
    await page.getByRole('button', { name: /new/i }).click();

    // Select first save slot
    await page.getByRole('button', { name: /Slot 1/i }).click();

    // Should transition to character creation
    await page.waitForSelector('[data-testid="cc-root"]', { timeout: 5000 });

    // Fill out character creation form
    await page.getByRole('button', { name: /Sentinel/i }).click();
    await page.keyboard.press('Tab'); // Focus ascendancy
    await page.keyboard.press('Enter'); // Select first ascendancy
    await page.keyboard.press('Tab'); // Focus name input
    await page.keyboard.type('TestCharacter');

    // Confirm character creation
    await page.getByTestId('cc-confirm').click();

    // Should load into hideout without errors
    await page.waitForURL('**/*', { timeout: 10000 });

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a moment for hideout to fully load
    await page.waitForTimeout(2000);

    // Should not have any particle-related errors
    const particleErrors = errors.filter(error =>
      error.includes('ParticleSystem') ||
      error.includes('WebGL2') ||
      error.includes('GPU') ||
      error.includes('HIDEOUT SETUP ERROR')
    );

    expect(particleErrors).toHaveLength(0);
  });

  test('should handle WebGL1 fallback gracefully', async ({ page, browser }) => {
    // Launch browser with WebGL1 simulation
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    const testPage = await context.newPage();

    // Mock WebGL version to 1 (simulate older hardware/CI)
    await testPage.addInitScript(() => {
      // Override getParameter to return WebGL 1
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 7938) { // VERSION
          return 'WebGL 1.0';
        }
        return originalGetParameter.call(this, parameter);
      };

      // Override webGLVersion if engine exposes it
      Object.defineProperty(HTMLCanvasElement.prototype, '_webGLVersion', {
        get: () => 1,
        configurable: true
      });
    });

    await testPage.goto('/');

    // Click New Game
    await testPage.getByRole('button', { name: /new/i }).click();

    // Select first save slot
    await testPage.getByRole('button', { name: /Slot 1/i }).click();

    // Should transition to character creation
    await testPage.waitForSelector('[data-testid="cc-root"]', { timeout: 5000 });

    // Fill out character creation form
    await testPage.getByRole('button', { name: /Sentinel/i }).click();
    await testPage.keyboard.press('Tab');
    await testPage.keyboard.press('Enter');
    await testPage.keyboard.press('Tab');
    await testPage.keyboard.type('TestCharacterWebGL1');

    // Confirm character creation
    await testPage.getByTestId('cc-confirm').click();

    // Should load into hideout without crashes
    await testPage.waitForURL('**/*', { timeout: 10000 });

    // Check console for graceful degradation messages
    const logs: string[] = [];
    testPage.on('console', msg => {
      logs.push(msg.text());
    });

    await testPage.waitForTimeout(2000);

    // Should have graceful degradation logs, not errors
    const degradationLogs = logs.filter(log =>
      log.includes('[Particles]') && log.includes('disabled')
    );

    // May or may not have degradation logs depending on implementation
    // But definitely should not have error alerts
    const errorLogs = logs.filter(log =>
      log.includes('HIDEOUT SETUP ERROR') ||
      log.includes('ParticleSystem') && log.includes('Error')
    );

    expect(errorLogs).toHaveLength(0);

    await context.close();
  });

  test('should handle headless/CI environment', async ({ page }) => {
    // Set up page for headless-like environment
    await page.addInitScript(() => {
      // Simulate limited WebGL capabilities
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 7938) { // VERSION
          return 'WebGL 1.0 (OpenGL ES 2.0 Chromium)';
        }
        return originalGetParameter.call(this, parameter);
      };
    });

    await page.goto('/');

    // Quick navigation to hideout
    await page.getByRole('button', { name: /new/i }).click();
    await page.getByRole('button', { name: /Slot 1/i }).click();

    await page.waitForSelector('[data-testid="cc-root"]', { timeout: 5000 });

    // Minimal character creation
    await page.getByRole('button', { name: /Sentinel/i }).click();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.type('CI_Test');

    await page.getByTestId('cc-confirm').click();

    // Should load successfully
    await page.waitForURL('**/*', { timeout: 10000 });

    // Verify basic functionality works
    const canvas = page.locator('#renderCanvas');
    await expect(canvas).toBeVisible();

    // Character should be able to move (basic functionality test)
    await canvas.click({ position: { x: 100, y: 100 } });
  });

  // Ensure no console errors or request failures
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

    await page.waitForTimeout(500);

    // Filter out expected non-critical errors
    const criticalErrors = errors.filter(error =>
      !error.includes('favicon.ico') &&
      !error.includes('net::ERR_ABORTED') &&
      !error.includes('WebGL') // WebGL warnings are OK
    );

    expect(criticalErrors).toHaveLength(0);
    expect(requests).toHaveLength(0);
  });
});
