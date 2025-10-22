import { Color3, DirectionalLight, ShadowGenerator, Scene, Vector3 } from 'babylonjs';

export function applyLighting(scene: Scene) {
  // Default environment (no skybox/ground)
  try {
    const env: any = scene.createDefaultEnvironment({ createSkybox: false, createGround: false });
    if (env && env.environmentTexture) {
      // Reduce environment intensity subtly if supported
      try { env.environmentTexture.level = 0.35; } catch {}
    }
  } catch {}

  const light = new DirectionalLight('polish_dir', new Vector3(-0.5, -1, 0.5), scene);
  light.intensity = 1.0;
  light.diffuse = new Color3(1, 0.98, 0.95);

  const sg = new ShadowGenerator(2048, light, true);
  sg.usePercentageCloserFiltering = true;
  sg.filter = ShadowGenerator.FILTER_PCF;
  sg.bias = 0.0005;

  // Mark common casters and receivers heuristically
  for (const mesh of scene.meshes) {
    if (!mesh || mesh.isDisposed()) continue;
    // Receive shadows for large/ground meshes
    if (mesh.name.toLowerCase().includes('ground')) {
      mesh.receiveShadows = true;
    }
    // Add some as casters
    if (mesh.name.match(/player|enemy|dummy|npc|chest/i)) {
      sg.addShadowCaster(mesh);
    }
  }

  return () => {
    try { sg.dispose(); } catch {}
    try { light.dispose(); } catch {}
  };
}
