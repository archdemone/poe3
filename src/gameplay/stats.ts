// Character stats system with derived values and damage calculations

export interface CharacterStats {
  // Core attributes
  strength: number;
  dexterity: number;
  intelligence: number;

  // Resources
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  energyShield: number;
  maxEnergyShield: number;

  // Defense
  armor: number;
  evasion: number;

  // Elemental Resistances
  fireResistance: number;
  coldResistance: number;
  lightningResistance: number;
  chaosResistance: number;

  // Accuracy (derived from DEX)
  accuracy: number;
}

export interface DerivedStats {
  // Offense
  meleeDamage: number;
  rangedDamage: number;
  spellDamage: number;
  
  // Defense
  physicalReduction: number;
  dodgeChance: number;
}

/** Calculate base stats from attributes (PoE mechanics) */
export function calculateBaseStatsFromAttributes(strength: number, dexterity: number, intelligence: number): {
  baseHp: number;
  baseMp: number;
  baseAccuracy: number;
} {
  return {
    baseHp: 38 + (strength * 2), // Base 38 + STR * 2
    baseMp: 33 + (intelligence * 2), // Base 33 + INT * 2
    baseAccuracy: 80 + (dexterity * 8), // Base 80 + DEX * 8
  };
}

/** Create default stats for a new character based on class */
export function createDefaultStats(characterClass: string): CharacterStats {
  if (characterClass === 'warrior') {
    const strength = 20;
    const dexterity = 10;
    const intelligence = 10;
    const baseStats = calculateBaseStatsFromAttributes(strength, dexterity, intelligence);

    return {
      strength,
      dexterity,
      intelligence,
      hp: baseStats.baseHp,
      maxHp: baseStats.baseHp,
      mp: baseStats.baseMp,
      maxMp: baseStats.baseMp,
      energyShield: 0,
      maxEnergyShield: 0,
      armor: 10,
      evasion: 5,
      fireResistance: 0,
      coldResistance: 0,
      lightningResistance: 0,
      chaosResistance: 0,
      accuracy: baseStats.baseAccuracy,
    };
  } else {
    // Archer
    const strength = 10;
    const dexterity = 20;
    const intelligence = 10;
    const baseStats = calculateBaseStatsFromAttributes(strength, dexterity, intelligence);

    return {
      strength,
      dexterity,
      intelligence,
      hp: baseStats.baseHp,
      maxHp: baseStats.baseHp,
      mp: baseStats.baseMp,
      maxMp: baseStats.baseMp,
      energyShield: 0,
      maxEnergyShield: 0,
      armor: 5,
      evasion: 15,
      fireResistance: 0,
      coldResistance: 0,
      lightningResistance: 0,
      chaosResistance: 0,
      accuracy: baseStats.baseAccuracy,
    };
  }
}

/** Calculate derived offensive stats from base stats and equipment */
export function calculateDerivedStats(
  stats: CharacterStats,
  characterClass: 'warrior' | 'archer'
): DerivedStats {
  // Melee damage: base 5 + (STR * 0.5)
  const meleeDamage = 5 + Math.floor(stats.strength * 0.5);
  
  // Ranged damage: base 4 + (DEX * 0.5)
  const rangedDamage = 4 + Math.floor(stats.dexterity * 0.5);
  
  // Spell damage: base 3 + (INT * 0.6)
  const spellDamage = 3 + Math.floor(stats.intelligence * 0.6);
  
  // Physical damage reduction: armor / (armor + 100) * 100%
  const physicalReduction = (stats.armor / (stats.armor + 100)) * 100;
  
  // Dodge chance: evasion / (evasion + 200) * 100%
  const dodgeChance = (stats.evasion / (stats.evasion + 200)) * 100;
  
  return {
    meleeDamage,
    rangedDamage,
    spellDamage,
    physicalReduction,
    dodgeChance,
  };
}

/** Calculate skill damage based on skill type and character stats */
export function calculateSkillDamage(
  skillId: string,
  stats: CharacterStats,
  characterClass: 'warrior' | 'archer'
): number {
  const derived = calculateDerivedStats(stats, characterClass);
  
  switch (skillId) {
    case 'heavyStrike':
      // Heavy Strike: melee damage * 1.5 (150% effectiveness)
      return Math.floor(derived.meleeDamage * 1.5);
    
    case 'splitShot':
      // Split Shot: ranged damage * 0.8 per arrow (80% effectiveness, fires 3)
      return Math.floor(derived.rangedDamage * 0.8);
    
    case 'chainSpark':
      // Chain Spark: spell damage * 1.2 (120% effectiveness)
      return Math.floor(derived.spellDamage * 1.2);
    
    default:
      // Default auto-attack
      if (characterClass === 'warrior') {
        return derived.meleeDamage;
      } else {
        return derived.rangedDamage;
      }
  }
}

/** Calculate mana cost for a skill (basic formula) */
export function calculateManaCost(skillId: string): number {
  switch (skillId) {
    case 'heavyStrike':
      return 10;
    case 'splitShot':
      return 15;
    case 'chainSpark':
      return 20;
    default:
      return 0; // Auto-attack is free
  }
}

/** Calculate effective resistance with caps (PoE mechanics) */
export function calculateEffectiveResistance(baseResistance: number): number {
  // Normal cap is 75% for elemental resistances, 90% for chaos with special mechanics
  // For now, we'll use 75% as the standard cap
  const maxResistance = 75;
  return Math.min(baseResistance, maxResistance);
}

/** Calculate damage reduction from resistance */
export function calculateDamageReductionFromResistance(effectiveResistance: number): number {
  return effectiveResistance / 100;
}

/** Get all resistance values for a character */
export function getCharacterResistances(stats: CharacterStats): {
  fire: number;
  cold: number;
  lightning: number;
  chaos: number;
} {
  return {
    fire: calculateEffectiveResistance(stats.fireResistance),
    cold: calculateEffectiveResistance(stats.coldResistance),
    lightning: calculateEffectiveResistance(stats.lightningResistance),
    chaos: calculateEffectiveResistance(stats.chaosResistance),
  };
}

/** Calculate ailment thresholds (PoE mechanics) */
export function calculateAilmentThresholds(stats: CharacterStats): {
  bleed: number;
  poison: number;
  ignite: number;
  freeze: number;
  shock: number;
  chill: number;
} {
  // Base ailment thresholds are primarily based on max life
  // These are simplified calculations for now
  const lifeThreshold = stats.maxHp * 0.1; // Base threshold ~10% of life

  return {
    bleed: lifeThreshold * 2,    // Bleeding threshold
    poison: lifeThreshold * 1.5, // Poison threshold
    ignite: lifeThreshold * 1.2, // Ignite threshold
    freeze: lifeThreshold,       // Freeze threshold
    shock: lifeThreshold * 0.8,  // Shock threshold
    chill: lifeThreshold * 0.5,  // Chill threshold
  };
}

/** Calculate stun and heavy stun thresholds */
export function calculateStunThresholds(stats: CharacterStats): {
  stun: number;
  heavyStun: number;
} {
  // Stun thresholds are based on life, but also affected by other factors
  const baseThreshold = stats.maxHp * 0.2; // ~20% of life

  return {
    stun: baseThreshold,
    heavyStun: baseThreshold * 1.5, // Heavy stun requires more buildup
  };
}

/** Calculate ailment buildup rates and effects */
export function calculateAilmentMechanics(stats: CharacterStats): {
  bleedBuildup: number;
  igniteBuildup: number;
  poisonBuildup: number;
  chillBuildup: number;
  freezeBuildup: number;
  shockBuildup: number;
} {
  // Simplified buildup calculations - in PoE these are more complex
  // and depend on damage dealt, resistances, etc.
  const baseBuildup = 10;

  return {
    bleedBuildup: baseBuildup,
    igniteBuildup: baseBuildup * 0.8, // Fire hits build ignites
    poisonBuildup: baseBuildup * 0.6,
    chillBuildup: baseBuildup * 0.7, // Cold hits build chills
    freezeBuildup: baseBuildup * 0.5,
    shockBuildup: baseBuildup * 0.9, // Lightning hits build shocks
  };
}

/** Format a number with + sign if positive */
export function formatStatBonus(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

