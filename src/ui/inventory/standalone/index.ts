// Inventory UI - Equipment and grid management with drag-and-drop

import type { ItemInstance, EquipmentState, InventoryGrid, ItemSlot } from '../../../systems/items';
import { getItemBase, canPlaceItem, addItemToGrid, removeItemFromGrid, getItemAtPosition, RarityColors } from '../../../systems/items';
import { sellItemToVendor, priceOf } from '../../../gameplay/loot/vendor';
import { isVendorOpen } from '../../../../ui/layout';

let currentEquipment: EquipmentState = {};
const EXTRA_ROWS = 0; // no extra rows
// Debug flag to help fix drag-drop issues
const DEBUG_DRAG = true;
let currentInventory: InventoryGrid = {
  width: 10,
  height: 6,
  items: [],
};

let draggedItem: { item: ItemInstance; fromSlot?: ItemSlot; fromGridPos?: { x: number; y: number } } | null = null;
let onInventoryChange: (() => void) | null = null;

/** Helper: get grid metrics from CSS so math stays in sync */
function getGridMetrics(gridContainer: HTMLElement) {
  const styles = getComputedStyle(gridContainer);
  const cell = parseInt(styles.getPropertyValue('--cell')) || 54;
  const gap = parseInt(styles.getPropertyValue('--gap')) || 2;
  const padLeft = parseInt(styles.paddingLeft) || 10;
  const padTop = parseInt(styles.paddingTop) || 10;
  return { cell, gap, padLeft, padTop };
}

// Fixed cell constants matching createGridItemElement hardcoded values
const CELL = 54;
const GAP = 2;
const PAD = 10;

/** Helper: map mouse position to grid coordinates */
function pointToCell(gridContainer: HTMLElement, clientX: number, clientY: number) {
  const rect = gridContainer.getBoundingClientRect();
  const relX = clientX - rect.left - PAD;
  const relY = clientY - rect.top - PAD;
  const stride = CELL + GAP;
  let x = Math.floor(relX / stride);
  let y = Math.floor(relY / stride);
  x = Math.max(0, Math.min(x, currentInventory.width - 1));
  y = Math.max(0, Math.min(y, currentInventory.height - 1));
  return { x, y };
}

/** Initialize standalone inventory UI */
export function initInventoryStandalone(
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
  const gridContainer = document.getElementById('inventory-grid');
  if (!gridContainer) return;
  
  // Set grid dimensions
  gridContainer.style.setProperty('--cols', String(currentInventory.width));
  const visualRows = currentInventory.height + EXTRA_ROWS;
  gridContainer.style.setProperty('--rows', String(visualRows));
  gridContainer.dataset.cols = String(currentInventory.width);
  const visualRowsDataset = currentInventory.height + EXTRA_ROWS;
  gridContainer.dataset.rows = String(visualRowsDataset);
  
  // Clear existing
  gridContainer.innerHTML = '';
  
  // Create background grid cells with coordinates
  for (let y = 0; y < currentInventory.height; y++) {
    for (let x = 0; x < currentInventory.width; x++) {
      const cell = document.createElement('div');
      cell.className = 'inv-cell grid-cell'; // Both classes for style + hit tests
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      
      // Add direct event listeners to each cell 
      if (DEBUG_DRAG) {
        cell.addEventListener('dragover', (e) => {
          e.preventDefault(); // Allow drop
          e.stopPropagation();
          
          if (draggedItem) {
            clearHoverStates();
            const excludeUid = draggedItem.fromGridPos ? draggedItem.item.uid : undefined;
            const canPlace = canPlaceItem(currentInventory, draggedItem.item, x, y, excludeUid);
            highlightGridCells(x, y, draggedItem.item, canPlace);
            
            // Debug info at panel top
            const debugEl = document.getElementById('drag-debug') || document.createElement('div');
            debugEl.id = 'drag-debug';
            debugEl.style.cssText = 'position:absolute; top:10px; left:10px; background:black; color:white; padding:5px; z-index:9999;';
            
            const base = getItemBase(draggedItem.item.baseId);
            const itemInfo = base ? `${base.name} (${base.size?.w || 1}x${base.size?.h || 1})` : 'Unknown';
            
            const occupiedItems = currentInventory.items.filter(item => {
              const ib = getItemBase(item.item.baseId);
              if (!ib) return false;
              
              // Check for overlap with this cell
              const ix = item.x;
              const iy = item.y;
              const iw = ib.size?.w || 1;
              const ih = ib.size?.h || 1;
              
              // Check if this item overlaps our target
              const isOverlap = (
                ix < x + (base?.size?.w || 1) && 
                ix + iw > x && 
                iy < y + (base?.size?.h || 1) && 
                iy + ih > y
              );
              
              return isOverlap;
            });
            
            let reason = '';
            if (!canPlace && occupiedItems.length > 0) {
              const itemNames = occupiedItems.map(i => {
                const b = getItemBase(i.item.baseId);
                return `${b?.name || 'Unknown'} at (${i.x},${i.y})`;
              }).join(', ');
              reason = `Overlaps: ${itemNames}`;
            } else if (!canPlace) {
              reason = 'Unknown reason';
            }
            
            debugEl.innerHTML = `
              Cell: ${x},${y}<br>
              Can place: ${canPlace}<br>
              Item: ${itemInfo}<br>
              ${reason}
            `;
            
            const panel = document.getElementById('inventoryStandalone');
            if (panel && !document.getElementById('drag-debug')) {
              panel.appendChild(debugEl);
            }
          }
        });
        
        cell.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (draggedItem) {
            // Remove from source
            if (draggedItem.fromSlot) {
              currentEquipment[draggedItem.fromSlot] = undefined;
            } else if (draggedItem.fromGridPos) {
              removeItemFromGrid(currentInventory, draggedItem.item.uid);
            }
            
            // Add to grid at exact coordinates
            const placed = addItemToGrid(currentInventory, draggedItem.item, x, y);
            if (!placed) {
              // Put back if couldn't place
              if (draggedItem.fromSlot) {
                currentEquipment[draggedItem.fromSlot] = draggedItem.item;
              } else if (draggedItem.fromGridPos) {
                addItemToGrid(currentInventory, draggedItem.item, 
                  draggedItem.fromGridPos.x, draggedItem.fromGridPos.y);
              }
            }
            
            clearHoverStates();
            renderGrid();
            renderEquipment();
            
            if (onInventoryChange) {
              onInventoryChange();
            }
          }
        });
      }
      
      gridContainer.appendChild(cell);
    }
  }
  
  // Render items appended so they overlay cells
  for (const gridItem of currentInventory.items) {
    const itemEl = createGridItemElement(gridItem.item, gridItem.x, gridItem.y);
    gridContainer.appendChild(itemEl);
  }
  
  // After rendering, ensure selling hooks are enabled
  import('../../../../ui/trade').then(({ enableInventorySelling }) => {
    enableInventorySelling();
  }).catch(() => {
    // Trade module not loaded yet, will be called from layout.ts
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
  
  // Size the element to match its logical dimensions in the inventory
  const CELL = 54;
  const GAP = 2;
  const PAD = 10;
  
  // Calculate width and height based on item size
  const itemWidth = base.size?.w || 1;
  const itemHeight = base.size?.h || 1;
  
  // Width and height including gaps between cells
  const w = itemWidth * CELL + (itemWidth - 1) * GAP;
  const h = itemHeight * CELL + (itemHeight - 1) * GAP;
  
  // Debug size
  console.log(`Item ${base.name} size: ${itemWidth}x${itemHeight}, rendering at ${w}x${h}px`);
  
  // Position element at grid coordinates
  el.style.position = 'absolute';
  
  // Force style with !important to override any CSS rules
  el.style.cssText = `
    position: absolute !important;
    width: ${w}px !important;
    height: ${h}px !important;
    left: ${PAD + gridX * (CELL + GAP)}px !important;
    top: ${PAD + gridY * (CELL + GAP)}px !important;
    z-index: 10 !important;
  `;
  
  // Create frame to show full size
  const frame = document.createElement('div');
  frame.className = 'item-frame';
  frame.textContent = base.icon || '?';
  frame.style.cssText = `
    width: 100% !important; 
    height: 100% !important; 
    display: flex !important; 
    align-items: center !important; 
    justify-content: center !important; 
    font-size: 1.8rem !important;
    background-color: rgba(40, 40, 50, 0.95) !important;
    border: 2px solid ${RarityColors[item.rarity]} !important;
    border-radius: 4px !important;
  `;
  
  // Add size indicator for debugging
  if (DEBUG_DRAG) {
    const sizeInfo = document.createElement('div');
    sizeInfo.style.cssText = 'position: absolute; bottom: 2px; right: 2px; font-size: 8px; color: white; background: rgba(0,0,0,0.5); padding: 1px 3px; border-radius: 2px;';
    sizeInfo.textContent = `${itemWidth}×${itemHeight}`;
    frame.appendChild(sizeInfo);
    
    // Optional: Add grid overlay to visualize cells
    if (itemWidth > 1 || itemHeight > 1) {
      el.style.background = `repeating-linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.05),
        rgba(255, 255, 255, 0.05) 10px,
        rgba(255, 255, 255, 0.1) 10px,
        rgba(255, 255, 255, 0.1) 20px
      )`;
    }
  }
  
  el.appendChild(frame);
  el.draggable = true;
  
  return el;
}

/** Render equipment slots */
function renderEquipment(): void {
  const slots: ItemSlot[] = [
    'weapon', 'offhand', 'helmet', 'chest', 'gloves',
    'boots', 'amulet', 'ring', 'ring2', 'belt',
  ];
  
  for (const slot of slots) {
    const slotEl = document.querySelector(`.equip-slot[data-slot="${slot}"]`);
    if (!slotEl) continue;
    
    const contentEl = slotEl.querySelector('.slot-content');
    if (!contentEl) continue;
    
    const item = currentEquipment[slot];
    if (item) {
      const base = getItemBase(item.baseId);
      if (base) {
        contentEl.innerHTML = `<div class="grid-item ${item.rarity}" data-uid="${item.uid}" draggable="true">${base.icon}</div>`;
      }
    } else {
      contentEl.innerHTML = '';
    }
  }
}

/** Setup drag and drop event handlers */
function setupDragAndDrop(): void {
  const gridContainer = document.getElementById('inventory-grid');
  const equipSlots = document.querySelectorAll('.equip-slot');
  const inventoryPanel = document.getElementById('inventoryStandalone');
  
  // Document-level events for item destruction
  document.addEventListener('dragover', (e) => {
    e.preventDefault(); // Always prevent default to allow drops anywhere
  });
  
  document.addEventListener('drop', (e) => {
    // Only trigger if we have a dragged item
    if (!draggedItem) return;
    
    console.log('Document drop event detected with dragged item in standalone inventory');
    
    // Check if we're outside the inventory panel
    // Try multiple possible panel IDs
    const panel = document.getElementById('inventoryStandalone') || 
                  document.getElementById('inventory-grid')?.closest('.panel');
    
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
    if (!itemEl) return;
    
    const uid = itemEl.dataset.uid || itemEl.dataset.itemId;
    if (!uid) return;
    
    // Find item in grid
    const gridItem = currentInventory.items.find(i => i.item.uid === uid);
    if (gridItem) {
      draggedItem = {
        item: gridItem.item,
        fromGridPos: { x: gridItem.x, y: gridItem.y },
      };
      itemEl.classList.add('dragging');
    }
  });
  
  gridContainer?.addEventListener('dragend', (e) => {
    console.log('Drag end event fired in standalone inventory');
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
      console.log('Equipment slot drag end event fired in standalone inventory');
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
  
  let cellX = -1, cellY = -1;
  
  // First try to find cell directly from DOM
  const target = e.target as HTMLElement;
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
    const gridContainer = document.getElementById('inventory-grid');
    if (gridContainer) {
      const pos = pointToCell(gridContainer, e.clientX, e.clientY);
      cellX = pos.x;
      cellY = pos.y;
    }
  }
  
  // Debug info - temporarily add to top of panel
  const debugEl = document.getElementById('drag-debug') || document.createElement('div');
  debugEl.id = 'drag-debug';
  debugEl.style.cssText = 'position:absolute; top:10px; left:10px; background:black; color:white; padding:5px; z-index:9999;';
  debugEl.textContent = `Target: ${cellX},${cellY}`;
  const panel = document.getElementById('inventoryStandalone');
  if (panel && !document.getElementById('drag-debug')) {
    panel.appendChild(debugEl);
  }
  
  clearHoverStates();
  
  // Check if can place
  const excludeUid = draggedItem.fromGridPos ? draggedItem.item.uid : undefined;
  const canPlace = canPlaceItem(currentInventory, draggedItem.item, cellX, cellY, excludeUid);
  
  highlightGridCells(cellX, cellY, draggedItem.item, canPlace);
}

function handleGridDrop(e: DragEvent): void {
  if (!draggedItem) return;
  
  let cellX = -1, cellY = -1;
  
  // First try to find cell directly from DOM
  const target = e.target as HTMLElement;
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
    const gridContainer = document.getElementById('inventory-grid');
    if (gridContainer) {
      const pos = pointToCell(gridContainer, e.clientX, e.clientY);
      cellX = pos.x;
      cellY = pos.y;
    }
  }
  
  // Remove from source
  if (draggedItem.fromSlot) {
    // Unequip
    currentEquipment[draggedItem.fromSlot] = undefined;
  } else if (draggedItem.fromGridPos) {
    // Move within grid
    removeItemFromGrid(currentInventory, draggedItem.item.uid);
  }
  
  // Add to grid
  const placed = addItemToGrid(currentInventory, draggedItem.item, cellX, cellY);
  if (!placed) {
    // Failed to place, put back
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
    onInventoryChange();
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
  
  const gridContainer = document.getElementById('inventory-grid');
  if (!gridContainer) return;
  const cells = gridContainer.querySelectorAll('.grid-cell, .inv-cell');
  cells.forEach((cell, idx) => {
    const cx = idx % currentInventory.width;
    const cy = Math.floor(idx / currentInventory.width);
    if (cx >= x && cx < x + base.size.w && cy >= y && cy < y + base.size.h) {
      (cell as HTMLElement).classList.add(valid ? 'hover-valid' : 'hover-invalid');
    }
  });
}

function clearHoverStates(): void {
  document.querySelectorAll('.grid-cell, .inv-cell').forEach((cell) => {
    (cell as HTMLElement).classList.remove('hover-valid', 'hover-invalid');
  });
  
  document.querySelectorAll('.equip-slot').forEach((slot) => {
    (slot as HTMLElement).classList.remove('can-drop', 'cannot-drop');
  });
  
  // Clear debug display when drag ends
  const debugEl = document.getElementById('drag-debug');
  if (debugEl && debugEl.parentNode) {
    debugEl.parentNode.removeChild(debugEl);
  }
}

function setupTooltips(): void {
  const gridContainer = document.getElementById('inventory-grid');
  const equipSlots = document.querySelectorAll('.equip-slot');
  
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
  const tooltip = document.getElementById('item-tooltip');
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
  tooltip.classList.remove('hidden');
  
  // Fixed positioning inside parent
  const panel = document.getElementById('inventoryStandalone');
  if (!panel) return;
  
  const panelRect = panel.getBoundingClientRect();
  const rect = (e.target as HTMLElement).getBoundingClientRect();
  
  // Position tooltip next to item but inside panel
  const itemLeft = rect.left - panelRect.left;
  const itemTop = rect.top - panelRect.top;
  const itemRight = itemLeft + rect.width;
  const panelWidth = panelRect.width;
  
  // Default to right of item
  let left = itemRight + 10;
  
  // If would overflow panel right edge, place to left of item
  if (left + 250 > panelWidth - 20) { // assuming max tooltip width ~250px
    left = Math.max(20, itemLeft - 250 - 10);
  }
  
  let top = itemTop;
  // Keep within panel vertical bounds
  if (top + 300 > panelRect.height - 20) { // assuming typical tooltip height ~300px
    top = Math.max(20, panelRect.height - 300 - 20);
  }
  
  // Make tooltip position absolute relative to panel
  tooltip.style.position = 'absolute';
  
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideItemTooltip(): void {
  const tooltip = document.getElementById('item-tooltip');
  if (tooltip) {
    tooltip.classList.add('hidden');
  }
}

/** Show confirmation dialog for destroying an item */
function showDestroyConfirmation(e: DragEvent): void {
  console.log('Showing destroy confirmation dialog in standalone inventory');
  
  if (!draggedItem) {
    console.error('Cannot show destroy confirmation: draggedItem is null');
    return;
  }
  
  const base = getItemBase(draggedItem.item.baseId);
  const itemName = base ? base.name : 'Unknown Item';
  const itemRarity = draggedItem.item.rarity;
  
  console.log(`Confirming destruction of: ${itemName} (${draggedItem.item.uid})`);
  
  // Store a reference to the dragged item in case it gets cleared elsewhere
  const itemToDestroy = { ...draggedItem };
  
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
  dialog.id = 'destroy-dialog';
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
  
  // Create buttons directly instead of using innerHTML
  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-size: 18px; margin-bottom: 15px;';
  titleEl.textContent = 'Destroy Item?';
  
  const nameEl = document.createElement('div');
  nameEl.style.cssText = `font-size: 16px; margin-bottom: 20px; color: ${RarityColors[itemRarity]};`;
  nameEl.textContent = itemName;
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; justify-content: space-around;';
  
  const confirmBtn = document.createElement('button');
  confirmBtn.id = 'destroy-confirm-btn'; // Changed ID to avoid layout.ts interception
  confirmBtn.style.cssText = `
    background-color: #a00;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  `;
  confirmBtn.textContent = 'Destroy';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.id = 'destroy-cancel-btn'; // Changed ID to avoid layout.ts interception
  cancelBtn.style.cssText = `
    background-color: #444;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  `;
  cancelBtn.textContent = 'Cancel';
  
  // Append elements
  buttonContainer.appendChild(confirmBtn);
  buttonContainer.appendChild(cancelBtn);
  dialog.appendChild(titleEl);
  dialog.appendChild(nameEl);
  dialog.appendChild(buttonContainer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Add event listeners with stopPropagation to prevent layout system interference
  confirmBtn.addEventListener('click', (event) => {
    console.log('Destroy confirmed by user in standalone inventory');
    // Stop event propagation to prevent layout system from handling it
    event.stopPropagation();
    event.preventDefault();
    
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
  
  cancelBtn.addEventListener('click', (event) => {
    console.log('Destroy cancelled by user in standalone inventory');
    // Stop event propagation to prevent layout system from handling it
    event.stopPropagation();
    event.preventDefault();
    
    // Just close the dialog
    const overlayEl = document.getElementById('destroy-overlay');
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
    }
  });
  
  // Close if clicking outside the dialog
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      console.log('Destroy cancelled by clicking outside in standalone inventory');
      // Stop event propagation to prevent layout system from handling it
      event.stopPropagation();
      
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
    console.error('Cannot destroy item: draggedItem is null in standalone inventory');
    return;
  }
  
  const base = getItemBase(draggedItem.item.baseId);
  const itemName = base ? base.name : 'Unknown Item';
  
  console.log(`Destroying item in standalone inventory: ${itemName} (${draggedItem.item.uid})`);
  console.log('Dragged item details:', JSON.stringify({
    uid: draggedItem.item.uid,
    name: base?.name,
    fromSlot: draggedItem.fromSlot,
    fromGridPos: draggedItem.fromGridPos
  }));
  
  // Log inventory state before removal
  console.log('Inventory before removal:', 
    currentInventory.items.map(i => ({
      uid: i.item.uid, 
      name: getItemBase(i.item.baseId)?.name,
      pos: `${i.x},${i.y}`
    }))
  );
  
  // Show destruction effect
  const destroyEffect = document.createElement('div');
  destroyEffect.id = 'destroy-effect';
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
  
  // Create elements directly instead of using innerHTML
  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'margin-bottom: 15px; font-size: 18px;';
  titleEl.textContent = 'Item Destroyed!';
  
  const nameEl = document.createElement('div');
  nameEl.style.cssText = `margin-bottom: 10px; color: ${RarityColors[draggedItem.item.rarity]}`;
  nameEl.textContent = itemName;
  
  destroyEffect.appendChild(titleEl);
  destroyEffect.appendChild(nameEl);
  document.body.appendChild(destroyEffect);
  
  // Remove effect after 1.5 seconds
  setTimeout(() => {
    const effectEl = document.getElementById('destroy-effect');
    if (effectEl && effectEl.parentNode) {
      effectEl.parentNode.removeChild(effectEl);
    }
  }, 1500);
  
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

/** Handle Ctrl+Click quick sell functionality */
function handleQuickSell(item: ItemInstance): void {
  if (!isVendorOpen()) {
    // Show a toast message or console log
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

/** Refresh the entire inventory display */
export function refreshInventory(): void {
  renderGrid();
  renderEquipment();
  
  // Re-enable selling hooks after re-rendering
  if (typeof (window as any).enableInventorySelling === 'function') {
    (window as any).enableInventorySelling();
  }
}

/** Update inventory data (call after loading a save) */
export function updateInventoryData(equipment: EquipmentState, inventory: InventoryGrid): void {
  currentEquipment = equipment;
  currentInventory = inventory;
  renderGrid();
  renderEquipment();
}

