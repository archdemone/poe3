// Item generation orchestrator

import type { ItemInstance, ItemBase } from '../../systems/items';
import { rollRarity, type Rarity } from './rarity';
import { pickRandomBase } from './dropTables';
import { rollAffixes } from './affixes';
import { rollWeaponSupports } from './sockets';
import uniquesData from '../../../data/items/uniques.json';
import { ItemBases } from '../../systems/items';

interface UniqueDef {
  id: string;
  name: string;
  baseId: string;
  explicit: { stat: string; value: [number, number] }[];
  special?: string;
}

const uniques: UniqueDef[] = uniquesData as UniqueDef[];

/**
 * Roll a value within a range
 */
function rollValue(range: number | [number, number]): number {
  if (typeof range === 'number') return range;
  const [min, max] = range;
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Generate a complete item instance
 * @param areaLevel Current area/dungeon level
 * @param allowUnique Whether unique items can drop
 * @returns A complete ItemInstance
 */
export function generateItem(areaLevel: number, allowUnique: boolean = true): ItemInstance | null {
  // Roll rarity
  let rarity = rollRarity();
  
  // If unique was rolled but not allowed, reroll as rare
  if (rarity === 'unique' && !allowUnique) {
    rarity = 'rare';
  }
  
  // Handle unique items
  if (rarity === 'unique' && uniques.length > 0) {
    const unique = uniques[Math.floor(Math.random() * uniques.length)];
    
    // For now, we only have SkullHunter which is a belt
    // Generate the belt base or use existing
    const baseId = unique.baseId;
    const base = ItemBases[baseId];
    
    if (!base) {
      console.warn(`[ItemGen] Unique base ${baseId} not found, falling back to rare`);
      rarity = 'rare';
      // Fall through to normal generation
    } else {
      // Roll explicit values
      const affixes = unique.explicit.map(exp => ({
        group: `unique_${exp.stat}`,
        stat: exp.stat,
        tier: 99, // Unique tier
        value: rollValue(exp.value),
      }));
      
      return {
        uid: `${unique.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        baseId: baseId,
        rarity: 'unique',
        affixes,
        level: areaLevel,
        uniqueId: unique.id,
      };
    }
  }
  
  // Pick a random base
  const base = pickRandomBase(areaLevel);
  if (!base) {
    console.warn('[ItemGen] No valid base found for area level', areaLevel);
    return null;
  }
  
  // Roll affixes
  const affixes = rollAffixes(rarity, areaLevel, base.class);
  
  // Roll sockets (weapons only)
  let sockets = undefined;
  if (base.slot === 'weapon') {
    sockets = {
      supports: rollWeaponSupports(),
    };
  }
  
  return {
    uid: `${base.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    baseId: base.id,
    rarity,
    affixes,
    sockets,
    level: areaLevel,
  };
}

