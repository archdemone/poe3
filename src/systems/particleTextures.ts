/**
 * Particle Texture Generation System
 * High-quality particle sprites for effects
 */

import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Scene } from '@babylonjs/core/scene';

/**
 * Creates a soft circular particle texture (good for flames, smoke, magic)
 */
export function createSoftParticleTexture(name: string, scene: Scene, size = 128): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, false);
  const ctx = texture.getContext();
  
  // Clear to transparent
  ctx.clearRect(0, 0, size, size);
  
  // Create radial gradient for soft edge
  const centerX = size / 2;
  const centerY = size / 2;
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size / 2);
  
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');      // Bright center
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');  // Mid bright
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)');  // Fade
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');      // Transparent edge
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  texture.update();
  return texture;
}

/**
 * Creates a flame-shaped particle texture
 */
export function createFlameParticleTexture(name: string, scene: Scene, size = 128): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, false);
  const ctx = texture.getContext();
  
  // Clear to transparent
  ctx.clearRect(0, 0, size, size);
  
  const centerX = size / 2;
  const centerY = size / 2;
  const baseY = size * 0.8;
  const tipY = size * 0.2;
  
  // Create flame shape with gradient
  const gradient = ctx.createLinearGradient(centerX, baseY, centerX, tipY);
  gradient.addColorStop(0, 'rgba(255, 200, 100, 1)');    // Yellow base
  gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.9)');  // Orange
  gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.6)');   // Red
  gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');        // Transparent tip
  
  // Draw flame shape (teardrop)
  ctx.beginPath();
  ctx.moveTo(centerX, baseY);
  
  // Left curve
  ctx.bezierCurveTo(
    centerX - size * 0.3, baseY - size * 0.2,
    centerX - size * 0.2, baseY - size * 0.5,
    centerX, tipY
  );
  
  // Right curve
  ctx.bezierCurveTo(
    centerX + size * 0.2, baseY - size * 0.5,
    centerX + size * 0.3, baseY - size * 0.2,
    centerX, baseY
  );
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Add outer glow
  ctx.globalCompositeOperation = 'destination-over';
  const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size / 2);
  glowGradient.addColorStop(0, 'rgba(255, 150, 0, 0.3)');
  glowGradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, size, size);
  
  texture.update();
  return texture;
}

/**
 * Creates a sparkle/star particle texture
 */
export function createSparkleTexture(name: string, scene: Scene, size = 64): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, false);
  const ctx = texture.getContext();
  
  // Clear to transparent
  ctx.clearRect(0, 0, size, size);
  
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Draw bright center
  const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 0.15);
  centerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
  ctx.fillStyle = centerGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw star rays
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineCap = 'round';
  
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const length = (i % 2 === 0) ? size * 0.45 : size * 0.35;
    
    ctx.lineWidth = (i % 2 === 0) ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(angle) * length,
      centerY + Math.sin(angle) * length
    );
    ctx.stroke();
  }
  
  // Add outer glow
  const outerGlow = ctx.createRadialGradient(centerX, centerY, size * 0.15, centerX, centerY, size / 2);
  outerGlow.addColorStop(0, 'rgba(200, 220, 255, 0.4)');
  outerGlow.addColorStop(1, 'rgba(200, 220, 255, 0)');
  ctx.fillStyle = outerGlow;
  ctx.fillRect(0, 0, size, size);
  
  texture.update();
  return texture;
}

/**
 * Creates a smoke/cloud particle texture
 */
export function createSmokeTexture(name: string, scene: Scene, size = 128): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, false);
  const ctx = texture.getContext();
  
  // Clear to transparent
  ctx.clearRect(0, 0, size, size);
  
  // Create wispy smoke with multiple overlapping circles
  const numPuffs = 5;
  for (let i = 0; i < numPuffs; i++) {
    const x = size * 0.3 + Math.random() * size * 0.4;
    const y = size * 0.3 + Math.random() * size * 0.4;
    const radius = size * 0.2 + Math.random() * size * 0.2;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(200, 200, 200, ${0.3 + Math.random() * 0.3})`);
    gradient.addColorStop(0.5, `rgba(180, 180, 180, ${0.15 + Math.random() * 0.15})`);
    gradient.addColorStop(1, 'rgba(160, 160, 160, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  texture.update();
  return texture;
}

/**
 * Creates a magical glow particle texture (for portals, crystals)
 */
export function createMagicGlowTexture(name: string, scene: Scene, size = 128): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, false);
  const ctx = texture.getContext();
  
  // Clear to transparent
  ctx.clearRect(0, 0, size, size);
  
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Outer magical aura
  const outerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size / 2);
  outerGradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');   // Bright cyan center
  outerGradient.addColorStop(0.4, 'rgba(150, 180, 255, 0.5)'); // Blue-white
  outerGradient.addColorStop(0.7, 'rgba(100, 150, 255, 0.2)'); // Fade to blue
  outerGradient.addColorStop(1, 'rgba(80, 120, 200, 0)');      // Transparent edge
  
  ctx.fillStyle = outerGradient;
  ctx.fillRect(0, 0, size, size);
  
  // Inner bright core
  const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 0.2);
  innerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  innerGradient.addColorStop(1, 'rgba(200, 230, 255, 0)');
  
  ctx.fillStyle = innerGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  texture.update();
  return texture;
}

/**
 * Creates a dust mote texture (small, subtle)
 */
export function createDustTexture(name: string, scene: Scene, size = 32): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, false);
  const ctx = texture.getContext();
  
  // Clear to transparent
  ctx.clearRect(0, 0, size, size);
  
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Very subtle gradient
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size / 2);
  gradient.addColorStop(0, 'rgba(200, 200, 180, 0.4)');
  gradient.addColorStop(0.5, 'rgba(180, 180, 170, 0.2)');
  gradient.addColorStop(1, 'rgba(160, 160, 150, 0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  texture.update();
  return texture;
}

