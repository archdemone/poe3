import { z } from 'zod';

export type Affinity = { str: number; dex: number; int: number };

export interface ClassDef {
  id: string;
  displayName: string;
  affinity: Affinity;
  startingStats: {
    strength: number;
    dexterity: number;
    intelligence: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    energyShield: number;
    maxEnergyShield: number;
    armor: number;
    evasion: number;
    fireResistance: number;
    coldResistance: number;
    lightningResistance: number;
    chaosResistance: number;
    accuracy: number;
  };
  allowedAscendancies: string[];
  // Optional mapping to existing save class to avoid breaking changes
  saveClass: 'warrior' | 'archer';
}

export interface AscendancyDef {
  id: string;
  classId: string; // FK to ClassDef.id
  displayName: string;
  shortDescription: string;
  creationBonuses: Partial<Affinity> & {
    hp_flat?: number;
    mp_flat?: number;
    es_flat?: number;
    melee_pct?: number;
    bow_pct?: number;
    armor?: number;
    evasion?: number;
    fire_res?: number;
    cold_res?: number;
    lightning_res?: number;
    chaos_res?: number;
  };
}

export const AffinitySchema = z.object({
  str: z.number().int(),
  dex: z.number().int(),
  int: z.number().int(),
});

export const ClassDefSchema: z.ZodType<ClassDef> = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  affinity: AffinitySchema,
  startingStats: z.object({
    strength: z.number().int(),
    dexterity: z.number().int(),
    intelligence: z.number().int(),
    hp: z.number().int(),
    maxHp: z.number().int(),
    mp: z.number().int(),
    maxMp: z.number().int(),
    energyShield: z.number().int(),
    maxEnergyShield: z.number().int(),
    armor: z.number().int(),
    evasion: z.number().int(),
    fireResistance: z.number().int(),
    coldResistance: z.number().int(),
    lightningResistance: z.number().int(),
    chaosResistance: z.number().int(),
    accuracy: z.number().int(),
  }),
  allowedAscendancies: z.array(z.string().min(1)),
  saveClass: z.union([z.literal('warrior'), z.literal('archer'), z.literal('marauder'), z.literal('ranger'), z.literal('witch'), z.literal('duelist'), z.literal('templar'), z.literal('shadow'), z.literal('scion'), z.literal('sorceress'), z.literal('mercenary'), z.literal('monk'), z.literal('huntress')]),
});

export const AscendancyDefSchema: z.ZodType<AscendancyDef> = z.object({
  id: z.string().min(1),
  classId: z.string().min(1),
  displayName: z.string().min(1),
  shortDescription: z.string().min(1),
  creationBonuses: z.object({
    str: z.number().int().optional(),
    dex: z.number().int().optional(),
    int: z.number().int().optional(),
    hp_flat: z.number().int().optional(),
    mp_flat: z.number().int().optional(),
    es_flat: z.number().int().optional(),
    melee_pct: z.number().int().optional(),
    bow_pct: z.number().int().optional(),
    armor: z.number().int().optional(),
    evasion: z.number().int().optional(),
    fire_res: z.number().int().optional(),
    cold_res: z.number().int().optional(),
    lightning_res: z.number().int().optional(),
    chaos_res: z.number().int().optional(),
  }),
});

export function deriveStats(
  base: ClassDef['startingStats'],
  bonuses: AscendancyDef['creationBonuses'] | undefined
): ClassDef['startingStats'] {
  const stats = { ...base };
  if (bonuses) {
    if (typeof bonuses.str === 'number') stats.strength += bonuses.str;
    if (typeof bonuses.dex === 'number') stats.dexterity += bonuses.dex;
    if (typeof bonuses.int === 'number') stats.intelligence += bonuses.int;
    if (typeof bonuses.hp_flat === 'number') {
      stats.maxHp += bonuses.hp_flat;
      stats.hp = Math.min(stats.hp + bonuses.hp_flat, stats.maxHp);
    }
    if (typeof bonuses.mp_flat === 'number') {
      stats.maxMp += bonuses.mp_flat;
      stats.mp = Math.min(stats.mp + bonuses.mp_flat, stats.maxMp);
    }
    if (typeof bonuses.es_flat === 'number') {
      stats.maxEnergyShield += bonuses.es_flat;
      stats.energyShield = Math.min(stats.energyShield + bonuses.es_flat, stats.maxEnergyShield);
    }
    if (typeof bonuses.armor === 'number') stats.armor += bonuses.armor;
    if (typeof bonuses.evasion === 'number') stats.evasion += bonuses.evasion;
    if (typeof bonuses.fire_res === 'number') stats.fireResistance += bonuses.fire_res;
    if (typeof bonuses.cold_res === 'number') stats.coldResistance += bonuses.cold_res;
    if (typeof bonuses.lightning_res === 'number') stats.lightningResistance += bonuses.lightning_res;
    if (typeof bonuses.chaos_res === 'number') stats.chaosResistance += bonuses.chaos_res;
  }
  return stats;
}
