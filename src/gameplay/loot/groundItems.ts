// Ground items system - spawning, rendering labels, and pickup

import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import type { ArcRotateCamera } from 'babylonjs';

import type { ItemInstance } from '../../systems/items';
import { getItemBase, RarityColors } from '../../systems/items';


interface GroundItem {
  id: number;
  item: ItemInstance;
  pos: Vector3;
  labelEl: HTMLElement;
}

const groundItems: GroundItem[] = [];
let labelsVisible = true;
let labelsContainer: HTMLElement | null = null;
let addToInventoryCallback: ((item: ItemInstance) => boolean) | null = null;

/**
 * Initialize the ground items system
 */
export function initGroundItems(onAddToInventory: (item: ItemInstance) => boolean) {
  addToInventoryCallback = onAddToInventory;
  
  // Create container for labels if it doesn't exist
  if (!labelsContainer) {
    labelsContainer = document.createElement('div');
    labelsContainer.id = 'ground-item-labels';
    labelsContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `;
    document.body.appendChild(labelsContainer);
  }
}

/**
 * Clean up all ground items
 */
export function cleanupGroundItems() {
  for (const gi of groundItems) {
    if (gi.labelEl.parentElement) {
      gi.labelEl.remove();
    }
  }
  groundItems.length = 0;
  
  if (labelsContainer && labelsContainer.parentElement) {
    labelsContainer.remove();
    labelsContainer = null;
  }
}

/**
 * Get display name for an item
 */
function getDisplayName(item: ItemInstance): string {
  const base = getItemBase(item.baseId);
  if (!base) return 'Unknown Item';
  
  if (item.uniqueId) {
    // Load unique name from uniques.json
    // For now, just use base name with rarity prefix
    return base.name;
  }
  
  // For magic/rare, could add prefix/suffix names later
  return base.name;
}

/**
 * Spawn a ground item at a position
 * @param item The item instance to spawn
 * @param pos World position
 * @returns The ground item ID
 */
export function spawnGroundItem(item: ItemInstance, pos: Vector3): number {
  const id = Math.floor(Math.random() * 1e9);
  
  // Create label element
  const label = document.createElement('div');
  label.className = `drop-label rarity-${item.rarity}`;
  label.textContent = getDisplayName(item);
  label.style.cssText = `
    position: absolute;
    pointer-events: auto;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    font: 12px/1.4 Cinzel, serif;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid;
    white-space: nowrap;
    transform-origin: center;
    transition: transform 0.1s;
  `;
  
  // Set rarity color
  const color = RarityColors[item.rarity] || '#fff';
  label.style.color = color;
  label.style.borderColor = color;
  
  // Hover effect
  label.addEventListener('mouseenter', () => {
    label.style.transform = 'scale(1.1)';
  });
  label.addEventListener('mouseleave', () => {
    label.style.transform = 'scale(1)';
  });
  
  // Click to pickup
  label.addEventListener('click', (e) => {
    e.stopPropagation();
    tryPickup(id);
  });
  
  if (labelsContainer) {
    labelsContainer.appendChild(label);
  }
  
  const groundItem: GroundItem = {
    id,
    item,
    pos: pos.clone(),
    labelEl: label,
  };
  
  groundItems.push(groundItem);
  
  return id;
}

/**
 * Remove a ground item
 */
export function removeGroundItem(id: number): void {
  const index = groundItems.findIndex(gi => gi.id === id);
  if (index === -1) return;
  
  const gi = groundItems[index];
  if (gi.labelEl.parentElement) {
    gi.labelEl.remove();
  }
  
  groundItems.splice(index, 1);
}

/**
 * Try to pick up an item
 */
function tryPickup(id: number): void {
  const gi = groundItems.find(g => g.id === id);
  if (!gi) return;
  
  if (!addToInventoryCallback) {
    console.warn('[GroundItems] No inventory callback set');
    return;
  }
  
  const success = addToInventoryCallback(gi.item);
  
  if (success) {
    console.log('[GroundItems] Picked up:', getDisplayName(gi.item));
    removeGroundItem(id);
  } else {
    // Flash "Inventory Full" message
    showMessage('Inventory Full', gi.labelEl);
  }
}

/**
 * Show a temporary message near an element
 */
function showMessage(text: string, nearElement: HTMLElement): void {
  const msg = document.createElement('div');
  msg.textContent = text;
  msg.style.cssText = `
    position: absolute;
    left: ${nearElement.offsetLeft}px;
    top: ${nearElement.offsetTop - 30}px;
    padding: 4px 8px;
    background: rgba(255, 0, 0, 0.8);
    color: white;
    font: bold 14px/1.4 sans-serif;
    border-radius: 4px;
    pointer-events: none;
    z-index: 1000;
  `;
  
  if (labelsContainer) {
    labelsContainer.appendChild(msg);
  }
  
  setTimeout(() => {
    if (msg.parentElement) {
      msg.remove();
    }
  }, 2000);
}

/**
 * Toggle label visibility
 */
export function toggleLabels(): void {
  labelsVisible = !labelsVisible;
  
  if (labelsContainer) {
    labelsContainer.style.display = labelsVisible ? 'block' : 'none';
  }
  
  console.log(`[GroundItems] Labels ${labelsVisible ? 'shown' : 'hidden'}`);
}

/**
 * Update label positions based on camera
 * Call this every frame or in onBeforeRender
 */
export function updateLabels(camera: ArcRotateCamera, canvas: HTMLCanvasElement): void {
  if (!labelsVisible) return;
  
  for (const gi of groundItems) {
    // Project world position to screen space
    const screenPos = Vector3.Project(
      gi.pos,
      Matrix.Identity(),
      camera.getScene().getTransformMatrix(),
      camera.viewport.toGlobal(
        canvas.width,
        canvas.height
      )
    );
    
    // Position label
    gi.labelEl.style.left = `${screenPos.x}px`;
    gi.labelEl.style.top = `${screenPos.y}px`;
    gi.labelEl.style.transform = 'translate(-50%, -100%)'; // Center above point
  }
}

/**
 * Get all ground items (for saving)
 */
export function getAllGroundItems(): Array<{ item: ItemInstance; pos: { x: number; y: number; z: number } }> {
  return groundItems.map(gi => ({
    item: gi.item,
    pos: { x: gi.pos.x, y: gi.pos.y, z: gi.pos.z },
  }));
}

/**
 * Restore ground items (from save)
 */
export function restoreGroundItems(items: Array<{ item: ItemInstance; pos: { x: number; y: number; z: number } }>): void {
  for (const { item, pos } of items) {
    spawnGroundItem(item, new Vector3(pos.x, pos.y, pos.z));
  }
}

