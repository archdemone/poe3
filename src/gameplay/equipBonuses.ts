// Equipment bonuses aggregation

import type { EquipmentState } from '../systems/items';

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
};

/** Compute total bonuses from all equipped items */
export function computeEquipBonuses(equip: EquipmentState): EquipBonuses {
  const out = { ...zeroEquip };
  
  for (const slot of Object.keys(equip)) {
    const inst = (equip as any)[slot];
    if (!inst) continue;
    
    for (const affix of (inst.affixes ?? [])) {
      (out as any)[affix.stat] = ((out as any)[affix.stat] ?? 0) + affix.value;
    }
  }
  
  return out;
}

