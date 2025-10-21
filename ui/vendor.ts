// Vendor UI handling

import type { ItemInstance } from '../src/systems/items';
import { getItemBase, RarityColors } from '../src/systems/items';
import { formatStatDisplay } from '../src/gameplay/loot/statDisplay';
import { 
  initVendor, 
  getVendorState, 
  buyItem, 
  sellItem, 
  calculateBuyPrice,
  calculateSellPrice,
  refreshVendor,
  getGold,
  setGold,
  priceOf,
  sellItemToVendor
} from '../src/gameplay/loot/vendor';
import { openVendorSideBySide, closeVendorView, isVendorOpen } from './layout';

/**
 * Add item to first empty slot in inventory
 */
function addItemToFirstEmptySlot(item: ItemInstance): void {
  const inventory = (window as any).currentInventoryGrid;
  if (!inventory) return;

  // Find first empty slot
  const emptySlot = inventory.items.find((gridItem: any) => !gridItem.item);
  if (emptySlot) {
    emptySlot.item = item;
    // Refresh inventory display
    if ((window as any).renderGrid) {
      (window as any).renderGrid();
    }
    console.log('[Vendor] Item added to inventory:', item.baseId);
  } else {
    console.warn('[Vendor] No empty slots in inventory');
  }
}

let vendorPanel: HTMLElement | null = null;
let vendorItemsContainer: HTMLElement | null = null;
let goldDisplay: HTMLElement | null = null;
let closeBtn: HTMLElement | null = null;
let refreshBtn: HTMLElement | null = null;
let sellZone: HTMLElement | null = null;

let onBuyCallback: ((item: ItemInstance) => boolean) | null = null;

/**
 * Initialize the vendor UI
 */
export function initVendorUI(onBuy: (item: ItemInstance) => boolean): void {
  vendorPanel = document.getElementById('vendorPanel');
  vendorItemsContainer = document.getElementById('vendor-items');
  goldDisplay = document.getElementById('vendor-gold');
  closeBtn = document.getElementById('close-vendor');
  refreshBtn = document.getElementById('refresh-vendor');
  sellZone = document.getElementById('vendor-sell-zone');
  
  onBuyCallback = onBuy;
  
  // Close button is now handled by attachPanelClosers
  
  // Refresh button
  refreshBtn?.addEventListener('click', () => {
    // Refresh costs 20 gold
    if (getGold() >= 20) {
      setGold(getGold() - 20);
      refreshVendor(1); // TODO: Use actual player level
      updateVendorDisplay();
    } else {
      alert('Not enough gold to refresh (costs 20 gold)');
    }
  });
}

/**
 * Show the vendor panel
 */
export function showVendor(playerLevel: number): void {
  // Initialize vendor if needed
  const state = getVendorState();
  if (state.items.length === 0) {
    initVendor(playerLevel);
  }
  
  openVendorSideBySide();
  updateVendorDisplay();
}

/**
 * Hide the vendor panel
 */
export function hideVendor(): void {
  closeVendorView();
}

/**
 * Update the vendor display
 */
function updateVendorDisplay(): void {
  if (!vendorItemsContainer || !goldDisplay) return;
  
  const state = getVendorState();
  
  // Update gold display
  goldDisplay.textContent = getGold().toString();
  
  // Clear and populate vendor items
  vendorItemsContainer.innerHTML = '';
  
  state.items.forEach((item, index) => {
    const itemEl = createVendorItemElement(item, index);
    vendorItemsContainer.appendChild(itemEl);
  });
}

/**
 * Create a vendor item element
 */
function createVendorItemElement(item: ItemInstance, index: number): HTMLElement {
  const base = getItemBase(item.baseId);
  if (!base) return document.createElement('div');
  
  const itemEl = document.createElement('div');
  itemEl.className = `vendor-item ${item.rarity}`;
  
  // Item name
  const nameEl = document.createElement('div');
  nameEl.className = 'vendor-item-name';
  nameEl.textContent = base.name;
  nameEl.style.color = RarityColors[item.rarity];
  itemEl.appendChild(nameEl);
  
  // Item stats (affixes)
  if (item.affixes.length > 0) {
    const statsEl = document.createElement('div');
    statsEl.className = 'vendor-item-stats';
    item.affixes.forEach(affix => {
      const statLine = document.createElement('div');
      statLine.textContent = formatStatDisplay(affix.stat, affix.value);
      statsEl.appendChild(statLine);
    });
    itemEl.appendChild(statsEl);
  }
  
  // Price
  const priceEl = document.createElement('div');
  priceEl.className = 'vendor-item-price';
  const price = calculateBuyPrice(item);
  priceEl.textContent = `${price} Gold`;
  itemEl.appendChild(priceEl);
  
  // Click to buy
  itemEl.addEventListener('click', () => {
    tryBuyItem(index);
  });
  
  return itemEl;
}

/**
 * Try to buy an item
 */
function tryBuyItem(index: number): void {
  const item = buyItem(index);
  
  if (!item) {
    alert('Not enough gold or item unavailable');
    return;
  }
  
  if (onBuyCallback) {
    const success = onBuyCallback(item);
    if (success) {
      updateVendorDisplay();
      console.log('[Vendor] Purchased:', item.baseId);
      // Auto-snap item to first empty slot
      addItemToFirstEmptySlot(item);
    } else {
      // Refund if inventory was full
      const price = calculateBuyPrice(item);
      setGold(getGold() + price);
      getVendorState().items.splice(index, 0, item); // Put item back
      alert('Inventory full!');
    }
  }
}

/**
 * Sell an item (called from inventory system)
 */
export function trySellItem(item: ItemInstance): number {
  const price = sellItem(item);
  updateVendorDisplay();
  console.log('[Vendor] Sold:', item.baseId, 'for', price, 'gold');
  return price;
}

/**
 * Update gold display
 */
export function updateGoldDisplay(): void {
  if (goldDisplay) {
    goldDisplay.textContent = getGold().toString();
  }
}

/**
 * Get current gold amount
 */
export function getCurrentGold(): number {
  return getGold();
}

