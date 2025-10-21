// Inventory and equipment system. Items are defined in a static database
// and referenced by ID. The inventory holds item IDs and the equipment
// tracks which items are currently equipped in each slot.

export type ItemType = 'weapon' | 'armor' | 'gem' | 'consumable';
export type ItemRarity = 'common' | 'magic' | 'rare' | 'unique';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  stats?: {
    damage?: number;
    defense?: number;
    attackSpeed?: number;
  };
  description?: string;
  icon?: string; // Future: icon path or emoji
}

/** Static database of all items in the game. */
export const ItemDatabase: Record<string, Item> = {
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    type: 'weapon',
    rarity: 'common',
    stats: {
      damage: 10,
      attackSpeed: 1.0,
    },
    description: 'A basic iron sword. Reliable for new warriors.',
  },
  short_bow: {
    id: 'short_bow',
    name: 'Short Bow',
    type: 'weapon',
    rarity: 'common',
    stats: {
      damage: 8,
      attackSpeed: 1.2,
    },
    description: 'A simple bow for ranged combat.',
  },
  // Future items can be added here
};

/** Get an item by ID from the database. */
export function getItem(id: string): Item | undefined {
  return ItemDatabase[id];
}

/** Inventory holds a collection of item IDs. */
export class Inventory {
  items: string[] = [];

  constructor(items: string[] = []) {
    this.items = items;
  }

  /** Add an item to the inventory. */
  addItem(itemId: string): void {
    if (!ItemDatabase[itemId]) {
      console.warn(`Item ${itemId} not found in database`);
      return;
    }
    this.items.push(itemId);
  }

  /** Remove an item from inventory by ID. Returns true if found and removed. */
  removeItem(itemId: string): boolean {
    const index = this.items.indexOf(itemId);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }

  /** Check if inventory contains an item. */
  hasItem(itemId: string): boolean {
    return this.items.includes(itemId);
  }

  /** Get all items with their full data. */
  getItems(): Item[] {
    return this.items
      .map(id => ItemDatabase[id])
      .filter(item => item !== undefined) as Item[];
  }
}

/** Equipment slots for a character. */
export interface Equipment {
  weapon?: string;
  helmet?: string;
  chest?: string;
  gloves?: string;
  boots?: string;
  // Future: rings, amulets, belts, etc.
}

/** Equip an item from inventory into an equipment slot. Returns true if successful. */
export function equipItem(
  inventory: Inventory,
  equipment: Equipment,
  itemId: string,
  slot: keyof Equipment
): boolean {
  if (!inventory.hasItem(itemId)) {
    console.warn(`Item ${itemId} not in inventory`);
    return false;
  }

  const item = ItemDatabase[itemId];
  if (!item) {
    console.warn(`Item ${itemId} not found in database`);
    return false;
  }

  // Simple type checking: weapons go in weapon slot, armor in armor slots
  if (slot === 'weapon' && item.type !== 'weapon') {
    console.warn(`Cannot equip ${item.name} in weapon slot`);
    return false;
  }
  if (slot !== 'weapon' && item.type !== 'armor') {
    console.warn(`Cannot equip ${item.name} in ${slot} slot`);
    return false;
  }

  // If something is already equipped, unequip it (keep in inventory)
  if (equipment[slot]) {
    // Item stays in inventory, just swap reference
  }

  equipment[slot] = itemId;
  return true;
}

/** Unequip an item from an equipment slot. The item remains in inventory. */
export function unequipItem(equipment: Equipment, slot: keyof Equipment): void {
  equipment[slot] = undefined;
}

