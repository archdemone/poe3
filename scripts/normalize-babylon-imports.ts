#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Mapping of Babylon.js classes to their @babylonjs/core paths
const BABYLON_MAPPING: Record<string, string> = {
  // Core classes
  'Scene': '@babylonjs/core/scene',
  'Engine': '@babylonjs/core/Engines/engine',
  'ArcRotateCamera': '@babylonjs/core/Cameras/arcRotateCamera',
  'FreeCamera': '@babylonjs/core/Cameras/freeCamera',
  'UniversalCamera': '@babylonjs/core/Cameras/universalCamera',
  'Vector3': '@babylonjs/core/Maths/math.vector',
  'Vector2': '@babylonjs/core/Maths/math.vector',
  'Vector4': '@babylonjs/core/Maths/math.vector',
  'Matrix': '@babylonjs/core/Maths/math.vector',
  'Quaternion': '@babylonjs/core/Maths/math.vector',
  'Color3': '@babylonjs/core/Maths/math.color',
  'Color4': '@babylonjs/core/Maths/math.color',
  'HemisphericLight': '@babylonjs/core/Lights/hemisphericLight',
  'PointLight': '@babylonjs/core/Lights/pointLight',
  'DirectionalLight': '@babylonjs/core/Lights/directionalLight',
  'SpotLight': '@babylonjs/core/Lights/spotLight',
  'MeshBuilder': '@babylonjs/core/Meshes/meshBuilder',
  'AbstractMesh': '@babylonjs/core/Meshes/abstractMesh',
  'TransformNode': '@babylonjs/core/Meshes/transformNode',
  'StandardMaterial': '@babylonjs/core/Materials/standardMaterial',
  'Texture': '@babylonjs/core/Materials/Textures/texture',
  'CubeTexture': '@babylonjs/core/Materials/Textures/cubeTexture',
  'DynamicTexture': '@babylonjs/core/Materials/Textures/dynamicTexture',
  'ParticleSystem': '@babylonjs/core/Particles/particleSystem',
  'GPUParticleSystem': '@babylonjs/core/Particles/gpuParticleSystem',
  'PointerEventTypes': '@babylonjs/core/Events/pointerEvents',
  'KeyboardEventTypes': '@babylonjs/core/Events/keyboardEvents',
  'Viewport': '@babylonjs/core/Maths/math.viewport',
  'AssetContainer': '@babylonjs/core/assetContainer',
  'Material': '@babylonjs/core/Materials/material',

  // Animation
  'Animation': '@babylonjs/core/Animations/animation',
  'AnimationGroup': '@babylonjs/core/Animations/animationGroup',

  // Audio
  'Sound': '@babylonjs/core/Audio/sound',

  // Physics (if using)
  'PhysicsImpostor': '@babylonjs/core/Physics/physicsImpostor',

  // Loaders
  'SceneLoader': '@babylonjs/core/Loading/sceneLoader',

  // GUI (if using)
  'GUI': '@babylonjs/core',
};

async function normalizeBabylonImports() {
  const srcFiles = await glob('src/**/*.{ts,tsx}', { ignore: ['**/node_modules/**'] });

  for (const file of srcFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Replace babylonjs barrel imports with specific @babylonjs/core imports
    const barrelImportRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]babylonjs['"]/g;

    content = content.replace(barrelImportRegex, (match, imports) => {
      const importList = imports.split(',').map((imp: string) => imp.trim()).filter(Boolean);
      const normalizedImports: Record<string, string[]> = {};

      for (const imp of importList) {
        const cleanImp = imp.replace(/ as \w+$/, ''); // Remove alias
        const mapping = BABYLON_MAPPING[cleanImp];

        if (mapping) {
          if (!normalizedImports[mapping]) {
            normalizedImports[mapping] = [];
          }
          normalizedImports[mapping].push(imp);
        } else {
          console.warn(`No mapping found for ${cleanImp} in ${file}`);
        }
      }

      const newImports = Object.entries(normalizedImports)
        .map(([modulePath, imports]) => `import { ${imports.join(', ')} } from '${modulePath}';`)
        .join('\n');

      if (newImports) {
        changed = true;
        return newImports;
      }

      return match;
    });

    // Replace * as BABYLON imports (less common but handle it)
    const namespaceImportRegex = /import\s*\*\s*as\s*BABYLON\s*from\s*['"]babylonjs['"]/g;
    if (namespaceImportRegex.test(content)) {
      console.warn(`Found namespace import in ${file}, manual conversion needed`);
    }

    // Convert banned identifiers to MeshBuilder calls
    const bannedIdentifiers = ['Sphere', 'Box', 'Cylinder', 'Plane', 'Torus', 'Cone', 'Ground'];
    for (const banned of bannedIdentifiers) {
      const createRegex = new RegExp(`BABYLON\\.MeshBuilder\\.Create${banned}\\b`, 'g');
      content = content.replace(createRegex, `MeshBuilder.Create${banned}`);

      // Also handle direct MeshBuilder calls that might need import
      const directRegex = new RegExp(`MeshBuilder\\.Create${banned}\\b`, 'g');
      if (directRegex.test(content) && !content.includes('MeshBuilder')) {
        console.warn(`Found MeshBuilder.Create${banned} usage in ${file} but MeshBuilder not imported`);
      }
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }

  console.log('Babylon.js import normalization complete!');
}

// Run the script
normalizeBabylonImports().catch(console.error);
