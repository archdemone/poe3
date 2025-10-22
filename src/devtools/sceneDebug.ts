// Diagnostic module for Babylon.js scene lifecycle and resources
// Only active when ?debug=1 or DEV_DEBUG=true

interface SceneDebugAPI {
  scenes: string[];
  meshes: number;
  textures: number;
  materials: number;
  lastEvent: string;
  eventTime: number;
}

const DEBUG_PARAM = 'debug';
const DEV_DEBUG = 'DEV_DEBUG';

let isEnabled = false;
const api: SceneDebugAPI = {
  scenes: [],
  meshes: 0,
  textures: 0,
  materials: 0,
  lastEvent: '',
  eventTime: 0
};

function checkEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(DEBUG_PARAM) === '1' ||
         (window as any)[DEV_DEBUG] === true;
}

function logSceneEvent(event: string, scene?: any): void {
  if (!isEnabled) return;

  api.lastEvent = event;
  api.eventTime = Date.now();

  // Count resources if scene provided
  if (scene) {
    try {
      api.meshes = scene.meshes?.length || 0;
      api.textures = scene.textures?.length || 0;
      api.materials = scene.materials?.length || 0;

      // Track scene names
      if (event.includes('created') && scene.name) {
        api.scenes.push(scene.name);
      } else if (event.includes('disposed') && scene.name) {
        api.scenes = api.scenes.filter(name => name !== scene.name);
      }
    } catch (err) {
      console.warn('[SceneDebug] Error counting resources:', err);
    }
  }

  console.log(`[SceneDebug] ${event} - Meshes: ${api.meshes}, Textures: ${api.textures}, Materials: ${api.materials}`);
}

// Initialize when module loads
if (typeof window !== 'undefined') {
  isEnabled = checkEnabled();
  if (isEnabled) {
    console.log('[SceneDebug] Enabled');
  }

  // Expose API globally
  (window as any).__sceneDbg = {
    logSceneEvent,
    getState: () => ({ ...api })
  };
}

export { logSceneEvent };
