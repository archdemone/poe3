// Compact Inventory UI - Used when vendor is open side-by-side

import type { ItemInstance, EquipmentState, InventoryGrid, ItemSlot } from '../../../systems/items';
import { getItemBase, canPlaceItem, addItemToGrid, removeItemFromGrid, getItemAtPosition, RarityColors } from '../../../systems/items';
import { sellItemToVendor, priceOf } from '../../../gameplay/loot/vendor';
import { isVendorOpen } from '../../../../ui/layout';

let currentEquipment: EquipmentState = {};
let currentInventory: InventoryGrid = {
  width: 10,
  height: 6,
  items: [],
};

let draggedItem: { item: ItemInstance; fromSlot?: ItemSlot; fromGridPos?: { x: number; y: number } } | null = null;
let onInventoryChange: (() => void) | null = null;

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
}

/** Render the inventory grid */
function renderGrid(): void {
  const gridContainer = document.getElementById('invc-grid');
  if (!gridContainer) return;
  
  // Set grid dimensions
  gridContainer.style.setProperty('--cols', String(currentInventory.width));
  gridContainer.style.setProperty('--rows', String(currentInventory.height));
  
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
    const itemEl = createGridItemElement(gridItem.item, gridItem.x, gridItem.y);
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
function createGridItemElement(item: ItemInstance, gridX: number, gridY: number): HTMLElement {
  const base = getItemBase(item.baseId);
  if (!base) throw new Error(`Unknown item base: ${item.baseId}`);
  
  const el = document.createElement('div');
  el.className = `inventory-item ${item.rarity}`;
  el.dataset.uid = item.uid;
  el.dataset.itemId = item.uid;
  
  // Absolute positioning inside grid container
  const CELL = 46; // must match --cell in CSS
  const GAP = 2;   // must match --gap in CSS
  const PAD = 10;  // grid container padding

  const w = (base.size?.w ?? 1) * CELL + ((base.size?.w ?? 1) - 1) * GAP;
  const h = (base.size?.h ?? 1) * CELL + ((base.size?.h ?? 1) - 1) * GAP;
  el.style.position = 'absolute';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.left = `${PAD + gridX * (CELL + GAP)}px`;
  el.style.top = `${PAD + gridY * (CELL + GAP)}px`;
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
  const itemWidth = base.size?.w || 1;
  const itemHeight = base.size?.h || 1;
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
    // Only trigger if we have a dragged item
    if (!draggedItem) return;
    
    console.log('Document drop event detected with dragged item');
    
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
      
      // Add a direct destroy option as a fallback
      const shouldConfirm = true; // Set to false to bypass confirmation
      if (shouldConfirm) {
        showDestroyConfirmation(e);
      } else {
        destroyItem();
      }
    }
  });
  
  // Grid click (including Ctrl+Click for selling)
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
      
      // Set drag image and effect
      e.dataTransfer?.setData('text/plain', uid);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
      }
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
  });
  
  // Setup tooltips
  setupTooltips();
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
      const CELL = 46; // must match --cell in CSS
      const GAP = 2;   // must match --gap in CSS
      const PAD = 10;  // grid container padding
      
      const relX = e.clientX - rect.left - PAD;
      const relY = e.clientY - rect.top - PAD;
      const stride = CELL + GAP;
      
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
      const CELL = 46; // must match --cell in CSS
      const GAP = 2;   // must match --gap in CSS
      const PAD = 10;  // grid container padding
      
      const relX = e.clientX - rect.left - PAD;
      const relY = e.clientY - rect.top - PAD;
      const stride = CELL + GAP;
      
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
    removeItemFromGrid(currentInventory, draggedItem.item.uid);
    currentEquipment[slot] = draggedItem.item;
    
    // Put existing item back in grid if there was one
    if (existing && draggedItem.fromGridPos) {
      addItemToGrid(currentInventory, existing, draggedItem.fromGridPos.x, draggedItem.fromGridPos.y);
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

function showItemTooltip(e: MouseEvent, item: ItemInstance): void {
  const tooltip = document.getElementById('invc-item-tooltip');
  if (!tooltip) return;
  
  const base = getItemBase(item.baseId);
  if (!base) return;
  
  const nameEl = tooltip.querySelector('.tooltip-item-name');
  const typeEl = tooltip.querySelector('.tooltip-item-type');
  const affixesEl = tooltip.querySelector('.tooltip-affixes');
  
  if (!nameEl || !typeEl || !affixesEl) return;
  
  // Set content
  nameEl.textContent = base.name;
  (nameEl as HTMLElement).style.color = RarityColors[item.rarity];
  
  typeEl.textContent = base.slot;
  
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
  for (const affix of item.affixes) {
    const label = statLabels[affix.stat] || affix.stat;
    const isPercent = affix.stat.endsWith('_pct');
    const formatted = isPercent ? `+${affix.value}%` : `+${affix.value}`;
    affixLines.push(`${formatted} ${label}`);
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
  
  // Clear the dragged item reference
  draggedItem = null;
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

/** Update inventory data (call after loading a save or switching from standalone) */
export function updateInventoryData(equipment: EquipmentState, inventory: InventoryGrid): void {
  currentEquipment = equipment;
  currentInventory = inventory;
  renderGrid();
  renderEquipment();
}

