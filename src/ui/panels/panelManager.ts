// Panel Manager - Toggles between standalone and compact inventory UIs
// Ensures only one inventory DOM is visible at a time

import { ensureTwoDock } from '../../../ui/mount';

/** Show a panel by ID */
function show(id: string): void {
  const panel = document.getElementById(id);
  if (panel) {
    panel.classList.remove('is-hidden');
  }
}

/** Hide a panel by ID */
function hide(id: string): void {
  const panel = document.getElementById(id);
  if (panel) {
    panel.classList.add('is-hidden');
  }
}

/** Check if a panel is currently open */
function isOpen(id: string): boolean {
  const panel = document.getElementById(id);
  return panel ? !panel.classList.contains('is-hidden') : false;
}

/** Open standalone inventory (full-size, centered) */
export function openInventoryStandalone(): void {
  hide('inventoryCompact');
  show('inventoryStandalone');
  
  // Center the standalone inventory
  const standalone = document.getElementById('inventoryStandalone');
  if (standalone) {
    standalone.classList.add('centered');
  }
  
  // Refresh the standalone inventory display
  import('../inventory/standalone/index').then(({ refreshInventory }) => {
    refreshInventory();
  }).catch(() => {
    console.warn('[PanelManager] Could not refresh standalone inventory');
  });
}

/** Open compact inventory (side-by-side with vendor) */
export function openInventoryCompact(): void {
  hide('inventoryStandalone');
  show('inventoryCompact');
  // Place compact inventory inside the two-panel dock so it sits next to the vendor
  const compact = document.getElementById('inventoryCompact');
  if (compact) {
    const dock = ensureTwoDock();
    if (!dock.contains(compact)) {
      dock.appendChild(compact);
    }
  }
  
  // Remove centered class from standalone
  const standalone = document.getElementById('inventoryStandalone');
  if (standalone) {
    standalone.classList.remove('centered');
  }
  
  // Refresh the compact inventory display
  import('../inventory/compact/index').then(({ refreshInventoryCompact }) => {
    refreshInventoryCompact();
  }).catch(() => {
    console.warn('[PanelManager] Could not refresh compact inventory');
  });
}

/** Close whichever inventory is currently open */
export function closeInventory(): void {
  hide('inventoryStandalone');
  hide('inventoryCompact');
}

/** Toggle inventory based on vendor state */
export function toggleInventory(): void {
  const vendorOpen = isOpen('vendorPanel');
  const standaloneOpen = isOpen('inventoryStandalone');
  const compactOpen = isOpen('inventoryCompact');
  
  if (standaloneOpen || compactOpen) {
    // Close whichever is open
    closeInventory();
  } else {
    // Open appropriate version
    if (vendorOpen) {
      openInventoryCompact();
    } else {
      openInventoryStandalone();
    }
  }
}

/** Called when vendor opens - switch to compact if inventory is open */
export function onVendorOpen(): void {
  const standaloneOpen = isOpen('inventoryStandalone');
  
  if (standaloneOpen) {
    // Switch from standalone to compact
    openInventoryCompact();
  }
}

/** Called when vendor closes - switch to standalone if inventory is open */
export function onVendorClose(): void {
  const compactOpen = isOpen('inventoryCompact');
  
  if (compactOpen) {
    // Switch from compact to standalone
    openInventoryStandalone();
  }
}

/** Check if any inventory is open */
export function isInventoryOpen(): boolean {
  return isOpen('inventoryStandalone') || isOpen('inventoryCompact');
}

/** Check if vendor is open */
export function isVendorOpen(): boolean {
  return isOpen('vendorPanel');
}

