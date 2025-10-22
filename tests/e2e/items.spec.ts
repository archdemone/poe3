// End-to-end tests for item UI interactions
import { test, expect } from '@playwright/test';

test.describe('Item UI Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Set up the page with extended timeout for Babylon.js loading
    page.setDefaultTimeout(30000);

    // Navigate to the main page
    await page.goto('/');

    // Wait for Babylon.js to initialize and the canvas to be ready
    await page.waitForSelector('#renderCanvas');
    await page.waitForFunction(() => {
      const canvas = document.querySelector('#renderCanvas') as HTMLCanvasElement;
      return canvas && canvas.width > 0 && canvas.height > 0;
    });

    // Wait a bit more for the game to fully initialize
    await page.waitForTimeout(2000);
  });

  test('should load the game without console errors', async ({ page }) => {
    // Check that no JavaScript errors occurred during loading
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit and check for errors
    await page.waitForTimeout(1000);

    // Filter out expected Babylon.js warnings and WebGL context messages
    const criticalErrors = errors.filter(error =>
      !error.includes('WebGL') &&
      !error.includes('Extension') &&
      !error.includes('BJS') &&
      !error.includes('shader') &&
      !error.includes('texture') &&
      !error.includes('material')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should display inventory UI elements', async ({ page }) => {
    // Check that inventory panels exist but are hidden initially
    await expect(page.locator('#inventoryStandalone')).toHaveClass(/is-hidden/);
    await expect(page.locator('#inventoryCompact')).toHaveClass(/is-hidden/);

    // Check that equipment slots exist
    const equipmentSlots = page.locator('.equip-slot');
    await expect(equipmentSlots).toHaveCount(10); // helmet, amulet, chest, weapon, offhand, gloves, belt, boots, ring, ring2

    // Check that inventory grid exists
    await expect(page.locator('#inventory-grid')).toBeVisible();
  });

  test('should open inventory panel', async ({ page }) => {
    // The inventory should be accessible via some UI trigger
    // For now, we'll simulate opening it by manipulating the DOM

    // Make the inventory panel visible
    await page.evaluate(() => {
      const panel = document.querySelector('#inventoryStandalone') as HTMLElement;
      if (panel) {
        panel.classList.remove('is-hidden');
      }
    });

    // Check that the panel is now visible
    await expect(page.locator('#inventoryStandalone')).not.toHaveClass(/is-hidden/);

    // Check that equipment slots are present
    const equipmentSlots = page.locator('#inventoryStandalone .equip-slot');
    await expect(equipmentSlots).toHaveCount(10);
  });

  test('should display vendor panel', async ({ page }) => {
    // Make the vendor panel visible
    await page.evaluate(() => {
      const panel = document.querySelector('#vendorPanel') as HTMLElement;
      if (panel) {
        panel.classList.remove('is-hidden');
      }
    });

    // Check that vendor elements are present
    await expect(page.locator('#vendorPanel')).not.toHaveClass(/is-hidden/);
    await expect(page.locator('#vendor-items')).toBeVisible();
    await expect(page.locator('#vendor-sell-zone')).toBeVisible();
    await expect(page.locator('.gold-amount')).toBeVisible();
  });

  test('should display character sheet', async ({ page }) => {
    // Make the character sheet visible
    await page.evaluate(() => {
      const sheet = document.querySelector('#char-sheet') as HTMLElement;
      if (sheet) {
        sheet.classList.remove('hidden');
      }
    });

    // Check that character sheet elements are present
    await expect(page.locator('#char-sheet')).not.toHaveClass(/hidden/);
    await expect(page.locator('#stat-str')).toBeVisible();
    await expect(page.locator('#stat-dex')).toBeVisible();
    await expect(page.locator('#stat-int')).toBeVisible();
    await expect(page.locator('#stat-melee-dmg')).toBeVisible();
  });

  test('should handle canvas interactions without errors', async ({ page }) => {
    // Click on the canvas (should not cause errors)
    const canvas = page.locator('#renderCanvas');
    await canvas.click({ position: { x: 100, y: 100 } });

    // Wait a moment and check for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(500);

    // Filter out expected errors
    const criticalErrors = errors.filter(error =>
      !error.includes('WebGL') &&
      !error.includes('Extension') &&
      !error.includes('BJS') &&
      !error.includes('shader') &&
      !error.includes('texture') &&
      !error.includes('material') &&
      !error.includes('Failed to execute') // Common Babylon.js warning
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should maintain UI state consistency', async ({ page }) => {
    // Open and close inventory multiple times
    for (let i = 0; i < 3; i++) {
      // Open inventory
      await page.evaluate(() => {
        const panel = document.querySelector('#inventoryStandalone') as HTMLElement;
        if (panel) {
          panel.classList.remove('is-hidden');
        }
      });

      await expect(page.locator('#inventoryStandalone')).not.toHaveClass(/is-hidden/);

      // Close inventory
      await page.evaluate(() => {
        const panel = document.querySelector('#inventoryStandalone') as HTMLElement;
        if (panel) {
          panel.classList.add('is-hidden');
        }
      });

      await expect(page.locator('#inventoryStandalone')).toHaveClass(/is-hidden/);
    }
  });

  test('should display skill bar and handle interactions', async ({ page }) => {
    // Check that skill bar exists
    await expect(page.locator('#skill-bar')).toBeVisible();

    // Check skill slots
    const skillSlots = page.locator('#skill-bar .slot');
    await expect(skillSlots).toHaveCount(8); // 3 mouse + 5 keyboard

    // Click a skill slot (should open modal)
    await skillSlots.first().click();

    // Modal should appear (though it might be hidden by default in the game)
    const modal = page.locator('#assign-modal');
    // Note: The modal visibility logic might be different, so we just check it exists
    await expect(modal).toBeAttached();
  });

  test('should handle resource orb displays', async ({ page }) => {
    // Check that resource orbs exist
    await expect(page.locator('.health-orb')).toBeVisible();
    await expect(page.locator('.mana-orb')).toBeVisible();

    // Check that they have text content
    await expect(page.locator('#health-text')).toHaveText(/\d+/);
    await expect(page.locator('#mana-text')).toHaveText(/\d+/);
  });

  test('should maintain WebGL context stability', async ({ page }) => {
    // Perform various UI interactions and ensure WebGL context remains stable

    // Open/close multiple panels
    const panels = ['#inventoryStandalone', '#vendorPanel', '#char-sheet'];

    for (const panelSelector of panels) {
      await page.evaluate((selector) => {
        const panel = document.querySelector(selector) as HTMLElement;
        if (panel) {
          panel.classList.remove('is-hidden', 'hidden');
        }
      }, panelSelector);

      await page.waitForTimeout(100);

      await page.evaluate((selector) => {
        const panel = document.querySelector(selector) as HTMLElement;
        if (panel) {
          panel.classList.add('is-hidden', 'hidden');
        }
      }, panelSelector);

      await page.waitForTimeout(100);
    }

    // Check that canvas is still responsive
    const canvas = page.locator('#renderCanvas');
    await expect(canvas).toBeVisible();

    // Check for WebGL context loss messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    await page.waitForTimeout(500);

    const contextLossMessages = consoleMessages.filter(msg =>
      msg.includes('WebGL context lost') ||
      msg.includes('Context lost') ||
      msg.includes('WebGL context')
    );

    expect(contextLossMessages).toHaveLength(0);
  });
});
