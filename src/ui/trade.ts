import { isVendorOpen } from './layout';
import { sellItemToVendor } from '../gameplay/loot/vendor';

export function enableInventorySelling() {
  const inv = document.getElementById("inventoryPanel");
  if (!inv) return;

  // Enable Ctrl+Click selling on inventory items
  // Note: Event listeners are set up using event delegation in inventory.ts
  // This function ensures the sell area is properly configured
  
  inv.querySelectorAll(".inventory-item, .grid-item").forEach(item => {
    // Ensure all items are draggable
    item.setAttribute("draggable", "true");
  });

  // Set up drop zone for selling
  const sellArea = document.querySelector("#vendorPanel .sell-area, #vendorPanel .vendor-sell-area") as HTMLElement;
  const sellZone = document.querySelector("#vendorPanel .sell-zone") as HTMLElement;
  
  if (sellZone) {
    // Clone and replace to remove old listeners
    const newSellZone = sellZone.cloneNode(true) as HTMLElement;
    sellZone.parentNode?.replaceChild(newSellZone, sellZone);
    
    newSellZone.addEventListener("dragover", handleDragOver);
    newSellZone.addEventListener("drop", handleDrop);
  }
}

function handleItemClick(e: Event) {
  const event = e as MouseEvent;
  const target = event.currentTarget as HTMLElement;
  const uid = target.getAttribute('data-uid');
  
  if (event.ctrlKey && isVendorOpen() && uid) {
    event.preventDefault();
    event.stopPropagation();
    
    // Find the item in inventory
    const inventory = (window as any).currentInventoryGrid;
    if (inventory) {
      const gridItem = inventory.items.find((item: any) => item.item.uid === uid);
      if (gridItem) {
        const gold = sellItemToVendor(gridItem.item);
        // Remove from inventory
        const index = inventory.items.indexOf(gridItem);
        if (index > -1) {
          inventory.items.splice(index, 1);
        }
        // Refresh inventory display
        if ((window as any).renderGrid) {
          (window as any).renderGrid();
        }
        // Show toast
        showToast(`Sold ${gridItem.item.baseId} for ${gold} gold`);
      }
    }
  }
}

function handleDragStart(e: Event) {
  const event = e as DragEvent;
  const target = event.currentTarget as HTMLElement;
  
  if (!isVendorOpen()) return;
  const uid = target.getAttribute('data-uid');
  if (uid) {
    event.dataTransfer?.setData("text/plain", uid);
  }
}

function handleDragOver(e: Event) {
  e.preventDefault();
}

function handleDrop(e: Event) {
  const event = e as DragEvent;
  event.preventDefault();
  
  const uid = event.dataTransfer?.getData("text/plain");
  if (uid) {
    const inventory = (window as any).currentInventoryGrid;
    if (inventory) {
      const gridItem = inventory.items.find((item: any) => item.item.uid === uid);
      if (gridItem) {
        const gold = sellItemToVendor(gridItem.item);
        // Remove from inventory
        const index = inventory.items.indexOf(gridItem);
        if (index > -1) {
          inventory.items.splice(index, 1);
        }
        // Refresh inventory display
        if ((window as any).renderGrid) {
          (window as any).renderGrid();
        }
        // Show toast
        showToast(`Sold ${gridItem.item.baseId} for ${gold} gold`);
      }
    }
  }
}

function showToast(message: string) {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: #c4b088;
    padding: 12px 16px;
    border-radius: 4px;
    z-index: 10000;
    font-size: 14px;
    border: 1px solid rgba(196, 176, 136, 0.3);
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    document.body.removeChild(toast);
  }, 3000);
}
