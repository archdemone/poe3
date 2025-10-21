// Socket generation for weapons

/**
 * Roll support socket count for a weapon
 * Weights: 2 sockets (70%), 3 sockets (25%), 4 sockets (5%)
 * @param rng Random number generator (0-1), defaults to Math.random
 * @returns Number of support sockets (2-4)
 */
export function rollWeaponSupports(rng: () => number = Math.random): number {
  const roll = rng();
  
  if (roll < 0.70) return 2;
  if (roll < 0.95) return 3;
  return 4;
}

