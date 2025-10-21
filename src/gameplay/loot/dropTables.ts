// Drop tables - manages base item pools and selection

import type { ItemBase } from '../../systems/items';
import { ItemBases } from '../../systems/items';
import swordsData from '../../../data/items/bases_one_hand_swords.json';
import bowsData from '../../../data/items/bases_bows.json';

// Loaded base pools
const swordBases: ItemBase[] = swordsData.map(s => ({
  ...s,
  size: { w: 1, h: 3 },
  icon: '⚔️',
}));

const bowBases: ItemBase[] = bowsData.map(b => ({
  ...b,
  size: { w: 2, h: 3 },
  icon: '🏹',
}));

// Register all bases in ItemBases for global access
[...swordBases, ...bowBases].forEach(base => {
  ItemBases[base.id] = base;
});

export type BaseClass = 'one_hand_sword' | 'bow';

/**
 * Get the pool of eligible base items for a given area level
 * @param areaLevel Current area/dungeon level
 * @param classFilter Optional filter for specific item class
 * @returns Array of eligible ItemBase objects
 */
export function getBasePool(areaLevel: number, classFilter?: BaseClass): ItemBase[] {
  let pool: ItemBase[] = [];
  
  if (classFilter === 'one_hand_sword') {
    pool = swordBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'bow') {
    pool = bowBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else {
    // 50/50 split between swords and bows
    const useSword = Math.random() < 0.5;
    const sourcePool = useSword ? swordBases : bowBases;
    pool = sourcePool.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  }
  
  return pool.length > 0 ? pool : (classFilter === 'bow' ? bowBases : swordBases);
}

/**
 * Pick a random base from the pool
 */
export function pickRandomBase(areaLevel: number, classFilter?: BaseClass): ItemBase | null {
  const pool = getBasePool(areaLevel, classFilter);
  if (pool.length === 0) return null;
  
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

