import { Engine, Scene, SceneInstrumentation } from 'babylonjs';

export function applyOverlay(scene: Scene, engine: Engine) {
  const el = document.createElement('div');
  el.id = 'polish-overlay';
  el.style.position = 'absolute';
  el.style.top = '8px';
  el.style.left = '8px';
  el.style.padding = '4px 6px';
  el.style.background = 'rgba(0,0,0,0.5)';
  el.style.color = '#fff';
  el.style.font = '12px/1.2 monospace';
  el.style.zIndex = '10000';
  el.textContent = 'fps: -- | meshes: -- | drawCalls: --';
  document.body.appendChild(el);

  // Draw call counter via SceneInstrumentation
  let instr: SceneInstrumentation | null = (scene as any)._polishInstr || null;
  try {
    if (!instr) {
      instr = new SceneInstrumentation(scene);
    }
  } catch {}
  if ((scene as any)._polishInstr === undefined && instr) {
    (scene as any)._polishInstr = instr;
    instr.captureFrameTime = true;
    instr.captureRenderTime = true;
  }

  let last = performance.now();
  let frames = 0;
  const obs = scene.onAfterRenderObservable.add(() => {
    frames++;
    const now = performance.now();
    if (now - last >= 500) {
      const fps = Math.round((frames * 1000) / (now - last));
      frames = 0; last = now;
      const meshes = scene.meshes.length;
      const draw = (scene as any)._drawCalls || (instr?.drawCallsCounter?.current || 0);
      el.textContent = `fps: ${fps} | meshes: ${meshes} | drawCalls: ${draw}`;
    }
  });

  return () => {
    scene.onAfterRenderObservable.remove(obs);
    el.remove();
    if (instr) {
      try { instr.dispose(); } catch {}
      if ((scene as any)._polishInstr === instr) (scene as any)._polishInstr = null;
    }
  };
}
