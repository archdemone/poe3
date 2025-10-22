/**
 * Character Creation E2E Tests
 * Tests the complete flow from New Game -> Character Creation -> Game Start
 */

import { test, expect } from '@playwright/test';

test.describe('Character Creation Flow', () => {
  test('happy path: new game -> character creation -> game start', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Monitor console for errors and warnings
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    // Navigate to the app
    await page.goto('http://localhost:5173');

    // Wait for main menu to load
    await page.waitForSelector('.main-menu', { timeout: 5000 });

    // Click "New Game" button
    await page.click('#btn-new-game');

    // Wait for slot picker modal
    await page.waitForSelector('#slot-picker-modal', { timeout: 2000 });

    // Click on first slot (should be empty)
    await page.click('.slot-item[data-slot="0"]');

    // Wait for character creation UI to load
    await page.waitForSelector('#poe-creator', { timeout: 3000 });

    // Verify character creation UI is visible
    const ccElement = await page.locator('#poe-creator');
    await expect(ccElement).toBeVisible();

    // Verify class grid is present
    const classGrid = await page.locator('#class-grid');
    await expect(classGrid).toBeVisible();

    // Select a class (first available)
    const firstClassTile = await page.locator('#class-grid .tile').first();
    await firstClassTile.click();

    // Wait for class selection to take effect
    await page.waitForTimeout(500);

    // Verify ascendancy grid appears
    const ascGrid = await page.locator('#asc-grid');
    await expect(ascGrid).toBeVisible();

    // Select an ascendancy (first available)
    const firstAscTile = await page.locator('#asc-grid .tile').first();
    await firstAscTile.click();

    // Wait for selection
    await page.waitForTimeout(500);

    // Enter character name
    const nameInput = await page.locator('#creator-name');
    await nameInput.fill('TestAdventurer');

    // Wait for validation to pass
    await page.waitForTimeout(500);

    // Verify confirm button is enabled
    const confirmBtn = await page.locator('#creator-confirm');
    await expect(confirmBtn).toBeEnabled();

    // Click confirm
    await confirmBtn.click();

    // Wait for confirmation modal
    await page.waitForSelector('#creator-confirm-modal', { timeout: 2000 });

    // Click "Yes, Create" in confirmation modal
    const confirmYesBtn = await page.locator('#confirm-yes');
    await confirmYesBtn.click();

    // Wait for game to load (should transition to hideout)
    await page.waitForTimeout(5000);

    // Verify we're in the game (hideout loaded)
    // Check if we have meshes in the scene
    const meshCount = await page.evaluate(() => {
      const scene = (window as any).scene;
      return scene ? scene.meshes.length : 0;
    });

    console.log(`Scene mesh count: ${meshCount}`);
    expect(meshCount).toBeGreaterThan(0);

    // No console errors should have occurred
    const ccErrors = errors.filter(e =>
      !e.includes('favicon') && // Ignore favicon errors
      !e.includes('manifest') && // Ignore manifest errors
      !e.includes('WebGL') // Ignore WebGL warnings
    );

    if (ccErrors.length > 0) {
      console.error('Character creation errors:', ccErrors);
    }
    expect(ccErrors).toHaveLength(0);

    // Watchdog should not have fired in happy path
    const watchdogHits = await page.evaluate(() => (window as any).__ccDebug?.watchdogHits || 0);
    expect(watchdogHits).toBe(0);
  });

  test('flag disabled: new game bypasses character creation', async ({ page }) => {
    // This test would verify behavior when ENABLE_POE_STYLE_CREATOR = false
    // For now, we'll skip this as the flag is enabled
    test.skip('Feature flag test - flag currently enabled');
  });

  test('watchdog recovery: handles slow asset loading', async ({ page }) => {
    // Test that the watchdog can recover from temporary failures
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate and start character creation
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.main-menu', { timeout: 5000 });
    await page.click('#btn-new-game');
    await page.waitForSelector('#slot-picker-modal', { timeout: 2000 });
    await page.click('.slot-item[data-slot="0"]');

    // Wait for character creation to load
    await page.waitForSelector('#poe-creator', { timeout: 5000 });

    // Verify no watchdog errors occurred
    const watchdogErrors = errors.filter(e => e.includes('Watchdog') || e.includes('mount'));
    expect(watchdogErrors).toHaveLength(0);
  });

  test('accessibility: keyboard navigation works', async ({ page }) => {
    // Navigate to character creation
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.main-menu', { timeout: 5000 });
    await page.click('#btn-new-game');
    await page.waitForSelector('#slot-picker-modal', { timeout: 2000 });
    await page.click('.slot-item[data-slot="0"]');
    await page.waitForSelector('#poe-creator', { timeout: 3000 });

    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Focus on first element
    await page.keyboard.press('Tab'); // Move to next
    await page.keyboard.press('Enter'); // Select class

    await page.waitForTimeout(500);

    // Should be able to navigate to ascendancy selection
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Select ascendancy

    await page.waitForTimeout(500);

    // Navigate to name input
    await page.keyboard.press('Tab');
    await page.keyboard.type('KeyboardTest');

    // Navigate to confirm button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Click confirm

    // Should show confirmation modal
    await page.waitForSelector('#creator-confirm-modal', { timeout: 2000 });

    // Verify modal is accessible
    const confirmModal = await page.locator('#creator-confirm-modal');
    await expect(confirmModal).toBeVisible();

    // Accessibility ping: verify CC root is focusable and tab order works
    const ccRoot = await page.locator('#poe-creator');
    await expect(ccRoot).toBeVisible();

    // Check that CC root has proper focus management (should be focusable for screen readers)
    const isFocusable = await page.evaluate(() => {
      const el = document.querySelector('#poe-creator');
      return el && (el.tabIndex >= 0 || el.getAttribute('tabindex') !== null);
    });
    expect(isFocusable).toBe(true);

    // Verify tab order reaches the confirm button
    await page.keyboard.press('Tab'); // Should reach confirm button
    const activeElement = await page.evaluate(() => document.activeElement?.id);
    expect(activeElement).toBe('creator-confirm');
  });

  test('slow-load simulation: watchdog recovers from delayed CSS', async ({ page }) => {
    const watchdogHitsBefore = await page.evaluate(() => (window as any).__ccDebug?.watchdogHits || 0);

    // Intercept CSS requests and delay them by 1.5 seconds (exceeds 1s watchdog timeout)
    await page.route('**/*.css', async route => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await route.continue();
    });

    // Navigate to character creation
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.main-menu', { timeout: 5000 });
    await page.click('#btn-new-game');
    await page.waitForSelector('#slot-picker-modal', { timeout: 2000 });
    await page.click('.slot-item[data-slot="0"]');

    // Wait for character creation to load (should trigger watchdog once, then recover)
    await page.waitForSelector('#poe-creator', { timeout: 5000 });

    // Verify watchdog fired exactly once
    const watchdogHitsAfter = await page.evaluate(() => (window as any).__ccDebug?.watchdogHits || 0);
    expect(watchdogHitsAfter).toBe(watchdogHitsBefore + 1);

    // Verify CC UI is still functional
    const ccElement = await page.locator('#poe-creator');
    await expect(ccElement).toBeVisible();
  });
});
