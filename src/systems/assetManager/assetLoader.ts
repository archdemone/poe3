import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Material } from '@babylonjs/core/Materials/material';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Scene } from '@babylonjs/core/scene';
import { AssetContainer } from '@babylonjs/core/assetContainer';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';


/**
 * Asset loading system for 3D models, textures, and effects
 * Supports GLTF/GLB models with progress tracking and error handling
 */

export interface AssetLoadProgress {
  loaded: number;
  total: number;
  currentItem?: string;
}

export interface AssetLoadCallbacks {
  onProgress?: (progress: AssetLoadProgress) => void;
  onComplete?: (assets: AssetContainer[]) => void;
  onError?: (error: string, assetPath: string) => void;
}

export class AssetLoader {
  private scene: Scene;
  private loadingPromises: Promise<AssetContainer>[] = [];
  private loadedAssets: Map<string, AssetContainer> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Load a single GLTF/GLB model
   */
  async loadModel(assetPath: string, name?: string): Promise<AssetContainer> {
    const cacheKey = assetPath;

    // Check cache first
    if (this.loadedAssets.has(cacheKey)) {
      return this.loadedAssets.get(cacheKey)!;
    }

    try {
      const result = await SceneLoader.LoadAssetContainerAsync(
        assetPath,
        undefined, // scene parameter (use current scene)
        this.scene,
        undefined, // onProgress callback
        '.gltf' // extension hint
      );

      // Cache the loaded asset
      this.loadedAssets.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`Failed to load model: ${assetPath}`, error);
      throw new Error(`Asset loading failed: ${assetPath}`);
    }
  }

  /**
   * Load multiple models with progress tracking
   */
  async loadModels(
    assetPaths: string[],
    callbacks?: AssetLoadCallbacks
  ): Promise<AssetContainer[]> {
    const containers: AssetContainer[] = [];
    let loadedCount = 0;

    callbacks?.onProgress?.({ loaded: 0, total: assetPaths.length });

    for (const path of assetPaths) {
      try {
        callbacks?.onProgress?.({
          loaded: loadedCount,
          total: assetPaths.length,
          currentItem: path
        });

        const container = await this.loadModel(path);
        containers.push(container);

        loadedCount++;
        callbacks?.onProgress?.({
          loaded: loadedCount,
          total: assetPaths.length,
          currentItem: path
        });

      } catch (error) {
        console.error(`Failed to load: ${path}`, error);
        callbacks?.onError?.(error instanceof Error ? error.message : 'Unknown error', path);

        // Create empty container as fallback
        const fallbackContainer = new AssetContainer(this.scene);
        containers.push(fallbackContainer);
        loadedCount++;
      }
    }

    callbacks?.onComplete?.(containers);
    return containers;
  }

  /**
   * Load texture with caching
   */
  async loadTexture(texturePath: string): Promise<Texture> {
    const cacheKey = `texture_${texturePath}`;

    if (this.loadedAssets.has(cacheKey)) {
      return this.loadedAssets.get(cacheKey) as any;
    }

    const texture = new Texture(texturePath, this.scene);
    this.loadedAssets.set(cacheKey, texture as any);

    return texture;
  }

  /**
   * Create a material from loaded assets
   */
  createMaterial(name: string, diffuseTexture?: Texture, normalTexture?: Texture): Material {
    // For now, return a basic material - will be expanded with PBR later
    const material = new StandardMaterial(name, this.scene);

    if (diffuseTexture) {
      material.diffuseTexture = diffuseTexture;
    }

    if (normalTexture) {
      material.bumpTexture = normalTexture;
    }

    return material;
  }

  /**
   * Instantiate a model from loaded container
   */
  instantiateModel(container: AssetContainer, name?: string): AbstractMesh[] {
    const instances = container.instantiateModelsToScene(
      (sourceName) => name || `${sourceName}_${Date.now()}`,
      false, // cloneMaterials
      { doNotInstantiate: false }
    );

    return instances.rootNodes;
  }

  /**
   * Clean up loaded assets
   */
  dispose(): void {
    for (const container of this.loadedAssets.values()) {
      if (container.dispose) {
        container.dispose();
      }
    }
    this.loadedAssets.clear();
  }

  /**
   * Get cached asset by path
   */
  getCachedAsset(path: string): AssetContainer | null {
    return this.loadedAssets.get(path) || null;
  }

  /**
   * Preload critical assets for immediate gameplay
   */
  async preloadCriticalAssets(): Promise<void> {
    console.log('Preloading critical assets...');

    // This will be expanded as we add more assets
    // For now, just log that preloading is working
    console.log('Critical assets preloaded');
  }
}

// Singleton instance
let assetLoaderInstance: AssetLoader | null = null;

export function getAssetLoader(scene?: Scene): AssetLoader {
  if (!assetLoaderInstance && scene) {
    assetLoaderInstance = new AssetLoader(scene);
  }
  return assetLoaderInstance!;
}

export function disposeAssetLoader(): void {
  if (assetLoaderInstance) {
    assetLoaderInstance.dispose();
    assetLoaderInstance = null;
  }
}
