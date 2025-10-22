// Equipment bonuses aggregation

import type { EquipmentState } from '../systems/items';
import { getSetBonuses } from '../systems/items';

export interface EquipBonuses {
  str: number;
  dex: number;
  int: number;
  hp_flat: number;
  mp_flat: number;
  hp_regen: number;
  mp_regen: number;
  melee_pct: number;
  bow_pct: number;
  phys_damage_pct: number;
  armor: number;
  evasion: number;
  fire_res: number;
  cold_res: number;
  lightning_res: number;
  aps_pct: number;
  crit_chance: number;
  // Wand stats
  spell_damage_pct: number;
  cast_speed_pct: number;
  spell_crit_chance: number;
  lightning_damage_pct: number;
  cold_damage_pct: number;
  chaos_damage_pct: number;
  life_gain_per_kill: number;
  // Sword/Bow specific stats
  all_attributes: number;
  lightning_damage_flat: number;
  life_leech_pct: number;
  gold_find_pct: number;
  minion_damage_pct: number;
  bleed_chance: number;
  poison_chance: number;
  fire_damage_pct: number;
}

export const zeroEquip: EquipBonuses = {
  str: 0,
  dex: 0,
  int: 0,
  hp_flat: 0,
  mp_flat: 0,
  hp_regen: 0,
  mp_regen: 0,
  melee_pct: 0,
  bow_pct: 0,
  phys_damage_pct: 0,
  armor: 0,
  evasion: 0,
  fire_res: 0,
  cold_res: 0,
  lightning_res: 0,
  aps_pct: 0,
  crit_chance: 0,
  // Wand stats
  spell_damage_pct: 0,
  cast_speed_pct: 0,
  spell_crit_chance: 0,
  lightning_damage_pct: 0,
  cold_damage_pct: 0,
  chaos_damage_pct: 0,
  life_gain_per_kill: 0,
  // Sword/Bow specific stats
  all_attributes: 0,
  lightning_damage_flat: 0,
  life_leech_pct: 0,
  gold_find_pct: 0,
  minion_damage_pct: 0,
  bleed_chance: 0,
  poison_chance: 0,
  fire_damage_pct: 0,
};

/** Compute total bonuses from all equipped items */
export function computeEquipBonuses(equip: EquipmentState): EquipBonuses {
  const out = { ...zeroEquip };

  // Add individual item bonuses
  for (const slot of Object.keys(equip)) {
    const inst = (equip as any)[slot];
    if (!inst) continue;

    for (const affix of (inst.affixes ?? [])) {
      (out as any)[affix.stat] = ((out as any)[affix.stat] ?? 0) + affix.value;
    }
  }

  // Add set bonuses
  const setBonuses = getSetBonuses(equip);
  for (const bonus of setBonuses) {
    (out as any)[bonus.stat] = ((out as any)[bonus.stat] ?? 0) + bonus.value;
  }

  return out;
}

