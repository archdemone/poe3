// Route watchdog for character creation launch
// Monitors character creation UI mount and provides recovery mechanisms

import { logError } from '../../devtools/routeDebug';
import { stateManager, GameState } from '../../state/gameState';
import { createNewSave } from '../../state/save';

let watchdogTimer: number | null = null;
let retryCount = 0;
const MAX_RETRIES = 1;
const WATCHDOG_TIMEOUT = 1000; // 1 second
// const FAILURE_TIMEOUT = 3000; // 3 seconds total - keeping for reference

export interface WatchdogOptions {
  onRetry?: () => void;
  onFailure?: () => void;
}

/**
 * Start monitoring character creation UI mount after state transition
 */
export function startWatchdog(options: WatchdogOptions = {}): void {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
  }

  retryCount = 0;
  watchdogTimer = window.setTimeout(() => checkMount(options), WATCHDOG_TIMEOUT);
}

/**
 * Stop the watchdog if it's running
 */
export function stopWatchdog(): void {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}

/**
 * Check if character creation UI is properly mounted
 */
function checkMount(options: WatchdogOptions): void {
  const ccRoot = document.querySelector('[data-testid="cc-root"]') ||
                 document.getElementById('poe-creator');

  if (ccRoot && !isHidden(ccRoot)) {
    // Success - UI is mounted and visible
    console.log('[CC Watchdog] Character creation UI mounted successfully');
    return;
  }

  // UI not found or hidden - attempt recovery
  handleMountFailure(options);
}

/**
 * Handle mount failure with retry logic
 */
function handleMountFailure(options: WatchdogOptions): void {
  // Increment telemetry counter for CI monitoring
  (window as any).__ccDebug.watchdogHits = ((window as any).__ccDebug.watchdogHits || 0) + 1;

  console.warn(`[CC Watchdog] Character creation UI mount failed (attempt ${retryCount + 1})`);

  if (retryCount < MAX_RETRIES) {
    // Try to reload the UI
    retryCount++;
    console.log(`[CC Watchdog] Retrying UI load (attempt ${retryCount})`);

    try {
      // Force reload the character creation UI
      import('./ui/index').then(module => {
        if (module.init) {
          module.init();
          options.onRetry?.();
          // Check again after retry
          watchdogTimer = window.setTimeout(() => checkMount(options), WATCHDOG_TIMEOUT);
        }
      }).catch(error => {
        logError(new Error(`Watchdog retry failed: ${error.message}`));
        showFallbackModal(options);
      });
    } catch (error) {
      logError(error as Error);
      showFallbackModal(options);
    }
  } else {
    // Max retries exceeded
    showFallbackModal(options);
  }
}

/**
 * Show fallback modal when all recovery attempts fail
 */
function showFallbackModal(options: WatchdogOptions): void {
  console.error('[CC Watchdog] Character creation mount failed permanently');

  // Prod breadcrumb: log version + route for user reports
  const breadcrumb = `CC-MOUNT-FAIL:v${import.meta.env.VITE_APP_VERSION || 'dev'}:route#/character/create`;
  console.warn(`[Breadcrumb] ${breadcrumb}`);

  // Create and show error modal
  const modal = createErrorModal();
  document.body.appendChild(modal);
  modal.style.display = 'flex';

  options.onFailure?.();
}

/**
 * Create error modal for mount failure
 */
function createErrorModal(): HTMLElement {
  const modal = document.createElement('div');
  modal.id = 'cc-mount-error-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: Arial, sans-serif;
  `;

  modal.innerHTML = `
    <div style="
      background: #2a2a2a;
      padding: 2rem;
      border-radius: 8px;
      border: 1px solid #444;
      max-width: 400px;
      text-align: center;
      color: white;
    ">
      <h3 style="margin: 0 0 1rem 0; color: #ff6b6b;">Character Creation Failed</h3>
      <p style="margin: 0 0 1.5rem 0; color: #ccc;">
        The character creation interface could not be loaded.
      </p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button id="cc-error-retry" style="
          padding: 0.5rem 1rem;
          background: #4a90e2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Retry</button>
        <button id="cc-error-continue" style="
          padding: 0.5rem 1rem;
          background: #666;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Continue</button>
      </div>
    </div>
  `;

  // Add event listeners
  const retryBtn = modal.querySelector('#cc-error-retry') as HTMLButtonElement;
  const continueBtn = modal.querySelector('#cc-error-continue') as HTMLButtonElement;

  retryBtn.addEventListener('click', () => {
    modal.remove();
    // Force retry by transitioning back to character create
    const slot = (window as any).__charCreateSlot ?? 0;
    stateManager.transitionTo(GameState.CHARACTER_CREATE, { slot });
  });

  continueBtn.addEventListener('click', () => {
    modal.remove();
    // Fallback to hideout with default character
    const slot = (window as any).__charCreateSlot ?? 0;
    try {
      const saveData = createNewSave(slot, 'Adventurer', 'warrior');
      stateManager.transitionTo(GameState.HIDEOUT, { saveData, slot });
    } catch (error) {
      logError(error as Error);
      // Last resort - go back to main menu
      stateManager.transitionTo(GameState.MAIN_MENU);
    }
  });

  return modal;
}

/**
 * Check if element is hidden (display none, visibility hidden, or opacity 0)
 */
function isHidden(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return style.display === 'none' ||
         style.visibility === 'hidden' ||
         parseFloat(style.opacity) === 0;
}

/**
 * Auto-start watchdog when entering character create state
 * This should be called from the main.ts CHARACTER_CREATE handler
 */
export function installWatchdog(): void {
  // Listen for character create state changes
  stateManager.on(GameState.CHARACTER_CREATE, () => {
    startWatchdog();
  });

  // Clean up watchdog when leaving character create
  stateManager.on(GameState.HIDEOUT, () => {
    stopWatchdog();
  });

  stateManager.on(GameState.MAIN_MENU, () => {
    stopWatchdog();
  });
}
