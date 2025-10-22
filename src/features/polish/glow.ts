import { GlowLayer, Scene } from 'babylonjs';

export function applyGlow(scene: Scene) {
  const glow = new GlowLayer('polish_glow', scene, { blurKernelSize: 16 });
  glow.intensity = 0.6;

  // Optional subtle torch-flicker on existing point/spot lights if any
  const lights = scene.lights.slice();
  let t = 0;
  const obs = scene.onBeforeRenderObservable.add(() => {
    t += scene.getEngine().getDeltaTime() * 0.001;
    for (let i = 0; i < lights.length; i++) {
      const L: any = lights[i];
      if (!L || L.isDisposed || L.isDisposed()) continue;
      const base = (L as any)._polishBaseIntensity ?? L.intensity ?? 1;
      if ((L as any)._polishBaseIntensity === undefined) (L as any)._polishBaseIntensity = base;
      L.intensity = base * (0.8 + 0.2 * Math.sin(t + i));
    }
  });

  return () => {
    scene.onBeforeRenderObservable.remove(obs);
    try { glow.dispose(); } catch {}
    for (const L of lights as any[]) {
      if ((L as any)._polishBaseIntensity !== undefined) {
        try { L.intensity = (L as any)._polishBaseIntensity; } catch {}
      }
    }
  };
}
