/**
 * Particle System Debugging Utilities
 * Helper functions for debugging and monitoring particle systems
 */

import { Scene } from 'babylonjs';

/**
 * Logs detailed information about all active particle systems
 */
export function debugParticleSystems(scene: Scene): void {
  console.log('='.repeat(60));
  console.log('[PARTICLE DEBUG] Scene Particle Systems');
  console.log('='.repeat(60));

  const particleSystems = scene.particleSystems;
  console.log(`Total particle systems: ${particleSystems.length}`);

  if (particleSystems.length === 0) {
    console.warn('[PARTICLE DEBUG] No particle systems found in scene!');
    return;
  }

  particleSystems.forEach((ps, index) => {
    console.log(`\n[${index + 1}/${particleSystems.length}] ${ps.name}`);
    console.log('  Type:', ps.constructor.name);
    console.log('  Started:', ps.isStarted());
    console.log('  Capacity:', (ps as any).getCapacity ? (ps as any).getCapacity() : 'N/A');
    console.log('  Active Count:', (ps as any).getActiveCount ? (ps as any).getActiveCount() : 'N/A');
    console.log('  Emit Rate:', ps.emitRate);
    console.log('  Emitter:', ps.emitter);
    console.log('  Texture:', ps.particleTexture ? ps.particleTexture.name : 'None');
    console.log('  Blend Mode:', ps.blendMode);
    console.log('  Min Life:', ps.minLifeTime);
    console.log('  Max Life:', ps.maxLifeTime);
    console.log('  Min Size:', ps.minSize);
    console.log('  Max Size:', ps.maxSize);
  });

  console.log('\n' + '='.repeat(60));
}

/**
 * Gets particle system statistics
 */
export function getParticleStats(scene: Scene): {
  totalSystems: number;
  activeSystems: number;
  totalCapacity: number;
  totalActive: number;
  systemDetails: Array<{
    name: string;
    type: string;
    started: boolean;
    capacity: number;
    active: number;
  }>;
} {
  const particleSystems = scene.particleSystems;

  const systemDetails = particleSystems.map(ps => ({
    name: ps.name,
    type: ps.constructor.name,
    started: ps.isStarted(),
    capacity: (ps as any).getCapacity ? (ps as any).getCapacity() : 0,
    active: (ps as any).getActiveCount ? (ps as any).getActiveCount() : 0,
  }));

  return {
    totalSystems: particleSystems.length,
    activeSystems: systemDetails.filter(s => s.started).length,
    totalCapacity: systemDetails.reduce((sum, s) => sum + s.capacity, 0),
    totalActive: systemDetails.reduce((sum, s) => sum + s.active, 0),
    systemDetails,
  };
}

/**
 * Starts all particle systems in the scene
 */
export function startAllParticles(scene: Scene): void {
  console.log('[PARTICLE DEBUG] Starting all particle systems...');
  let startedCount = 0;

  scene.particleSystems.forEach(ps => {
    if (!ps.isStarted()) {
      ps.start();
      startedCount++;
      console.log(`  Started: ${ps.name}`);
    }
  });

  console.log(`[PARTICLE DEBUG] Started ${startedCount} particle systems`);
}

/**
 * Stops all particle systems in the scene
 */
export function stopAllParticles(scene: Scene): void {
  console.log('[PARTICLE DEBUG] Stopping all particle systems...');
  let stoppedCount = 0;

  scene.particleSystems.forEach(ps => {
    if (ps.isStarted()) {
      ps.stop();
      stoppedCount++;
      console.log(`  Stopped: ${ps.name}`);
    }
  });

  console.log(`[PARTICLE DEBUG] Stopped ${stoppedCount} particle systems`);
}

/**
 * Tests GPU particle support
 */
export function testGPUSupport(): void {
  const GPUParticleSystem = (window as any).BABYLON?.GPUParticleSystem;
  
  if (!GPUParticleSystem) {
    console.error('[PARTICLE DEBUG] Babylon.js GPUParticleSystem not available!');
    return;
  }

  const isSupported = GPUParticleSystem.IsSupported;
  console.log('[PARTICLE DEBUG] GPU Particle Support:', isSupported ? '✓ YES' : '✗ NO');
  
  if (!isSupported) {
    console.warn('[PARTICLE DEBUG] GPU particles not supported - using CPU particles');
  }
}

/**
 * Exports particle system data for analysis
 */
export function exportParticleData(scene: Scene): string {
  const stats = getParticleStats(scene);
  return JSON.stringify(stats, null, 2);
}

/**
 * Install debugging commands to window for console access
 */
export function installParticleDebugCommands(scene: Scene): void {
  (window as any).particleDebug = {
    list: () => debugParticleSystems(scene),
    stats: () => getParticleStats(scene),
    start: () => startAllParticles(scene),
    stop: () => stopAllParticles(scene),
    gpu: () => testGPUSupport(),
    export: () => exportParticleData(scene),
    
    // Quick access
    count: () => {
      const stats = getParticleStats(scene);
      console.log(`Particle Systems: ${stats.activeSystems}/${stats.totalSystems} active`);
      console.log(`Particles: ${stats.totalActive}/${stats.totalCapacity} active`);
      return stats;
    },
    
    // Test single system
    test: (name: string) => {
      const ps = scene.particleSystems.find(p => p.name.includes(name));
      if (!ps) {
        console.error(`Particle system containing "${name}" not found`);
        return;
      }
      
      console.log(`Testing particle system: ${ps.name}`);
      if (ps.isStarted()) {
        ps.stop();
        console.log('  Stopped');
      } else {
        ps.start();
        console.log('  Started');
      }
    },
  };

  console.log('[PARTICLE DEBUG] Debugging commands installed!');
  console.log('Available commands in window.particleDebug:');
  console.log('  - particleDebug.list()   : List all particle systems');
  console.log('  - particleDebug.stats()  : Get statistics');
  console.log('  - particleDebug.count()  : Quick count');
  console.log('  - particleDebug.start()  : Start all particles');
  console.log('  - particleDebug.stop()   : Stop all particles');
  console.log('  - particleDebug.gpu()    : Test GPU support');
  console.log('  - particleDebug.test("name") : Toggle specific particle system');
  console.log('  - particleDebug.export() : Export data as JSON');
}

