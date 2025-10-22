import { Engine, Scene } from 'babylonjs';

export function applyPerf(scene: Scene, engine: Engine) {
  // Hardware scaling to respect devicePixelRatio
  try { engine.setHardwareScalingLevel(1 / (window.devicePixelRatio || 1)); } catch {}

  // Freeze static meshes
  const unfroze: Array<() => void> = [];
  for (const m of scene.meshes) {
    if (!m || m.isDisposed()) continue;
    // Heuristic: ground, walls and other static geometry
    if (/ground|wall|device/i.test(m.name)) {
      try {
        m.freezeWorldMatrix();
        unfroze.push(() => { try { m.unfreezeWorldMatrix(); } catch {} });
      } catch {}
    }
  }
  // Freeze active meshes pass
  try { scene.freezeActiveMeshes(); unfroze.push(() => { try { scene.unfreezeActiveMeshes(); } catch {} }); } catch {}

  return () => {
    for (const fn of unfroze.reverse()) fn();
  };
}

export function unfreezeWorld(scene: Scene) {
  try { scene.unfreezeActiveMeshes(); } catch {}
  for (const m of scene.meshes) {
    try { m.unfreezeWorldMatrix(); } catch {}
  }
}
