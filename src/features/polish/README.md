# Polish Pack

A toggleable set of visual and performance tweaks for the hideout scene.

Flags (env or query params; query overrides env):
- ENABLE_POLISH
- POLISH_CAMERA
- POLISH_LIGHTING
- POLISH_GLOW
- POLISH_POSTFX
- POLISH_OUTLINES
- POLISH_PERF_FREEZE
- POLISH_OVERLAY
- POLISH_HUD_SCALE
- POLISH_KEYBINDS

Usage:
- Integrate `applyPolish(scene, camera, engine)` after scene/camera creation.
- Preview route: `/#/__polish` with query toggles, e.g. `?glow=1&postfx=0`.
- Dispose via returned `dispose()` to clean up.
