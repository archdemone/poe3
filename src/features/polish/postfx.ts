import { DefaultRenderingPipeline, Scene } from 'babylonjs';

export function applyPostFX(scene: Scene) {
  const pipeline = new DefaultRenderingPipeline('polish_pipeline', true, scene, undefined as any);
  try { (pipeline as any).cameras = scene.activeCamera ? [scene.activeCamera] : []; } catch {}
  pipeline.fxaaEnabled = true;
  pipeline.sharpenEnabled = true;
  if (pipeline.bloomEnabled) {
    pipeline.bloomThreshold = 0.9;
    pipeline.bloomWeight = 0.2;
  }
  // Ensure cameras added later also get the pipeline
  const camObs = scene.onActiveCameraChanged.add(() => {
    if (scene.activeCamera) {
      try { pipeline.addCamera(scene.activeCamera as any); } catch {}
    }
  });

  return () => {
    scene.onActiveCameraChanged.remove(camObs);
    try { pipeline.dispose(); } catch {}
  };
}
