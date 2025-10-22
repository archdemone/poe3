// Affix rolling system

import prefixesData from '../../../data/affixes/prefixes.json';
import suffixesData from '../../../data/affixes/suffixes.json';
import type { Affix } from '../../systems/items';

import type { Rarity } from './rarity';

interface AffixTier {
  tier: number;
  min: number;
  max: number;
}

interface AffixDef {
  group: string;
  stat: string;
  tiers: AffixTier[];
}

const prefixes: AffixDef[] = prefixesData.prefixes;
const suffixes: AffixDef[] = suffixesData.suffixes;

/**
 * Get affix count range for a given rarity
 */
function getAffixCount(rarity: Rarity): { min: number; max: number; prefixMax: number; suffixMax: number } {
  switch (rarity) {
    case 'normal':
      return { min: 1, max: 1, prefixMax: 1, suffixMax: 1 };
    case 'magic':
      return { min: 1, max: 2, prefixMax: 1, suffixMax: 1 };
    case 'rare':
      return { min: 3, max: 6, prefixMax: 3, suffixMax: 3 };
    case 'unique':
      return { min: 0, max: 0, prefixMax: 0, suffixMax: 0 }; // Uniques don't get random affixes
    default:
      return { min: 0, max: 0, prefixMax: 0, suffixMax: 0 };
  }
}

/**
 * Get allowed tiers for a given rarity
 */
function getAllowedTiers(rarity: Rarity): number[] {
  switch (rarity) {
    case 'normal':
      return [1];
    case 'magic':
      return [1, 2];
    case 'rare':
      return [1, 2, 3];
    default:
      return [];
  }
}

/**
 * Roll a random affix from a pool
 */
function rollAffix(pool: AffixDef[], allowedTiers: number[], usedGroups: Set<string>): Affix | null {
  // Filter to affixes not already used
  const available = pool.filter(a => !usedGroups.has(a.group));
  if (available.length === 0) return null;
  
  const chosen = available[Math.floor(Math.random() * available.length)];
  
  // Filter tiers
  const validTiers = chosen.tiers.filter(t => allowedTiers.includes(t.tier));
  if (validTiers.length === 0) return null;
  
  // Pick a tier
  const tier = validTiers[Math.floor(Math.random() * validTiers.length)];
  
  // Roll value within tier range
  const value = tier.min + Math.floor(Math.random() * (tier.max - tier.min + 1));
  
  return {
    group: chosen.group,
    stat: chosen.stat,
    tier: tier.tier,
    value,
  };
}

/**
 * Roll affixes for an item based on rarity
 * @param rarity Item rarity
 * @param itemLevel Item level (not used yet, but can tie to tier later)
 * @param baseType Base item type (not used yet)
 * @returns Array of rolled affixes
 */
export function rollAffixes(rarity: Rarity, itemLevel = 1, baseType?: string): Affix[] {
  const counts = getAffixCount(rarity);
  const allowedTiers = getAllowedTiers(rarity);
  
  if (counts.max === 0) return [];
  
  const usedGroups = new Set<string>();
  const result: Affix[] = [];
  
  // Determine how many affixes to roll (random between min and max)
  const totalCount = counts.min + Math.floor(Math.random() * (counts.max - counts.min + 1));
  
  // For normal/magic, roll from combined pool
  // For rare, ensure mix of prefixes and suffixes
  if (rarity === 'normal' || rarity === 'magic') {
    const combinedPool = [...prefixes, ...suffixes];
    for (let i = 0; i < totalCount; i++) {
      const affix = rollAffix(combinedPool, allowedTiers, usedGroups);
      if (affix) {
        result.push(affix);
        usedGroups.add(affix.group);
      }
    }
  } else if (rarity === 'rare') {
    // For rare, try to balance prefixes and suffixes
    const prefixCount = Math.floor(totalCount / 2);
    const suffixCount = totalCount - prefixCount;
    
    // Roll prefixes
    for (let i = 0; i < prefixCount && i < counts.prefixMax; i++) {
      const affix = rollAffix(prefixes, allowedTiers, usedGroups);
      if (affix) {
        result.push(affix);
        usedGroups.add(affix.group);
      }
    }
    
    // Roll suffixes
    for (let i = 0; i < suffixCount && i < counts.suffixMax; i++) {
      const affix = rollAffix(suffixes, allowedTiers, usedGroups);
      if (affix) {
        result.push(affix);
        usedGroups.add(affix.group);
      }
    }
  }
  
  return result;
}

