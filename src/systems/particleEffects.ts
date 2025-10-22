/**
 * HIGH-QUALITY Particle Effects System
 * Creates and manages various particle effects using proper textures
 */

import {
  ParticleSystem,
  GPUParticleSystem,
  Vector3,
  Color4,
  Scene,
  AbstractMesh,
} from 'babylonjs';
import { createFlameParticleTexture, createMagicGlowTexture, createSoftParticleTexture, createDustTexture } from './particleTextures';

/**
 * Creates a HIGH-QUALITY torch flame particle effect
 * @param name Unique name for the particle system
 * @param position Position of the torch
 * @param scene Babylon.js scene
 * @returns ParticleSystem instance
 */
export function createTorchFlame(name: string, position: Vector3, scene: Scene): ParticleSystem {
  // Try to use GPU particles for better performance, fallback to CPU
  let particleSystem: ParticleSystem;
  
  if (GPUParticleSystem.IsSupported) {
    particleSystem = new GPUParticleSystem(name, { capacity: 150 }, scene);
    console.log(`[Particles] Using GPU particles for ${name}`);
  } else {
    particleSystem = new ParticleSystem(name, 150, scene);
    console.log(`[Particles] Using CPU particles for ${name}`);
  }

  // Use high-quality flame texture
  const flameTexture = createFlameParticleTexture(`${name}_texture`, scene, 128);
  particleSystem.particleTexture = flameTexture;

  // Emit from the torch position
  particleSystem.emitter = position.clone();
  particleSystem.minEmitBox = new Vector3(-0.08, 0, -0.08);
  particleSystem.maxEmitBox = new Vector3(0.08, 0, 0.08);

  // Vibrant flame colors
  particleSystem.color1 = new Color4(1.0, 0.8, 0.3, 1.0); // Bright yellow-orange
  particleSystem.color2 = new Color4(1.0, 0.4, 0.1, 0.9); // Orange
  particleSystem.colorDead = new Color4(0.5, 0.1, 0.0, 0.0); // Red fade

  // Optimized size for visibility
  particleSystem.minSize = 0.15;
  particleSystem.maxSize = 0.35;

  // Life time - shorter for performance
  particleSystem.minLifeTime = 0.4;
  particleSystem.maxLifeTime = 0.9;

  // Moderate emission rate
  particleSystem.emitRate = 80;

  // Additive blending for fire glow
  particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;

  // Emit power
  particleSystem.minEmitPower = 0.8;
  particleSystem.maxEmitPower = 1.8;
  particleSystem.updateSpeed = 0.015;

  // Direction - upward flame
  particleSystem.direction1 = new Vector3(-0.15, 1.2, -0.15);
  particleSystem.direction2 = new Vector3(0.15, 2.0, 0.15);

  // Slight downward gravity for realism
  particleSystem.gravity = new Vector3(0, -0.3, 0);

  return particleSystem;
}

/**
 * Creates a magical aura particle effect
 * @param name Unique name for the particle system
 * @param emitter Mesh or position to emit from
 * @param scene Babylon.js scene
 * @returns ParticleSystem instance
 */
export function createMagicalAura(
  name: string,
  emitter: AbstractMesh | Vector3,
  scene: Scene
): ParticleSystem {
  // Try GPU particles for better performance
  let particleSystem: ParticleSystem;
  
  if (GPUParticleSystem.IsSupported) {
    particleSystem = new GPUParticleSystem(name, { capacity: 200 }, scene);
  } else {
    particleSystem = new ParticleSystem(name, 200, scene);
  }

  // Use high-quality magic glow texture
  const magicTexture = createMagicGlowTexture(`${name}_texture`, scene, 128);
  particleSystem.particleTexture = magicTexture;
  particleSystem.emitter = emitter;

  if (emitter instanceof Vector3) {
    particleSystem.minEmitBox = new Vector3(-0.4, 0, -0.4);
    particleSystem.maxEmitBox = new Vector3(0.4, 1.5, 0.4);
  } else {
    // Emit from around the mesh
    particleSystem.minEmitBox = new Vector3(-0.4, 0, -0.4);
    particleSystem.maxEmitBox = new Vector3(0.4, 0.8, 0.4);
  }

  // Vibrant magical colors
  particleSystem.color1 = new Color4(0.3, 0.9, 1.0, 0.9); // Bright cyan
  particleSystem.color2 = new Color4(0.5, 0.7, 1.0, 0.7); // Light blue
  particleSystem.colorDead = new Color4(0.2, 0.4, 0.8, 0.0); // Blue fade

  // Visible size
  particleSystem.minSize = 0.08;
  particleSystem.maxSize = 0.2;

  // Life time
  particleSystem.minLifeTime = 1.2;
  particleSystem.maxLifeTime = 2.2;

  // Moderate emission rate
  particleSystem.emitRate = 50;

  // Additive blend for magical glow
  particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;

  // Emit power
  particleSystem.minEmitPower = 0.3;
  particleSystem.maxEmitPower = 0.7;
  particleSystem.updateSpeed = 0.015;

  // Swirling magical motion
  particleSystem.direction1 = new Vector3(-0.6, 0.8, -0.6);
  particleSystem.direction2 = new Vector3(0.6, 1.8, 0.6);

  // Gentle upward float
  particleSystem.gravity = new Vector3(0, 0.15, 0);

  return particleSystem;
}

/**
 * Creates a portal swirl particle effect
 * @param name Unique name for the particle system
 * @param emitter Portal mesh or position
 * @param scene Babylon.js scene
 * @returns ParticleSystem instance
 */
export function createPortalEffect(
  name: string,
  emitter: AbstractMesh | Vector3,
  scene: Scene
): ParticleSystem {
  // Use GPU particles for portal effect
  let particleSystem: ParticleSystem;
  
  if (GPUParticleSystem.IsSupported) {
    particleSystem = new GPUParticleSystem(name, { capacity: 250 }, scene);
  } else {
    particleSystem = new ParticleSystem(name, 250, scene);
  }

  // Use soft particle texture for portal
  const portalTexture = createSoftParticleTexture(`${name}_texture`, scene, 128);
  particleSystem.particleTexture = portalTexture;
  particleSystem.emitter = emitter;

  if (emitter instanceof Vector3) {
    particleSystem.minEmitBox = new Vector3(-0.6, 0, -0.6);
    particleSystem.maxEmitBox = new Vector3(0.6, 0.1, 0.6);
  } else {
    particleSystem.minEmitBox = new Vector3(-0.6, -0.05, -0.6);
    particleSystem.maxEmitBox = new Vector3(0.6, 0.05, 0.6);
  }

  // Mystical purple/blue portal colors
  particleSystem.color1 = new Color4(0.4, 0.6, 1.0, 0.9); // Bright blue
  particleSystem.color2 = new Color4(0.7, 0.3, 1.0, 0.8); // Purple
  particleSystem.colorDead = new Color4(0.3, 0.2, 0.6, 0.0); // Dark purple fade

  // Moderate size
  particleSystem.minSize = 0.1;
  particleSystem.maxSize = 0.25;

  // Life time
  particleSystem.minLifeTime = 1.0;
  particleSystem.maxLifeTime = 1.8;

  // Balanced emission rate
  particleSystem.emitRate = 100;

  // Additive blend for magical glow
  particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;

  // Emit power
  particleSystem.minEmitPower = 0.4;
  particleSystem.maxEmitPower = 1.0;
  particleSystem.updateSpeed = 0.015;

  // Swirling portal motion
  particleSystem.direction1 = new Vector3(-0.8, 0.3, -0.8);
  particleSystem.direction2 = new Vector3(0.8, 0.6, 0.8);

  // Upward magical pull
  particleSystem.gravity = new Vector3(0, 0.4, 0);

  return particleSystem;
}

/**
 * Creates ambient dust motes floating in the environment
 * @param name Unique name for the particle system
 * @param centerPosition Center of the dust area
 * @param radius Radius of the dust area
 * @param scene Babylon.js scene
 * @returns ParticleSystem instance
 */
export function createAmbientDust(
  name: string,
  centerPosition: Vector3,
  radius: number,
  scene: Scene
): ParticleSystem {
  // Use CPU particles for dust (low count, doesn't need GPU)
  const particleSystem = new ParticleSystem(name, 60, scene);

  // Use subtle dust texture
  const dustTexture = createDustTexture(`${name}_texture`, scene, 32);
  particleSystem.particleTexture = dustTexture;
  particleSystem.emitter = centerPosition.clone();
  particleSystem.minEmitBox = new Vector3(-radius, 0, -radius);
  particleSystem.maxEmitBox = new Vector3(radius, 3, radius);

  // Subtle dust colors
  particleSystem.color1 = new Color4(0.85, 0.85, 0.8, 0.4); // Light beige
  particleSystem.color2 = new Color4(0.7, 0.7, 0.65, 0.3); // Darker beige
  particleSystem.colorDead = new Color4(0.6, 0.6, 0.6, 0.0); // Fade out

  // Very small size
  particleSystem.minSize = 0.03;
  particleSystem.maxSize = 0.08;

  // Long floating life
  particleSystem.minLifeTime = 6.0;
  particleSystem.maxLifeTime = 12.0;

  // Very sparse emission
  particleSystem.emitRate = 8;

  // Standard alpha blend for subtle effect
  particleSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;

  // Very slow drift
  particleSystem.minEmitPower = 0.06;
  particleSystem.maxEmitPower = 0.18;
  particleSystem.updateSpeed = 0.008;

  // Gentle upward drift
  particleSystem.direction1 = new Vector3(-0.15, 0.4, -0.15);
  particleSystem.direction2 = new Vector3(0.15, 0.7, 0.15);

  // Minimal gravity
  particleSystem.gravity = new Vector3(0, -0.015, 0);

  return particleSystem;
}

