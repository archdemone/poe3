import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Babylon.js modules
vi.mock('@babylonjs/core/Particles/particleSystem', () => ({
  ParticleSystem: vi.fn().mockImplementation((name, capacity, scene) => ({
    name,
    capacity,
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    isStarted: vi.fn().mockReturnValue(false),
    particleTexture: null,
    emitter: null,
    minEmitBox: null,
    maxEmitBox: null,
    color1: null,
    color2: null,
    colorDead: null,
    minSize: 0,
    maxSize: 0,
    emitRate: 0,
    minLifeTime: 0,
    maxLifeTime: 0,
    direction1: null,
    direction2: null,
    minEmitPower: 0,
    maxEmitPower: 0,
    gravity: null,
    blendMode: 0,
    updateSpeed: 0
  }))
}));

const mockGPUParticleSystem = vi.fn().mockImplementation((name, options, scene) => ({
  name,
  capacity: options.capacity,
  start: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
  isStarted: vi.fn().mockReturnValue(false),
  particleTexture: null,
  emitter: null,
  minEmitBox: null,
  maxEmitBox: null,
  color1: null,
  color2: null,
  colorDead: null,
  minSize: 0,
  maxSize: 0,
  emitRate: 0,
  minLifeTime: 0,
  maxLifeTime: 0,
  direction1: null,
  direction2: null,
  minEmitPower: 0,
  maxEmitPower: 0,
  gravity: null,
  blendMode: 0,
  updateSpeed: 0
}));

vi.mock('@babylonjs/core/Particles/gpuParticleSystem', () => ({
  GPUParticleSystem: Object.assign(mockGPUParticleSystem, {
    IsSupported: vi.fn()
  })
}));

vi.mock('@babylonjs/core/Particles/webgl2ParticleSystem', () => ({
  // Side-effect import - just mock as empty
}));

vi.mock('@babylonjs/core/Materials/Textures/texture', () => ({
  Texture: vi.fn()
}));

// Mock the particle texture creators
vi.mock('../../../src/systems/particleTextures', () => ({
  createFlameParticleTexture: vi.fn().mockReturnValue({}),
  createMagicGlowTexture: vi.fn().mockReturnValue({}),
  createSoftParticleTexture: vi.fn().mockReturnValue({}),
  createDustTexture: vi.fn().mockReturnValue({})
}));

import {
  createFireParticles,
  createTorchFlicker,
  createMagicGlow,
  createDustParticles
} from '../../src/gfx/particles';
import { GPUParticleSystem } from '@babylonjs/core/Particles/gpuParticleSystem';

describe('Particle System', () => {
  let mockEngine: any;
  let mockScene: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockEngine = {
      webGLVersion: 2
    };
    mockScene = {};
    mockEmitter = { x: 0, y: 1, z: 0 };

    // Reset GPUParticleSystem.IsSupported mock
    (GPUParticleSystem.IsSupported as any).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature Detection', () => {
    it('should prefer GPU particles when supported', () => {
      (GPUParticleSystem.IsSupported as any).mockReturnValue(true);
      mockEngine.webGLVersion = 2;

      const particleSystem = createFireParticles(mockScene, mockEngine, mockEmitter);

      expect(particleSystem).toBeDefined();
      expect(typeof particleSystem.start).toBe('function');
      expect(typeof particleSystem.stop).toBe('function');
      expect(typeof particleSystem.dispose).toBe('function');
      expect(typeof particleSystem.isStarted).toBe('function');
    });

    it('should fallback to CPU particles when GPU not supported', () => {
      (GPUParticleSystem.IsSupported as any).mockReturnValue(false);
      mockEngine.webGLVersion = 2;

      const particleSystem = createFireParticles(mockScene, mockEngine, mockEmitter);

      expect(particleSystem).toBeDefined();
      expect(typeof particleSystem.start).toBe('function');
    });

    it('should use no-op system for WebGL1', () => {
      mockEngine.webGLVersion = 1;

      const particleSystem = createFireParticles(mockScene, mockEngine, mockEmitter);

      expect(particleSystem).toBeDefined();
      expect(particleSystem.start()).toBeUndefined(); // No-op
      expect(particleSystem.isStarted()).toBe(false);
    });
  });

  describe('Particle Creation Functions', () => {
    beforeEach(() => {
      (GPUParticleSystem.IsSupported as any).mockReturnValue(true);
      mockEngine.webGLVersion = 2;
    });

    it('should create fire particles with default options', () => {
      const particleSystem = createFireParticles(mockScene, mockEngine, mockEmitter);

      expect(particleSystem).toBeDefined();
      expect(typeof particleSystem.start).toBe('function');
    });

    it('should create torch flicker (smaller fire)', () => {
      const particleSystem = createTorchFlicker(mockScene, mockEngine, mockEmitter);

      expect(particleSystem).toBeDefined();
      expect(typeof particleSystem.start).toBe('function');
    });

    it('should create magic glow particles', () => {
      const particleSystem = createMagicGlow(mockScene, mockEngine, mockEmitter);

      expect(particleSystem).toBeDefined();
      expect(typeof particleSystem.start).toBe('function');
    });

    it('should create dust particles', () => {
      const particleSystem = createDustParticles(mockScene, mockEngine, mockEmitter);

      expect(particleSystem).toBeDefined();
      expect(typeof particleSystem.start).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should return no-op system when particle creation fails', () => {
      // Mock GPUParticleSystem constructor to throw
      mockGPUParticleSystem.mockImplementationOnce(() => {
        throw new Error('GPU particles not available');
      });

      const particleSystem = createFireParticles(mockScene, mockEngine, mockEmitter);

      expect(particleSystem).toBeDefined();
      expect(particleSystem.start()).toBeUndefined(); // No-op
      expect(particleSystem.isStarted()).toBe(false);
    });

    it('should handle missing engine gracefully', () => {
      const particleSystem = createFireParticles(mockScene, undefined as any, mockEmitter);

      expect(particleSystem).toBeDefined();
      expect(particleSystem.isStarted()).toBe(false);
    });
  });

  describe('System Interface', () => {
    it('should have consistent interface across all systems', () => {
      const systems = [
        createFireParticles(mockScene, mockEngine, mockEmitter),
        createTorchFlicker(mockScene, mockEngine, mockEmitter),
        createMagicGlow(mockScene, mockEngine, mockEmitter),
        createDustParticles(mockScene, mockEngine, mockEmitter)
      ];

      systems.forEach(system => {
        expect(typeof system.start).toBe('function');
        expect(typeof system.stop).toBe('function');
        expect(typeof system.dispose).toBe('function');
        expect(typeof system.isStarted).toBe('function');
      });
    });

    it('should allow idempotent dispose calls', () => {
      const particleSystem = createFireParticles(mockScene, mockEngine, mockEmitter);

      expect(() => {
        particleSystem.dispose();
        particleSystem.dispose(); // Should not throw
      }).not.toThrow();
    });
  });
});
