// Compact Inventory UI - Used when vendor is open side-by-side

import { isVendorOpen } from '../../../../ui/layout';
import { sellItemToVendor, priceOf } from '../../../gameplay/loot/vendor';
import type { ItemInstance, EquipmentState, InventoryGrid, ItemSlot } from '../../../systems/items';
import { getItemBase, canPlaceItem, addItemToGrid, removeItemFromGrid, getItemAtPosition, RarityColors, meetsRequirements } from '../../../systems/items';
import { readGridMetrics, type GridMetrics } from '../gridMetrics';

let currentEquipment: EquipmentState = {};
let currentInventory: InventoryGrid = {
  width: 10,
  height: 7,
  items: [],
};

let draggedItem: { item: ItemInstance; fromSlot?: ItemSlot; fromGridPos?: { x: number; y: number } } | null = null;
let isProcessingDrop = false;
let onInventoryChange: (() => void) | null = null;

const DEFAULT_GRID_METRICS: GridMetrics = { cell: 46, gap: 2, padLeft: 10, padTop: 10 };
let gridMetrics: GridMetrics = { ...DEFAULT_GRID_METRICS };

function syncMetrics(container: HTMLElement | null): void {
  if (!container) return;
  gridMetrics = readGridMetrics(container, gridMetrics);
}

/** Initialize compact inventory UI */
export function initInventoryCompact(
  equipment: EquipmentState,
  inventory: InventoryGrid,
  onChange: () => void
): void {
  currentEquipment = equipment;
  currentInventory = inventory;
  onInventoryChange = onChange;

  renderGrid();
  renderEquipment();
  setupDragAndDrop();
  setupClearButton();
}

/** Render the inventory grid */
function renderGrid(): void {
  const gridContainer = document.getElementById('invc-grid');
  if (!gridContainer) return;

  syncMetrics(gridContainer);
  
  // Set grid dimensions
  gridContainer.style.setProperty('--cols', String(currentInventory.width));
  gridContainer.style.setProperty('--rows', String(currentInventory.height));
  const totalWidth = currentInventory.width * gridMetrics.cell + (currentInventory.width - 1) * gridMetrics.gap + gridMetrics.padLeft * 2;
  const totalHeight = currentInventory.height * gridMetrics.cell + (currentInventory.height - 1) * gridMetrics.gap + gridMetrics.padTop * 2;
  gridContainer.style.width = `${totalWidth}px`;
  gridContainer.style.minWidth = gridContainer.style.width;
  gridContainer.style.height = `${totalHeight}px`;
  gridContainer.style.minHeight = gridContainer.style.height;
  const rect = gridContainer.getBoundingClientRect();
  console.log(
    '[InventoryCompact] grid sizing',
    `cols=${currentInventory.width}`,
    `rows=${currentInventory.height}`,
    `cell=${gridMetrics.cell}`,
    `gap=${gridMetrics.gap}`,
    `total=${totalWidth}x${totalHeight}`,
    `rect=${rect.width}x${rect.height}`
  );
  
  // Clear existing
  gridContainer.innerHTML = '';
  
  // Create background grid cells with coordinates
  for (let y = 0; y < currentInventory.height; y++) {
    for (let x = 0; x < currentInventory.width; x++) {
      const cell = document.createElement('div');
      cell.className = 'inv-cell grid-cell'; // Both classes for style + hit tests
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      gridContainer.appendChild(cell);
    }
  }
  
  // Render items using CSS grid placement. Order does not matter as long as
  // items are children of the grid container, so append after background
  // cells to avoid shifting the grid layout (previously items injected before
  // cells sometimes pushed the grid downward, causing them to appear in the
  // empty space above the grid).
  for (const gridItem of currentInventory.items) {
    const itemEl = createGridItemElement(gridContainer, gridItem.item, gridItem.x, gridItem.y);
    gridContainer.appendChild(itemEl);
  }
  
  // After rendering, ensure selling hooks are enabled
  import('../../../../ui/trade').then(({ enableInventorySelling }) => {
    enableInventorySelling();
  }).catch(() => {
    // Trade module not loaded yet
  });
}

/** Create a grid item element */
function createGridItemElement(gridContainer: HTMLElement, item: ItemInstance, gridX: number, gridY: number): HTMLElement {
  const base = getItemBase(item.baseId);
  if (!base) throw new Error(`Unknown item base: ${item.baseId}`);

  syncMetrics(gridContainer);
  const { cell, gap, padLeft, padTop } = gridMetrics;
  
  const el = document.createElement('div');
  el.className = `inventory-item ${item.rarity}`;
  el.dataset.uid = item.uid;
  el.dataset.itemId = item.uid;
  
  // Absolute positioning inside grid container
  const itemWidth = base.size?.w ?? 1;
  const itemHeight = base.size?.h ?? 1;
  const w = itemWidth * cell + (itemWidth - 1) * gap;
  const h = itemHeight * cell + (itemHeight - 1) * gap;
  el.style.position = 'absolute';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.left = `${padLeft + gridX * (cell + gap)}px`;
  el.style.top = `${padTop + gridY * (cell + gap)}px`;
  el.style.zIndex = '10'; // Ensure items are above grid cells
  
  // Create inner frame
  const frame = document.createElement('div');
  frame.className = 'item-frame';
  frame.textContent = base.icon || '?';
  frame.style.cssText = `
    width: 100%; 
    height: 100%; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    font-size: 1.6rem;
    background-color: rgba(40, 40, 50, 0.95);
    border: 2px solid ${RarityColors[item.rarity]};
    border-radius: 4px;
    cursor: grab;
  `;
  el.appendChild(frame);
  
  // Make sure draggable is set to true
  el.draggable = true;
  
  // Add debug size info
  if (itemWidth > 1 || itemHeight > 1) {
    const sizeInfo = document.createElement('div');
    sizeInfo.style.cssText = 'position: absolute; bottom: 2px; right: 2px; font-size: 8px; color: white; background: rgba(0,0,0,0.5); padding: 1px 3px; border-radius: 2px;';
    sizeInfo.textContent = `${itemWidth}×${itemHeight}`;
    frame.appendChild(sizeInfo);
  }
  
  return el;
}

/** Render equipment slots */
function renderEquipment(): void {
  const slots: ItemSlot[] = [
    'weapon', 'offhand', 'helmet', 'chest', 'gloves',
    'boots', 'amulet', 'ring', 'ring2', 'belt',
  ];
  
  for (const slot of slots) {
    const slotEl = document.querySelector(`#invc-equip .equip-slot[data-slot="${slot}"]`);
    if (!slotEl) continue;
    
    const contentEl = slotEl.querySelector('.slot-content');
    if (!contentEl) continue;
    
    const item = currentEquipment[slot];
    if (item) {
      const base = getItemBase(item.baseId);
      if (base) {
        // Create a more robust draggable element
        const itemEl = document.createElement('div');
        itemEl.className = `grid-item ${item.rarity}`;
        itemEl.dataset.uid = item.uid;
        itemEl.draggable = true;
        itemEl.style.cssText = `
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          background-color: rgba(40, 40, 50, 0.95);
          border: 2px solid ${RarityColors[item.rarity]};
          border-radius: 4px;
          cursor: grab;
        `;
        itemEl.textContent = base.icon || '?';
        
        // Clear and append
        contentEl.innerHTML = '';
        contentEl.appendChild(itemEl);
      }
    } else {
      contentEl.innerHTML = '';
    }
  }
}

/** Setup drag and drop event handlers */
function setupDragAndDrop(): void {
  const gridContainer = document.getElementById('invc-grid');
  const equipSlots = document.querySelectorAll('#invc-equip .equip-slot');
  const inventoryPanel = document.getElementById('invc-panel');
  
  // Document-level events for item destruction
  document.addEventListener('dragover', (e) => {
    e.preventDefault(); // Always prevent default to allow drops anywhere
  });
  
  document.addEventListener('drop', (e) => {
    // Only trigger if we have a dragged item and not already processing
    if (!draggedItem || isProcessingDrop) return;

    console.log('Document drop event detected with dragged item');

    // Check if drop target is the map device modal or any other valid drop zone
    const target = e.target as HTMLElement;
    const mapDeviceModal = document.getElementById('map-device-modal');
    const mapDeviceSlot = document.getElementById('map-device-slot');
    const vendorPanel = document.getElementById('vendorPanel');
    
    // If dropped on map device modal, slot, or vendor, don't destroy
    if (mapDeviceModal && mapDeviceModal.contains(target)) {
      console.log('Dropped on map device modal - ignoring destroy');
      return;
    }
    if (mapDeviceSlot && (mapDeviceSlot === target || mapDeviceSlot.contains(target))) {
      console.log('Dropped on map device slot - ignoring destroy');
      return;
    }
    if (vendorPanel && vendorPanel.contains(target)) {
      console.log('Dropped on vendor panel - ignoring destroy');
      return;
    }

    // Check if we're outside the inventory panel
    // Try multiple possible panel IDs
    const panel = document.getElementById('invc-panel') ||
                  document.getElementById('inventoryCompact') ||
                  document.getElementById('invc-grid')?.closest('.panel');

    if (!panel) {
      console.error('Could not find inventory panel element');
      // If we can't find the panel, assume we're outside and destroy the item
      e.preventDefault();
      e.stopPropagation();
      isProcessingDrop = true;

      // Add a direct destroy option as a fallback
      const shouldConfirm = true; // Set to false to bypass confirmation
      if (shouldConfirm) {
        showDestroyConfirmation(e);
      } else {
        destroyItem();
      }
      return;
    }

    console.log('Found panel with ID:', panel.id);

    const panelRect = panel.getBoundingClientRect();
    const isOutside =
      e.clientX < panelRect.left ||
      e.clientX > panelRect.right ||
      e.clientY < panelRect.top ||
      e.clientY > panelRect.bottom;

    console.log('Drop position:', e.clientX, e.clientY);
    console.log('Panel bounds:', panelRect.left, panelRect.right, panelRect.top, panelRect.bottom);
    console.log('Is outside panel:', isOutside);

    // If outside the panel, destroy the item
    if (isOutside) {
      e.preventDefault();
      e.stopPropagation();
      isProcessingDrop = true;

      // Add a direct destroy option as a fallback
      const shouldConfirm = true; // Set to false to bypass confirmation
      if (shouldConfirm) {
        showDestroyConfirmation(e);
      } else {
        destroyItem();
      }
    }
  });
  
  // Grid click (including Ctrl+Click for selling and Double-Click for equipping)
  gridContainer?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const itemEl = target.closest('.inventory-item, .grid-item') as HTMLElement;
    if (!itemEl) return;

    const uid = itemEl.dataset.uid || itemEl.dataset.itemId;
    if (!uid) return;

    // Find item in grid
    const gridItem = currentInventory.items.find(i => i.item.uid === uid);
    if (!gridItem) return;

    // Handle Ctrl+Click for selling
    if (e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      handleQuickSell(gridItem.item);
      return;
    }
  });

  // Double-click to equip items
  gridContainer?.addEventListener('dblclick', (e) => {
    const target = e.target as HTMLElement;
    const itemEl = target.closest('.inventory-item, .grid-item') as HTMLElement;
    if (!itemEl) return;

    const uid = itemEl.dataset.uid || itemEl.dataset.itemId;
    if (!uid) return;

    // Find item in grid
    const gridItem = currentInventory.items.find(i => i.item.uid === uid);
    if (!gridItem) return;

    // Check if item is a map - don't try to equip maps
    const base = getItemBase(gridItem.item.baseId);
    if (base && base.slot === 'map') {
      console.log('[Inventory] Cannot equip maps via double-click');
      return; // Maps are not equippable
    }

    e.preventDefault();
    e.stopPropagation();

    // Try to equip the item
    handleDoubleClickEquip(gridItem.item);
  });
  
  // Grid drag start
  gridContainer?.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement;
    const itemEl = target.closest('.inventory-item, .grid-item') as HTMLElement;
    if (!itemEl) {
      console.warn('Drag start: No item element found');
      return;
    }
    
    const uid = itemEl.dataset.uid || itemEl.dataset.itemId;
    if (!uid) {
      console.warn('Drag start: No UID found on item element');
      return;
    }
    
    console.log(`Drag start: Item with UID ${uid}`);
    
    // Find item in grid
    const gridItem = currentInventory.items.find(i => i.item.uid === uid);
    if (gridItem) {
      console.log(`Found item in grid at position ${gridItem.x},${gridItem.y}`);
      draggedItem = {
        item: gridItem.item,
        fromGridPos: { x: gridItem.x, y: gridItem.y },
      };
      itemEl.classList.add('dragging');

      // Set drag data for external drops (like map device)
      const dragData = {
        type: 'inventory-item',
        item: gridItem.item,
        fromInventory: true
      };
      e.dataTransfer!.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer!.effectAllowed = 'move';
    } else {
      console.error(`Item with UID ${uid} not found in inventory`);
    }
  });
  
  gridContainer?.addEventListener('dragend', (e) => {
    console.log('Drag end event fired');
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
    
    // Don't clear draggedItem here - we need it for the document drop handler
    // The document drop handler will clear it after processing
    // Instead, use a timeout to clear it if no drop event occurs
    setTimeout(() => {
      if (draggedItem) {
        console.log('Clearing dragged item reference after timeout');
        draggedItem = null;
      }
    }, 100);
    
    clearHoverStates();
  });
  
  // Grid drop
  gridContainer?.addEventListener('dragover', (e) => {
    e.preventDefault();
    handleGridDragOver(e);
  });
  
  gridContainer?.addEventListener('drop', (e) => {
    e.preventDefault();
    handleGridDrop(e);
  });
  
  // Equipment slot drag start
  equipSlots.forEach((slotEl) => {
    slotEl.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('grid-item')) return;
      
      const uid = target.dataset.uid;
      const slot = (slotEl as HTMLElement).dataset.slot as ItemSlot;
      if (!uid || !slot) return;
      
      const item = currentEquipment[slot];
      if (item && item.uid === uid) {
        draggedItem = {
          item,
          fromSlot: slot,
        };
        target.classList.add('dragging');

        // Set drag data for external drops (like map device)
        const dragData = {
          type: 'inventory-item',
          item: item,
          fromEquipment: true,
          slot: slot
        };
        e.dataTransfer!.setData('application/json', JSON.stringify(dragData));
        e.dataTransfer!.effectAllowed = 'move';
      }
    });
    
    slotEl.addEventListener('dragend', (e) => {
      console.log('Equipment slot drag end event fired');
      const target = e.target as HTMLElement;
      target.classList.remove('dragging');
      
      // Don't clear draggedItem here - we need it for the document drop handler
      // The document drop handler will clear it after processing
      // Instead, use a timeout to clear it if no drop event occurs
      setTimeout(() => {
        if (draggedItem) {
          console.log('Clearing dragged item reference after timeout');
          draggedItem = null;
        }
      }, 100);
      
      clearHoverStates();
    });
    
    // Equipment drop
    slotEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      handleEquipDragOver(e, slotEl as HTMLElement);
    });
    
    slotEl.addEventListener('drop', (e) => {
      e.preventDefault();
      handleEquipDrop(slotEl as HTMLElement);
    });

    // Double-click to unequip items
    slotEl.addEventListener('dblclick', (e) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('grid-item')) return;

      const uid = target.dataset.uid;
      const slot = (slotEl as HTMLElement).dataset.slot as ItemSlot;
      if (!uid || !slot) return;

      const item = currentEquipment[slot];
      if (item && item.uid === uid) {
        e.preventDefault();
        e.stopPropagation();
        handleDoubleClickUnequip(slot);
      }
    });
  });
  
  // Setup tooltips
  setupTooltips();

  // Setup dynamic tooltip updates for Shift key
  setupTooltipKeyListeners();
}

function handleGridDragOver(e: DragEvent): void {
  if (!draggedItem) return;
  
  const target = e.target as HTMLElement;
  let cellX = -1;
  let cellY = -1;
  
  // First try to find cell directly from DOM
  if (target.classList.contains('grid-cell') || target.classList.contains('inv-cell')) {
    cellX = parseInt(target.dataset.x || '-1');
    cellY = parseInt(target.dataset.y || '-1');
  } else if (target.closest('.grid-cell') || target.closest('.inv-cell')) {
    const cell = target.closest('.grid-cell') || target.closest('.inv-cell');
    if (cell) {
      cellX = parseInt((cell as HTMLElement).dataset.x || '-1');
      cellY = parseInt((cell as HTMLElement).dataset.y || '-1');
    }
  }
  
  // Fallback to geometry if DOM lookup failed
  if (cellX === -1 || cellY === -1) {
    const gridContainer = document.getElementById('invc-grid');
    if (gridContainer) {
      // Calculate position based on mouse coordinates
      const rect = gridContainer.getBoundingClientRect();
      syncMetrics(gridContainer);
      const { cell, gap, padLeft, padTop } = gridMetrics;
      
      const relX = e.clientX - rect.left - padLeft;
      const relY = e.clientY - rect.top - padTop;
      const stride = cell + gap;
      
      cellX = Math.floor(relX / stride);
      cellY = Math.floor(relY / stride);
      
      // Ensure coordinates are within bounds
      cellX = Math.max(0, Math.min(cellX, currentInventory.width - 1));
      cellY = Math.max(0, Math.min(cellY, currentInventory.height - 1));
    }
  }
  
  console.log(`Grid dragover at cell: ${cellX},${cellY}`);
  
  clearHoverStates();
  
  // Check if can place
  const excludeUid = draggedItem.fromGridPos ? draggedItem.item.uid : undefined;
  const canPlace = canPlaceItem(currentInventory, draggedItem.item, cellX, cellY, excludeUid);
  
  console.log(`Can place item: ${canPlace}`);
  
  highlightGridCells(cellX, cellY, draggedItem.item, canPlace);
}

function handleGridDrop(e: DragEvent): void {
  if (!draggedItem) return;
  
  console.log('Grid drop event detected');
  
  const target = e.target as HTMLElement;
  let cellX = -1;
  let cellY = -1;
  
  // First try to find cell directly from DOM
  if (target.classList.contains('grid-cell') || target.classList.contains('inv-cell')) {
    cellX = parseInt(target.dataset.x || '-1');
    cellY = parseInt(target.dataset.y || '-1');
  } else if (target.closest('.grid-cell') || target.closest('.inv-cell')) {
    const cell = target.closest('.grid-cell') || target.closest('.inv-cell');
    if (cell) {
      cellX = parseInt((cell as HTMLElement).dataset.x || '-1');
      cellY = parseInt((cell as HTMLElement).dataset.y || '-1');
    }
  }
  
  // Fallback to geometry if DOM lookup failed
  if (cellX === -1 || cellY === -1) {
    const gridContainer = document.getElementById('invc-grid');
    if (gridContainer) {
      // Calculate position based on mouse coordinates
      const rect = gridContainer.getBoundingClientRect();
      syncMetrics(gridContainer);
      const { cell, gap, padLeft, padTop } = gridMetrics;
      
      const relX = e.clientX - rect.left - padLeft;
      const relY = e.clientY - rect.top - padTop;
      const stride = cell + gap;
      
      cellX = Math.floor(relX / stride);
      cellY = Math.floor(relY / stride);
      
      // Ensure coordinates are within bounds
      cellX = Math.max(0, Math.min(cellX, currentInventory.width - 1));
      cellY = Math.max(0, Math.min(cellY, currentInventory.height - 1));
    }
  }
  
  console.log(`Grid drop at cell: ${cellX},${cellY}`);
  
  // Remove from source
  if (draggedItem.fromSlot) {
    // Unequip
    console.log(`Removing item from equipment slot: ${draggedItem.fromSlot}`);
    currentEquipment[draggedItem.fromSlot] = undefined;
  } else if (draggedItem.fromGridPos) {
    // Move within grid
    console.log(`Removing item from grid position: ${draggedItem.fromGridPos.x},${draggedItem.fromGridPos.y}`);
    removeItemFromGrid(currentInventory, draggedItem.item.uid);
  }
  
  // Add to grid
  console.log(`Attempting to place item at: ${cellX},${cellY}`);
  const placed = addItemToGrid(currentInventory, draggedItem.item, cellX, cellY);
  console.log(`Item placement success: ${placed}`);
  
  if (!placed) {
    // Failed to place, put back
    console.log('Failed to place item, returning to original position');
    if (draggedItem.fromSlot) {
      currentEquipment[draggedItem.fromSlot] = draggedItem.item;
    } else if (draggedItem.fromGridPos) {
      addItemToGrid(currentInventory, draggedItem.item, draggedItem.fromGridPos.x, draggedItem.fromGridPos.y);
    }
  }
  
  clearHoverStates();
  renderGrid();
  renderEquipment();
  
  if (onInventoryChange) {
    console.log('Calling onInventoryChange callback');
    onInventoryChange();
  } else {
    console.warn('No onInventoryChange callback registered');
  }
}

function handleEquipDragOver(e: DragEvent, slotEl: HTMLElement): void {
  if (!draggedItem) return;
  
  const slot = slotEl.dataset.slot as ItemSlot;
  const base = getItemBase(draggedItem.item.baseId);
  if (!base) return;
  
  // Check if item can go in this slot
  const canEquip = base.slot === slot || (base.slot === 'ring' && (slot === 'ring' || slot === 'ring2'));
  
  slotEl.classList.remove('can-drop', 'cannot-drop');
  if (canEquip) {
    slotEl.classList.add('can-drop');
  } else {
    slotEl.classList.add('cannot-drop');
  }
}

function handleEquipDrop(slotEl: HTMLElement): void {
  if (!draggedItem) return;
  
  const slot = slotEl.dataset.slot as ItemSlot;
  const base = getItemBase(draggedItem.item.baseId);
  if (!base) return;
  
  // Check if item can go in this slot
  const canEquip = base.slot === slot || (base.slot === 'ring' && (slot === 'ring' || slot === 'ring2'));
  if (!canEquip) {
    clearHoverStates();
    return;
  }
  
  // Remove from source
  if (draggedItem.fromSlot) {
    // Swap equipment
    const existing = currentEquipment[slot];
    currentEquipment[draggedItem.fromSlot] = existing;
    currentEquipment[slot] = draggedItem.item;
  } else if (draggedItem.fromGridPos) {
    // Equip from grid
    const existing = currentEquipment[slot];
    const removed = removeItemFromGrid(currentInventory, draggedItem.item.uid);
    if (!removed) {
      console.error(`Failed to remove item ${draggedItem.item.uid} from grid during equip`);
      clearHoverStates();
      return;
    }
    currentEquipment[slot] = draggedItem.item;

    // Put existing item back in grid if there was one
    if (existing) {
      // Find any available space in inventory
      if (!addItem(existing)) {
        console.error('Failed to place existing equipped item back in inventory - inventory may be full');
        // Put it back in equipment slot (swap failed)
        currentEquipment[slot] = existing;
        clearHoverStates();
        renderGrid();
        renderEquipment();
        return;
      }
    }
  }
  
  clearHoverStates();
  renderGrid();
  renderEquipment();
  
  if (onInventoryChange) {
    onInventoryChange();
  }
}

function highlightGridCells(x: number, y: number, item: ItemInstance, valid: boolean): void {
  const base = getItemBase(item.baseId);
  if (!base) return;
  
  const gridContainer = document.getElementById('invc-grid');
  if (!gridContainer) return;
  
  console.log(`Highlighting cells for item at ${x},${y} with size ${base.size?.w || 1}x${base.size?.h || 1}, valid: ${valid}`);
  
  // Get all cells
  const cells = gridContainer.querySelectorAll('.inv-cell, .grid-cell');
  
  // Clear any existing highlights first
  cells.forEach(cell => {
    (cell as HTMLElement).classList.remove('hover-valid', 'hover-invalid');
  });
  
  // Calculate item dimensions
  const itemWidth = base.size?.w || 1;
  const itemHeight = base.size?.h || 1;
  
  // Apply new highlights
  cells.forEach((cell) => {
    const cellEl = cell as HTMLElement;
    const cx = parseInt(cellEl.dataset.x || '-1');
    const cy = parseInt(cellEl.dataset.y || '-1');
    
    // Only process cells with valid coordinates
    if (cx !== -1 && cy !== -1) {
      // Check if this cell is within the item's footprint
      if (cx >= x && cx < x + itemWidth && cy >= y && cy < y + itemHeight) {
        cellEl.classList.add(valid ? 'hover-valid' : 'hover-invalid');
      }
    }
  });
}

function clearHoverStates(): void {
  // Clear grid cell hover states
  document.querySelectorAll('#invc-grid .inv-cell, #invc-grid .grid-cell').forEach((cell) => {
    (cell as HTMLElement).classList.remove('hover-valid', 'hover-invalid');
  });
  
  // Clear equipment slot hover states
  document.querySelectorAll('#invc-equip .equip-slot').forEach((slot) => {
    (slot as HTMLElement).classList.remove('can-drop', 'cannot-drop');
  });
  
  // Clear any debug elements
  const debugEl = document.getElementById('drag-debug');
  if (debugEl && debugEl.parentNode) {
    debugEl.parentNode.removeChild(debugEl);
  }
}

function setupTooltips(): void {
  const gridContainer = document.getElementById('invc-grid');
  const equipSlots = document.querySelectorAll('#invc-equip .equip-slot');
  
  // Grid tooltips
  gridContainer?.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    const itemEl = target.closest('.inventory-item, .grid-item') as HTMLElement;
    if (!itemEl) return;

    const uid = itemEl.dataset.uid || itemEl.dataset.itemId;
    if (!uid) return;

    const gridItem = currentInventory.items.find(i => i.item.uid === uid);
    if (gridItem) {
      showItemTooltip(e, gridItem.item);
    }
  });
  
  gridContainer?.addEventListener('mouseout', (e) => {
    const target = e.target as HTMLElement;
    const itemEl = target.closest('.inventory-item, .grid-item');
    if (itemEl) {
      hideItemTooltip();
    }
  });
  
  // Equipment tooltips
  equipSlots.forEach((slotEl) => {
    slotEl.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('grid-item')) return;
      
      const uid = target.dataset.uid;
      const slot = (slotEl as HTMLElement).dataset.slot as ItemSlot;
      if (!uid || !slot) return;
      
      const item = currentEquipment[slot];
      if (item && item.uid === uid) {
        showItemTooltip(e, item);
      }
    });
    
    slotEl.addEventListener('mouseout', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('grid-item')) {
        hideItemTooltip();
      }
    });
  });
}

function showItemTooltip(e: MouseEvent, item: ItemInstance, isComparison?: boolean): void {
  const tooltip = document.getElementById('invc-item-tooltip');
  if (!tooltip) return;

  const base = getItemBase(item.baseId);
  if (!base) return;

  const nameEl = tooltip.querySelector('.tooltip-item-name');
  const typeEl = tooltip.querySelector('.tooltip-item-type');
  const affixesEl = tooltip.querySelector('.tooltip-affixes');

  if (!nameEl || !typeEl || !affixesEl) return;

  // Check if Shift is held for comparison tooltip
  const isShiftPressed = e.shiftKey;
  const equippedItem = isShiftPressed ? getEquippedItemForComparison(item) : null;

  // Set content
  if (equippedItem && equippedItem.equipped) {
    // Comparison tooltip
    nameEl.textContent = `${base.name} (vs ${equippedItem.equippedName})`;
    (nameEl as HTMLElement).style.color = RarityColors[item.rarity];
    typeEl.textContent = `Comparing: ${base.slot}`;
  } else {
    // Regular tooltip
    nameEl.textContent = base.name;
    (nameEl as HTMLElement).style.color = RarityColors[item.rarity];
    typeEl.textContent = base.slot;
  }

  // Format affixes
  const statLabels: Record<string, string> = {
    str: 'Strength',
    dex: 'Dexterity',
    int: 'Intelligence',
    hp_flat: 'Maximum Life',
    mp_flat: 'Maximum Mana',
    melee_pct: 'Melee Damage',
    bow_pct: 'Bow Damage',
    armor: 'Armor',
    evasion: 'Evasion',
  };

  const affixLines: string[] = [];
  
  // Check if this is a map item and show map modifiers
  if (base.slot === 'map' && base.mapMods) {
    const mods = base.mapMods;
    
    if (mods.areaLevel) {
      affixLines.push(`<span style="color: #88f">Area Level: ${mods.areaLevel}</span>`);
    }
    if (mods.monsterPackSize && mods.monsterPackSize !== 1.0) {
      const pct = Math.round((mods.monsterPackSize - 1) * 100);
      affixLines.push(`<span style="color: #f88">${pct > 0 ? '+' : ''}${pct}% Monster Pack Size</span>`);
    }
    if (mods.monsterRarity && mods.monsterRarity > 0) {
      const pct = Math.round(mods.monsterRarity * 100);
      affixLines.push(`<span style="color: #f88">${pct}% Rare Monsters</span>`);
    }
    if (mods.monsterLevel && mods.monsterLevel !== 0) {
      affixLines.push(`<span style="color: #f88">${mods.monsterLevel > 0 ? '+' : ''}${mods.monsterLevel} Monster Level</span>`);
    }
    if (mods.itemQuantity && mods.itemQuantity !== 1.0) {
      const pct = Math.round((mods.itemQuantity - 1) * 100);
      affixLines.push(`<span style="color: #8f8">${pct > 0 ? '+' : ''}${pct}% Item Quantity</span>`);
    }
    if (mods.itemRarity && mods.itemRarity > 0) {
      const pct = Math.round(mods.itemRarity * 100);
      affixLines.push(`<span style="color: #8f8">${pct}% Item Rarity</span>`);
    }
    if (mods.bossChance && mods.bossChance > 0) {
      const pct = Math.round(mods.bossChance * 100);
      affixLines.push(`<span style="color: #f8f">${pct}% Boss Chance</span>`);
    }
  } else if (equippedItem && equippedItem.equipped) {
    // Show comparison format for equipment
    const comparison = generateStatComparison(item, equippedItem.equipped);
    for (const line of comparison) {
      affixLines.push(line);
    }
  } else {
    // Regular format for equipment/weapons
    for (const affix of item.affixes) {
      const label = statLabels[affix.stat] || affix.stat;
      const isPercent = affix.stat.endsWith('_pct');
      const formatted = isPercent ? `+${affix.value}%` : `+${affix.value}`;
      affixLines.push(`${formatted} ${label}`);
    }
  }

  affixesEl.innerHTML = affixLines.map(line => `<div>${line}</div>`).join('');

  // Set border color based on rarity
  tooltip.className = `item-tooltip ${item.rarity}`;

  // Position tooltip
  const rect = (e.target as HTMLElement).getBoundingClientRect();
  tooltip.style.left = `${rect.right + 10}px`;
  tooltip.style.top = `${rect.top}px`;

  tooltip.classList.remove('hidden');
}

function hideItemTooltip(): void {
  const tooltip = document.getElementById('invc-item-tooltip');
  if (tooltip) {
    tooltip.classList.add('hidden');
  }
}

/** Get the equipped item for comparison with the given item */
function getEquippedItemForComparison(item: ItemInstance): { equipped: ItemInstance | null; equippedName: string } | null {
  const base = getItemBase(item.baseId);
  if (!base) return null;

  const targetSlot: ItemSlot = base.slot as ItemSlot;

  // Handle ring slots - check both ring slots
  if (targetSlot === 'ring') {
    const ring1 = currentEquipment.ring;
    const ring2 = currentEquipment.ring2;

    // If hovering over ring, compare with ring, otherwise compare with ring2
    // For simplicity, we'll compare with the first occupied ring slot
    if (ring1) {
      const ring1Base = getItemBase(ring1.baseId);
      return { equipped: ring1, equippedName: ring1Base?.name || 'Ring' };
    } else if (ring2) {
      const ring2Base = getItemBase(ring2.baseId);
      return { equipped: ring2, equippedName: ring2Base?.name || 'Ring' };
    }
    return { equipped: null, equippedName: 'Ring' };
  }

  // For other slots, get the equipped item
  const equipped = currentEquipment[targetSlot];
  if (equipped) {
    const equippedBase = getItemBase(equipped.baseId);
    return { equipped, equippedName: equippedBase?.name || targetSlot };
  }

  return { equipped: null, equippedName: targetSlot };
}

/** Generate stat comparison between two items */
function generateStatComparison(item1: ItemInstance, item2: ItemInstance): string[] {
  const statLabels: Record<string, string> = {
    str: 'Strength',
    dex: 'Dexterity',
    int: 'Intelligence',
    hp_flat: 'Maximum Life',
    mp_flat: 'Maximum Mana',
    melee_pct: 'Melee Damage',
    bow_pct: 'Bow Damage',
    armor: 'Armor',
    evasion: 'Evasion',
  };

  // Collect all unique stats from both items
  const allStats = new Set<string>();
  item1.affixes.forEach(affix => allStats.add(affix.stat));
  item2.affixes.forEach(affix => allStats.add(affix.stat));

  const comparisonLines: string[] = [];

  for (const stat of allStats) {
    const item1Affix = item1.affixes.find(a => a.stat === stat);
    const item2Affix = item2.affixes.find(a => a.stat === stat);

    const item1Value = item1Affix?.value || 0;
    const item2Value = item2Affix?.value || 0;
    const diff = item1Value - item2Value;

    const label = statLabels[stat] || stat;
    const isPercent = stat.endsWith('_pct');

    // Format values
    const formatValue = (val: number) => isPercent ? `${val}%` : val.toString();

    let line = '';
    if (diff > 0) {
      line = `<span style="color: #00ff00">+${formatValue(item1Value)} ${label} (+${formatValue(diff)})</span>`;
    } else if (diff < 0) {
      line = `<span style="color: #ff0000">+${formatValue(item1Value)} ${label} (${formatValue(diff)})</span>`;
    } else {
      line = `<span style="color: #ffff00">+${formatValue(item1Value)} ${label} (same)</span>`;
    }

    comparisonLines.push(line);
  }

  return comparisonLines;
}

/** Setup key listeners for dynamic tooltip updates */
function setupTooltipKeyListeners(): void {
  // Track currently hovered item for tooltip updates
  let hoveredItem: { element: HTMLElement; item: ItemInstance } | null = null;

  // Store original mouseover handler references to update tooltips dynamically
  const originalGridMouseOver = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const itemEl = target.closest('.inventory-item, .grid-item') as HTMLElement;
    if (!itemEl) return;

    const uid = itemEl.dataset.uid || itemEl.dataset.itemId;
    if (!uid) return;

    const gridItem = currentInventory.items.find(i => i.item.uid === uid);
    if (gridItem) {
      hoveredItem = { element: itemEl, item: gridItem.item };
      showItemTooltip(e, gridItem.item);
    }
  };

  const originalEquipMouseOver = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('grid-item')) return;

    const uid = target.dataset.uid;
    const slot = (target.closest('.equip-slot') as HTMLElement)?.dataset.slot as ItemSlot;
    if (!uid || !slot) return;

    const item = currentEquipment[slot];
    if (item && item.uid === uid) {
      hoveredItem = { element: target, item };
      showItemTooltip(e, item);
    }
  };

  // Override the existing mouseover handlers to track hovered items
  const gridContainer = document.getElementById('invc-grid');
  const equipSlots = document.querySelectorAll('#invc-equip .equip-slot');

  // Remove existing mouseover handlers and add our tracking versions
  gridContainer?.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    const itemEl = target.closest('.inventory-item, .grid-item') as HTMLElement;
    if (!itemEl) return;

    const uid = itemEl.dataset.uid || itemEl.dataset.itemId;
    if (!uid) return;

    const gridItem = currentInventory.items.find(i => i.item.uid === uid);
    if (gridItem) {
      hoveredItem = { element: itemEl, item: gridItem.item };
      showItemTooltip(e, gridItem.item);
    }
  });

  equipSlots.forEach((slotEl) => {
    slotEl.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('grid-item')) return;

      const uid = target.dataset.uid;
      const slot = (slotEl as HTMLElement).dataset.slot as ItemSlot;
      if (!uid || !slot) return;

      const item = currentEquipment[slot];
      if (item && item.uid === uid) {
        hoveredItem = { element: target, item };
        showItemTooltip(e, item);
      }
    });
  });

  // Add key listeners to update tooltip when Shift is pressed/released
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift' && hoveredItem) {
      // Create a synthetic mouse event to pass to showItemTooltip
      const syntheticEvent = {
        target: hoveredItem.element,
        shiftKey: true,
        clientX: 0,
        clientY: 0
      } as MouseEvent;
      showItemTooltip(syntheticEvent, hoveredItem.item);
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' && hoveredItem) {
      // Create a synthetic mouse event to pass to showItemTooltip
      const syntheticEvent = {
        target: hoveredItem.element,
        shiftKey: false,
        clientX: 0,
        clientY: 0
      } as MouseEvent;
      showItemTooltip(syntheticEvent, hoveredItem.item);
    }
  });

  // Clear hovered item on mouseout
  gridContainer?.addEventListener('mouseout', () => {
    hoveredItem = null;
  });

  equipSlots.forEach((slotEl) => {
    slotEl.addEventListener('mouseout', () => {
      hoveredItem = null;
    });
  });
}

/** Handle double-click equipping */
function handleDoubleClickEquip(item: ItemInstance): void {
  const base = getItemBase(item.baseId);
  if (!base) return;

  // Determine the target slot for this item
  let targetSlot: ItemSlot = base.slot as ItemSlot;

  // Handle ring slots - prefer ring if empty, otherwise ring2
  if (targetSlot === 'ring') {
    if (!currentEquipment.ring) {
      targetSlot = 'ring';
    } else if (!currentEquipment.ring2) {
      targetSlot = 'ring2';
    } else {
      targetSlot = 'ring'; // Default to ring if both are occupied
    }
  }

  // Try to equip the item
  const existing = currentEquipment[targetSlot];
  const removed = removeItemFromGrid(currentInventory, item.uid);
  if (!removed) {
    console.error(`Failed to remove item ${item.uid} from grid during double-click equip`);
    return;
  }

  currentEquipment[targetSlot] = item;

  // Put existing item back in grid if there was one
  if (existing) {
    // Find any available space in inventory
    if (!addItem(existing)) {
      console.error('Failed to place existing equipped item back in inventory - inventory may be full');
      // Put it back in equipment slot (swap failed)
      currentEquipment[targetSlot] = existing;
      renderGrid();
      renderEquipment();
      return;
    }
  }

  // Update UI
  renderGrid();
  renderEquipment();

  if (onInventoryChange) {
    onInventoryChange();
  }
}

/** Handle double-click unequipping */
function handleDoubleClickUnequip(slot: ItemSlot): void {
  const item = currentEquipment[slot];
  if (!item) return;

  // Remove item from equipment slot
  currentEquipment[slot] = undefined;

  // Try to add item back to inventory
  if (!addItem(item)) {
    console.error('Failed to unequip item - inventory may be full');
    // Put it back in equipment slot if inventory is full
    currentEquipment[slot] = item;
    return;
  }

  // Update UI
  renderGrid();
  renderEquipment();

  if (onInventoryChange) {
    onInventoryChange();
  }
}

/** Handle Ctrl+Click quick sell functionality */
function handleQuickSell(item: ItemInstance): void {
  if (!isVendorOpen()) {
    console.log('Open Vendor to sell items (Ctrl+Click)');
    return;
  }
  
  // Calculate sell price
  const gold = priceOf(item);
  
  // Remove item from inventory
  removeItemFromGrid(currentInventory, item.uid);
  
  // Add gold via vendor system
  const actualGold = sellItemToVendor(item);
  
  // Refresh inventory display
  renderGrid();
  if (onInventoryChange) onInventoryChange();
  
  console.log(`Sold ${getItemBase(item.baseId)?.name || 'item'} for ${actualGold} gold`);
}

/** Show confirmation dialog for destroying an item */
function showDestroyConfirmation(e: DragEvent): void {
  console.log('Showing destroy confirmation dialog');
  
  if (!draggedItem) {
    console.error('Cannot show destroy confirmation: draggedItem is null');
    return;
  }
  
  const base = getItemBase(draggedItem.item.baseId);
  const itemName = base ? base.name : 'Unknown Item';
  const itemRarity = draggedItem.item.rarity;
  
  console.log(`Confirming destruction of: ${itemName} (${draggedItem.item.uid})`);
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'destroy-overlay';
  overlay.id = 'destroy-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  // Create confirmation dialog
  const dialog = document.createElement('div');
  dialog.className = 'destroy-dialog';
  dialog.style.cssText = `
    background-color: #222;
    border: 2px solid ${RarityColors[itemRarity]};
    border-radius: 8px;
    padding: 20px;
    width: 300px;
    text-align: center;
    color: #eee;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  `;
  
  dialog.innerHTML = `
    <div style="font-size: 18px; margin-bottom: 15px;">Destroy Item?</div>
    <div style="font-size: 16px; margin-bottom: 20px; color: ${RarityColors[itemRarity]};">${itemName}</div>
    <div style="display: flex; justify-content: space-around;">
      <button id="destroy-confirm" style="
        background-color: #a00;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      ">Destroy</button>
      <button id="destroy-cancel" style="
        background-color: #444;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      ">Cancel</button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Store a reference to the dragged item in case it gets cleared elsewhere
  const itemToDestroy = { ...draggedItem };
  
  // Add event listeners
  const confirmBtn = document.getElementById('destroy-confirm');
  const cancelBtn = document.getElementById('destroy-cancel');
  
  confirmBtn?.addEventListener('click', () => {
    console.log('Destroy confirmed by user');
    // Make sure we still have the item reference
    if (!draggedItem && itemToDestroy) {
      console.log('Restoring dragged item reference from stored copy');
      draggedItem = itemToDestroy;
    }
    
    // Actually destroy the item
    destroyItem();
    
    // Remove the overlay
    const overlayEl = document.getElementById('destroy-overlay');
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
    }
  });
  
  cancelBtn?.addEventListener('click', () => {
    console.log('Destroy cancelled by user');
    // Just close the dialog
    const overlayEl = document.getElementById('destroy-overlay');
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
    }
  });
  
  // Close if clicking outside the dialog
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      console.log('Destroy cancelled by clicking outside');
      const overlayEl = document.getElementById('destroy-overlay');
      if (overlayEl && overlayEl.parentNode) {
        overlayEl.parentNode.removeChild(overlayEl);
      }
    }
  });
}

/** Actually destroy the dragged item */
function destroyItem(): void {
  if (!draggedItem) {
    console.error('Cannot destroy item: draggedItem is null');
    return;
  }
  
  const base = getItemBase(draggedItem.item.baseId);
  const itemName = base ? base.name : 'Unknown Item';
  
  console.log(`Attempting to destroy item: ${itemName} (${draggedItem.item.uid})`);
  console.log('Dragged item details:', JSON.stringify({
    uid: draggedItem.item.uid,
    name: base?.name,
    fromSlot: draggedItem.fromSlot,
    fromGridPos: draggedItem.fromGridPos
  }));
  
  // Show destruction effect
  const destroyEffect = document.createElement('div');
  destroyEffect.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: #ff6666;
    padding: 20px;
    border-radius: 8px;
    border: 2px solid #ff3333;
    font-weight: bold;
    z-index: 10000;
    text-align: center;
  `;
  
  destroyEffect.innerHTML = `
    <div style="margin-bottom: 15px; font-size: 18px;">
      Item Destroyed!
    </div>
    <div style="margin-bottom: 10px; color: ${RarityColors[draggedItem.item.rarity]}">
      ${itemName}
    </div>
  `;
  
  document.body.appendChild(destroyEffect);
  
  // Remove effect after 1.5 seconds
  setTimeout(() => {
    if (destroyEffect.parentNode) {
      destroyEffect.parentNode.removeChild(destroyEffect);
    }
  }, 1500);
  
  // Log inventory state before removal
  console.log('Inventory before removal:', 
    currentInventory.items.map(i => ({
      uid: i.item.uid, 
      name: getItemBase(i.item.baseId)?.name,
      pos: `${i.x},${i.y}`
    }))
  );
  
  // Actually remove the item from its source
  if (draggedItem.fromSlot) {
    // Remove from equipment
    console.log(`Removing item from equipment slot: ${draggedItem.fromSlot}`);
    currentEquipment[draggedItem.fromSlot] = undefined;
  } else if (draggedItem.fromGridPos) {
    // Remove from grid
    console.log(`Removing item from grid position: ${draggedItem.fromGridPos.x},${draggedItem.fromGridPos.y}`);
    const removed = removeItemFromGrid(currentInventory, draggedItem.item.uid);
    console.log(`Item removal success: ${removed}`);
  } else {
    console.error('Cannot remove item: no source location (fromSlot or fromGridPos)');
  }
  
  // Log inventory state after removal
  console.log('Inventory after removal:', 
    currentInventory.items.map(i => ({
      uid: i.item.uid, 
      name: getItemBase(i.item.baseId)?.name,
      pos: `${i.x},${i.y}`
    }))
  );
  
  // Update UI
  renderGrid();
  renderEquipment();
  
  if (onInventoryChange) {
    console.log('Calling onInventoryChange callback');
    onInventoryChange();
  } else {
    console.warn('No onInventoryChange callback registered');
  }
  
  // Clear the dragged item reference and reset processing flag
  draggedItem = null;
  isProcessingDrop = false;
}

/** Get current equipment state */
export function getEquipment(): EquipmentState {
  return currentEquipment;
}

/** Get current inventory */
export function getInventory(): InventoryGrid {
  return currentInventory;
}

/** Add an item to inventory (finds first available space) */
export function addItem(item: ItemInstance): boolean {
  const base = getItemBase(item.baseId);
  if (!base) return false;
  
  // Find first available position
  for (let y = 0; y <= currentInventory.height - base.size.h; y++) {
    for (let x = 0; x <= currentInventory.width - base.size.w; x++) {
      if (canPlaceItem(currentInventory, item, x, y)) {
        addItemToGrid(currentInventory, item, x, y);
        renderGrid();
        if (onInventoryChange) onInventoryChange();
        return true;
      }
    }
  }
  
  return false; // Inventory full
}

/** Refresh the entire inventory display */
export function refreshInventoryCompact(): void {
  renderGrid();
  renderEquipment();
  
  // Re-enable selling hooks after re-rendering
  if (typeof (window as any).enableInventorySelling === 'function') {
    (window as any).enableInventorySelling();
  }
}

/** Setup the clear inventory button */
function setupClearButton(): void {
  console.log('Setting up clear inventory button...');

  // Try to find existing button first
  let clearBtn = document.getElementById('clear-inventory-btn');

  if (!clearBtn) {
    console.log('Button not found in HTML, creating it dynamically...');

    // Create the button dynamically
    clearBtn = document.createElement('button');
    clearBtn.id = 'clear-inventory-btn';
    clearBtn.className = 'clear-btn';
    clearBtn.title = 'Clear all unequipped items';
    clearBtn.innerHTML = '🗑️ Clear';
    clearBtn.style.cssText = `
      position: absolute !important;
      right: 50px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      z-index: 1000 !important;
      background: red !important;
      color: white !important;
      border: 3px solid white !important;
      font-weight: bold !important;
      font-size: 16px !important;
      padding: 10px 15px !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      box-shadow: 0 0 20px red !important;
    `;

    // Add to the header
    const header = document.querySelector('#inventoryCompact .ui-panel__header');
    if (header) {
      header.appendChild(clearBtn);
      console.log('Button created and added to header');
    } else {
      console.error('Header not found!');
      return;
    }
  } else {
    console.log('Button found in HTML');
  }

  // Add click handler
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all unequipped items from your inventory?')) {
      clearInventory();
    }
  });

  console.log('Clear inventory button setup complete');
}

/** Clear all unequipped items from inventory */
export function clearInventory(): void {
  // Filter out all items from the inventory (keep equipped items)
  currentInventory.items = [];

  renderGrid();

  if (onInventoryChange) {
    onInventoryChange();
  }
}

/** Update inventory data (call after loading a save or switching from standalone) */
export function updateInventoryData(equipment: EquipmentState, inventory: InventoryGrid): void {
  currentEquipment = equipment;
  currentInventory = inventory;
  renderGrid();
  renderEquipment();
}
