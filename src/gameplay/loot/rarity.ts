// Rarity weights and rolling system

export const RARITY_WEIGHTS = {
  normal: 0.60,
  magic: 0.30,
  rare: 0.09,
  unique: 0.01,
};

export type Rarity = 'normal' | 'magic' | 'rare' | 'unique';

/**
 * Roll a random rarity based on configured weights
 * @param rng Random number generator (0-1), defaults to Math.random
 * @returns The rolled rarity
 */
export function rollRarity(rng: () => number = Math.random): Rarity {
  const w = RARITY_WEIGHTS;
  const total = w.normal + w.magic + w.rare + w.unique;
  const roll = rng() * total;
  
  if (roll < w.normal) return 'normal';
  if (roll < w.normal + w.magic) return 'magic';
  if (roll < w.normal + w.magic + w.rare) return 'rare';
  return 'unique';
}

