import { Color3, HighlightLayer, Mesh, PointerEventTypes, Scene } from 'babylonjs';

export function applyOutlines(scene: Scene) {
  const hl = new HighlightLayer('polish_outlines', scene, { blurHorizontalSize: 0, blurVerticalSize: 0 });
  const outlineColor = new Color3(1.0, 0.85, 0.5);
  const highlighted = new Set<Mesh>();

  const over = scene.onPointerObservable.add((pi) => {
    if (pi.type !== PointerEventTypes.POINTERMOVE) return;
    const pick = scene.pick(scene.pointerX, scene.pointerY);
    if (!pick || !pick.pickedMesh) return;
    const m = pick.pickedMesh as Mesh;
    const isInteractable = /chest|altar|npc|device/i.test(m.name);
    for (const cur of Array.from(highlighted)) {
      if (cur !== m) {
        try { hl.removeMesh(cur); } catch {}
        highlighted.delete(cur);
      }
    }
    if (isInteractable && !highlighted.has(m)) {
      try { hl.addMesh(m, outlineColor); highlighted.add(m); } catch {}
    }
  });

  const out = scene.onPointerObservable.add((pi) => {
    if (pi.type !== PointerEventTypes.POINTERUP) return;
    for (const cur of Array.from(highlighted)) {
      try { hl.removeMesh(cur); } catch {}
      highlighted.delete(cur);
    }
  });

  return () => {
    scene.onPointerObservable.remove(over);
    scene.onPointerObservable.remove(out);
    try { hl.dispose(); } catch {}
  };
}
