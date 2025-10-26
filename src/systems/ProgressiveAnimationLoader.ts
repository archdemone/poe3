/**
 * Progressive Animation Loading System
 *
 * Loads character animations progressively based on priority and usage patterns:
 * - Loads essential animations first (idle, run)
 * - Loads combat animations on-demand
 * - Supports LOD-based quality levels
 * - Caches loaded animations for reuse
 */

import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { Scene } from '@babylonjs/core/scene';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { CharacterAnimation, loadCharacterAnimation, getCharacterAssetPath } from './characterLoader';
import { PlayerAnimState } from './AnimationController';

interface AnimationPriority {
  state: PlayerAnimState;
  priority: number; // Higher = more important
  preload: boolean; // Load immediately
  lodLevels: number; // Number of quality levels available
}

interface ProgressiveManifest {
  version: string;
  generated: string;
  assets: Array<{
    name: string;
    baseFile: string;
    lods: number;
    stats: {
      animationsCount: number;
      meshesCount: number;
      compressionRatio: number;
    };
  }>;
}

export class ProgressiveAnimationLoader {
  private scene: Scene;
  private targetSkeleton: Skeleton | null = null;
  private manifest: ProgressiveManifest | null = null;
  private loadedAnimations: Map<string, CharacterAnimation> = new Map();
  private loadingPromises: Map<string, Promise<CharacterAnimation>> = new Map();
  private priorities: AnimationPriority[] = [
    { state: PlayerAnimState.IDLE, priority: 10, preload: true, lodLevels: 1 },
    { state: PlayerAnimState.RUN, priority: 9, preload: true, lodLevels: 1 },
    { state: PlayerAnimState.SPRINT, priority: 8, preload: false, lodLevels: 1 },
    { state: PlayerAnimState.ATTACK, priority: 7, preload: false, lodLevels: 2 },
    { state: PlayerAnimState.CAST, priority: 6, preload: false, lodLevels: 2 },
    { state: PlayerAnimState.DODGE, priority: 5, preload: false, lodLevels: 1 }
  ];

  private currentLodLevel: number = 0; // 0 = highest quality
  private memoryPressure: boolean = false;

  constructor(scene: Scene, targetSkeleton: Skeleton | null = null) {
    this.scene = scene;
    this.targetSkeleton = targetSkeleton;
    this.loadManifest();
  }

  /**
   * Load the progressive manifest
   */
  private async loadManifest(): Promise<void> {
    try {
      const manifestPath = getCharacterAssetPath('progressive-manifest.json');
      const response = await fetch(manifestPath);
      if (response.ok) {
        this.manifest = await response.json();
        console.log('[ProgressiveLoader] Loaded manifest with', this.manifest.assets.length, 'assets');
      } else {
        console.warn('[ProgressiveLoader] No manifest found, using fallback loading');
      }
    } catch (error) {
      console.warn('[ProgressiveLoader] Failed to load manifest:', error);
    }
  }

  /**
   * Preload essential animations
   */
  async preloadEssentialAnimations(): Promise<void> {
    console.log('[ProgressiveLoader] Preloading essential animations...');

    const preloadPromises = this.priorities
      .filter(priority => priority.preload)
      .map(priority => this.loadAnimation(priority.state));

    await Promise.all(preloadPromises);
    console.log('[ProgressiveLoader] Essential animations loaded');
  }

  /**
   * Load animation with progressive quality
   */
  async loadAnimation(state: PlayerAnimState, lodLevel?: number): Promise<CharacterAnimation> {
    const cacheKey = `${state}_${lodLevel || this.currentLodLevel}`;
    const priority = this.priorities.find(p => p.state === state);

    if (!priority) {
      throw new Error(`Unknown animation state: ${state}`);
    }

    // Check cache first
    if (this.loadedAnimations.has(cacheKey)) {
      return this.loadedAnimations.get(cacheKey)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    // Start loading
    const loadPromise = this.loadAnimationInternal(state, lodLevel || this.currentLodLevel, priority);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const animation = await loadPromise;
      this.loadedAnimations.set(cacheKey, animation);
      this.loadingPromises.delete(cacheKey);

      console.log(`[ProgressiveLoader] Loaded ${state} at LOD${lodLevel || this.currentLodLevel}`);
      return animation;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Internal animation loading with LOD support
   */
  private async loadAnimationInternal(
    state: PlayerAnimState,
    lodLevel: number,
    priority: AnimationPriority
  ): Promise<CharacterAnimation> {
    let fileName = `${state}.glb`;

    // Use LOD file if available and requested
    if (lodLevel > 0 && priority.lodLevels > 1) {
      const lodFile = `${state}_lod${Math.min(lodLevel, priority.lodLevels - 1)}.glb`;
      fileName = lodFile;
    }

    try {
      const animation = await loadCharacterAnimation(
        this.scene,
        getCharacterAssetPath(fileName),
        state,
        this.targetSkeleton
      );

      // Apply LOD-specific optimizations if needed
      if (lodLevel > 0) {
        // Reduce animation quality for lower LODs
        this.optimizeAnimationForLod(animation, lodLevel);
      }

      return animation;
    } catch (error) {
      console.warn(`[ProgressiveLoader] Failed to load ${fileName}, trying base quality...`, error);

      // Fallback to base quality if LOD fails
      if (lodLevel > 0) {
        return this.loadAnimationInternal(state, 0, priority);
      }

      throw error;
    }
  }

  /**
   * Optimize animation for lower LOD levels
   */
  private optimizeAnimationForLod(animation: CharacterAnimation, lodLevel: number): void {
    // Reduce keyframe density for lower quality LODs
    const reductionFactor = Math.pow(0.7, lodLevel); // Reduce by 30% per LOD level

    animation.animationGroup.animations.forEach(anim => {
      const keyframes = anim.getKeys();
      if (keyframes.length > 10) { // Only reduce if we have enough keyframes
        const newKeyframes = [];
        const step = Math.max(1, Math.floor(1 / reductionFactor));

        for (let i = 0; i < keyframes.length; i += step) {
          newKeyframes.push(keyframes[i]);
        }

        // Replace keyframes
        anim.setKeys(newKeyframes);
      }
    });

    console.log(`[ProgressiveLoader] Optimized ${animation.name} for LOD${lodLevel} (${reductionFactor.toFixed(2)}x keyframes)`);
  }

  /**
   * Preload animations based on predicted usage
   */
  async preloadPredictedAnimations(currentState: PlayerAnimState): Promise<void> {
    const predictions = this.predictNextAnimations(currentState);

    // Load high-priority predictions in parallel
    const highPriority = predictions.filter(p => p.priority > 7);
    await Promise.all(highPriority.map(p => this.loadAnimation(p.state)));

    // Load medium-priority predictions in background
    const mediumPriority = predictions.filter(p => p.priority > 5 && p.priority <= 7);
    mediumPriority.forEach(p => {
      this.loadAnimation(p.state).catch(error =>
        console.warn(`[ProgressiveLoader] Failed to preload ${p.state}:`, error)
      );
    });
  }

  /**
   * Predict which animations might be needed next
   */
  private predictNextAnimations(currentState: PlayerAnimState): AnimationPriority[] {
    switch (currentState) {
      case PlayerAnimState.IDLE:
        return this.priorities.filter(p =>
          [PlayerAnimState.RUN, PlayerAnimState.ATTACK, PlayerAnimState.DODGE].includes(p.state)
        );

      case PlayerAnimState.RUN:
        return this.priorities.filter(p =>
          [PlayerAnimState.SPRINT, PlayerAnimState.DODGE, PlayerAnimState.ATTACK].includes(p.state)
        );

      case PlayerAnimState.ATTACK:
        return this.priorities.filter(p =>
          [PlayerAnimState.IDLE, PlayerAnimState.RUN, PlayerAnimState.CAST].includes(p.state)
        );

      case PlayerAnimState.CAST:
        return this.priorities.filter(p =>
          [PlayerAnimState.IDLE, PlayerAnimState.RUN].includes(p.state)
        );

      default:
        return [];
    }
  }

  /**
   * Adjust LOD level based on performance/memory conditions
   */
  setLodLevel(level: number): void {
    if (level !== this.currentLodLevel) {
      console.log(`[ProgressiveLoader] Changing LOD level to ${level}`);
      this.currentLodLevel = level;

      // Optionally unload high-LOD animations if memory pressure
      if (this.memoryPressure && level > 0) {
        this.unloadHighLodAnimations();
      }
    }
  }

  /**
   * Set memory pressure flag
   */
  setMemoryPressure(pressure: boolean): void {
    this.memoryPressure = pressure;
    if (pressure) {
      this.unloadHighLodAnimations();
    }
  }

  /**
   * Unload high-LOD animations to free memory
   */
  private unloadHighLodAnimations(): void {
    const toUnload: string[] = [];

    this.loadedAnimations.forEach((animation, key) => {
      const parts = key.split('_');
      const lodLevel = parseInt(parts[parts.length - 1]) || 0;

      if (lodLevel > this.currentLodLevel) {
        toUnload.push(key);
      }
    });

    toUnload.forEach(key => {
      const animation = this.loadedAnimations.get(key);
      if (animation) {
        animation.animationGroup.dispose();
        this.loadedAnimations.delete(key);
      }
    });

    if (toUnload.length > 0) {
      console.log(`[ProgressiveLoader] Unloaded ${toUnload.length} high-LOD animations`);
    }
  }

  /**
   * Get loading statistics
   */
  getStats(): {
    loadedCount: number;
    loadingCount: number;
    totalMemoryUsage: number;
    currentLodLevel: number;
  } {
    let totalMemoryUsage = 0;

    // Estimate memory usage (rough approximation)
    this.loadedAnimations.forEach(animation => {
      // Each animation group uses memory for keyframes
      totalMemoryUsage += animation.animationGroup.animations.length * 1000; // ~1KB per animation track
    });

    return {
      loadedCount: this.loadedAnimations.size,
      loadingCount: this.loadingPromises.size,
      totalMemoryUsage,
      currentLodLevel: this.currentLodLevel
    };
  }

  /**
   * Dispose of all loaded animations
   */
  dispose(): void {
    this.loadedAnimations.forEach(animation => {
      animation.animationGroup.dispose();
    });
    this.loadedAnimations.clear();
    this.loadingPromises.clear();
    console.log('[ProgressiveLoader] Disposed');
  }
}
