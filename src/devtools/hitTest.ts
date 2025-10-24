// Hit testing and debug utilities for diagnosing UI interaction issues
// Use with ?debug=1 URL parameter to enable debug overlays

/** Get element at point with z-index chain analysis */
export function hitTest(x: number, y: number): {
  element: HTMLElement | null;
  outerHTML: string;
  zIndexChain: Array<{ element: string; zIndex: string }>;
} {
  const element = document.elementFromPoint(x, y) as HTMLElement | null;

  if (!element) {
    return { element: null, outerHTML: '', zIndexChain: [] };
  }

  // Build z-index chain by walking up ancestors
  const zIndexChain: Array<{ element: string; zIndex: string }> = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    const computedStyle = window.getComputedStyle(current);
    const zIndex = computedStyle.zIndex;

    zIndexChain.push({
      element: current.tagName.toLowerCase() + (current.id ? `#${current.id}` : '') + (current.className ? `.${current.className.split(' ')[0]}` : ''),
      zIndex: zIndex === 'auto' ? 'auto' : zIndex
    });

    current = current.parentElement;
  }

  return {
    element,
    outerHTML: element.outerHTML.substring(0, 200) + (element.outerHTML.length > 200 ? '...' : ''),
    zIndexChain
  };
}

/** Initialize debug overlay for ?debug=1 */
export function initDebugOverlay(): void {
  if (!new URLSearchParams(window.location.search).has('debug')) {
    return;
  }

  // Create debug corner badge
  const badge = document.createElement('div');
  badge.id = 'debug-badge';
  badge.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    z-index: 99999;
    pointer-events: none;
    max-width: 300px;
    word-wrap: break-word;
  `;
  document.body.appendChild(badge);

  // Update badge on mouse move
  let updateTimeout: number;
  document.addEventListener('mousemove', (e) => {
    clearTimeout(updateTimeout);
    updateTimeout = window.setTimeout(() => {
      const result = hitTest(e.clientX, e.clientY);
      if (result.element) {
        const topZ = result.zIndexChain[0];
        badge.textContent = `${topZ.element}\nz: ${topZ.zIndex}`;
      } else {
        badge.textContent = 'no element';
      }
    }, 50);
  });

  console.log('🎯 Debug overlay initialized. Use window.__hit(x, y) for programmatic testing.');
}

// Expose global function for console testing
declare global {
  interface Window {
    __hit: typeof hitTest;
  }
}

window.__hit = hitTest;

// Auto-initialize if debug mode
if (typeof window !== 'undefined') {
  // Delay to ensure DOM is ready
  setTimeout(initDebugOverlay, 100);
}
