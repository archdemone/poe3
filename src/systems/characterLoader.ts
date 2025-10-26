// Character Loading System for Babylon.js
// Handles loading GLB character models and animations

import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Scene } from '@babylonjs/core/scene';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { Animation } from '@babylonjs/core/Animations/animation';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

// Import GLB loader
import '@babylonjs/loaders/glTF';

// Try to register FBX loader
let fbxLoaderAvailable = false;
try {
  // Try to import FBX loader dynamically
  import('@babylonjs/loaders').then(({ FBXLoader }) => {
    try {
      if (!SceneLoader.GetPluginForExtension('.fbx')) {
        FBXLoader.RegisterExtension();
        fbxLoaderAvailable = true;
        console.log('[CharacterLoader] FBX loader registered successfully');
      } else {
        fbxLoaderAvailable = true;
        console.log('[CharacterLoader] FBX loader already registered');
      }
    } catch (regError) {
      console.warn('[CharacterLoader] FBX loader registration failed:', regError);
    }
  }).catch(importError => {
    console.warn('[CharacterLoader] FBX loader import failed - FBX files will not load:', importError.message);
    console.log('[CharacterLoader] Falling back to GLB-only loading');
  });
} catch (error) {
  console.warn('[CharacterLoader] FBX loader setup failed:', error);
}
import { ProgressiveAnimationLoader } from './ProgressiveAnimationLoader';

export interface CharacterModel {
  rootMesh: AbstractMesh;
  skeleton: Skeleton | null;
  meshes: AbstractMesh[];
  animationGroups?: AnimationGroup[];
}

export interface CharacterAnimation {
  name: string;
  animationGroup: AnimationGroup;
  duration: number;
}

/**
 * Load a character model from GLB or FBX file
 */
export async function loadCharacterModel(scene: Scene, modelPath: string): Promise<CharacterModel> {
  console.log(`[CharacterLoader] Starting character model loading for: ${modelPath}`);
  console.log(`[CharacterLoader] FBX loader available: ${fbxLoaderAvailable}`);

  // First try to load from file
  const loadAttempts = [
    { path: modelPath, type: 'GLB' },
    // Only try FBX if loader is available
    ...(fbxLoaderAvailable ? [
      { path: modelPath.replace('.glb', '.fbx'), type: 'FBX' },
      { path: modelPath.replace('character.glb', 'player model.fbx'), type: 'FBX' }
    ] : [])
  ];

  for (const attempt of loadAttempts) {
    try {
      console.log(`[CharacterLoader] Attempting to load ${attempt.type} model from: ${attempt.path}`);

      // Check if file exists first
      try {
        const response = await fetch(attempt.path, { method: 'HEAD' });
        if (!response.ok) {
          console.warn(`[CharacterLoader] ${attempt.type} file not accessible: ${attempt.path} (${response.status})`);
          continue;
        }
      } catch (fetchError) {
        console.warn(`[CharacterLoader] Could not check ${attempt.type} file: ${attempt.path}`, fetchError);
        continue;
      }

      console.log(`[CharacterLoader] ${attempt.type} file exists, loading...`);

      const result = await SceneLoader.ImportMeshAsync("", attempt.path, "", scene);

      console.log(`[CharacterLoader] ImportMeshAsync completed for ${attempt.type}, result:`, {
        meshes: result.meshes?.length || 0,
        skeletons: result.skeletons?.length || 0,
        animationGroups: result.animationGroups?.length || 0
      });

      if (!result.meshes || result.meshes.length === 0) {
        console.warn(`[CharacterLoader] No meshes found in ${attempt.path}, trying next method`);
        continue;
      }

      // Find the root mesh (usually the first one or the one with skeleton)
      const rootMesh = result.meshes[0];
      const skeleton = result.skeletons && result.skeletons.length > 0 ? result.skeletons[0] : null;

      console.log(`[CharacterLoader] Model loaded successfully: ${result.meshes.length} meshes, ${result.skeletons?.length || 0} skeletons, ${result.animationGroups?.length || 0} animation groups`);

      // Position the character correctly
      rootMesh.position = new Vector3(0, 0, 0);

      // Scale FBX models appropriately (they might be in different units)
      if (attempt.type === 'FBX') {
        rootMesh.scaling = new Vector3(0.01, 0.01, 0.01); // FBX is often in centimeters
        console.log(`[CharacterLoader] Scaled FBX model to ${rootMesh.scaling.x} scale`);
      }

      console.log(`[CharacterLoader] Successfully loaded ${attempt.type} character with ${result.meshes.length} meshes and ${skeleton ? 'skeleton' : 'no skeleton'}`);

      return {
        rootMesh,
        skeleton,
        meshes: result.meshes,
        animationGroups: result.animationGroups
      };
    } catch (error) {
      console.error(`[CharacterLoader] Failed to load ${attempt.type} from ${attempt.path}:`, error.message);
      // Continue to next attempt
      continue;
    }
  }

  // If all file loading attempts failed, create a procedural character model
  console.log(`[CharacterLoader] All file loading attempts failed, creating procedural character model`);

  return createProceduralCharacterModel(scene);
}

/**
 * Create a procedural character model when file loading fails
 */
function createProceduralCharacterModel(scene: Scene): CharacterModel {
  console.log(`[CharacterLoader] Creating procedural character model`);

  // Import MeshBuilder for creating procedural geometry
  const { MeshBuilder } = require('@babylonjs/core/Meshes/meshBuilder');
  const { StandardMaterial } = require('@babylonjs/core/Materials/standardMaterial');
  const { Color3 } = require('@babylonjs/core/Maths/math.color');

  // Create a parent mesh for the character
  const characterMesh = MeshBuilder.CreateBox('procedural-character', { size: 0.1 }, scene);
  characterMesh.position = new Vector3(0, 0.5, 0);

  // Create body (capsule shape)
  const body = MeshBuilder.CreateCapsule('character-body', {
    radius: 0.3,
    height: 1.4,
    tessellation: 12
  }, scene);
  body.parent = characterMesh;
  body.position.y = 0.7;

  // Create head (sphere)
  const head = MeshBuilder.CreateSphere('character-head', {
    diameter: 0.4,
    segments: 16
  }, scene);
  head.parent = characterMesh;
  head.position.y = 1.6;

  // Create arms
  const leftArm = MeshBuilder.CreateCapsule('character-left-arm', {
    radius: 0.15,
    height: 0.8,
    tessellation: 8
  }, scene);
  leftArm.parent = characterMesh;
  leftArm.position.set(-0.5, 0.8, 0);
  leftArm.rotation.z = Math.PI / 6;

  const rightArm = MeshBuilder.CreateCapsule('character-right-arm', {
    radius: 0.15,
    height: 0.8,
    tessellation: 8
  }, scene);
  rightArm.parent = characterMesh;
  rightArm.position.set(0.5, 0.8, 0);
  rightArm.rotation.z = -Math.PI / 6;

  // Create legs
  const leftLeg = MeshBuilder.CreateCapsule('character-left-leg', {
    radius: 0.18,
    height: 0.9,
    tessellation: 8
  }, scene);
  leftLeg.parent = characterMesh;
  leftLeg.position.set(-0.2, -0.45, 0);

  const rightLeg = MeshBuilder.CreateCapsule('character-right-leg', {
    radius: 0.18,
    height: 0.9,
    tessellation: 8
  }, scene);
  rightLeg.parent = characterMesh;
  rightLeg.position.set(0.2, -0.45, 0);

  // Apply materials
  const bodyMaterial = new StandardMaterial('character-body-material', scene);
  bodyMaterial.diffuseColor = new Color3(0.2, 0.4, 0.8); // Blue tint
  bodyMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

  const skinMaterial = new StandardMaterial('character-skin-material', scene);
  skinMaterial.diffuseColor = new Color3(0.9, 0.7, 0.5); // Skin tone
  skinMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

  body.material = bodyMaterial;
  head.material = skinMaterial;
  leftArm.material = skinMaterial;
  rightArm.material = skinMaterial;
  leftLeg.material = bodyMaterial;
  rightLeg.material = bodyMaterial;

  console.log(`[CharacterLoader] Created procedural character with multiple body parts`);

  return {
    rootMesh: characterMesh,
    skeleton: null, // No skeleton for procedural model
    meshes: [characterMesh, body, head, leftArm, rightArm, leftLeg, rightLeg]
  };
}

/**
 * Load a character animation from GLB or FBX file
 */
export async function loadCharacterAnimation(
  scene: Scene,
  animationPath: string,
  animationName: string,
  targetSkeleton?: Skeleton
): Promise<CharacterAnimation> {
  const loadAttempts = [
    { path: animationPath, type: 'GLB' },
    // Only try FBX if loader is available
    ...(fbxLoaderAvailable ? [{ path: animationPath.replace('.glb', '.fbx'), type: 'FBX' }] : [])
  ];

  for (const attempt of loadAttempts) {
    try {
      console.log(`[CharacterLoader] Attempting to load ${attempt.type} animation ${animationName} from: ${attempt.path}`);

      // Check if file exists first
      const response = await fetch(attempt.path, { method: 'HEAD' });
      if (!response.ok) {
        console.warn(`[CharacterLoader] ${attempt.type} animation file not found: ${attempt.path}`);
        continue;
      }

      console.log(`[CharacterLoader] ${attempt.type} animation file exists, loading...`);

      const result = await SceneLoader.ImportMeshAsync("", attempt.path, "", scene);

      console.log(`[CharacterLoader] ImportMeshAsync completed for ${attempt.type} animation, result:`, {
        meshes: result.meshes?.length || 0,
        skeletons: result.skeletons?.length || 0,
        animationGroups: result.animationGroups?.length || 0
      });

      if (!result.animationGroups || result.animationGroups.length === 0) {
        // Clean up any imported meshes/skeletons if no animations found
        result.meshes?.forEach(mesh => mesh.dispose());
        result.skeletons?.forEach(skeleton => skeleton.dispose());
        throw new Error(`No animation groups found in ${attempt.path}`);
      }

      const animationGroup = result.animationGroups[0];
      animationGroup.name = animationName;

      // If we have a target skeleton, retarget the animations to use it instead of the imported skeleton
      if (targetSkeleton) {
        console.log(`[CharacterLoader] Retargeting ${animationName} animations to main skeleton`);
        try {
          // Retarget the animation group to use the main skeleton
          animationGroup.retargetAnimation(targetSkeleton);
          console.log(`[CharacterLoader] Successfully retargeted ${animationName} animations`);
        } catch (error) {
          console.warn(`[CharacterLoader] Failed to retarget ${animationName} animations:`, error);
          // Fall back to manual retargeting
          if (animationGroup.targetedAnimations) {
            animationGroup.targetedAnimations.forEach(targetedAnim => {
              if (targetedAnim.target && typeof targetedAnim.target === 'object' && 'bones' in targetedAnim.target) {
                // This is a skeleton, retarget to the main skeleton
                const sourceSkeleton = targetedAnim.target as Skeleton;
                const boneName = sourceSkeleton.name || 'root';
                const targetBone = targetSkeleton.bones.find(bone => bone.name === boneName);
                if (targetBone) {
                  targetedAnim.target = targetBone;
                  console.log(`[CharacterLoader] Manually retargeted bone ${boneName} for ${animationName}`);
                }
              }
            });
          }
        }
      }

      // Hide imported meshes since animation GLB files contain geometry that creates duplicate models
      // We only want the animation data, not the visual meshes
      result.meshes?.forEach(mesh => {
        mesh.isVisible = false;
        mesh.setEnabled(false); // Completely disable the mesh
        // Don't dispose as it might affect skeleton references
      });
      // Keep skeletons as animations reference them

      // Calculate duration
      let duration = 0;
      if (animationGroup.animations && Array.isArray(animationGroup.animations)) {
        for (const animation of animationGroup.animations) {
          const animDuration = animation.getDuration();
          if (animDuration > duration) {
            duration = animDuration;
          }
        }
      } else {
        console.warn(`[CharacterLoader] AnimationGroup ${animationName} has no animations array, using default duration`);
        duration = 1.0; // Default 1 second duration
      }

      console.log(`[CharacterLoader] Successfully loaded ${attempt.type} animation ${animationName} with duration ${duration}s`);

      return {
        name: animationName,
        animationGroup,
        duration
      };
    } catch (error) {
      console.error(`[CharacterLoader] Failed to load ${attempt.type} animation ${animationName} from ${attempt.path}:`, error);
      console.error(`[CharacterLoader] Animation error details:`, {
        message: error.message,
        stack: error.stack
      });

      // Continue to next attempt
      continue;
    }
  }

  // All attempts failed, create a fallback animation
  console.log(`[CharacterLoader] All animation loading attempts failed for ${animationName}, creating fallback animation`);
  return createFallbackAnimation(scene, animationName);
}

/**
 * Create a fallback animation when file loading fails
 */
function createFallbackAnimation(scene: Scene, animationName: string): CharacterAnimation {
  console.log(`[CharacterLoader] Creating fallback animation for ${animationName}`);

  // Create a simple animation group with a dummy animation
  const animationGroup = new AnimationGroup(animationName, scene);

  console.log(`[CharacterLoader] Created fallback animation group for ${animationName}`);

  return {
    name: animationName,
    animationGroup,
    duration: 1.0 // 1 second fallback duration
  };
}

/**
 * Convert FBX to GLB using online converter
 * This is a placeholder - in practice, you would use an online converter
 * or Blender to convert the FBX files to GLB format
 */
export function convertFBXToGLB(fbxPath: string): string {
  // Replace .fbx with .glb
  return fbxPath.replace('.fbx', '.glb');
}

/**
 * Get the asset path for a character file
 */
export function getCharacterAssetPath(filename: string): string {
  return `src/assets/characters/player/${filename}`;
}

/**
 * Create a progressive animation loader
 */
export function createProgressiveAnimationLoader(scene: Scene): ProgressiveAnimationLoader {
  return new ProgressiveAnimationLoader(scene);
}

/**
 * Validate GLB file structure and contents
 */
export async function validateGlbFile(filePath: string): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    meshesCount: number;
    animationsCount: number;
    materialsCount: number;
    fileSize: number;
  };
}> {
  const result = {
    valid: false,
    errors: [] as string[],
    warnings: [] as string[],
    stats: {
      meshesCount: 0,
      animationsCount: 0,
      materialsCount: 0,
      fileSize: 0
    }
  };

  try {
    // Check if file exists
    const response = await fetch(filePath);
    if (!response.ok) {
      result.errors.push(`File not found: ${filePath}`);
      return result;
    }

    result.stats.fileSize = parseInt(response.headers.get('content-length') || '0');

    // For GLB validation, we'd need to parse the binary format
    // This is a simplified check - in production you'd use a GLB parser
    const buffer = await response.arrayBuffer();

    // Basic GLB header validation (simplified)
    if (buffer.byteLength < 12) {
      result.errors.push('File too small to be a valid GLB');
      return result;
    }

    const header = new DataView(buffer);
    const magic = header.getUint32(0, true);
    const version = header.getUint32(4, true);
    const length = header.getUint32(8, true);

    if (magic !== 0x46546C67) { // 'glTF'
      result.errors.push('Invalid GLB magic number');
      return result;
    }

    if (version !== 2) {
      result.warnings.push(`GLB version ${version} detected (expected 2)`);
    }

    if (length !== buffer.byteLength) {
      result.errors.push('GLB length mismatch');
      return result;
    }

    // Try to load with Babylon to validate structure
    try {
      // This would require creating a temporary scene, which is complex
      // For now, assume it's valid if header is correct
      result.valid = true;
      result.warnings.push('Full GLB validation requires Babylon.js context');
    } catch (error) {
      result.errors.push(`Babylon.js validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

  } catch (error) {
    result.errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Optimize GLB file for web delivery (placeholder for future implementation)
 */
export async function optimizeGlbForWeb(inputPath: string, outputPath: string, options: {
  compressTextures?: boolean;
  dracoCompression?: boolean;
  simplifyGeometry?: number;
  reduceKeyframeDensity?: number;
}): Promise<void> {
  // This would use gltf-pipeline or similar tools
  // For now, just copy the file
  console.log(`[AssetOptimizer] Optimizing ${inputPath} -> ${outputPath}`);

  try {
    const response = await fetch(inputPath);
    const buffer = await response.arrayBuffer();

    // In a real implementation, this would:
    // 1. Parse GLB
    // 2. Apply Draco compression
    // 3. Compress textures
    // 4. Simplify geometry
    // 5. Reduce animation keyframes
    // 6. Write optimized GLB

    console.log(`[AssetOptimizer] Optimization complete (placeholder implementation)`);
  } catch (error) {
    console.error(`[AssetOptimizer] Failed to optimize:`, error);
    throw error;
  }
}
