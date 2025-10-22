// Diagnostic module for route transitions and feature flags
// Only active when ?debug=1 or DEV_DEBUG=true

interface RouteDebugAPI {
  route: { current: string; lastTransition: number };
  flags: Record<string, boolean>;
  lastError: Error | null;
}

const DEBUG_PARAM = 'debug';
const DEV_DEBUG = 'DEV_DEBUG';

let isEnabled = false;
const api: RouteDebugAPI = {
  route: { current: '', lastTransition: 0 },
  flags: {},
  lastError: null
};

function checkEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(DEBUG_PARAM) === '1' ||
         (window as any)[DEV_DEBUG] === true;
}

function logRouteChange(route: string): void {
  if (!isEnabled) return;
  api.route.current = route;
  api.route.lastTransition = Date.now();
  console.log(`[RouteDebug] Route changed to: ${route}`);
}

function logFeatureFlag(flag: string, value: boolean): void {
  if (!isEnabled) return;
  api.flags[flag] = value;
  console.log(`[RouteDebug] Feature flag ${flag}: ${value}`);
}

function logError(error: Error): void {
  if (!isEnabled) return;
  api.lastError = error;
  console.error('[RouteDebug] Error:', error);
}

// Initialize when module loads
if (typeof window !== 'undefined') {
  isEnabled = checkEnabled();
  if (isEnabled) {
    console.log('[RouteDebug] Enabled');
  }

  // Expose API globally
  (window as any).__ccDebug = {
    logRouteChange,
    logFeatureFlag,
    logError,
    getState: () => ({ ...api })
  };
}

export { logRouteChange, logFeatureFlag, logError };
