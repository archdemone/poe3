// Dynamic UI loader for injecting HTML/CSS/TS overlays into the DOM.
// Manages loading and cleanup of menu screens.

const CONTAINER_ID = 'dynamic-ui';

// Track loaded resources for cleanup
let currentHtmlPath: string | null = null;
let currentStyleElement: HTMLLinkElement | null = null;
let currentScriptModule: any = null;

/** Load an HTML file and its associated CSS/TS into the dynamic UI container.
 * The HTML is fetched and injected into #dynamic-ui. If a matching .css file
 * exists it is loaded as a stylesheet. If a matching .ts file exists it is
 * imported as a module. */
export async function loadUI(htmlPath: string): Promise<void> {
  // Clean up any existing UI first
  await unloadUI();

  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    throw new Error(`Container #${CONTAINER_ID} not found`);
  }

  try {
    // Fetch and inject HTML
    const htmlResponse = await fetch(htmlPath);
    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch ${htmlPath}: ${htmlResponse.statusText}`);
    }
    const html = await htmlResponse.text();
    container.innerHTML = html;
    currentHtmlPath = htmlPath;

    // Load matching CSS if it exists
    const cssPath = htmlPath.replace('.html', '.css');
    try {
      const cssResponse = await fetch(cssPath);
      if (cssResponse.ok) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssPath;
        document.head.appendChild(link);
        currentStyleElement = link;
      }
    } catch (err) {
      // CSS file may not exist, that's okay
      console.debug(`No CSS file found for ${htmlPath}`);
    }

    // Load matching TS/JS module if it exists
    const tsPath = htmlPath.replace('.html', '.ts');
    const jsPath = htmlPath.replace('.html', '.js');
    try {
      // Try .ts first (Vite will handle it), fall back to .js
      let modulePath = tsPath;
      try {
        currentScriptModule = await import(/* @vite-ignore */ modulePath);
      } catch {
        modulePath = jsPath;
        currentScriptModule = await import(/* @vite-ignore */ modulePath);
      }
      // If the module exports an init function, call it
      if (currentScriptModule?.init) {
        currentScriptModule.init();
      }
    } catch (err) {
      // TS/JS file may not exist or may not export init, that's okay
      console.debug(`No script found or init not exported for ${htmlPath}`, err);
    }

    console.log(`Loaded UI: ${htmlPath}`);
  } catch (err) {
    console.error(`Error loading UI ${htmlPath}:`, err);
    throw err;
  }
}

/** Unload the current UI, clearing the container and removing styles/scripts. */
export async function unloadUI(): Promise<void> {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  // Clear HTML
  container.innerHTML = '';

  // Remove stylesheet
  if (currentStyleElement && currentStyleElement.parentNode) {
    currentStyleElement.parentNode.removeChild(currentStyleElement);
    currentStyleElement = null;
  }

  // Call cleanup function if the module exports one
  if (currentScriptModule?.cleanup) {
    try {
      currentScriptModule.cleanup();
    } catch (err) {
      console.warn('Error during module cleanup:', err);
    }
  }
  currentScriptModule = null;

  currentHtmlPath = null;
  console.log('UI unloaded');
}

/** Get the currently loaded UI path. */
export function getCurrentUI(): string | null {
  return currentHtmlPath;
}

