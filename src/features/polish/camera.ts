import type { Scene } from 'babylonjs';
import type { ArcRotateCamera } from 'babylonjs/Cameras/arcRotateCamera';

export function applyCameraPolish(_scene: Scene, camera: ArcRotateCamera) {
  // mark parameter as used for linters
  void _scene;
  const original = {
    lowerRadiusLimit: camera.lowerRadiusLimit,
    upperRadiusLimit: camera.upperRadiusLimit,
    wheelDeltaPercentage: camera.wheelDeltaPercentage,
    panningSensibility: camera.panningSensibility,
    useAutoRotationBehavior: (camera as any).useAutoRotationBehavior as boolean,
    idleRotationSpeed: (camera as any).autoRotationBehavior?.idleRotationSpeed as number | undefined,
    idleRotationWaitTime: (camera as any).autoRotationBehavior?.idleRotationWaitTime as number | undefined,
  };

  camera.lowerRadiusLimit = 6;
  camera.upperRadiusLimit = 16;
  camera.wheelDeltaPercentage = 0.02;
  camera.panningSensibility = 2000;

  // Enable and tune auto-rotation behavior
  try {
    (camera as any).useAutoRotationBehavior = true;
    const arb = (camera as any).autoRotationBehavior;
    if (arb) {
      arb.idleRotationSpeed = 0.05;
      arb.idleRotationWaitTime = 2000;
      arb.zoomStopsAnimation = true;
    }
  } catch {}

  return () => {
    camera.lowerRadiusLimit = original.lowerRadiusLimit;
    camera.upperRadiusLimit = original.upperRadiusLimit;
    camera.wheelDeltaPercentage = original.wheelDeltaPercentage as number;
    camera.panningSensibility = original.panningSensibility as number;
    try {
      (camera as any).useAutoRotationBehavior = original.useAutoRotationBehavior;
      const arb = (camera as any).autoRotationBehavior;
      if (arb) {
        if (original.idleRotationSpeed !== undefined) arb.idleRotationSpeed = original.idleRotationSpeed;
        if (original.idleRotationWaitTime !== undefined) arb.idleRotationWaitTime = original.idleRotationWaitTime;
      }
    } catch {}
  };
}
