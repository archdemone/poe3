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
  
  // Defense (placeholders for now)
  armor: number;
  evasion: number;
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

/** Create default stats for a new character based on class */
export function createDefaultStats(characterClass: 'warrior' | 'archer'): CharacterStats {
  if (characterClass === 'warrior') {
    return {
      strength: 20,
      dexterity: 10,
      intelligence: 10,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      armor: 10,
      evasion: 5,
    };
  } else {
    // Archer
    return {
      strength: 10,
      dexterity: 20,
      intelligence: 10,
      hp: 80,
      maxHp: 80,
      mp: 60,
      maxMp: 60,
      armor: 5,
      evasion: 15,
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

/** Format a number with + sign if positive */
export function formatStatBonus(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

