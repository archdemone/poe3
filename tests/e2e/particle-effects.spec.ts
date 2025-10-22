/**
 * E2E Tests for Particle Effects System
 * Tests particle visibility, performance, and proper initialization
 */

import { test, expect } from '@playwright/test';

test.describe('Particle Effects System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the game
    await page.goto('http://localhost:5173');
    
    // Wait for game to load
    await page.waitForTimeout(2000);
  });

  test('should log GPU particle system support', async ({ page }) => {
    // Check console logs for particle system initialization
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[Particles]')) {
        logs.push(msg.text());
      }
    });

    // Reload to capture logs
    await page.reload();
    await page.waitForTimeout(3000);

    // Should have logs about GPU/CPU particle support
    const hasParticleLogs = logs.some(log => 
      log.includes('GPU particles') || log.includes('CPU particles')
    );
    expect(hasParticleLogs).toBeTruthy();
    
    console.log('Particle logs:', logs);
  });

  test('should initialize hideout particles', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[Particles]')) {
        logs.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(3000);

    // Check for hideout particle initialization
    expect(logs.some(log => log.includes('torch flames'))).toBeTruthy();
    expect(logs.some(log => log.includes('ambient dust'))).toBeTruthy();
    expect(logs.some(log => log.includes('magical aura'))).toBeTruthy();
    
    console.log('Hideout particle logs:', logs);
  });

  test('should have acceptable FPS with particles enabled', async ({ page }) => {
    // Start measuring FPS
    const fps = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        
        function measureFrame() {
          frameCount++;
          const elapsed = performance.now() - startTime;
          
          if (elapsed >= 1000) {
            // 1 second has passed
            resolve(frameCount);
          } else {
            requestAnimationFrame(measureFrame);
          }
        }
        
        requestAnimationFrame(measureFrame);
      });
    });

    console.log(`FPS with particles: ${fps}`);
    
    // Should maintain at least 30 FPS
    expect(fps).toBeGreaterThanOrEqual(30);
    
    // Warn if FPS is low
    if (fps < 45) {
      console.warn(`Warning: FPS is ${fps}, which may indicate performance issues`);
    }
  });

  test('should initialize portal particles when maps are inserted', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[Particles]') || msg.text().includes('portal')) {
        logs.push(msg.text());
      }
    });

    // Click on dev chest to get maps
    await page.evaluate(() => {
      // Simulate clicking the dev chest
      const devChest = (window as any).devChest;
      if (devChest) {
        const pickInfo = (window as any).scene.pick(
          (window as any).scene.pointerX,
          (window as any).scene.pointerY
        );
        
        // Trigger click on chest
        const event = new PointerEvent('pointerdown', {
          button: 0,
          clientX: 400,
          clientY: 300
        });
        (window as any).canvas.dispatchEvent(event);
      }
    });

    await page.waitForTimeout(1000);

    // Open map device and insert a map
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Try to find and click map device
    // This is a simplified test - in practice you'd need to interact with the actual device
    
    console.log('Logs after map device interaction:', logs);
  });

  test('should not have console errors related to particles', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          (msg.text().includes('particle') || 
           msg.text().includes('Particle') ||
           msg.text().includes('texture'))) {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(3000);

    // Should have no particle-related errors
    expect(errors).toHaveLength(0);
    
    if (errors.length > 0) {
      console.error('Particle errors:', errors);
    }
  });

  test('should create particle textures successfully', async ({ page }) => {
    const textureCreation = await page.evaluate(() => {
      return new Promise<{success: boolean, details: string[]}>((resolve) => {
        const details: string[] = [];
        
        // Check if particle texture functions are available
        const scene = (window as any).scene;
        if (!scene) {
          resolve({ success: false, details: ['Scene not found'] });
          return;
        }

        // Check textures in the scene
        const textures = scene.textures;
        const particleTextures = textures.filter((t: any) => 
          t.name && (
            t.name.includes('flame') ||
            t.name.includes('magic') ||
            t.name.includes('portal') ||
            t.name.includes('dust')
          )
        );

        details.push(`Found ${particleTextures.length} particle textures`);
        particleTextures.forEach((t: any) => {
          details.push(`Texture: ${t.name}, Ready: ${t.isReady()}`);
        });

        resolve({
          success: particleTextures.length > 0,
          details
        });
      });
    });

    console.log('Texture creation details:', textureCreation.details);
    expect(textureCreation.success).toBeTruthy();
  });

  test('should have visible particles in the scene', async ({ page }) => {
    const particleInfo = await page.evaluate(() => {
      return new Promise<{count: number, systems: string[]}>((resolve) => {
        const scene = (window as any).scene;
        if (!scene) {
          resolve({ count: 0, systems: [] });
          return;
        }

        // Wait a bit for particles to initialize
        setTimeout(() => {
          const particleSystems = scene.particleSystems || [];
          const systems = particleSystems.map((ps: any) => ({
            name: ps.name,
            isStarted: ps.isStarted(),
            emitRate: ps.emitRate,
            activeCount: ps.getActiveCount ? ps.getActiveCount() : 'N/A'
          }));

          resolve({
            count: particleSystems.length,
            systems: systems.map((s: any) => 
              `${s.name}: started=${s.isStarted}, rate=${s.emitRate}, active=${s.activeCount}`
            )
          });
        }, 2000);
      });
    });

    console.log(`Particle systems found: ${particleInfo.count}`);
    console.log('Systems:', particleInfo.systems);

    // Should have multiple particle systems running
    expect(particleInfo.count).toBeGreaterThan(0);
    
    // Should have at least hideout particles (torches, dust, aura)
    expect(particleInfo.count).toBeGreaterThanOrEqual(3);
  });

  test('should maintain particle performance over time', async ({ page }) => {
    // Measure FPS over multiple samples
    const fpsReadings: number[] = [];
    
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(1000);
      
      const fps = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let frameCount = 0;
          const startTime = performance.now();
          
          function measureFrame() {
            frameCount++;
            const elapsed = performance.now() - startTime;
            
            if (elapsed >= 1000) {
              resolve(frameCount);
            } else {
              requestAnimationFrame(measureFrame);
            }
          }
          
          requestAnimationFrame(measureFrame);
        });
      });
      
      fpsReadings.push(fps);
      console.log(`FPS reading ${i + 1}: ${fps}`);
    }

    // Calculate average FPS
    const avgFPS = fpsReadings.reduce((a, b) => a + b, 0) / fpsReadings.length;
    console.log(`Average FPS: ${avgFPS.toFixed(2)}`);

    // Average FPS should be acceptable
    expect(avgFPS).toBeGreaterThanOrEqual(30);

    // FPS shouldn't vary wildly (check standard deviation)
    const variance = fpsReadings.reduce((sum, fps) => 
      sum + Math.pow(fps - avgFPS, 2), 0) / fpsReadings.length;
    const stdDev = Math.sqrt(variance);
    console.log(`FPS standard deviation: ${stdDev.toFixed(2)}`);

    // Standard deviation should be reasonable (less than 20% of average)
    expect(stdDev).toBeLessThan(avgFPS * 0.2);
  });
});

