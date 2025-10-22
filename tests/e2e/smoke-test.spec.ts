/**
 * SMOKE TEST - Catches Critical Bugs Before User Sees Them
 * This test actually loads the game and navigates to hideout to catch real issues
 */

import { test, expect } from '@playwright/test';

test.describe('Critical Smoke Tests', () => {
  test('game loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);

    // Should have NO console errors
    if (errors.length > 0) {
      console.error('Console errors detected:', errors);
    }
    expect(errors).toHaveLength(0);
  });

  test('hideout actually loads and renders meshes', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    // Click "New Game"
    await page.click('text=New Game');
    await page.waitForTimeout(1000);

    // Select Warrior class
    await page.click('text=Warrior');
    await page.waitForTimeout(500);

    // Enter character name
    await page.fill('input[type="text"]', 'TestCharacter');
    
    // Click Create
    await page.click('text=Create');
    await page.waitForTimeout(5000); // Wait for hideout to load

    // Check for errors during hideout load
    expect(errors.length).toBe(0);

    // Verify hideout loaded
    const hideoutMeshCount = await page.evaluate(() => {
      const hideoutMeshes = (window as any).hideoutMeshes;
      return hideoutMeshes ? hideoutMeshes.length : 0;
    });

    console.log(`Hideout mesh count: ${hideoutMeshCount}`);
    expect(hideoutMeshCount).toBeGreaterThan(0);

    // Verify meshes are visible
    const visibleCount = await page.evaluate(() => {
      const hideoutMeshes = (window as any).hideoutMeshes;
      if (!hideoutMeshes) return 0;
      return hideoutMeshes.filter((m: any) => m.isVisible).length;
    });

    console.log(`Visible meshes: ${visibleCount}`);
    expect(visibleCount).toBeGreaterThan(0);
  });

  test('particle systems initialize without errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    // Navigate to hideout (same as above)
    await page.click('text=New Game');
    await page.waitForTimeout(1000);
    await page.click('text=Warrior');
    await page.waitForTimeout(500);
    await page.fill('input[type="text"]', 'TestChar');
    await page.click('text=Create');
    await page.waitForTimeout(5000);

    // Check for particle-related errors
    const particleErrors = errors.filter(e => 
      e.toLowerCase().includes('particle') ||
      e.toLowerCase().includes('texture') ||
      e.toLowerCase().includes('centerY') ||
      e.toLowerCase().includes('undefined')
    );

    if (particleErrors.length > 0) {
      console.error('Particle errors:', particleErrors);
    }
    expect(particleErrors).toHaveLength(0);

    // Verify particles exist
    const particleCount = await page.evaluate(() => {
      const scene = (window as any).scene;
      return scene ? scene.particleSystems.length : 0;
    });

    console.log(`Particle systems: ${particleCount}`);
    expect(particleCount).toBeGreaterThan(0);
  });
});

