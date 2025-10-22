import type { Engine, Scene } from 'babylonjs';
import type { ArcRotateCamera } from 'babylonjs/Cameras/arcRotateCamera';
import { applyCameraPolish } from './camera';
import { applyLighting } from './lighting';
import { applyGlow } from './glow';
import { applyPostFX } from './postfx';
import { applyOutlines } from './outlines';
import { applyPerf, unfreezeWorld } from './perf';
import { applyOverlay } from './overlay';
import { applyKeybinds } from './keybinds';
import './hud.css';

export type PolishOptions = {
  enable?: boolean;
  camera?: boolean;
  lighting?: boolean;
  glow?: boolean;
  postfx?: boolean;
  outlines?: boolean;
  perfFreeze?: boolean;
  overlay?: boolean;
  hudScale?: boolean;
  keybinds?: boolean;
  query?: URLSearchParams;
  playerGetter?: () => { position: any } | null;
};

export type PolishHandles = {
  dispose: () => void;
  unfreeze: () => void;
  markers: Record<string, boolean>;
};

function readFlag(name: string, def: boolean, q?: URLSearchParams): boolean {
  if (q && q.has(name)) {
    const v = q.get(name);
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  }
  const env = (import.meta as any).env || {};
  const val = env[name];
  if (val === 'true') return true;
  if (val === 'false') return false;
  return def;
}

export function applyPolish(
  scene: Scene,
  camera: ArcRotateCamera,
  engine: Engine,
  options: PolishOptions = {}
): PolishHandles {
  const q = options.query ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : undefined);
  const isDev = (import.meta as any).env?.MODE !== 'production';
  const enabled = options.enable ?? readFlag('ENABLE_POLISH', isDev, q);
  const handles: Array<() => void> = [];
  const markers: Record<string, boolean> = {};

  if (!enabled) {
    return { dispose: () => {}, unfreeze: () => {}, markers };
  }

  const doCamera = options.camera ?? readFlag('POLISH_CAMERA', true, q);
  const doLighting = options.lighting ?? readFlag('POLISH_LIGHTING', true, q);
  const doGlow = options.glow ?? readFlag('POLISH_GLOW', true, q);
  const doPost = options.postfx ?? readFlag('POLISH_POSTFX', true, q);
  const doOut = options.outlines ?? readFlag('POLISH_OUTLINES', true, q);
  const doPerf = options.perfFreeze ?? readFlag('POLISH_PERF_FREEZE', true, q);
  const doOverlay = options.overlay ?? readFlag('POLISH_OVERLAY', true, q);
  const doHud = options.hudScale ?? readFlag('POLISH_HUD_SCALE', true, q);
  const doKeys = options.keybinds ?? readFlag('POLISH_KEYBINDS', true, q);

  if (doCamera) handles.push(applyCameraPolish(scene, camera));
  if (doLighting) handles.push(applyLighting(scene));
  if (doGlow) handles.push(applyGlow(scene));
  if (doPost) handles.push(applyPostFX(scene));
  if (doOut) handles.push(applyOutlines(scene));
  if (doPerf) handles.push(applyPerf(scene, engine));
  if (doOverlay) handles.push(applyOverlay(scene, engine));
  if (doHud) {
    // HUD scaling via CSS variable on root
    const root = document.documentElement;
    const prev = root.style.getPropertyValue('--ui-scale');
    root.style.setProperty('--ui-scale', 'clamp(0.8, 1.2vw, 1.4)');
    markers.hud = true;
    handles.push(() => {
      if (prev) root.style.setProperty('--ui-scale', prev);
      else root.style.removeProperty('--ui-scale');
    });
  }
  if (doKeys) handles.push(applyKeybinds(scene, camera, options.playerGetter));

  markers.camera = !!doCamera;
  markers.lighting = !!doLighting;
  markers.glow = !!doGlow;
  markers.postfx = !!doPost;
  markers.outlines = !!doOut;
  markers.perfFreeze = !!doPerf;
  markers.overlay = !!doOverlay;
  markers.hudScale = !!doHud;
  markers.keybinds = !!doKeys;

  return {
    dispose: () => {
      for (let i = handles.length - 1; i >= 0; i--) {
        try { handles[i](); } catch {}
      }
    },
    unfreeze: () => unfreezeWorld(scene),
    markers,
  };
}

export * from './route';
