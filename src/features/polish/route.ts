import type { Engine } from 'babylonjs';
import { Scene } from 'babylonjs';
import { ArcRotateCamera } from 'babylonjs/Cameras/arcRotateCamera';
import { Vector3, HemisphericLight, MeshBuilder, Color3 } from 'babylonjs';
import { applyPolish } from './index';

export function bootPolishPreview(canvas: HTMLCanvasElement, engine: Engine) {
  const scene = new Scene(engine);
  scene.clearColor = new Color3(0.08, 0.08, 0.1).toColor4();
  const cam = new ArcRotateCamera('cam', Math.PI/4, Math.PI/3.2, 12, new Vector3(0, 0.5, 0), scene);
  cam.attachControl(canvas, true);
  scene.activeCamera = cam;

  new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene);
  const chest = MeshBuilder.CreateBox('devChest', { size: 1 }, scene);
  chest.position = new Vector3(-2, 0.5, -2);
  const npc = MeshBuilder.CreateCylinder('vendorNPC', { diameter: 1, height: 2 }, scene);
  npc.position = new Vector3(3, 1, -2);
  const player = MeshBuilder.CreateBox('player', { size: 1 }, scene);
  player.position = new Vector3(0, 0.5, 0);

  const q = new URLSearchParams(window.location.search);
  const handles = applyPolish(scene, cam, engine, {
    query: q,
    playerGetter: () => ({ position: player.position }) as any,
  });
  ;(window as any).__polishMarkers = handles.markers;

  // Render loop for preview
  engine.runRenderLoop(() => {
    if (scene.activeCamera) scene.render();
  });

  // Dispose on unload
  window.addEventListener('beforeunload', () => {
    try { handles.dispose(); } catch {}
    try { scene.dispose(); } catch {}
  });

  return { scene, camera: cam, handles };
}

export function maybeInstallPolishRoute(canvas: HTMLCanvasElement, engine: Engine) {
  if (location.hash === '#/__polish') {
    return bootPolishPreview(canvas, engine);
  }
  return null;
}
