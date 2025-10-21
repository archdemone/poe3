// Independent panel toggles

import { ensureTwoDock } from './mount';
import { toggleInventory, onVendorOpen, onVendorClose, isVendorOpen } from '../src/ui/panels/panelManager';

export function setupIndependentToggles() {
  console.log('[Toggles] Setting up independent panel toggles');
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "i") {
      e.preventDefault();
      console.log('[Toggles] I key pressed - toggling inventory');
      toggleInventory();
    }
    if (e.key.toLowerCase() === "v") {
      e.preventDefault();
      console.log('[Toggles] V key pressed - toggling vendor');
      const vendorPanel = document.getElementById("vendorPanel");
      if (vendorPanel) {
        const dock = ensureTwoDock();
        if (!dock.contains(vendorPanel)) {
          dock.appendChild(vendorPanel);
        }
        const isHidden = vendorPanel.classList.contains("is-hidden");
        console.log('[Toggles] Vendor panel isHidden:', isHidden);
        if (isHidden) {
          vendorPanel.classList.remove("is-hidden");
          console.log('[Toggles] Showing vendor panel');
          onVendorOpen();
        } else {
          vendorPanel.classList.add("is-hidden");
          console.log('[Toggles] Hiding vendor panel');
          onVendorClose();
        }
      }
    }
  });
}
