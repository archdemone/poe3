## Character Creation Feature Architecture

- Feature flag: `ENABLE_POE_STYLE_CREATOR` via `VITE_ENABLE_POE_STYLE_CREATOR` or `?poeCreator=1` query. Guard in `src/main.ts` under `GameState.CHARACTER_CREATE`.

- Routing/Load: Uses existing dynamic UI loader (`src/ui/loader.ts`). When enabled, loads `src/features/characterCreation/ui/index.html` which imports `creator.ts` and `creator.css`.

- Data model:
  - `classes.json`: `{ id, displayName, affinity, startingStats, allowedAscendancies, saveClass }`
  - `ascendancies.json`: `{ id, classId, displayName, shortDescription, creationBonuses }`
  - Runtime validation via strict TS types and `zod` schemas in `src/features/characterCreation/types.ts`.

- State management: `CreatorStore` in `state.ts` (simple observable): name, selected class/ascendancy, derived stats. Provides validity checks and filtered ascendancy list.

- Scene layer: `CharacterCreationScene` creates a dim room with lights and a `PreviewAvatar` built from primitives. Public API: `setClass`, `setAscendancy`, `setAppearance`, `dispose`.

- UI overlay: `ui/index.html` (fragment), `ui/creator.css` (dark theme). `ui/creator.ts` binds DOM to store and scene API. Keyboard-friendly, ARIA labels, focus-visible styles.

- Persistence: On confirm, maps selected class to existing save class (`saveClass: 'warrior'|'archer'`) and uses `createNewSave` + `saveGame` to persist, then transitions to `HIDEOUT`.

- Testing:
  - Unit: derive stats, filter ascendancies, validation messaging (Vitest).
  - E2E: Playwright happy path + keyboard-only navigation; scene marker (`_isCreator`) and canvas present.

- Swapping art: Replace `PreviewAvatar` construction with glTF load and map colors/poses to art pipeline. Keep API surface identical.
