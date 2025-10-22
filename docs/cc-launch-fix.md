# Character Creation Launch Fix

## Root Cause Analysis

The issue was that clicking "New" in the main menu did not navigate to/show the Character Creation UI, resulting in users seeing a blank game scene/HUD instead.

### Root Cause

The main.ts file was attempting to load character creation UI from `/src/features/characterCreation/ui/index.html`, but this feature was only implemented in the `browser-tools-mcp-extension` directory, not in the main application source. The CHARACTER_CREATE state handler was calling:

```typescript
await loadUI('/src/features/characterCreation/ui/index.html');
```

But this path did not exist, causing the UI loading to fail silently and leaving users on a blank scene.

## Changes Made

### 1. Moved Character Creation Feature
- **Action**: Copied the complete character creation feature from `browser-tools-mcp-extension/src/features/characterCreation/` to `src/features/characterCreation/`
- **Files**: All character creation files including UI, scene, state management, data, and tests
- **Impact**: Makes the feature available to the main application

### 2. Added Feature Flag Support
- **File**: `src/main.ts`
- **Change**: Added `ENABLE_POE_STYLE_CREATOR = true` feature flag
- **Integration**: Updated CHARACTER_CREATE handler to respect the flag with fallback to legacy flow

### 3. Added Diagnostic Modules
- **Files**: `src/devtools/routeDebug.ts`, `src/devtools/sceneDebug.ts`
- **Purpose**: Debug route transitions and Babylon.js scene lifecycle
- **Activation**: Only active when `?debug=1` or `DEV_DEBUG=true`
- **API**: Exposes `window.__ccDebug` and `window.__sceneDbg` for runtime inspection

### 4. Implemented Route Watchdog
- **File**: `src/features/characterCreation/guard.ts`
- **Function**: Monitors character creation UI mount within 1 second of state transition
- **Recovery**: Auto-retries UI loading once, shows fallback modal after 3 seconds if still failing
- **Integration**: Installed in main.ts DOMContentLoaded handler

### 5. Enhanced Error Handling
- **File**: `src/main.ts`
- **Change**: Added try/catch around character creation loading with fallback to hideout
- **Logging**: Integrated diagnostic logging throughout the flow

### 6. Added Comprehensive Tests
- **E2E Test**: `tests/e2e/characterCreation.spec.ts`
  - Happy path: New Game → Character Creation → Game Start
  - Watchdog recovery from slow loading
  - Keyboard accessibility
- **Unit Test**: `tests/unit/ccGuard.spec.ts`
  - Watchdog timer management
  - UI mount detection
  - Recovery mechanisms
  - Error modal functionality

### 7. Updated Build Scripts
- **File**: `package.json`
- **Change**: Added `qa:cc-launch` script that runs unit tests and headless e2e tests

### 8. Fast Follow-up Improvements

#### Kill Drift Prevention
- **Action**: Deleted `browser-tools-mcp-extension/src/features/characterCreation/` to prevent resurrection
- **Impact**: Eliminates risk of old code being accidentally restored

#### Flag Hygiene
- **File**: `src/main.ts`
- **Change**: `ENABLE_POE_STYLE_CREATOR = import.meta.env.DEV` (true in dev, false in prod)
- **Impact**: Prevents accidental production enablement of experimental features

#### Watchdog Telemetry
- **Files**: `src/main.ts`, `src/features/characterCreation/guard.ts`
- **Change**: Added `(window as any).__ccDebug.watchdogHits` counter
- **Impact**: CI can assert `watchdogHits === 0` in happy path tests

#### Slow-Load Simulation
- **File**: `tests/e2e/characterCreation.spec.ts`
- **Test**: `"slow-load simulation: watchdog recovers from delayed CSS"`
- **Change**: Delays CSS requests by 1.5s, verifies watchdog fires once and recovers
- **Impact**: Ensures watchdog works correctly under adverse conditions

#### Dispose Assurance
- **File**: `tests/unit/ccGuard.spec.ts`
- **Test**: `"CharacterCreationScene dispose assurance"`
- **Change**: Verifies proper cleanup of Babylon.js resources after dispose
- **Impact**: Prevents resource leaks in scene lifecycle

#### Accessibility Ping
- **Files**: `src/features/characterCreation/ui/index.html`, `tests/e2e/characterCreation.spec.ts`
- **Change**: Added `data-testid="cc-root"`, verified focusability and tab order
- **Impact**: Ensures keyboard navigation works and screen readers can access UI

#### Prod Breadcrumb Logging
- **File**: `src/features/characterCreation/guard.ts`
- **Change**: Logs `CC-MOUNT-FAIL:v{version}:route#/character/create` on permanent failure
- **Impact**: User reports can be easily identified and correlated with versions

## How the Watchdog Works

The route watchdog (`src/features/characterCreation/guard.ts`) provides three layers of protection:

1. **Early Detection** (1 second): Checks if character creation UI mounted after state transition
2. **Auto-Recovery** (1 retry): Attempts to reload the UI module if mount fails
3. **User Fallback** (3 seconds): Shows modal allowing retry or continue with legacy flow

The watchdog is installed during application bootstrap and monitors state transitions, cleaning up timers when leaving character creation.

## Test Summary

- **Unit Tests**: 8 test cases covering watchdog functionality, UI detection, and error handling
- **E2E Tests**: 4 test scenarios covering happy path, recovery, and accessibility
- **Integration**: All tests verify no console errors during character creation flow

## Expected Result

After these changes:
- Clicking "New" routes to Character Creation within 1 second
- Character creation UI renders with 3D preview and class/ascendancy selection
- Confirming creates the character and starts the game in hideout
- Watchdog prevents blank screen scenarios with automatic recovery
- No console errors during the complete flow
- `npm run qa:cc-launch` passes all tests

## Potential Edge Cases Addressed

- Slow network/async loading of character creation assets
- WebGL context loss during scene transitions
- CSS/JS loading failures
- Feature flag disabled falls back to legacy flow
- Keyboard-only navigation for accessibility
- Multiple rapid clicks on "New" button

## Backward Compatibility

- Legacy character creation flow preserved when `ENABLE_POE_STYLE_CREATOR = false`
- All existing game functionality unchanged
- No breaking changes to save format or existing UI
