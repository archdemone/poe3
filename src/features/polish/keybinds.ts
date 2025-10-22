import { ArcRotateCamera } from 'babylonjs/Cameras/arcRotateCamera';
import type { Scene, Vector3 } from 'babylonjs';

export function applyKeybinds(
  _scene: Scene,
  camera: ArcRotateCamera,
  playerGetter?: () => { position: Vector3 } | null
) {
  const handler = (ev: KeyboardEvent) => {
    if (ev.key === '+' || ev.key === '=') {
      camera.radius = (camera.radius ?? 10) - 0.5;
    } else if (ev.key === '-') {
      camera.radius = (camera.radius ?? 10) + 0.5;
    } else if (ev.key.toLowerCase() === 'c') {
      const player = playerGetter ? playerGetter() : null;
      if (player && player.position) {
        camera.target = (player.position as any).clone?.() ?? player.position;
      }
    }
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
}
