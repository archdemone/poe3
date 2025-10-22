// Vendor system - buy and sell items

import type { ItemInstance } from '../../systems/items';

import { generateItem } from './itemGen';
// Import playerGold and addGold function from main.ts
import { playerGold, addGold } from '../../main';

export interface VendorState {
  items: ItemInstance[];
  gold: number;
  lastRefresh: number;
}

const vendorState: VendorState = {
  items: [],
  gold: 100, // Starting gold
  lastRefresh: 0,
};

/**
 * Initialize vendor with random items
 * @param playerLevel Current player level
 */
export function initVendor(playerLevel: number): void {
  vendorState.items = [];
  
  // Generate 6 random items (normal to magic only)
  for (let i = 0; i < 6; i++) {
    const item = generateItem(playerLevel, false); // No uniques
    if (item) {
      // Force to normal or magic for vendor
      if (item.rarity === 'rare') {
        item.rarity = 'magic';
        // Reduce affixes to 1-2
        item.affixes = item.affixes.slice(0, Math.floor(Math.random() * 2) + 1);
      }
      vendorState.items.push(item);
    }
  }
  
  vendorState.lastRefresh = Date.now();
}

/**
 * Get vendor state
 */
export function getVendorState(): VendorState {
  return vendorState;
}

/**
 * Set player gold
 */
export function setGold(amount: number): void {
  vendorState.gold = Math.max(0, amount);
}

/**
 * Get player gold
 */
export function getGold(): number {
  return vendorState.gold;
}

/**
 * Calculate item buy price
 */
export function calculateBuyPrice(item: ItemInstance): number {
  const basePrice = item.level * 10;
  
  switch (item.rarity) {
    case 'normal':
      return basePrice;
    case 'magic':
      return basePrice * 2;
    case 'rare':
      return basePrice * 5;
    case 'unique':
      return basePrice * 10;
    default:
      return basePrice;
  }
}

/**
 * Calculate item sell price (40% of buy price)
 */
export function calculateSellPrice(item: ItemInstance): number {
  return Math.floor(calculateBuyPrice(item) * 0.4);
}

/**
 * Buy an item from vendor
 * @returns true if purchase successful
 */
export function buyItem(index: number): ItemInstance | null {
  if (index < 0 || index >= vendorState.items.length) return null;
  
  const item = vendorState.items[index];
  const price = calculateBuyPrice(item);
  
  if (vendorState.gold < price) {
    console.log('[Vendor] Not enough gold');
    return null;
  }
  
  vendorState.gold -= price;
  vendorState.items.splice(index, 1);
  
  return item;
}

/**
 * Sell an item to vendor
 */
export function sellItem(item: ItemInstance): number {
  const price = calculateSellPrice(item);
  vendorState.gold += price;
  return price;
}

/**
 * Refresh vendor inventory
 */
export function refreshVendor(playerLevel: number): void {
  initVendor(playerLevel);
}

/**
 * Save vendor state to JSON
 */
export function saveVendorState(): VendorState {
  return { ...vendorState };
}

/**
 * Load vendor state from JSON
 */
export function loadVendorState(state: Partial<VendorState>): void {
  if (state.items) vendorState.items = state.items;
  if (state.gold !== undefined) vendorState.gold = state.gold;
  if (state.lastRefresh) vendorState.lastRefresh = state.lastRefresh;
}

export function priceOf(item: ItemInstance): number {
  // Simple formula: base 10 + rarity & affix count
  const rarityMul = item.rarity === "unique" ? 10 : item.rarity === "rare" ? 5 : item.rarity === "magic" ? 2 : 1;
  return Math.max(1, 10 * rarityMul + (item.affixes?.length || 0) * 2);
}

export function sellItemToVendor(item: ItemInstance): number {
  const gold = priceOf(item);
  addGold(gold);
  console.log(`Sold ${item.baseId} for ${gold} gold. Total gold: ${playerGold}`);
  return gold;
}

