// Particle Effects System with Robust Runtime Fallbacks
// Uses tree-shakable @babylonjs/core imports and feature detection

import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
// Side-effect import to enable WebGL2 particle system
import '@babylonjs/core/Particles/webgl2ParticleSystem';
import { GPUParticleSystem } from '@babylonjs/core/Particles/gpuParticleSystem';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color4, Vector3 } from '@babylonjs/core/Maths/math';
import { Scene } from '@babylonjs/core/scene';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';

import { createFlameParticleTexture, createMagicGlowTexture, createSoftParticleTexture, createDustTexture } from '../systems/particleTextures';

// Unified particle system interface that works with both CPU and GPU systems
export interface IParticleSystem {
  start(): void;
  stop(): void;
  dispose(): void;
  readonly isStarted: () => boolean;
}

// No-op particle system stub for when particles are unavailable
class NoOpParticleSystem implements IParticleSystem {
  start(): void {
    // No-op
  }

  stop(): void {
    // No-op
  }

  dispose(): void {
    // No-op
  }

  isStarted(): boolean {
    return false;
  }
}

// Feature detection and system creation
function detectParticleCapabilities(engine: any): {
  supportsGPU: boolean;
  supportsWebGL2: boolean;
  preferredSystem: 'gpu' | 'cpu' | 'none';
} {
  const supportsWebGL2 = engine?.webGLVersion >= 2;
  const supportsGPU = supportsWebGL2 && GPUParticleSystem?.IsSupported;

  let preferredSystem: 'gpu' | 'cpu' | 'none' = 'cpu';

  if (supportsGPU) {
    preferredSystem = 'gpu';
  } else if (supportsWebGL2) {
    preferredSystem = 'cpu'; // WebGL2 CPU particles still work
  } else {
    preferredSystem = 'none'; // WebGL1 or headless, disable particles
  }

  return {
    supportsGPU,
    supportsWebGL2,
    preferredSystem
  };
}

// Safe particle system creation with fallback
function createSafeParticleSystem(
  name: string,
  capacity: number,
  scene: Scene,
  engine: any,
  preferred: 'gpu' | 'cpu' | 'none'
): IParticleSystem {
  try {
    switch (preferred) {
      case 'gpu':
        if (GPUParticleSystem?.IsSupported) {
          const gpuSystem = new GPUParticleSystem(name, { capacity }, scene);
          console.log(`[Particles] Created GPU particle system: ${name}`);
          return gpuSystem;
        }
        // Fall through to CPU if GPU not available

      case 'cpu':
        const cpuSystem = new ParticleSystem(name, capacity, scene);
        console.log(`[Particles] Created CPU particle system: ${name}`);
        return cpuSystem;

      case 'none':
      default:
        console.log(`[Particles] Particles disabled for ${name} (WebGL1/headless)`);
        return new NoOpParticleSystem();
    }
  } catch (error) {
    console.warn(`[Particles] Failed to create particle system ${name}:`, error);
    return new NoOpParticleSystem();
  }
}

// Public API - Fire particles
export function createFireParticles(
  scene: Scene,
  engine: any,
  emitter: Vector3 | AbstractMesh,
  options?: {
    capacity?: number;
    name?: string;
    color1?: Color4;
    color2?: Color4;
    minSize?: number;
    maxSize?: number;
  }
): IParticleSystem {
  const opts = {
    capacity: 150,
    name: 'fire_particles',
    color1: new Color4(1.0, 0.8, 0.3, 1.0),
    color2: new Color4(1.0, 0.4, 0.1, 0.9),
    minSize: 0.15,
    maxSize: 0.35,
    ...options
  };

  const capabilities = detectParticleCapabilities(engine);
  const particleSystem = createSafeParticleSystem(opts.name, opts.capacity, scene, engine, capabilities.preferredSystem);

  // Skip configuration for no-op systems
  if (particleSystem instanceof NoOpParticleSystem) {
    return particleSystem;
  }

  // Type assertion needed because we know it's a real particle system at this point
  const system = particleSystem as ParticleSystem;

  try {
    // Use high-quality flame texture
    const flameTexture = createFlameParticleTexture(`${opts.name}_texture`, scene, 128);
    system.particleTexture = flameTexture;

    // Emit from the specified position/mesh
    system.emitter = emitter;
    if (emitter instanceof Vector3) {
      system.minEmitBox = new Vector3(-0.08, 0, -0.08);
      system.maxEmitBox = new Vector3(0.08, 0, 0.08);
    }

    // Flame colors
    system.color1 = opts.color1;
    system.color2 = opts.color2;
    system.colorDead = new Color4(0.5, 0.1, 0.0, 0.0);

    // Size
    system.minSize = opts.minSize;
    system.maxSize = opts.maxSize;

    // Emission rate and lifetime
    system.emitRate = 25;
    system.minLifeTime = 0.8;
    system.maxLifeTime = 1.5;

    // Movement
    system.direction1 = new Vector3(0, 1, 0);
    system.direction2 = new Vector3(0.2, 1, 0.2);
    system.minEmitPower = 0.5;
    system.maxEmitPower = 1.2;

    // Gravity
    system.gravity = new Vector3(0, -1, 0);

    // Blend mode for fire effect
    system.blendMode = ParticleSystem.BLENDMODE_ONEONE;

    return system;
  } catch (error) {
    console.warn(`[Particles] Failed to configure fire particles ${opts.name}:`, error);
    return new NoOpParticleSystem();
  }
}

// Torch flicker effect (smaller, more contained fire)
export function createTorchFlicker(
  scene: Scene,
  engine: any,
  position: Vector3
): IParticleSystem {
  return createFireParticles(scene, engine, position, {
    name: 'torch_flicker',
    capacity: 80,
    minSize: 0.08,
    maxSize: 0.2
  });
}

// Magic glow particles
export function createMagicGlow(
  scene: Scene,
  engine: any,
  emitter: Vector3 | AbstractMesh,
  color: Color4 = new Color4(0.4, 0.8, 1.0, 0.8)
): IParticleSystem {
  const capabilities = detectParticleCapabilities(engine);
  const particleSystem = createSafeParticleSystem('magic_glow', 100, scene, engine, capabilities.preferredSystem);

  if (particleSystem instanceof NoOpParticleSystem) {
    return particleSystem;
  }

  const system = particleSystem as ParticleSystem;

  try {
    const glowTexture = createMagicGlowTexture('magic_glow_texture', scene, 64);
    system.particleTexture = glowTexture;

    system.emitter = emitter;
    if (emitter instanceof Vector3) {
      system.minEmitBox = new Vector3(-0.05, -0.05, -0.05);
      system.maxEmitBox = new Vector3(0.05, 0.05, 0.05);
    }

    system.color1 = color;
    system.color2 = new Color4(color.r * 0.7, color.g * 0.7, color.b * 0.7, color.a * 0.5);
    system.colorDead = new Color4(0, 0, 0, 0);

    system.minSize = 0.1;
    system.maxSize = 0.3;

    system.emitRate = 15;
    system.minLifeTime = 1.5;
    system.maxLifeTime = 3.0;

    system.direction1 = new Vector3(-0.1, 0.1, -0.1);
    system.direction2 = new Vector3(0.1, 0.3, 0.1);
    system.minEmitPower = 0.2;
    system.maxEmitPower = 0.5;

    system.blendMode = ParticleSystem.BLENDMODE_ADD;

    return system;
  } catch (error) {
    console.warn('[Particles] Failed to create magic glow:', error);
    return new NoOpParticleSystem();
  }
}

// Backward compatibility wrappers for old API
export function createTorchFlame(name: string, position: Vector3, scene: Scene): IParticleSystem {
  return createFireParticles(scene, scene.getEngine(), position, {
    name,
    capacity: 150,
    minSize: 0.15,
    maxSize: 0.35
  });
}

export function createAmbientDust(name: string, position: Vector3, capacity: number, scene: Scene): IParticleSystem {
  return createDustParticles(scene, scene.getEngine(), position, {
    name,
    capacity,
    minSize: 0.05,
    maxSize: 0.15
  });
}

export function createPortalEffect(name: string, mesh: AbstractMesh, scene: Scene): IParticleSystem {
  return createMagicGlow(scene, scene.getEngine(), mesh, {
    name,
    capacity: 100,
    minSize: 0.1,
    maxSize: 0.3
  });
}

export function createMagicalAura(name: string, mesh: AbstractMesh, scene: Scene): IParticleSystem {
  return createMagicGlow(scene, scene.getEngine(), mesh, {
    name,
    capacity: 200,
    minSize: 0.2,
    maxSize: 0.5
  });
}

// Dust particles for environmental effect
export function createDustParticles(
  scene: Scene,
  engine: any,
  emitter: Vector3 | AbstractMesh
): IParticleSystem {
  const capabilities = detectParticleCapabilities(engine);
  const particleSystem = createSafeParticleSystem('dust', 50, scene, engine, capabilities.preferredSystem);

  if (particleSystem instanceof NoOpParticleSystem) {
    return particleSystem;
  }

  const system = particleSystem as ParticleSystem;

  try {
    const dustTexture = createDustTexture('dust_texture', scene, 32);
    system.particleTexture = dustTexture;

    system.emitter = emitter;
    system.minEmitBox = new Vector3(-2, -1, -2);
    system.maxEmitBox = new Vector3(2, 1, 2);

    system.color1 = new Color4(0.8, 0.8, 0.8, 0.1);
    system.color2 = new Color4(0.9, 0.9, 0.9, 0.05);
    system.colorDead = new Color4(1, 1, 1, 0);

    system.minSize = 0.05;
    system.maxSize = 0.15;

    system.emitRate = 5;
    system.minLifeTime = 5;
    system.maxLifeTime = 10;

    system.direction1 = new Vector3(-0.01, 0.005, -0.01);
    system.direction2 = new Vector3(0.01, 0.02, 0.01);
    system.minEmitPower = 0.01;
    system.maxEmitPower = 0.05;

    system.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    return system;
  } catch (error) {
    console.warn('[Particles] Failed to create dust particles:', error);
    return new NoOpParticleSystem();
  }
}
