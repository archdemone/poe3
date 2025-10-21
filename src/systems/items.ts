// Item system - bases, instances, affixes, and equipment

export type ItemId = string;
export type Rarity = 'normal' | 'magic' | 'rare' | 'unique';
export type ItemSlot =
  | 'weapon'
  | 'offhand'
  | 'helmet'
  | 'chest'
  | 'gloves'
  | 'boots'
  | 'amulet'
  | 'ring'
  | 'ring2'
  | 'belt';

export type ItemClass = 'one_hand_sword' | 'bow' | 'belt' | 'ring' | 'helmet' | 'chest' | 'gloves' | 'boots' | 'amulet';

export interface ItemBase {
  id: ItemId;
  slot: ItemSlot;
  name: string;
  size: { w: number; h: number };
  icon: string;
  class?: ItemClass;
  req?: { level?: number; str?: number; dex?: number; int?: number };
  dmg?: { 
    physMin?: number; 
    physMax?: number; 
    elem?: { 
      fireMin?: number; 
      fireMax?: number;
      coldMin?: number;
      coldMax?: number;
      lightningMin?: number; 
      lightningMax?: number;
    } 
  };
  crit?: number;
  aps?: number;
  range?: number;
  implicit?: { stat: string; value: number | [number, number] }[];
}

export interface Affix {
  group: string;
  stat: string;
  tier: number;
  value: number;
}

export interface Sockets {
  supports: number; // Number of support gem sockets (weapons only)
}

export interface UniqueDef {
  id: string;
  name: string;
  baseId: string;
  implicit?: { stat: string; value: number | [number, number] }[];
  explicit: { stat: string; value: [number, number] }[];
  special?: string;
}

export interface ItemInstance {
  uid: string;
  baseId: ItemId;
  rarity: Rarity;
  affixes: Affix[];
  sockets?: Sockets;
  level: number;
  uniqueId?: string; // If this is a unique item
}

export interface EquipmentState {
  weapon?: ItemInstance;
  offhand?: ItemInstance;
  helmet?: ItemInstance;
  chest?: ItemInstance;
  gloves?: ItemInstance;
  boots?: ItemInstance;
  amulet?: ItemInstance;
  ring?: ItemInstance;
  ring2?: ItemInstance;
  belt?: ItemInstance;
}

export interface InventoryGrid {
  width: number;
  height: number;
  items: Array<{
    item: ItemInstance;
    x: number;
    y: number;
  }>;
}

// Item database
export const ItemBases: Record<ItemId, ItemBase> = {
  iron_sword: {
    id: 'iron_sword',
    slot: 'weapon',
    name: 'Iron Sword',
    size: { w: 1, h: 3 },
    icon: '⚔️',
  },
  short_bow: {
    id: 'short_bow',
    slot: 'weapon',
    name: 'Short Bow',
    size: { w: 2, h: 3 },
    icon: '🏹',
  },
  leather_belt: {
    id: 'leather_belt',
    slot: 'belt',
    name: 'Leather Belt',
    size: { w: 2, h: 1 },
    icon: '💼',
    class: 'belt' as any,
  },
  gold_ring: {
    id: 'gold_ring',
    slot: 'ring',
    name: 'Gold Ring',
    size: { w: 1, h: 1 },
    icon: '💍',
  },
  mana_ring: {
    id: 'mana_ring',
    slot: 'ring',
    name: 'Sapphire Ring',
    size: { w: 1, h: 1 },
    icon: '💍',
  },
  steel_helmet: {
    id: 'steel_helmet',
    slot: 'helmet',
    name: 'Steel Helmet',
    size: { w: 2, h: 2 },
    icon: '⛑️',
  },
  leather_chest: {
    id: 'leather_chest',
    slot: 'chest',
    name: 'Leather Chest',
    size: { w: 2, h: 3 },
    icon: '🦺',
  },
};

// Rarity colors
export const RarityColors: Record<Rarity, string> = {
  normal: '#c8c8c8',
  magic: '#8888ff',
  rare: '#ffff77',
  unique: '#ff8800',
};

/** Create an item instance */
export function createItem(baseId: ItemId, affixes: Affix[] = [], rarity: Rarity = 'normal'): ItemInstance {
  return {
    uid: `${baseId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    baseId,
    rarity,
    affixes,
    level: 1,
  };
}

/** Get item base by ID */
export function getItemBase(baseId: ItemId): ItemBase | undefined {
  return ItemBases[baseId];
}

/** Check if an item can fit at a position in the grid */
export function canPlaceItem(
  grid: InventoryGrid,
  item: ItemInstance,
  x: number,
  y: number,
  excludeUid?: string
): boolean {
  const base = getItemBase(item.baseId);
  if (!base) return false;
  
  // Check bounds
  if (x < 0 || y < 0 || x + base.size.w > grid.width || y + base.size.h > grid.height) {
    return false;
  }
  
  // Check overlaps with other items
  for (const gridItem of grid.items) {
    if (excludeUid && gridItem.item.uid === excludeUid) continue;
    
    const otherBase = getItemBase(gridItem.item.baseId);
    if (!otherBase) continue;
    
    // Check rectangle overlap
    if (
      x < gridItem.x + otherBase.size.w &&
      x + base.size.w > gridItem.x &&
      y < gridItem.y + otherBase.size.h &&
      y + base.size.h > gridItem.y
    ) {
      return false;
    }
  }
  
  return true;
}

/** Add item to grid at position */
export function addItemToGrid(grid: InventoryGrid, item: ItemInstance, x: number, y: number): boolean {
  if (!canPlaceItem(grid, item, x, y)) {
    return false;
  }
  
  grid.items.push({ item, x, y });
  return true;
}

/** Remove item from grid by UID */
export function removeItemFromGrid(grid: InventoryGrid, uid: string): ItemInstance | null {
  const index = grid.items.findIndex(i => i.item.uid === uid);
  if (index === -1) return null;
  
  const removed = grid.items.splice(index, 1)[0];
  return removed.item;
}

/** Get item at grid position */
export function getItemAtPosition(grid: InventoryGrid, x: number, y: number): { item: ItemInstance; x: number; y: number } | null {
  for (const gridItem of grid.items) {
    const base = getItemBase(gridItem.item.baseId);
    if (!base) continue;
    
    if (
      x >= gridItem.x &&
      x < gridItem.x + base.size.w &&
      y >= gridItem.y &&
      y < gridItem.y + base.size.h
    ) {
      return gridItem;
    }
  }
  
  return null;
}

