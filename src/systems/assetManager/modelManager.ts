import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import { AssetContainer } from '@babylonjs/core/assetContainer';

import { AssetLoader } from './assetLoader';

/**
 * Model management system for character and object models
 * Handles instantiation, positioning, and lifecycle of 3D models
 */

export interface ModelInstance {
  container: AssetContainer;
  rootNodes: AbstractMesh[];
  animations?: AnimationGroup[];
  position: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
}

export interface ModelOptions {
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
  name?: string;
  cloneMaterials?: boolean;
}

export class ModelManager {
  private scene: Scene;
  private assetLoader: AssetLoader;
  private activeModels: Map<string, ModelInstance> = new Map();
  private modelCache: Map<string, AssetContainer> = new Map();

  constructor(scene: Scene, assetLoader: AssetLoader) {
    this.scene = scene;
    this.assetLoader = assetLoader;
  }

  /**
   * Load and instantiate a model
   */
  async createModel(
    modelPath: string,
    options: ModelOptions = {}
  ): Promise<ModelInstance> {
    try {
      // Load the asset container
      const container = await this.assetLoader.loadModel(modelPath);

      // Instantiate the model
      const rootNodes = this.assetLoader.instantiateModel(container, options.name);

      // Apply transformations
      const rootNode = rootNodes[0];
      if (rootNode) {
        if (options.position) {
          rootNode.position = options.position.clone();
        }
        if (options.rotation) {
          rootNode.rotation = options.rotation.clone();
        }
        if (options.scale) {
          rootNode.scaling = options.scale.clone();
        }
      }

      // Create model instance
      const instance: ModelInstance = {
        container,
        rootNodes,
        position: options.position || Vector3.Zero(),
        rotation: options.rotation,
        scale: options.scale,
      };

      // Store animations if available
      if (container.animationGroups && container.animationGroups.length > 0) {
        instance.animations = container.animationGroups;
      }

      // Generate unique ID
      const modelId = options.name || `${modelPath}_${Date.now()}`;
      this.activeModels.set(modelId, instance);

      return instance;

    } catch (error) {
      console.error(`Failed to create model: ${modelPath}`, error);

      // Create fallback primitive model
      const fallbackInstance = this.createFallbackModel(options);
      const modelId = options.name || `fallback_${Date.now()}`;
      this.activeModels.set(modelId, fallbackInstance);

      return fallbackInstance;
    }
  }

  /**
   * Create a fallback primitive model when asset loading fails
   */
  private createFallbackModel(options: ModelOptions): ModelInstance {
    const container = new AssetContainer(this.scene);
    const rootNode = new AbstractMesh(options.name || 'fallback_model', this.scene);

    // Create gothic-style character using primitives
    const body = MeshBuilder.CreateCylinder('body', { height: 1.5, diameterTop: 0.8, diameterBottom: 1.0 }, this.scene);
    body.position.y = 0.75;
    body.parent = rootNode;

    const head = MeshBuilder.CreateSphere('head', { diameter: 0.6 }, this.scene);
    head.position.y = 1.8;
    head.parent = rootNode;

    // Arms
    const leftArm = MeshBuilder.CreateCylinder('left_arm', { height: 0.8, diameter: 0.15 }, this.scene);
    leftArm.position.set(-0.5, 1.2, 0);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.parent = rootNode;

    const rightArm = MeshBuilder.CreateCylinder('right_arm', { height: 0.8, diameter: 0.15 }, this.scene);
    rightArm.position.set(0.5, 1.2, 0);
    rightArm.rotation.z = -Math.PI / 4;
    rightArm.parent = rootNode;

    // Legs
    const leftLeg = MeshBuilder.CreateCylinder('left_leg', { height: 0.8, diameter: 0.2 }, this.scene);
    leftLeg.position.set(-0.2, -0.4, 0);
    leftLeg.parent = rootNode;

    const rightLeg = MeshBuilder.CreateCylinder('right_leg', { height: 0.8, diameter: 0.2 }, this.scene);
    rightLeg.position.set(0.2, -0.4, 0);
    rightLeg.parent = rootNode;

    // Create dark material for gothic theme
    const material = new StandardMaterial('gothic_material', this.scene);
    material.diffuseColor = new Color3(0.3, 0.3, 0.4); // Dark blue-gray
    material.specularColor = new Color3(0.1, 0.1, 0.1);

    body.material = material;
    head.material = material;
    leftArm.material = material;
    rightArm.material = material;
    leftLeg.material = material;
    rightLeg.material = material;

    // Set position and scale
    if (options.position) {
      rootNode.position = options.position.clone();
    }
    if (options.rotation) {
      rootNode.rotation = options.rotation.clone();
    }
    if (options.scale) {
      rootNode.scaling = options.scale.clone();
    }

    // Add all meshes to container
    container.meshes.push(rootNode, body, head, leftArm, rightArm, leftLeg, rightLeg);

    return {
      container,
      rootNodes: [rootNode],
      position: options.position || Vector3.Zero(),
      rotation: options.rotation,
      scale: options.scale,
    };
  }

  /**
   * Update model position
   */
  updateModelPosition(modelId: string, position: Vector3): void {
    const instance = this.activeModels.get(modelId);
    if (instance && instance.rootNodes[0]) {
      instance.rootNodes[0].position = position.clone();
      instance.position = position.clone();
    }
  }

  /**
   * Update model rotation
   */
  updateModelRotation(modelId: string, rotation: Vector3): void {
    const instance = this.activeModels.get(modelId);
    if (instance && instance.rootNodes[0]) {
      instance.rootNodes[0].rotation = rotation.clone();
      instance.rotation = rotation.clone();
    }
  }

  /**
   * Play animation on model
   */
  playAnimation(modelId: string, animationName?: string, loop = true): void {
    const instance = this.activeModels.get(modelId);
    if (instance && instance.animations) {
      // Stop all current animations
      instance.animations.forEach(anim => anim.stop());

      // Find and play specific animation or first available
      let targetAnimation: AnimationGroup | undefined;

      if (animationName) {
        targetAnimation = instance.animations.find(anim => anim.name === animationName);
      } else {
        targetAnimation = instance.animations[0];
      }

      if (targetAnimation) {
        targetAnimation.loopAnimation = loop;
        targetAnimation.play();
      }
    }
  }

  /**
   * Stop all animations on model
   */
  stopAnimations(modelId: string): void {
    const instance = this.activeModels.get(modelId);
    if (instance && instance.animations) {
      instance.animations.forEach(anim => anim.stop());
    }
  }

  /**
   * Remove and dispose of a model
   */
  removeModel(modelId: string): void {
    const instance = this.activeModels.get(modelId);
    if (instance) {
      // Dispose of meshes
      instance.rootNodes.forEach(node => node.dispose());

      // Dispose of container
      instance.container.dispose();

      // Remove from active models
      this.activeModels.delete(modelId);
    }
  }

  /**
   * Get model instance by ID
   */
  getModel(modelId: string): ModelInstance | null {
    return this.activeModels.get(modelId) || null;
  }

  /**
   * Get all active model IDs
   */
  getActiveModelIds(): string[] {
    return Array.from(this.activeModels.keys());
  }

  /**
   * Clean up all models
   */
  dispose(): void {
    for (const [id, instance] of this.activeModels) {
      instance.rootNodes.forEach(node => node.dispose());
      instance.container.dispose();
    }
    this.activeModels.clear();
    this.modelCache.clear();
  }

  /**
   * Create character model with standard setup
   */
  async createCharacter(
    modelPath: string,
    position: Vector3,
    options: { scale?: number; name?: string } = {}
  ): Promise<ModelInstance> {
    const scale = options.scale || 1;
    return this.createModel(modelPath, {
      position,
      scale: new Vector3(scale, scale, scale),
      name: options.name || `character_${Date.now()}`,
    });
  }

  /**
   * Create weapon model attached to character
   */
  async createWeapon(
    weaponPath: string,
    characterModel: ModelInstance,
    attachPoint?: string
  ): Promise<ModelInstance> {
    // For now, just create weapon at same position
    // Later we can implement proper bone attachment
    const weaponInstance = await this.createModel(weaponPath, {
      position: characterModel.position.clone(),
      name: `weapon_${Date.now()}`,
    });

    return weaponInstance;
  }

  /**
   * Create a primitive weapon model (for testing)
   */
  createPrimitiveWeapon(weaponType: string, options: ModelOptions = {}): ModelInstance {
    const container = new AssetContainer(this.scene);
    const rootNode = new AbstractMesh(options.name || `${weaponType}_weapon`, this.scene);

    let weaponMesh: AbstractMesh;

    // Create different weapon shapes based on type
    switch (weaponType.toLowerCase()) {
      case 'sword':
        // Long blade with handle
        const blade = MeshBuilder.CreateBox('blade', { width: 0.1, height: 1.2, depth: 0.05 }, this.scene);
        blade.position.y = 0.6;
        const handle = MeshBuilder.CreateCylinder('handle', { height: 0.3, diameter: 0.08 }, this.scene);
        handle.position.y = -0.15;
        handle.parent = blade;
        weaponMesh = blade;
        container.meshes.push(blade, handle);
        break;

      case 'axe':
        // Axe head with handle
        const axeHead = MeshBuilder.CreateBox('axe_head', { width: 0.3, height: 0.4, depth: 0.1 }, this.scene);
        axeHead.position.y = 0.2;
        axeHead.rotation.z = Math.PI / 6;
        const axeHandle = MeshBuilder.CreateCylinder('axe_handle', { height: 0.8, diameter: 0.06 }, this.scene);
        axeHandle.position.y = -0.4;
        axeHandle.parent = axeHead;
        weaponMesh = axeHead;
        container.meshes.push(axeHead, axeHandle);
        break;

      case 'staff':
        // Long staff
        weaponMesh = MeshBuilder.CreateCylinder('staff', { height: 2.0, diameter: 0.08 }, this.scene);
        weaponMesh.position.y = 1.0;
        container.meshes.push(weaponMesh);
        break;

      case 'shield':
        // Round shield
        weaponMesh = MeshBuilder.CreateCylinder('shield', { height: 0.05, diameter: 0.8 }, this.scene);
        weaponMesh.position.y = 0.4;
        container.meshes.push(weaponMesh);
        break;

      default:
        // Default sword
        weaponMesh = MeshBuilder.CreateBox('default_weapon', { width: 0.1, height: 1.0, depth: 0.05 }, this.scene);
        weaponMesh.position.y = 0.5;
        container.meshes.push(weaponMesh);
    }

    weaponMesh.parent = rootNode;

    // Create metallic material
    const material = new StandardMaterial(`${weaponType}_material`, this.scene);
    material.diffuseColor = new Color3(0.6, 0.6, 0.7); // Metallic silver
    material.specularColor = new Color3(0.8, 0.8, 0.9);
    weaponMesh.material = material;

    // Set position and scale
    if (options.position) {
      rootNode.position = options.position.clone();
    }
    if (options.rotation) {
      rootNode.rotation = options.rotation.clone();
    }
    if (options.scale) {
      rootNode.scaling = options.scale.clone();
    }

    return {
      container,
      rootNodes: [rootNode],
      position: options.position || Vector3.Zero(),
      rotation: options.rotation,
      scale: options.scale,
    };
  }
}

// Singleton instance
let modelManagerInstance: ModelManager | null = null;

export function getModelManager(scene?: Scene, assetLoader?: AssetLoader): ModelManager {
  if (!modelManagerInstance && scene && assetLoader) {
    modelManagerInstance = new ModelManager(scene, assetLoader);
  }
  return modelManagerInstance!;
}

export function disposeModelManager(): void {
  if (modelManagerInstance) {
    modelManagerInstance.dispose();
    modelManagerInstance = null;
  }
}
