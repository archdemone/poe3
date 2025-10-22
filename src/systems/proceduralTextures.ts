/**
 * Procedural Texture Generation System
 * High-quality textures created using Babylon.js DynamicTexture
 */

import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';


/**
 * Creates a high-quality stone texture with realistic details
 */
export function createStoneTexture(name: string, scene: Scene, size = 512): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, true);
  const ctx = texture.getContext();
  
  // Base stone color (dark gray with slight blue tint)
  const baseColor = '#3a3d42';
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  
  // Add noise for stone grain
  for (let i = 0; i < size * size * 0.3; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = 30 + Math.random() * 40;
    const alpha = 0.1 + Math.random() * 0.3;
    ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness + 10}, ${alpha})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  
  // Add cracks and weathering
  ctx.strokeStyle = 'rgba(20, 20, 20, 0.4)';
  ctx.lineWidth = 1 + Math.random();
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    const startX = Math.random() * size;
    const startY = Math.random() * size;
    ctx.moveTo(startX, startY);
    
    let x = startX;
    let y = startY;
    for (let j = 0; j < 5 + Math.random() * 10; j++) {
      x += (Math.random() - 0.5) * 40;
      y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  
  // Add stone blocks/mortar lines
  ctx.strokeStyle = 'rgba(25, 25, 30, 0.6)';
  ctx.lineWidth = 2;
  
  // Horizontal lines
  for (let y = 0; y < size; y += size / 4) {
    const offset = (Math.floor(y / (size / 4)) % 2) * (size / 8);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  
  // Vertical lines
  for (let y = 0; y < size; y += size / 4) {
    const offset = (Math.floor(y / (size / 4)) % 2) * (size / 8);
    for (let x = offset; x < size; x += size / 4) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + size / 4);
      ctx.stroke();
    }
  }
  
  texture.update();
  return texture;
}

/**
 * Creates a wood texture for chests and objects
 */
export function createWoodTexture(name: string, scene: Scene, size = 512): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, true);
  const ctx = texture.getContext();
  
  // Base wood color (dark brown)
  const gradient = ctx.createLinearGradient(0, 0, size, 0);
  gradient.addColorStop(0, '#3d2817');
  gradient.addColorStop(0.5, '#4a3420');
  gradient.addColorStop(1, '#3d2817');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Add wood grain (horizontal lines with variation)
  for (let y = 0; y < size; y++) {
    const lineVariation = Math.sin(y * 0.1) * 3;
    const alpha = 0.1 + Math.random() * 0.15;
    const brightness = 20 + Math.random() * 30;
    
    ctx.strokeStyle = `rgba(${brightness}, ${brightness - 10}, ${brightness - 15}, ${alpha})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y + lineVariation);
    
    // Add curves for natural wood grain
    for (let x = 0; x < size; x += 20) {
      const curve = Math.sin(x * 0.05 + y * 0.02) * 5;
      ctx.lineTo(x, y + lineVariation + curve);
    }
    ctx.lineTo(size, y + lineVariation);
    ctx.stroke();
  }
  
  // Add knots
  for (let i = 0; i < 3 + Math.random() * 3; i++) {
    const knotX = Math.random() * size;
    const knotY = Math.random() * size;
    const knotSize = 10 + Math.random() * 20;
    
    const knotGradient = ctx.createRadialGradient(knotX, knotY, 0, knotX, knotY, knotSize);
    knotGradient.addColorStop(0, 'rgba(25, 15, 10, 0.6)');
    knotGradient.addColorStop(1, 'rgba(45, 30, 20, 0)');
    ctx.fillStyle = knotGradient;
    ctx.beginPath();
    ctx.arc(knotX, knotY, knotSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  texture.update();
  return texture;
}

/**
 * Creates a metal texture for chest decorations
 */
export function createMetalTexture(name: string, scene: Scene, size = 256): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, true);
  const ctx = texture.getContext();
  
  // Base metallic gray
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#4a4a4a');
  gradient.addColorStop(0.5, '#606060');
  gradient.addColorStop(1, '#4a4a4a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Add scratches and wear
  ctx.strokeStyle = 'rgba(30, 30, 30, 0.3)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 50; i++) {
    ctx.beginPath();
    const x = Math.random() * size;
    const y = Math.random() * size;
    const angle = Math.random() * Math.PI * 2;
    const length = 5 + Math.random() * 20;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
  
  // Add highlights for metallic sheen
  ctx.fillStyle = 'rgba(200, 200, 200, 0.1)';
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  texture.update();
  return texture;
}

/**
 * Creates a magical crystal texture for the map device
 */
export function createCrystalTexture(name: string, scene: Scene, size = 512): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, true);
  const ctx = texture.getContext();
  
  // Base crystal color (cyan/blue gradient)
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#80e5ff');
  gradient.addColorStop(0.5, '#40a0d0');
  gradient.addColorStop(1, '#206090');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Add facets (angular patterns)
  ctx.strokeStyle = 'rgba(200, 240, 255, 0.3)';
  ctx.lineWidth = 2;
  const centerX = size / 2;
  const centerY = size / 2;
  
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x1 = centerX + Math.cos(angle) * (size * 0.4);
    const y1 = centerY + Math.sin(angle) * (size * 0.4);
    const x2 = centerX + Math.cos(angle + Math.PI / 12) * (size * 0.3);
    const y2 = centerY + Math.sin(angle + Math.PI / 12) * (size * 0.3);
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.stroke();
  }
  
  // Add bright highlights for magical glow
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * (size * 0.3);
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    const glowSize = 2 + Math.random() * 8;
    
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  texture.update();
  return texture;
}

/**
 * Creates a ground tile texture with stone pattern
 */
export function createGroundTileTexture(name: string, scene: Scene, size = 1024): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, true);
  const ctx = texture.getContext();
  
  // Base ground color (dark greenish-gray)
  ctx.fillStyle = '#2a2f2e';
  ctx.fillRect(0, 0, size, size);
  
  // Create individual tiles
  const tileSize = size / 8;
  const colors = ['#323832', '#2e342e', '#2a302a', '#363c36'];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * tileSize;
      const y = row * tileSize;
      
      // Random tile color variation
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      
      // Tile border (mortar)
      ctx.strokeStyle = '#1a1e1a';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, tileSize, tileSize);
      
      // Add tile weathering
      for (let i = 0; i < 5; i++) {
        const wx = x + Math.random() * tileSize;
        const wy = y + Math.random() * tileSize;
        const wSize = 2 + Math.random() * 8;
        ctx.fillStyle = `rgba(${20 + Math.random() * 20}, ${20 + Math.random() * 20}, ${15 + Math.random() * 15}, ${0.2 + Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(wx, wy, wSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Add overall dirt/moss overlay
  for (let i = 0; i < size * size * 0.05; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const mossColor = Math.random() > 0.5;
    if (mossColor) {
      // Moss (greenish)
      ctx.fillStyle = `rgba(${20 + Math.random() * 30}, ${40 + Math.random() * 30}, ${20 + Math.random() * 20}, ${0.1 + Math.random() * 0.2})`;
    } else {
      // Dirt
      ctx.fillStyle = `rgba(${30 + Math.random() * 20}, ${25 + Math.random() * 15}, ${15 + Math.random() * 10}, ${0.1 + Math.random() * 0.2})`;
    }
    const spotSize = 1 + Math.random() * 4;
    ctx.fillRect(x, y, spotSize, spotSize);
  }
  
  texture.update();
  return texture;
}

/**
 * Creates a dirt/grass texture for outdoor areas
 */
export function createDirtTexture(name: string, scene: Scene, size = 512): DynamicTexture {
  const texture = new DynamicTexture(name, size, scene, true);
  const ctx = texture.getContext();
  
  // Base dirt color
  ctx.fillStyle = '#3d2f1f';
  ctx.fillRect(0, 0, size, size);
  
  // Add color variation
  for (let i = 0; i < size * size * 0.5; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 50 + Math.random() * 30;
    const g = 35 + Math.random() * 25;
    const b = 20 + Math.random() * 15;
    const alpha = 0.2 + Math.random() * 0.4;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  
  // Add small rocks
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rockSize = 3 + Math.random() * 8;
    ctx.fillStyle = `rgba(${80 + Math.random() * 40}, ${80 + Math.random() * 40}, ${75 + Math.random() * 35}, ${0.6 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, rockSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  texture.update();
  return texture;
}

