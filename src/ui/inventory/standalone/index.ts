// Inventory UI - Equipment and grid management with drag-and-drop

import { isVendorOpen } from '../../../../ui/layout';
import { sellItemToVendor, priceOf } from '../../../gameplay/loot/vendor';
import type { ItemInstance, EquipmentState, InventoryGrid, ItemSlot } from '../../../systems/items';
import { getItemBase, canPlaceItem, addItemToGrid, removeItemFromGrid, getItemAtPosition, RarityColors } from '../../../systems/items';
import { readGridMetrics, type GridMetrics } from '../gridMetrics';

let currentEquipment: EquipmentState = {};
const EXTRA_ROWS = 0; // no extra rows
// Debug flag to help fix drag-drop issues
const DEBUG_DRAG = true;
let currentInventory: InventoryGrid = {
  width: 10,
  height: 7,
  items: [],
};

let draggedItem: { item: ItemInstance; fromSlot?: ItemSlot; fromGridPos?: { x: number; y: number } } | null = null;
let isProcessingDrop = false;
let onInventoryChange: (() => void) | null = null;

const DEFAULT_GRID_METRICS: GridMetrics = { cell: 54, gap: 2, padLeft: 10, padTop: 10 };
let gridMetrics: GridMetrics = { ...DEFAULT_GRID_METRICS };

function syncMetrics(container: HTMLElement | null): void {
  if (!container) return;
  gridMetrics = readGridMetrics(container, gridMetrics);
}

/** Helper: map mouse position to grid coordinates */
function pointToCell(gridContainer: HTMLElement, clientX: number, clientY: number) {
  syncMetrics(gridContainer);
  const rect = gridContainer.getBoundingClientRect();
  const relX = clientX - rect.left - gridMetrics.padLeft;
  const relY = clientY - rect.top - gridMetrics.padTop;
  const stride = gridMetrics.cell + gridMetrics.gap;
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
  setupClearButton();
}

/** Render the inventory grid */
function renderGrid(): void {
  const gridContainer = document.getElementById('inventory-grid');
  if (!gridContainer) return;

  gridContainer.style.removeProperty('transform');
  gridContainer.style.removeProperty('width');
  gridContainer.style.removeProperty('height');
  gridContainer.style.removeProperty('minWidth');
  gridContainer.style.removeProperty('minHeight');

  syncMetrics(gridContainer);
  
  // Set grid dimensions
  gridContainer.style.setProperty('--cols', String(currentInventory.width));
  const visualRows = currentInventory.height + EXTRA_ROWS;
  gridContainer.style.setProperty('--rows', String(visualRows));
  gridContainer.dataset.cols = String(currentInventory.width);
  const visualRowsDataset = currentInventory.height + EXTRA_ROWS;
  gridContainer.dataset.rows = String(visualRowsDataset);
  const totalWidth = currentInventory.width * gridMetrics.cell + (currentInventory.width - 1) * gridMetrics.gap + gridMetrics.padLeft * 2;
  const totalHeight = visualRows * gridMetrics.cell + (visualRows - 1) * gridMetrics.gap + gridMetrics.padTop * 2;
  gridContainer.style.width = `${totalWidth}px`;
  gridContainer.style.minWidth = gridContainer.style.width;
  gridContainer.style.height = `${totalHeight}px`;
  gridContainer.style.minHeight = gridContainer.style.height;
  const panel = gridContainer.closest('#inventoryStandalone') as HTMLElement | null;
  if (panel) {
    const parentId = panel.parentElement?.id;
    if (parentId !== 'ui-two-dock') {
      const equipment = panel.querySelector('#equipmentRoot') as HTMLElement | null;
      const equipmentWidth = equipment ? equipment.offsetWidth : 320;
      const root = gridContainer.closest('.inventory-root') as HTMLElement | null;
      let gap = 24;
      if (root) {
        const rootStyles = getComputedStyle(root);
        gap = parseFloat(rootStyles.columnGap || rootStyles.gap || '24');
      }
      const body = panel.querySelector('.ui-panel__body') as HTMLElement | null;
      let paddingX = 32;
      let paddingY = 48;
      if (body) {
        const bodyStyles = getComputedStyle(body);
        paddingX =
          (parseFloat(bodyStyles.paddingLeft || '16') || 0) +
          (parseFloat(bodyStyles.paddingRight || '16') || 0);
        paddingY =
          (parseFloat(bodyStyles.paddingTop || '16') || 0) +
          (parseFloat(bodyStyles.paddingBottom || '16') || 0);
      }
      const desiredWidth = totalWidth + equipmentWidth + gap + paddingX;
      const desiredHeight = totalHeight + paddingY;
      const viewportWidth = window.innerWidth - 32;
      const finalWidth = Math.min(desiredWidth, viewportWidth);
      const finalHeight = Math.min(desiredHeight, window.innerHeight - 120);
      panel.style.width = `${finalWidth}px`;
      panel.style.minWidth = panel.style.width;
      panel.style.maxWidth = `${viewportWidth}px`;
      panel.style.height = `${finalHeight}px`;
      panel.style.maxHeight = `${window.innerHeight - 80}px`;
      if (DEBUG_DRAG) {
        console.log(
          '[InventoryStandalone] panel sizing',
          { equipmentWidth, gap, paddingX, paddingY, desiredWidth, desiredHeight, finalWidth, finalHeight }
        );
      }
    }
  }
  if (DEBUG_DRAG) {
    const rect = gridContainer.getBoundingClientRect();
    console.log(
      '[InventoryStandalone] grid sizing',
      `cols=${currentInventory.width}`,
      `rows=${visualRows}`,
      `cell=${gridMetrics.cell}`,
      `gap=${gridMetrics.gap}`,
      `total=${totalWidth}x${totalHeight}`,
      `rect=${rect.width}x${rect.height}`
    );
  }
  
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
    const itemEl = createGridItemElement(gridContainer, gridItem.item, gridItem.x, gridItem.y);
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
function createGridItemElement(gridContainer: HTMLElement, item: ItemInstance, gridX: number, gridY: number): HTMLElement {
  const base = getItemBase(item.baseId);
  if (!base) throw new Error(`Unknown item base: ${item.baseId}`);

  syncMetrics(gridContainer);
  const { cell, gap, padLeft, padTop } = gridMetrics;

  const el = document.createElement('div');
  el.className = `inventory-item ${item.rarity}`;
  el.dataset.uid = item.uid;
  el.dataset.itemId = item.uid;
  
  // Size the element to match its logical dimensions in the inventory
  const itemWidth = base.size?.w || 1;
  const itemHeight = base.size?.h || 1;
  
  // Width and height including gaps between cells
  const w = itemWidth * cell + (itemWidth - 1) * gap;
  const h = itemHeight * cell + (itemHeight - 1) * gap;
  
  // Debug size
  console.log(`Item ${base.name} size: ${itemWidth}x${itemHeight}, rendering at ${w}x${h}px`);
  
  // Position element at grid coordinates
  el.style.position = 'absolute';
  
  // Force style with !important to override any CSS rules
  el.style.cssText = `
    position: absolute !important;
    width: ${w}px !important;
    height: ${h}px !important;
    left: ${padLeft + gridX * (cell + gap)}px !important;
    top: ${padTop + gridY * (cell + gap)}px !important;
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
    // Only trigger if we have a dragged item and not already processing
    if (!draggedItem || isProcessingDrop) return;

    console.log('Document drop event detected with dragged item in standalone inventory');

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
    const panel = document.getElementById('inventoryStandalone') ||
                  document.getElementById('inventory-grid')?.closest('.panel');

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

      // Set drag data for external drops (like map device)
      const dragData = {
        type: 'inventory-item',
        item: gridItem.item,
        fromInventory: true
      };
      e.dataTransfer!.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer!.effectAllowed = 'move';
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
  
  const gridContainer = document.getElementById('inventory-grid');
  if (!gridContainer) return;

  gridContainer.style.removeProperty('transform');
  gridContainer.style.removeProperty('width');
  gridContainer.style.removeProperty('height');
  gridContainer.style.removeProperty('minWidth');
  gridContainer.style.removeProperty('minHeight');
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
  const gridContainer = document.getElementById('inventory-grid');
  const equipSlots = document.querySelectorAll('.equip-slot');

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

/** Setup the clear inventory button */
function setupClearButton(): void {
  console.log('Setting up clear inventory button (standalone)...');

  // Try to find existing button first
  let clearBtn = document.getElementById('clear-inventory-btn-standalone');

  if (!clearBtn) {
    console.log('Button not found in HTML, creating it dynamically...');

    // Create the button dynamically
    clearBtn = document.createElement('button');
    clearBtn.id = 'clear-inventory-btn-standalone';
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
    const header = document.querySelector('#inventoryStandalone .ui-panel__header');
    if (header) {
      header.appendChild(clearBtn);
      console.log('Button created and added to header (standalone)');
    } else {
      console.error('Header not found (standalone)!');
      return;
    }
  } else {
    console.log('Button found in HTML (standalone)');
  }

  // Add click handler
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all unequipped items from your inventory?')) {
      clearInventory();
    }
  });

  console.log('Clear inventory button (standalone) setup complete');
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
