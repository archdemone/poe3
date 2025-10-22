// Item validation schemas using Zod
import { z } from 'zod';

// Base schemas
export const ItemIdSchema = z.string().min(1).max(100);

export const ItemSlotSchema = z.enum([
  'weapon', 'offhand', 'helmet', 'chest', 'gloves', 'boots',
  'amulet', 'ring', 'ring2', 'belt', 'map', 'flask', 'currency', 'socketable'
]);

export const ItemClassSchema = z.enum([
  'one_hand_sword', 'bow', 'belt', 'ring', 'helmet', 'chest', 'gloves',
  'boots', 'amulet', 'flask', 'currency', 'socketable'
]);

export const RaritySchema = z.enum(['normal', 'magic', 'rare', 'unique']);

// Stat key validation - must be one of the known stat keys used in the game
export const StatKeySchema = z.enum([
  // Core attributes
  'str', 'dex', 'int',
  // Resources
  'hp_flat', 'mp_flat', 'life_flat', 'mana_flat', 'energy_shield',
  // Regen
  'hp_regen', 'mp_regen', 'life_regen', 'mana_regen',
  // Damage modifiers
  'melee_pct', 'bow_pct', 'phys_damage_pct', 'fire_damage_pct', 'cold_damage_pct',
  'lightning_damage_pct', 'chaos_damage_pct', 'poison_damage_pct',
  'spell_damage_pct', 'melee_physical_damage_pct', 'damage_pct',
  // Flat damage
  'lightning_damage_flat', 'lightning_damage', 'fire_damage', 'cold_damage',
  'physical_damage', 'added_fire_damage', 'added_cold_damage', 'added_lightning_damage',
  // Special damage
  'area_damage', 'area_damage_pct', 'burn_damage_pct', 'bleed_damage_pct',
  'spin_damage', 'explosion_damage', 'split_damage',
  // Defense
  'armor', 'evasion', 'fire_res', 'cold_res', 'lightning_res', 'chaos_res',
  'damage_reduction_pct', 'physical_damage_reduction_pct', 'block_chance',
  // Speed
  'aps_pct', 'attack_speed_pct', 'cast_speed_pct', 'movement_speed_pct',
  'projectile_speed_pct',
  // Critical
  'crit_chance', 'spell_crit_chance', 'critical_strike_chance_pct',
  'critical_strike_multiplier_pct',
  // Special effects
  'life_gain_per_kill', 'all_attributes', 'life_leech_pct', 'gold_find_pct',
  'minion_damage_pct', 'bleed_chance', 'poison_chance',
  // Chance effects
  'stun_chance_pct', 'freeze_chance_pct', 'chill_effect_pct', 'knockback',
  // Special abilities
  'chain_lightning', 'multistrike', 'chain_count', 'fork_count', 'duration_pct',
  'projectile_count', 'pierce_count', 'area_of_effect_pct',
  // Item effects
  'item_rarity_pct', 'item_quantity_pct'
]);

// Value range validation
export const ValueRangeSchema = z.union([
  z.number().finite(),
  z.tuple([z.number().finite(), z.number().finite()])
]).refine((val) => {
  if (Array.isArray(val)) {
    return val[0] <= val[1];
  }
  return true;
}, 'Range min must be <= max');

// Requirements schema
export const RequirementsSchema = z.object({
  level: z.number().min(1).max(100).optional(),
  str: z.number().min(0).max(500).optional(),
  dex: z.number().min(0).max(500).optional(),
  int: z.number().min(0).max(500).optional(),
}).strict();

// Damage schema
export const DamageSchema = z.object({
  physMin: z.number().min(0).finite().optional(),
  physMax: z.number().min(0).finite().optional(),
  elem: z.object({
    fireMin: z.number().min(0).finite().optional(),
    fireMax: z.number().min(0).finite().optional(),
    coldMin: z.number().min(0).finite().optional(),
    coldMax: z.number().min(0).finite().optional(),
    lightningMin: z.number().min(0).finite().optional(),
    lightningMax: z.number().min(0).finite().optional(),
  }).optional(),
}).strict();

// Implicit mod schema
export const ImplicitModSchema = z.object({
  stat: StatKeySchema,
  value: ValueRangeSchema,
}).strict();

// Map modifiers schema
export const MapModifiersSchema = z.object({
  monsterPackSize: z.number().min(0.1).max(5).optional(),
  monsterRarity: z.number().min(0).max(100).optional(),
  monsterLevel: z.number().min(-10).max(10).optional(),
  itemQuantity: z.number().min(0.1).max(5).optional(),
  itemRarity: z.number().min(0).max(100).optional(),
  bossChance: z.number().min(0).max(100).optional(),
  areaLevel: z.number().min(1).max(100).optional(),
}).strict();

// Flask schema
export const FlaskSchema = z.object({
  maxCharges: z.number().min(1).max(100),
  chargeTime: z.number().min(0.1).max(60),
  duration: z.number().min(0.1).max(300).optional(),
  effect: z.array(z.object({
    stat: StatKeySchema,
    value: ValueRangeSchema,
  })),
  instantHeal: z.number().min(0).finite().optional(),
}).strict();

// Currency schema
export const CurrencySchema = z.object({
  effect: z.string().min(1).max(500),
  action: z.enum([
    'upgrade_rarity', 'add_mod', 'remove_mods', 'reroll', 'identify',
    'portal', 'wisdom', 'transmute', 'augment', 'alteration', 'regal',
    'chaos', 'exalted', 'divine', 'blessed', 'scouring', 'annulment'
  ]),
}).strict();

// Socketable schema
export const SocketableSchema = z.object({
  type: z.enum(['active_skill', 'support_skill']),
  tags: z.array(z.string()).optional(),
  manaCost: z.number().min(0).finite().optional(),
  cooldown: z.number().min(0).finite().optional(),
  effect: z.array(z.object({
    stat: StatKeySchema,
    value: ValueRangeSchema,
  })),
  description: z.string().min(1).max(1000),
}).strict();

// ItemBase schema
export const ItemBaseSchema = z.object({
  id: ItemIdSchema,
  slot: ItemSlotSchema,
  name: z.string().min(1).max(100).regex(/^[^<>&"]*$/, 'Name contains invalid characters'),
  class: ItemClassSchema.optional(),
  size: z.object({
    w: z.number().min(1).max(4),
    h: z.number().min(1).max(4),
  }).optional(),
  icon: z.string().min(1).max(200).optional(),
  req: RequirementsSchema.optional(),
  dmg: DamageSchema.optional(),
  crit: z.number().min(0).max(100).optional(),
  aps: z.number().min(0.1).max(10).optional(),
  range: z.number().min(1).max(200).optional(),
  implicit: z.array(ImplicitModSchema).optional(),
  mapMods: MapModifiersSchema.optional(),
  stackable: z.boolean().optional(),
  maxStack: z.number().min(1).max(10000).optional(),
  flask: FlaskSchema.optional(),
  currency: CurrencySchema.optional(),
  socketable: SocketableSchema.optional(),
}).strict();

// Affix schema
export const AffixSchema = z.object({
  group: z.string().min(1).max(100),
  stat: StatKeySchema,
  tier: z.number().min(1).max(99),
  value: z.number().finite(),
}).strict();

// Affix definition schema (for prefixes/suffixes data)
export const AffixDefinitionSchema = z.object({
  group: z.string().min(1).max(100),
  stat: StatKeySchema,
  tiers: z.array(z.object({
    tier: z.number().min(1).max(3),
    min: z.number().finite(),
    max: z.number().finite(),
  })).min(1).max(3),
}).strict();

// Unique definition schema
export const UniqueDefSchema = z.object({
  id: ItemIdSchema,
  name: z.string().min(1).max(100).regex(/^[^<>&"]*$/, 'Name contains invalid characters'),
  baseId: ItemIdSchema,
  implicit: z.array(z.object({
    stat: StatKeySchema,
    value: ValueRangeSchema,
  })).optional(),
  explicit: z.array(z.object({
    stat: StatKeySchema,
    value: z.tuple([z.number().finite(), z.number().finite()]),
  })),
  special: z.string().optional(),
}).strict();

// ItemInstance schema
export const ItemInstanceSchema = z.object({
  uid: z.string().min(1).max(200),
  baseId: ItemIdSchema,
  rarity: RaritySchema,
  affixes: z.array(AffixSchema),
  sockets: z.object({
    supports: z.number().min(0).max(6),
    gems: z.array(z.string()).optional(),
  }).optional(),
  level: z.number().min(1).max(100),
  uniqueId: z.string().optional(),
  setId: z.string().optional(),
  quantity: z.number().min(1).max(10000).optional(),
  flaskCharges: z.number().min(0).max(100).optional(),
  flaskChargeTime: z.number().finite().optional(),
}).strict();

// Drop table entry schema
export const DropTableEntrySchema = z.object({
  id: ItemIdSchema,
  weight: z.number().min(0).max(1000),
  minLevel: z.number().min(1).max(100).optional(),
  maxLevel: z.number().min(1).max(100).optional(),
  nodrop: z.boolean().optional(),
}).strict();

// Type exports for TypeScript
export type ItemId = z.infer<typeof ItemIdSchema>;
export type ItemSlot = z.infer<typeof ItemSlotSchema>;
export type ItemClass = z.infer<typeof ItemClassSchema>;
export type Rarity = z.infer<typeof RaritySchema>;
export type StatKey = z.infer<typeof StatKeySchema>;
export type ValueRange = z.infer<typeof ValueRangeSchema>;
export type Requirements = z.infer<typeof RequirementsSchema>;
export type Damage = z.infer<typeof DamageSchema>;
export type ImplicitMod = z.infer<typeof ImplicitModSchema>;
export type MapModifiers = z.infer<typeof MapModifiersSchema>;
export type Flask = z.infer<typeof FlaskSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type Socketable = z.infer<typeof SocketableSchema>;
export type ItemBase = z.infer<typeof ItemBaseSchema>;
export type Affix = z.infer<typeof AffixSchema>;
export type AffixDefinition = z.infer<typeof AffixDefinitionSchema>;
export type UniqueDef = z.infer<typeof UniqueDefSchema>;
export type ItemInstance = z.infer<typeof ItemInstanceSchema>;
export type DropTableEntry = z.infer<typeof DropTableEntrySchema>;
