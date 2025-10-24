// Stat display mapping for item affixes

export interface StatDisplayInfo {
  displayName: string;
  suffix?: string; // e.g., "%", "+", etc.
  prefix?: string; // e.g., "+", etc.
}

/**
 * Mapping of internal stat names to display names and formatting
 */
export const STAT_DISPLAY_MAP: Record<string, StatDisplayInfo> = {
  // Attributes
  str: { displayName: "Strength", prefix: "+" },
  dex: { displayName: "Dexterity", prefix: "+" },
  int: { displayName: "Intelligence", prefix: "+" },

  // Life, Mana and Energy Shield
  hp_flat: { displayName: "Maximum Life", prefix: "+" },
  mp_flat: { displayName: "Maximum Mana", prefix: "+" },
  es_flat: { displayName: "Maximum Energy Shield", prefix: "+" },
  hp_regen: { displayName: "Life Regeneration", prefix: "+", suffix: " per second" },
  mp_regen: { displayName: "Mana Regeneration", prefix: "+", suffix: " per second" },
  es_regen: { displayName: "Energy Shield Regeneration", prefix: "+", suffix: " per second" },

  // Accuracy
  accuracy: { displayName: "Accuracy Rating", prefix: "+" },

  // Damage
  phys_damage_pct: { displayName: "Physical Damage", prefix: "+", suffix: "%" },
  fire_damage_pct: { displayName: "Fire Damage", prefix: "+", suffix: "%" },
  cold_damage_pct: { displayName: "Cold Damage", prefix: "+", suffix: "%" },
  lightning_damage_pct: { displayName: "Lightning Damage", prefix: "+", suffix: "%" },
  chaos_damage_pct: { displayName: "Chaos Damage", prefix: "+", suffix: "%" },
  melee_pct: { displayName: "Melee Damage", prefix: "+", suffix: "%" },
  bow_pct: { displayName: "Bow Damage", prefix: "+", suffix: "%" },
  spell_pct: { displayName: "Spell Damage", prefix: "+", suffix: "%" },

  // Attack Speed
  aps_pct: { displayName: "Attack Speed", prefix: "+", suffix: "%" },

  // Critical Strike
  crit_chance: { displayName: "Critical Strike Chance", prefix: "+", suffix: "%" },
  crit_mult: { displayName: "Critical Strike Multiplier", prefix: "+", suffix: "%" },

  // Resistances
  fire_res: { displayName: "Fire Resistance", prefix: "+", suffix: "%" },
  cold_res: { displayName: "Cold Resistance", prefix: "+", suffix: "%" },
  lightning_res: { displayName: "Lightning Resistance", prefix: "+", suffix: "%" },
  chaos_res: { displayName: "Chaos Resistance", prefix: "+", suffix: "%" },

  // Defense
  armour: { displayName: "Armour", prefix: "+" },
  evasion: { displayName: "Evasion Rating", prefix: "+" },
  block_chance: { displayName: "Block Chance", prefix: "+", suffix: "%" },

  // Movement
  move_speed: { displayName: "Movement Speed", prefix: "+", suffix: "%" },

  // Ailment and Status
  ailment_threshold: { displayName: "Ailment Threshold", prefix: "+" },
  stun_threshold: { displayName: "Stun Threshold", prefix: "+" },
  freeze_threshold: { displayName: "Freeze Threshold", prefix: "+" },

  // Misc
  item_rarity: { displayName: "Item Rarity", prefix: "+", suffix: "%" },
  item_quantity: { displayName: "Item Quantity", prefix: "+", suffix: "%" },
};

/**
 * Format a stat value for display
 */
export function formatStatDisplay(statName: string, value: number): string {
  const statInfo = STAT_DISPLAY_MAP[statName];
  
  if (!statInfo) {
    // Fallback for unknown stats - show the raw name
    return `+${value} ${statName}`;
  }
  
  const prefix = statInfo.prefix || "";
  const suffix = statInfo.suffix || "";
  
  return `${prefix}${value}${suffix} ${statInfo.displayName}`;
}

/**
 * Get display name for a stat (without value formatting)
 */
export function getStatDisplayName(statName: string): string {
  const statInfo = STAT_DISPLAY_MAP[statName];
  return statInfo ? statInfo.displayName : statName;
}
