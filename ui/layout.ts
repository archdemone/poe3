import { ensureTwoDock } from './mount';
import { enableInventorySelling } from './trade';
import { onVendorOpen, onVendorClose, closeInventory as closeInventoryPanel } from '../src/ui/panels/panelManager';

/**
 * Opens both vendor and inventory panels side-by-side.
 */
export function openVendorAndInventory(): void {
  const dock = ensureTwoDock();
  const vendor = document.getElementById("vendorPanel")!;
  dock.append(vendor);
  vendor.classList.remove("is-hidden");

  // Notify panel manager that vendor is now open
  onVendorOpen();

  requestAnimationFrame(() => {
    enableInventorySelling();
  });

  // optional: prevent game scroll while panels open
  document.body.style.overflow = "hidden";
}

export function closeVendor(): void {
  document.getElementById("vendorPanel")?.classList.add("is-hidden");
  
  // Notify panel manager that vendor is now closed
  onVendorClose();
  
  document.body.style.overflow = ""; // restore scroll
}

export function closeInventory(): void {
  closeInventoryPanel();
  maybeAllowBodyScroll();
}

function maybeAllowBodyScroll(): void {
  const anyOpen = [...document.querySelectorAll("#vendorPanel,#inventoryPanel")]
    .some(el => !el.classList.contains("is-hidden"));
  if (!anyOpen) document.body.style.overflow = ""; // restore
}

// Call once on boot to attach close buttons & ESC
export function attachPanelClosers(): void {
  document.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("[data-close-panel]") as HTMLElement | null;
    if (!btn) {
      // Debug: log what was clicked
      console.log('[Layout] Clicked element:', e.target, 'No close button found');
      return;
    }
    const panelId = btn.getAttribute("data-close-panel")!;
    console.log('[Layout] Close button clicked for panel:', panelId);
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.add("is-hidden");
      panel.classList.remove("centered"); // Remove centered class when closing
      console.log('[Layout] Panel hidden:', panelId);
      
      // If we closed the vendor, check if inventory should be centered
      if (panelId === "vendorPanel") {
        const inventoryPanel = document.getElementById("inventoryPanel");
        if (inventoryPanel && !inventoryPanel.classList.contains("is-hidden")) {
          inventoryPanel.classList.add("centered");
          console.log('[Layout] Centering inventory panel (vendor closed)');
        }
      }
      
      // Check if panel is actually hidden after a brief delay
      setTimeout(() => {
        const isStillHidden = panel.classList.contains("is-hidden");
        console.log('[Layout] Panel', panelId, 'still hidden after 100ms:', isStillHidden);
        if (!isStillHidden) {
          console.error('[Layout] Panel', panelId, 'was reopened by something else!');
        }
      }, 100);
    } else {
      console.error('[Layout] Panel not found:', panelId);
    }
    maybeAllowBodyScroll();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      console.log('[Layout] ESC key pressed');
      // close topmost open panel first
      const openPanels = [...document.querySelectorAll(".ui-panel:not(.is-hidden)")] as HTMLElement[];
      console.log('[Layout] Open panels found:', openPanels.length);
      const last = openPanels.at(-1);
      if (last) { 
        console.log('[Layout] Closing panel:', last.id);
        last.classList.add("is-hidden"); 
        maybeAllowBodyScroll();
      } else {
        console.log('[Layout] No panels to close');
      }
    }
  });

  // Optional: handle resize events if needed
  // Removed autosize logic as it was causing transform issues
}

// Legacy functions for backward compatibility
export function openVendorSideBySide(): void {
  openVendorAndInventory();
}

export function closeVendorView(): void {
  closeVendor();
}

export function closeInventoryView(): void {
  closeInventory();
}

export function handleEscKey(): void {
  // This is now handled by attachPanelClosers
}

export function isVendorOpen(): boolean {
  const panel = document.getElementById('vendorPanel');
  return panel ? !panel.classList.contains('is-hidden') : false;
}

export function isInventoryOpen(): boolean {
  const panel = document.getElementById('inventoryPanel');
  return panel ? !panel.classList.contains('is-hidden') : false;
}