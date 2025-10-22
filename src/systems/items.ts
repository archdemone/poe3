// Item system - bases, instances, affixes, and equipment

export type ItemId = string;
export type Rarity = 'normal' | 'magic' | 'rare' | 'unique';
export type ItemSlot =
  | 'weapon'
  | 'offhand'
  | 'helmet'
  | 'chest'
  | 'gloves'
  | 'boots'
  | 'amulet'
  | 'ring'
  | 'ring2'
  | 'belt'
  | 'map'
  | 'flask'
  | 'currency'
  | 'socketable';

export type ItemClass = 'one_hand_sword' | 'bow' | 'belt' | 'ring' | 'helmet' | 'chest' | 'gloves' | 'boots' | 'amulet' | 'flask' | 'currency' | 'socketable';

export interface ItemBase {
  id: ItemId;
  slot: ItemSlot;
  name: string;
  size: { w: number; h: number };
  icon: string;
  class?: ItemClass;
  req?: { level?: number; str?: number; dex?: number; int?: number };
  dmg?: {
    physMin?: number;
    physMax?: number;
    elem?: {
      fireMin?: number;
      fireMax?: number;
      coldMin?: number;
      coldMax?: number;
      lightningMin?: number;
      lightningMax?: number;
    }
  };
  crit?: number;
  aps?: number;
  range?: number;
  implicit?: { stat: string; value: number | [number, number] }[];
  mapMods?: MapModifiers;

  // Stackable item properties (currency, consumables)
  stackable?: boolean;
  maxStack?: number;

  // Flask properties
  flask?: {
    maxCharges: number;
    chargeTime: number; // seconds to gain 1 charge
    duration?: number; // effect duration in seconds
    effect: { stat: string; value: number | [number, number] }[];
    instantHeal?: number; // for instant heal flasks
  };

  // Currency properties
  currency?: {
    effect: string; // description of what the currency does
    action: 'upgrade_rarity' | 'add_mod' | 'remove_mods' | 'reroll' | 'identify' | 'portal' | 'wisdom' | 'transmute' | 'augment' | 'alteration' | 'regal' | 'chaos' | 'exalted' | 'divine' | 'blessed' | 'scouring' | 'annulment';
  };

  // Socketable properties
  socketable?: {
    type: 'active_skill' | 'support_skill';
    tags?: string[]; // weapon types this gem works with
    manaCost?: number;
    cooldown?: number;
    effect: { stat: string; value: number | [number, number] }[];
    description: string;
  };
}

export interface MapModifiers {
  monsterPackSize?: number; // Multiplier for number of monsters
  monsterRarity?: number; // Chance for rare monsters
  monsterLevel?: number; // Level modifier for monsters
  itemQuantity?: number; // Multiplier for item drops
  itemRarity?: number; // Chance for rare items
  bossChance?: number; // Chance for boss monsters
  areaLevel?: number; // Base area level
}

export interface Affix {
  group: string;
  stat: string;
  tier: number;
  value: number;
}

export interface Sockets {
  supports: number; // Number of support gem sockets (weapons only)
  gems?: string[]; // Array of socketed gem IDs
}

export interface UniqueDef {
  id: string;
  name: string;
  baseId: string;
  implicit?: { stat: string; value: number | [number, number] }[];
  explicit: { stat: string; value: [number, number] }[];
  special?: string;
}

export interface ItemInstance {
  uid: string;
  baseId: ItemId;
  rarity: Rarity;
  affixes: Affix[];
  sockets?: Sockets;
  level: number;
  uniqueId?: string; // If this is a unique item
  setId?: string; // If this is a unique item

  // Stackable item properties
  quantity?: number; // Current stack size

  // Flask properties
  flaskCharges?: number; // Current charges for flasks
  flaskChargeTime?: number; // Timestamp when last charge was gained
}

export interface EquipmentState {
  weapon?: ItemInstance;
  offhand?: ItemInstance;
  helmet?: ItemInstance;
  chest?: ItemInstance;
  gloves?: ItemInstance;
  boots?: ItemInstance;
  amulet?: ItemInstance;
  ring?: ItemInstance;
  ring2?: ItemInstance;
  belt?: ItemInstance;
}

export interface InventoryGrid {
  width: number;
  height: number;
  items: Array<{
    item: ItemInstance;
    x: number;
    y: number;
  }>;
}

// Item database
export const ItemBases: Record<ItemId, ItemBase> = {
  iron_sword: {
    id: 'iron_sword',
    slot: 'weapon',
    name: 'Iron Sword',
    size: { w: 1, h: 3 },
    icon: '⚔️',
  },
  short_bow: {
    id: 'short_bow',
    slot: 'weapon',
    name: 'Short Bow',
    size: { w: 2, h: 3 },
    icon: '🏹',
  },

  // Wands
  withered_wand: {
    id: 'withered_wand',
    slot: 'weapon',
    name: 'Withered Wand',
    size: { w: 1, h: 3 },
    icon: '🪄',
    req: { level: 1, int: 6 },
    implicit: [{ stat: 'spell_damage_pct', value: [10, 15] }],
  },
  bone_wand: {
    id: 'bone_wand',
    slot: 'weapon',
    name: 'Bone Wand',
    size: { w: 1, h: 3 },
    icon: '🦴',
    req: { level: 2, int: 7 },
    implicit: [{ stat: 'spell_damage_pct', value: [15, 20] }],
  },
  attuned_wand: {
    id: 'attuned_wand',
    slot: 'weapon',
    name: 'Attuned Wand',
    size: { w: 1, h: 3 },
    icon: '🔮',
    req: { level: 2, int: 7 },
    implicit: [{ stat: 'cast_speed_pct', value: [5, 10] }],
  },
  siphoning_wand: {
    id: 'siphoning_wand',
    slot: 'weapon',
    name: 'Siphoning Wand',
    size: { w: 1, h: 3 },
    icon: '⚡',
    req: { level: 11, int: 23 },
    implicit: [{ stat: 'spell_damage_pct', value: [20, 25] }],
  },
  volatile_wand: {
    id: 'volatile_wand',
    slot: 'weapon',
    name: 'Volatile Wand',
    size: { w: 1, h: 3 },
    icon: '💥',
    req: { level: 16, int: 31 },
    implicit: [{ stat: 'spell_crit_chance', value: [10, 15] }],
  },
  galvanic_wand: {
    id: 'galvanic_wand',
    slot: 'weapon',
    name: 'Galvanic Wand',
    size: { w: 1, h: 3 },
    icon: '🌀',
    req: { level: 25, int: 46 },
    implicit: [{ stat: 'lightning_damage_pct', value: [15, 20] }],
  },
  acrid_wand: {
    id: 'acrid_wand',
    slot: 'weapon',
    name: 'Acrid Wand',
    size: { w: 1, h: 3 },
    icon: '☠️',
    req: { level: 33, int: 60 },
    implicit: [{ stat: 'cast_speed_pct', value: [10, 15] }],
  },
  offering_wand: {
    id: 'offering_wand',
    slot: 'weapon',
    name: 'Offering Wand',
    size: { w: 1, h: 3 },
    icon: '🩸',
    req: { level: 38, int: 69 },
    implicit: [{ stat: 'life_gain_per_kill', value: [5, 10] }],
  },
  frigid_wand: {
    id: 'frigid_wand',
    slot: 'weapon',
    name: 'Frigid Wand',
    size: { w: 1, h: 3 },
    icon: '❄️',
    req: { level: 45, int: 80 },
    implicit: [{ stat: 'cold_damage_pct', value: [15, 20] }],
  },
  torture_wand: {
    id: 'torture_wand',
    slot: 'weapon',
    name: 'Torture Wand',
    size: { w: 1, h: 3 },
    icon: '🔪',
    req: { level: 49, int: 87 },
    implicit: [{ stat: 'chaos_damage_pct', value: [15, 20] }],
  },
  critical_wand: {
    id: 'critical_wand',
    slot: 'weapon',
    name: 'Critical Wand',
    size: { w: 1, h: 3 },
    icon: '💎',
    req: { level: 52, int: 92 },
    implicit: [{ stat: 'spell_crit_chance', value: [15, 20] }],
  },
  primordial_wand: {
    id: 'primordial_wand',
    slot: 'weapon',
    name: 'Primordial Wand',
    size: { w: 1, h: 3 },
    icon: '🌑',
    req: { level: 56, int: 99 },
    implicit: [{ stat: 'spell_damage_pct', value: [25, 30] }],
  },
  dueling_wand: {
    id: 'dueling_wand',
    slot: 'weapon',
    name: 'Dueling Wand',
    size: { w: 1, h: 3 },
    icon: '🎭',
    req: { level: 65, int: 114 },
    implicit: [{ stat: 'cast_speed_pct', value: [15, 20] }],
  },

  // One Hand Swords
  golden_blade: {
    id: 'golden_blade',
    slot: 'weapon',
    name: 'Golden Blade',
    size: { w: 1, h: 3 },
    icon: '⚔️',
    req: { level: 1 },
    implicit: [{ stat: 'all_attributes', value: [16, 24] }],
  },
  energy_blade: {
    id: 'energy_blade',
    slot: 'weapon',
    name: 'Energy Blade',
    size: { w: 1, h: 3 },
    icon: '⚡',
    req: { level: 1 },
    implicit: [{ stat: 'lightning_damage_flat', value: [2, 10] }],
  },
  shortsword: {
    id: 'shortsword',
    slot: 'weapon',
    name: 'Shortsword',
    size: { w: 1, h: 3 },
    icon: '🗡️',
    req: { level: 1 },
    implicit: [{ stat: 'melee_pct', value: [3, 5] }],
  },
  broadsword: {
    id: 'broadsword',
    slot: 'weapon',
    name: 'Broadsword',
    size: { w: 1, h: 3 },
    icon: '⚔️',
    req: { level: 6, str: 9, dex: 9 },
    implicit: [{ stat: 'melee_pct', value: [5, 8] }],
  },
  vampiric_blade: {
    id: 'vampiric_blade',
    slot: 'weapon',
    name: 'Vampiric Blade',
    size: { w: 1, h: 3 },
    icon: '🧛',
    req: { level: 11, str: 14, dex: 14 },
    implicit: [{ stat: 'life_leech_pct', value: [3, 5] }],
  },
  scimitar: {
    id: 'scimitar',
    slot: 'weapon',
    name: 'Scimitar',
    size: { w: 1, h: 3 },
    icon: '🗡️',
    req: { level: 16, str: 19, dex: 19 },
    implicit: [{ stat: 'melee_pct', value: [8, 12] }],
  },
  charred_shortsword: {
    id: 'charred_shortsword',
    slot: 'weapon',
    name: 'Charred Shortsword',
    size: { w: 1, h: 3 },
    icon: '🔥',
    req: { level: 21, str: 23, dex: 23 },
    implicit: [{ stat: 'fire_damage_pct', value: [10, 15] }],
  },
  sickle_sword: {
    id: 'sickle_sword',
    slot: 'weapon',
    name: 'Sickle Sword',
    size: { w: 1, h: 3 },
    icon: '🌙',
    req: { level: 28, str: 29, dex: 29 },
    implicit: [{ stat: 'crit_chance', value: [5, 8] }],
  },
  falchion: {
    id: 'falchion',
    slot: 'weapon',
    name: 'Falchion',
    size: { w: 1, h: 3 },
    icon: '⚔️',
    req: { level: 33, str: 34, dex: 34 },
    implicit: [{ stat: 'melee_pct', value: [12, 18] }],
  },
  treasured_blade: {
    id: 'treasured_blade',
    slot: 'weapon',
    name: 'Treasured Blade',
    size: { w: 1, h: 3 },
    icon: '💰',
    req: { level: 40, str: 40, dex: 40 },
    implicit: [{ stat: 'gold_find_pct', value: [10, 15] }],
  },
  cutlass: {
    id: 'cutlass',
    slot: 'weapon',
    name: 'Cutlass',
    size: { w: 1, h: 3 },
    icon: '🏴‍☠️',
    req: { level: 45, str: 45, dex: 45 },
    implicit: [{ stat: 'melee_pct', value: [15, 22] }],
  },
  runic_shortsword: {
    id: 'runic_shortsword',
    slot: 'weapon',
    name: 'Runic Shortsword',
    size: { w: 1, h: 3 },
    icon: '📜',
    req: { level: 50, str: 49, dex: 49 },
    implicit: [{ stat: 'spell_damage_pct', value: [8, 12] }],
  },
  messer: {
    id: 'messer',
    slot: 'weapon',
    name: 'Messer',
    size: { w: 1, h: 3 },
    icon: '⚔️',
    req: { level: 52, str: 51, dex: 51 },
    implicit: [{ stat: 'melee_pct', value: [18, 25] }],
  },
  commander_sword: {
    id: 'commander_sword',
    slot: 'weapon',
    name: 'Commander Sword',
    size: { w: 1, h: 3 },
    icon: '👑',
    req: { level: 54, str: 53, dex: 53 },
    implicit: [{ stat: 'minion_damage_pct', value: [10, 15] }],
  },
  dark_blade: {
    id: 'dark_blade',
    slot: 'weapon',
    name: 'Dark Blade',
    size: { w: 1, h: 3 },
    icon: '🌑',
    req: { level: 65, str: 63, dex: 63 },
    implicit: [{ stat: 'chaos_damage_pct', value: [15, 20] }],
  },

  // Bows
  crude_bow: {
    id: 'crude_bow',
    slot: 'weapon',
    name: 'Crude Bow',
    size: { w: 2, h: 3 },
    icon: '🏹',
    req: { level: 1 },
    implicit: [{ stat: 'bow_pct', value: [3, 5] }],
  },
  hunters_bow: {
    id: 'hunters_bow',
    slot: 'weapon',
    name: 'Hunter\'s Bow',
    size: { w: 2, h: 3 },
    icon: '🏹',
    req: { level: 10, dex: 18 },
    implicit: [{ stat: 'bow_pct', value: [8, 12] }],
  },
  composite_bow: {
    id: 'composite_bow',
    slot: 'weapon',
    name: 'Composite Bow',
    size: { w: 2, h: 3 },
    icon: '🏹',
    req: { level: 15, dex: 25 },
    implicit: [{ stat: 'bow_pct', value: [10, 15] }],
  },
  recurve_bow: {
    id: 'recurve_bow',
    slot: 'weapon',
    name: 'Recurve Bow',
    size: { w: 2, h: 3 },
    icon: '🏹',
    req: { level: 20, dex: 32 },
    implicit: [{ stat: 'bow_pct', value: [12, 18] }],
  },
  bone_bow: {
    id: 'bone_bow',
    slot: 'weapon',
    name: 'Bone Bow',
    size: { w: 2, h: 3 },
    icon: '🦴',
    req: { level: 25, dex: 38 },
    implicit: [{ stat: 'bow_pct', value: [15, 22] }],
  },
  royal_bow: {
    id: 'royal_bow',
    slot: 'weapon',
    name: 'Royal Bow',
    size: { w: 2, h: 3 },
    icon: '👑',
    req: { level: 30, dex: 45 },
    implicit: [{ stat: 'bow_pct', value: [18, 25] }],
  },
  grove_bow: {
    id: 'grove_bow',
    slot: 'weapon',
    name: 'Grove Bow',
    size: { w: 2, h: 3 },
    icon: '🌳',
    req: { level: 35, dex: 50 },
    implicit: [{ stat: 'bow_pct', value: [20, 28] }],
  },
  barbed_bow: {
    id: 'barbed_bow',
    slot: 'weapon',
    name: 'Barbed Bow',
    size: { w: 2, h: 3 },
    icon: '🌵',
    req: { level: 40, dex: 55 },
    implicit: [{ stat: 'bleed_chance', value: [10, 15] }],
  },
  iron_bow: {
    id: 'iron_bow',
    slot: 'weapon',
    name: 'Iron Bow',
    size: { w: 2, h: 3 },
    icon: '🏹',
    req: { level: 45, dex: 60 },
    implicit: [{ stat: 'bow_pct', value: [25, 35] }],
  },
  thorn_bow: {
    id: 'thorn_bow',
    slot: 'weapon',
    name: 'Thorn Bow',
    size: { w: 2, h: 3 },
    icon: '🌿',
    req: { level: 50, dex: 65 },
    implicit: [{ stat: 'poison_chance', value: [15, 20] }],
  },
  steel_bow: {
    id: 'steel_bow',
    slot: 'weapon',
    name: 'Steel Bow',
    size: { w: 2, h: 3 },
    icon: '🏹',
    req: { level: 55, dex: 70 },
    implicit: [{ stat: 'bow_pct', value: [30, 40] }],
  },
  ebony_bow: {
    id: 'ebony_bow',
    slot: 'weapon',
    name: 'Ebony Bow',
    size: { w: 2, h: 3 },
    icon: '🌑',
    req: { level: 60, dex: 75 },
    implicit: [{ stat: 'bow_pct', value: [35, 45] }],
  },
  imperial_bow: {
    id: 'imperial_bow',
    slot: 'weapon',
    name: 'Imperial Bow',
    size: { w: 2, h: 3 },
    icon: '👑',
    req: { level: 65, dex: 80 },
    implicit: [{ stat: 'bow_pct', value: [40, 50] }],
  },

  // One Hand Axes
  hand_axe: {
    id: 'hand_axe',
    slot: 'weapon',
    name: 'Hand Axe',
    size: { w: 1, h: 3 },
    icon: '🪓',
    req: { level: 1 },
    implicit: [{ stat: 'melee_pct', value: [3, 5] }],
  },
  war_axe: {
    id: 'war_axe',
    slot: 'weapon',
    name: 'War Axe',
    size: { w: 1, h: 3 },
    icon: '🪓',
    req: { level: 8, str: 16 },
    implicit: [{ stat: 'melee_pct', value: [6, 9] }],
  },
  broad_axe: {
    id: 'broad_axe',
    slot: 'weapon',
    name: 'Broad Axe',
    size: { w: 1, h: 3 },
    icon: '🪓',
    req: { level: 15, str: 27 },
    implicit: [{ stat: 'melee_pct', value: [9, 13] }],
  },
  battle_axe: {
    id: 'battle_axe',
    slot: 'weapon',
    name: 'Battle Axe',
    size: { w: 1, h: 3 },
    icon: '🪓',
    req: { level: 22, str: 35 },
    implicit: [{ stat: 'melee_pct', value: [12, 17] }],
  },
  great_axe: {
    id: 'great_axe',
    slot: 'weapon',
    name: 'Great Axe',
    size: { w: 1, h: 3 },
    icon: '🪓',
    req: { level: 30, str: 44 },
    implicit: [{ stat: 'melee_pct', value: [15, 21] }],
  },
  royal_axe: {
    id: 'royal_axe',
    slot: 'weapon',
    name: 'Royal Axe',
    size: { w: 1, h: 3 },
    icon: '👑',
    req: { level: 38, str: 52 },
    implicit: [{ stat: 'melee_pct', value: [18, 25] }],
  },
  infernal_axe: {
    id: 'infernal_axe',
    slot: 'weapon',
    name: 'Infernal Axe',
    size: { w: 1, h: 3 },
    icon: '🔥',
    req: { level: 46, str: 59 },
    implicit: [{ stat: 'fire_damage_pct', value: [15, 22] }],
  },
  legion_axe: {
    id: 'legion_axe',
    slot: 'weapon',
    name: 'Legion Axe',
    size: { w: 1, h: 3 },
    icon: '⚔️',
    req: { level: 54, str: 66 },
    implicit: [{ stat: 'melee_pct', value: [22, 30] }],
  },
  decapitating_axe: {
    id: 'decapitating_axe',
    slot: 'weapon',
    name: 'Decapitating Axe',
    size: { w: 1, h: 3 },
    icon: '⚔️',
    req: { level: 62, str: 72 },
    implicit: [{ stat: 'crit_chance', value: [8, 12] }],
  },

  // One Hand Maces
  club: {
    id: 'club',
    slot: 'weapon',
    name: 'Club',
    size: { w: 1, h: 3 },
    icon: '🏏',
    req: { level: 1 },
    implicit: [{ stat: 'melee_pct', value: [2, 4] }],
  },
  mace: {
    id: 'mace',
    slot: 'weapon',
    name: 'Mace',
    size: { w: 1, h: 3 },
    icon: '🔨',
    req: { level: 5, str: 13 },
    implicit: [{ stat: 'melee_pct', value: [4, 7] }],
  },
  morning_star: {
    id: 'morning_star',
    slot: 'weapon',
    name: 'Morning Star',
    size: { w: 1, h: 3 },
    icon: '⭐',
    req: { level: 12, str: 22 },
    implicit: [{ stat: 'melee_pct', value: [7, 11] }],
  },
  flanged_mace: {
    id: 'flanged_mace',
    slot: 'weapon',
    name: 'Flanged Mace',
    size: { w: 1, h: 3 },
    icon: '🔨',
    req: { level: 19, str: 31 },
    implicit: [{ stat: 'melee_pct', value: [10, 15] }],
  },
  war_hammer: {
    id: 'war_hammer',
    slot: 'weapon',
    name: 'War Hammer',
    size: { w: 1, h: 3 },
    icon: '🔨',
    req: { level: 26, str: 39 },
    implicit: [{ stat: 'melee_pct', value: [13, 19] }],
  },
  battle_hammer: {
    id: 'battle_hammer',
    slot: 'weapon',
    name: 'Battle Hammer',
    size: { w: 1, h: 3 },
    icon: '🔨',
    req: { level: 33, str: 47 },
    implicit: [{ stat: 'stun_chance', value: [5, 8] }],
  },
  great_maul: {
    id: 'great_maul',
    slot: 'weapon',
    name: 'Great Maul',
    size: { w: 1, h: 3 },
    icon: '🔨',
    req: { level: 40, str: 54 },
    implicit: [{ stat: 'melee_pct', value: [18, 25] }],
  },
  thunder_maul: {
    id: 'thunder_maul',
    slot: 'weapon',
    name: 'Thunder Maul',
    size: { w: 1, h: 3 },
    icon: '⚡',
    req: { level: 48, str: 61 },
    implicit: [{ stat: 'lightning_damage_pct', value: [12, 18] }],
  },
  earthquake_maul: {
    id: 'earthquake_maul',
    slot: 'weapon',
    name: 'Earthquake Maul',
    size: { w: 1, h: 3 },
    icon: '🌋',
    req: { level: 56, str: 67 },
    implicit: [{ stat: 'melee_pct', value: [25, 35] }],
  },

  // Daggers
  dagger: {
    id: 'dagger',
    slot: 'weapon',
    name: 'Dagger',
    size: { w: 1, h: 2 },
    icon: '🗡️',
    req: { level: 1 },
    implicit: [{ stat: 'melee_pct', value: [4, 6] }],
  },
  kukri: {
    id: 'kukri',
    slot: 'weapon',
    name: 'Kukri',
    size: { w: 1, h: 2 },
    icon: '🗡️',
    req: { level: 4, dex: 10 },
    implicit: [{ stat: 'melee_pct', value: [6, 9] }],
  },
  skinning_knife: {
    id: 'skinning_knife',
    slot: 'weapon',
    name: 'Skinning Knife',
    size: { w: 1, h: 2 },
    icon: '🔪',
    req: { level: 9, dex: 17 },
    implicit: [{ stat: 'crit_chance', value: [3, 5] }],
  },
  carving_knife: {
    id: 'carving_knife',
    slot: 'weapon',
    name: 'Carving Knife',
    size: { w: 1, h: 2 },
    icon: '🔪',
    req: { level: 14, dex: 24 },
    implicit: [{ stat: 'melee_pct', value: [9, 13] }],
  },
  stiletto: {
    id: 'stiletto',
    slot: 'weapon',
    name: 'Stiletto',
    size: { w: 1, h: 2 },
    icon: '🗡️',
    req: { level: 19, dex: 31 },
    implicit: [{ stat: 'crit_chance', value: [5, 8] }],
  },
  boot_knife: {
    id: 'boot_knife',
    slot: 'weapon',
    name: 'Boot Knife',
    size: { w: 1, h: 2 },
    icon: '🗡️',
    req: { level: 24, dex: 37 },
    implicit: [{ stat: 'melee_pct', value: [12, 17] }],
  },
  royal_dagger: {
    id: 'royal_dagger',
    slot: 'weapon',
    name: 'Royal Dagger',
    size: { w: 1, h: 2 },
    icon: '👑',
    req: { level: 29, dex: 42 },
    implicit: [{ stat: 'melee_pct', value: [15, 21] }],
  },
  fiend_dagger: {
    id: 'fiend_dagger',
    slot: 'weapon',
    name: 'Fiend Dagger',
    size: { w: 1, h: 2 },
    icon: '😈',
    req: { level: 34, dex: 47 },
    implicit: [{ stat: 'chaos_damage_pct', value: [8, 12] }],
  },
  gutting_knife: {
    id: 'gutting_knife',
    slot: 'weapon',
    name: 'Gutting Knife',
    size: { w: 1, h: 2 },
    icon: '🔪',
    req: { level: 39, dex: 51 },
    implicit: [{ stat: 'bleed_chance', value: [8, 12] }],
  },
  poinard: {
    id: 'poinard',
    slot: 'weapon',
    name: 'Poinard',
    size: { w: 1, h: 2 },
    icon: '🗡️',
    req: { level: 44, dex: 55 },
    implicit: [{ stat: 'melee_pct', value: [18, 25] }],
  },

  // Claws
  splintered_claw: {
    id: 'splintered_claw',
    slot: 'weapon',
    name: 'Splintered Claw',
    size: { w: 1, h: 2 },
    icon: '🦞',
    req: { level: 1 },
    implicit: [{ stat: 'melee_pct', value: [3, 5] }],
  },
  tiger_claw: {
    id: 'tiger_claw',
    slot: 'weapon',
    name: 'Tiger Claw',
    size: { w: 1, h: 2 },
    icon: '🐯',
    req: { level: 6, dex: 14 },
    implicit: [{ stat: 'melee_pct', value: [5, 8] }],
  },
  gut_ripper: {
    id: 'gut_ripper',
    slot: 'weapon',
    name: 'Gut Ripper',
    size: { w: 1, h: 2 },
    icon: '🩸',
    req: { level: 11, dex: 21 },
    implicit: [{ stat: 'bleed_chance', value: [6, 9] }],
  },
  shark_tooth: {
    id: 'shark_tooth',
    slot: 'weapon',
    name: 'Shark Tooth',
    size: { w: 1, h: 2 },
    icon: '🦈',
    req: { level: 16, dex: 28 },
    implicit: [{ stat: 'melee_pct', value: [8, 12] }],
  },
  terror_claw: {
    id: 'terror_claw',
    slot: 'weapon',
    name: 'Terror Claw',
    size: { w: 1, h: 2 },
    icon: '👻',
    req: { level: 21, dex: 35 },
    implicit: [{ stat: 'chaos_damage_pct', value: [6, 10] }],
  },
  demon_claw: {
    id: 'demon_claw',
    slot: 'weapon',
    name: 'Demon Claw',
    size: { w: 1, h: 2 },
    icon: '😈',
    req: { level: 26, dex: 41 },
    implicit: [{ stat: 'melee_pct', value: [12, 17] }],
  },
  eagle_talon: {
    id: 'eagle_talon',
    slot: 'weapon',
    name: 'Eagle Talon',
    size: { w: 1, h: 2 },
    icon: '🦅',
    req: { level: 31, dex: 47 },
    implicit: [{ stat: 'crit_chance', value: [4, 7] }],
  },
  imperial_claw: {
    id: 'imperial_claw',
    slot: 'weapon',
    name: 'Imperial Claw',
    size: { w: 1, h: 2 },
    icon: '👑',
    req: { level: 36, dex: 53 },
    implicit: [{ stat: 'melee_pct', value: [15, 21] }],
  },
  dragon_talon: {
    id: 'dragon_talon',
    slot: 'weapon',
    name: 'Dragon Talon',
    size: { w: 1, h: 2 },
    icon: '🐉',
    req: { level: 41, dex: 58 },
    implicit: [{ stat: 'fire_damage_pct', value: [8, 12] }],
  },

  // Sceptres
  drifters_sceptre: {
    id: 'drifters_sceptre',
    slot: 'weapon',
    name: 'Drifter\'s Sceptre',
    size: { w: 1, h: 3 },
    icon: '🪄',
    req: { level: 1, str: 3, int: 3 },
    implicit: [{ stat: 'spell_damage_pct', value: [4, 6] }],
  },
  dark_sceptre: {
    id: 'dark_sceptre',
    slot: 'weapon',
    name: 'Dark Sceptre',
    size: { w: 1, h: 3 },
    icon: '🌑',
    req: { level: 8, str: 15, int: 15 },
    implicit: [{ stat: 'spell_damage_pct', value: [6, 9] }],
  },
  bronze_sceptre: {
    id: 'bronze_sceptre',
    slot: 'weapon',
    name: 'Bronze Sceptre',
    size: { w: 1, h: 3 },
    icon: '🟫',
    req: { level: 15, str: 26, int: 26 },
    implicit: [{ stat: 'spell_damage_pct', value: [8, 12] }],
  },
  quartz_sceptre: {
    id: 'quartz_sceptre',
    slot: 'weapon',
    name: 'Quartz Sceptre',
    size: { w: 1, h: 3 },
    icon: '💎',
    req: { level: 22, str: 35, int: 35 },
    implicit: [{ stat: 'spell_damage_pct', value: [10, 15] }],
  },
  iron_sceptre: {
    id: 'iron_sceptre',
    slot: 'weapon',
    name: 'Iron Sceptre',
    size: { w: 1, h: 3 },
    icon: '⚔️',
    req: { level: 29, str: 43, int: 43 },
    implicit: [{ stat: 'spell_damage_pct', value: [12, 18] }],
  },
  blood_sceptre: {
    id: 'blood_sceptre',
    slot: 'weapon',
    name: 'Blood Sceptre',
    size: { w: 1, h: 3 },
    icon: '🩸',
    req: { level: 36, str: 50, int: 50 },
    implicit: [{ stat: 'life_gain_per_kill', value: [3, 6] }],
  },
  shadow_sceptre: {
    id: 'shadow_sceptre',
    slot: 'weapon',
    name: 'Shadow Sceptre',
    size: { w: 1, h: 3 },
    icon: '👤',
    req: { level: 43, str: 56, int: 56 },
    implicit: [{ stat: 'spell_damage_pct', value: [15, 22] }],
  },
  grim_sceptre: {
    id: 'grim_sceptre',
    slot: 'weapon',
    name: 'Grim Sceptre',
    size: { w: 1, h: 3 },
    icon: '💀',
    req: { level: 50, str: 61, int: 61 },
    implicit: [{ stat: 'chaos_damage_pct', value: [8, 12] }],
  },
  opal_sceptre: {
    id: 'opal_sceptre',
    slot: 'weapon',
    name: 'Opal Sceptre',
    size: { w: 1, h: 3 },
    icon: '💎',
    req: { level: 57, str: 66, int: 66 },
    implicit: [{ stat: 'spell_damage_pct', value: [18, 25] }],
  },

  // Spears
  wooden_spear: {
    id: 'wooden_spear',
    slot: 'weapon',
    name: 'Wooden Spear',
    size: { w: 1, h: 4 },
    icon: '🔱',
    req: { level: 1 },
    implicit: [{ stat: 'melee_pct', value: [3, 5] }],
  },
  bronze_spear: {
    id: 'bronze_spear',
    slot: 'weapon',
    name: 'Bronze Spear',
    size: { w: 1, h: 4 },
    icon: '🔱',
    req: { level: 7, str: 15 },
    implicit: [{ stat: 'melee_pct', value: [5, 8] }],
  },
  iron_spear: {
    id: 'iron_spear',
    slot: 'weapon',
    name: 'Iron Spear',
    size: { w: 1, h: 4 },
    icon: '🔱',
    req: { level: 14, str: 25 },
    implicit: [{ stat: 'melee_pct', value: [8, 12] }],
  },
  steel_spear: {
    id: 'steel_spear',
    slot: 'weapon',
    name: 'Steel Spear',
    size: { w: 1, h: 4 },
    icon: '🔱',
    req: { level: 21, str: 34 },
    implicit: [{ stat: 'melee_pct', value: [11, 16] }],
  },
  partisan: {
    id: 'partisan',
    slot: 'weapon',
    name: 'Partisan',
    size: { w: 1, h: 4 },
    icon: '🔱',
    req: { level: 28, str: 42 },
    implicit: [{ stat: 'melee_pct', value: [14, 20] }],
  },
  pike: {
    id: 'pike',
    slot: 'weapon',
    name: 'Pike',
    size: { w: 1, h: 4 },
    icon: '🔱',
    req: { level: 35, str: 49 },
    implicit: [{ stat: 'melee_pct', value: [17, 24] }],
  },
  corsairs_pike: {
    id: 'corsairs_pike',
    slot: 'weapon',
    name: 'Corsair\'s Pike',
    size: { w: 1, h: 4 },
    icon: '🏴‍☠️',
    req: { level: 42, str: 55 },
    implicit: [{ stat: 'melee_pct', value: [20, 28] }],
  },
  halberd: {
    id: 'halberd',
    slot: 'weapon',
    name: 'Halberd',
    size: { w: 1, h: 4 },
    icon: '⚔️',
    req: { level: 49, str: 60 },
    implicit: [{ stat: 'melee_pct', value: [23, 32] }],
  },
  trident: {
    id: 'trident',
    slot: 'weapon',
    name: 'Trident',
    size: { w: 1, h: 4 },
    icon: '🔱',
    req: { level: 56, str: 65 },
    implicit: [{ stat: 'lightning_damage_pct', value: [10, 15] }],
  },

  // Flails
  wooden_flail: {
    id: 'wooden_flail',
    slot: 'weapon',
    name: 'Wooden Flail',
    size: { w: 1, h: 3 },
    icon: '🔗',
    req: { level: 1 },
    implicit: [{ stat: 'melee_pct', value: [2, 4] }],
  },
  spiked_flail: {
    id: 'spiked_flail',
    slot: 'weapon',
    name: 'Spiked Flail',
    size: { w: 1, h: 3 },
    icon: '🔗',
    req: { level: 9, str: 17 },
    implicit: [{ stat: 'melee_pct', value: [4, 7] }],
  },
  ball_flail: {
    id: 'ball_flail',
    slot: 'weapon',
    name: 'Ball Flail',
    size: { w: 1, h: 3 },
    icon: '🔗',
    req: { level: 16, str: 28 },
    implicit: [{ stat: 'stun_chance', value: [3, 5] }],
  },
  morning_flail: {
    id: 'morning_flail',
    slot: 'weapon',
    name: 'Morning Flail',
    size: { w: 1, h: 3 },
    icon: '⭐',
    req: { level: 23, str: 37 },
    implicit: [{ stat: 'melee_pct', value: [8, 12] }],
  },
  chain_flail: {
    id: 'chain_flail',
    slot: 'weapon',
    name: 'Chain Flail',
    size: { w: 1, h: 3 },
    icon: '🔗',
    req: { level: 30, str: 45 },
    implicit: [{ stat: 'melee_pct', value: [11, 16] }],
  },
  knuckle_flail: {
    id: 'knuckle_flail',
    slot: 'weapon',
    name: 'Knuckle Flail',
    size: { w: 1, h: 3 },
    icon: '👊',
    req: { level: 37, str: 52 },
    implicit: [{ stat: 'crit_chance', value: [4, 7] }],
  },
  battle_flail: {
    id: 'battle_flail',
    slot: 'weapon',
    name: 'Battle Flail',
    size: { w: 1, h: 3 },
    icon: '⚔️',
    req: { level: 44, str: 58 },
    implicit: [{ stat: 'melee_pct', value: [15, 21] }],
  },
  infernal_flail: {
    id: 'infernal_flail',
    slot: 'weapon',
    name: 'Infernal Flail',
    size: { w: 1, h: 3 },
    icon: '🔥',
    req: { level: 51, str: 63 },
    implicit: [{ stat: 'fire_damage_pct', value: [10, 15] }],
  },
  dread_flail: {
    id: 'dread_flail',
    slot: 'weapon',
    name: 'Dread Flail',
    size: { w: 1, h: 3 },
    icon: '💀',
    req: { level: 58, str: 67 },
    implicit: [{ stat: 'melee_pct', value: [20, 28] }],
  },

  // Shields (Off-hand)
  buckler: {
    id: 'buckler',
    slot: 'offhand',
    name: 'Buckler',
    size: { w: 1, h: 2 },
    icon: '🛡️',
    req: { level: 1 },
    implicit: [{ stat: 'block_chance', value: [3, 5] }],
  },
  round_shield: {
    id: 'round_shield',
    slot: 'offhand',
    name: 'Round Shield',
    size: { w: 1, h: 3 },
    icon: '🛡️',
    req: { level: 5, str: 12 },
    implicit: [{ stat: 'block_chance', value: [5, 8] }],
  },
  kite_shield: {
    id: 'kite_shield',
    slot: 'offhand',
    name: 'Kite Shield',
    size: { w: 1, h: 3 },
    icon: '🛡️',
    req: { level: 12, str: 22 },
    implicit: [{ stat: 'block_chance', value: [8, 12] }],
  },
  spiked_shield: {
    id: 'spiked_shield',
    slot: 'offhand',
    name: 'Spiked Shield',
    size: { w: 1, h: 3 },
    icon: '🛡️',
    req: { level: 19, str: 31 },
    implicit: [{ stat: 'melee_pct', value: [5, 8] }],
  },
  tower_shield: {
    id: 'tower_shield',
    slot: 'offhand',
    name: 'Tower Shield',
    size: { w: 1, h: 4 },
    icon: '🛡️',
    req: { level: 26, str: 39 },
    implicit: [{ stat: 'block_chance', value: [12, 18] }],
  },
  bone_shield: {
    id: 'bone_shield',
    slot: 'offhand',
    name: 'Bone Shield',
    size: { w: 1, h: 3 },
    icon: '🦴',
    req: { level: 33, str: 47 },
    implicit: [{ stat: 'chaos_resistance', value: [5, 8] }],
  },
  spiked_round_shield: {
    id: 'spiked_round_shield',
    slot: 'offhand',
    name: 'Spiked Round Shield',
    size: { w: 1, h: 3 },
    icon: '🛡️',
    req: { level: 40, str: 54 },
    implicit: [{ stat: 'melee_pct', value: [8, 12] }],
  },
  heater_shield: {
    id: 'heater_shield',
    slot: 'offhand',
    name: 'Heater Shield',
    size: { w: 1, h: 3 },
    icon: '🛡️',
    req: { level: 47, str: 61 },
    implicit: [{ stat: 'block_chance', value: [15, 22] }],
  },
  imperial_shield: {
    id: 'imperial_shield',
    slot: 'offhand',
    name: 'Imperial Shield',
    size: { w: 1, h: 3 },
    icon: '👑',
    req: { level: 54, str: 66 },
    implicit: [{ stat: 'block_chance', value: [18, 25] }],
  },

  // Quivers (Off-hand for bows)
  arrow_quiver: {
    id: 'arrow_quiver',
    slot: 'offhand',
    name: 'Arrow Quiver',
    size: { w: 1, h: 2 },
    icon: '🏹',
    req: { level: 1 },
    implicit: [{ stat: 'bow_pct', value: [2, 4] }],
  },
  blunt_arrow_quiver: {
    id: 'blunt_arrow_quiver',
    slot: 'offhand',
    name: 'Blunt Arrow Quiver',
    size: { w: 1, h: 2 },
    icon: '🏹',
    req: { level: 8, dex: 16 },
    implicit: [{ stat: 'bow_pct', value: [4, 6] }],
  },
  fire_arrow_quiver: {
    id: 'fire_arrow_quiver',
    slot: 'offhand',
    name: 'Fire Arrow Quiver',
    size: { w: 1, h: 2 },
    icon: '🔥',
    req: { level: 15, dex: 27 },
    implicit: [{ stat: 'fire_damage_pct', value: [5, 8] }],
  },
  serrated_arrow_quiver: {
    id: 'serrated_arrow_quiver',
    slot: 'offhand',
    name: 'Serrated Arrow Quiver',
    size: { w: 1, h: 2 },
    icon: '🗡️',
    req: { level: 22, dex: 35 },
    implicit: [{ stat: 'bleed_chance', value: [4, 6] }],
  },
  two_point_quiver: {
    id: 'two_point_quiver',
    slot: 'offhand',
    name: 'Two-Point Quiver',
    size: { w: 1, h: 2 },
    icon: '🏹',
    req: { level: 29, dex: 42 },
    implicit: [{ stat: 'bow_pct', value: [8, 12] }],
  },
  broadhead_quiver: {
    id: 'broadhead_quiver',
    slot: 'offhand',
    name: 'Broadhead Quiver',
    size: { w: 1, h: 2 },
    icon: '🏹',
    req: { level: 36, dex: 50 },
    implicit: [{ stat: 'crit_chance', value: [3, 5] }],
  },
  featherfall_quiver: {
    id: 'featherfall_quiver',
    slot: 'offhand',
    name: 'Featherfall Quiver',
    size: { w: 1, h: 2 },
    icon: '🪶',
    req: { level: 43, dex: 56 },
    implicit: [{ stat: 'bow_pct', value: [10, 15] }],
  },
  blunt_quiver: {
    id: 'blunt_quiver',
    slot: 'offhand',
    name: 'Blunt Quiver',
    size: { w: 1, h: 2 },
    icon: '🏹',
    req: { level: 50, dex: 61 },
    implicit: [{ stat: 'stun_chance', value: [3, 5] }],
  },
  imperial_quiver: {
    id: 'imperial_quiver',
    slot: 'offhand',
    name: 'Imperial Quiver',
    size: { w: 1, h: 2 },
    icon: '👑',
    req: { level: 57, dex: 67 },
    implicit: [{ stat: 'bow_pct', value: [12, 18] }],
  },

  // Two Hand Swords
  bastard_sword: {
    id: 'bastard_sword',
    slot: 'weapon',
    name: 'Bastard Sword',
    size: { w: 1, h: 4 },
    icon: '⚔️',
    req: { level: 1, str: 8 },
    implicit: [{ stat: 'melee_pct', value: [8, 12] }],
  },
  longsword: {
    id: 'longsword',
    slot: 'weapon',
    name: 'Longsword',
    size: { w: 1, h: 4 },
    icon: '⚔️',
    req: { level: 8, str: 18 },
    implicit: [{ stat: 'melee_pct', value: [12, 18] }],
  },
  greatsword: {
    id: 'greatsword',
    slot: 'weapon',
    name: 'Greatsword',
    size: { w: 1, h: 4 },
    icon: '⚔️',
    req: { level: 15, str: 30 },
    implicit: [{ stat: 'melee_pct', value: [16, 24] }],
  },
  war_sword: {
    id: 'war_sword',
    slot: 'weapon',
    name: 'War Sword',
    size: { w: 1, h: 4 },
    icon: '⚔️',
    req: { level: 22, str: 40 },
    implicit: [{ stat: 'melee_pct', value: [20, 28] }],
  },
  battle_sword: {
    id: 'battle_sword',
    slot: 'weapon',
    name: 'Battle Sword',
    size: { w: 1, h: 4 },
    icon: '⚔️',
    req: { level: 29, str: 48 },
    implicit: [{ stat: 'melee_pct', value: [24, 32] }],
  },
  royal_sword: {
    id: 'royal_sword',
    slot: 'weapon',
    name: 'Royal Sword',
    size: { w: 1, h: 4 },
    icon: '👑',
    req: { level: 36, str: 55 },
    implicit: [{ stat: 'melee_pct', value: [28, 36] }],
  },
  legion_sword: {
    id: 'legion_sword',
    slot: 'weapon',
    name: 'Legion Sword',
    size: { w: 1, h: 4 },
    icon: '⚔️',
    req: { level: 43, str: 61 },
    implicit: [{ stat: 'melee_pct', value: [32, 40] }],
  },
  highland_sword: {
    id: 'highland_sword',
    slot: 'weapon',
    name: 'Highland Sword',
    size: { w: 1, h: 4 },
    icon: '⚔️',
    req: { level: 50, str: 66 },
    implicit: [{ stat: 'melee_pct', value: [36, 44] }],
  },
  eternal_sword: {
    id: 'eternal_sword',
    slot: 'weapon',
    name: 'Eternal Sword',
    size: { w: 1, h: 4 },
    icon: '⚔️',
    req: { level: 57, str: 70 },
    implicit: [{ stat: 'melee_pct', value: [40, 48] }],
  },

  // Two Hand Axes
  woodcutters_axe: {
    id: 'woodcutters_axe',
    slot: 'weapon',
    name: 'Woodcutter\'s Axe',
    size: { w: 2, h: 3 },
    icon: '🪓',
    req: { level: 1, str: 8 },
    implicit: [{ stat: 'melee_pct', value: [10, 15] }],
  },
  poleaxe: {
    id: 'poleaxe',
    slot: 'weapon',
    name: 'Poleaxe',
    size: { w: 2, h: 3 },
    icon: '🪓',
    req: { level: 8, str: 18 },
    implicit: [{ stat: 'melee_pct', value: [15, 22] }],
  },
  double_axe: {
    id: 'double_axe',
    slot: 'weapon',
    name: 'Double Axe',
    size: { w: 2, h: 3 },
    icon: '🪓',
    req: { level: 15, str: 30 },
    implicit: [{ stat: 'melee_pct', value: [20, 28] }],
  },
  greataxe: {
    id: 'greataxe',
    slot: 'weapon',
    name: 'Greataxe',
    size: { w: 2, h: 3 },
    icon: '🪓',
    req: { level: 22, str: 40 },
    implicit: [{ stat: 'melee_pct', value: [25, 33] }],
  },
  arreats_axe: {
    id: 'arreats_axe',
    slot: 'weapon',
    name: 'Arreat\'s Axe',
    size: { w: 2, h: 3 },
    icon: '🪓',
    req: { level: 29, str: 48 },
    implicit: [{ stat: 'melee_pct', value: [30, 38] }],
  },
  champion_axe: {
    id: 'champion_axe',
    slot: 'weapon',
    name: 'Champion Axe',
    size: { w: 2, h: 3 },
    icon: '🪓',
    req: { level: 36, str: 55 },
    implicit: [{ stat: 'melee_pct', value: [35, 43] }],
  },
  grim_reaper: {
    id: 'grim_reaper',
    slot: 'weapon',
    name: 'Grim Reaper',
    size: { w: 2, h: 3 },
    icon: '💀',
    req: { level: 43, str: 61 },
    implicit: [{ stat: 'melee_pct', value: [40, 48] }],
  },
  hellslayer: {
    id: 'hellslayer',
    slot: 'weapon',
    name: 'Hellslayer',
    size: { w: 2, h: 3 },
    icon: '🔥',
    req: { level: 50, str: 66 },
    implicit: [{ stat: 'fire_damage_pct', value: [20, 28] }],
  },
  messerschmidt: {
    id: 'messerschmidt',
    slot: 'weapon',
    name: 'Messerschmidt',
    size: { w: 2, h: 3 },
    icon: '⚔️',
    req: { level: 57, str: 70 },
    implicit: [{ stat: 'melee_pct', value: [45, 53] }],
  },

  // Two Hand Maces
  great_club: {
    id: 'great_club',
    slot: 'weapon',
    name: 'Great Club',
    size: { w: 2, h: 3 },
    icon: '🏏',
    req: { level: 1, str: 8 },
    implicit: [{ stat: 'melee_pct', value: [8, 12] }],
  },
  flanged_maul: {
    id: 'flanged_maul',
    slot: 'weapon',
    name: 'Flanged Maul',
    size: { w: 2, h: 3 },
    icon: '🔨',
    req: { level: 8, str: 18 },
    implicit: [{ stat: 'melee_pct', value: [12, 18] }],
  },
  war_maul: {
    id: 'war_maul',
    slot: 'weapon',
    name: 'War Maul',
    size: { w: 2, h: 3 },
    icon: '🔨',
    req: { level: 15, str: 30 },
    implicit: [{ stat: 'stun_chance', value: [8, 12] }],
  },
  two_hand_great_maul: {
    id: 'two_hand_great_maul',
    slot: 'weapon',
    name: 'Great Maul',
    size: { w: 2, h: 3 },
    icon: '🔨',
    req: { level: 22, str: 40 },
    implicit: [{ stat: 'melee_pct', value: [18, 26] }],
  },
  ogre_maul: {
    id: 'ogre_maul',
    slot: 'weapon',
    name: 'Ogre Maul',
    size: { w: 2, h: 3 },
    icon: '🔨',
    req: { level: 29, str: 48 },
    implicit: [{ stat: 'melee_pct', value: [22, 30] }],
  },
  thunder_maul_2h: {
    id: 'thunder_maul_2h',
    slot: 'weapon',
    name: 'Thunder Maul',
    size: { w: 2, h: 3 },
    icon: '⚡',
    req: { level: 36, str: 55 },
    implicit: [{ stat: 'lightning_damage_pct', value: [18, 26] }],
  },
  godly_maul: {
    id: 'godly_maul',
    slot: 'weapon',
    name: 'Godly Maul',
    size: { w: 2, h: 3 },
    icon: '🔨',
    req: { level: 43, str: 61 },
    implicit: [{ stat: 'melee_pct', value: [28, 36] }],
  },
  sacred_hammer: {
    id: 'sacred_hammer',
    slot: 'weapon',
    name: 'Sacred Hammer',
    size: { w: 2, h: 3 },
    icon: '🔨',
    req: { level: 50, str: 66 },
    implicit: [{ stat: 'melee_pct', value: [32, 40] }],
  },
  legend_spike: {
    id: 'legend_spike',
    slot: 'weapon',
    name: 'Legend Spike',
    size: { w: 2, h: 3 },
    icon: '🔨',
    req: { level: 57, str: 70 },
    implicit: [{ stat: 'melee_pct', value: [36, 44] }],
  },

  // Staves
  gnarled_staff: {
    id: 'gnarled_staff',
    slot: 'weapon',
    name: 'Gnarled Staff',
    size: { w: 1, h: 4 },
    icon: '🪄',
    req: { level: 1, str: 3, int: 8 },
    implicit: [{ stat: 'spell_damage_pct', value: [8, 12] }],
  },
  quarterstaff: {
    id: 'quarterstaff',
    slot: 'weapon',
    name: 'Quarterstaff',
    size: { w: 1, h: 4 },
    icon: '🪄',
    req: { level: 8, str: 12, int: 18 },
    implicit: [{ stat: 'spell_damage_pct', value: [12, 18] }],
  },
  cedar_staff: {
    id: 'cedar_staff',
    slot: 'weapon',
    name: 'Cedar Staff',
    size: { w: 1, h: 4 },
    icon: '🪄',
    req: { level: 15, str: 20, int: 30 },
    implicit: [{ stat: 'spell_damage_pct', value: [16, 24] }],
  },
  lunar_staff: {
    id: 'lunar_staff',
    slot: 'weapon',
    name: 'Lunar Staff',
    size: { w: 1, h: 4 },
    icon: '🌙',
    req: { level: 22, str: 28, int: 40 },
    implicit: [{ stat: 'spell_damage_pct', value: [20, 28] }],
  },
  elder_staff: {
    id: 'elder_staff',
    slot: 'weapon',
    name: 'Elder Staff',
    size: { w: 1, h: 4 },
    icon: '🪄',
    req: { level: 29, str: 35, int: 48 },
    implicit: [{ stat: 'spell_damage_pct', value: [24, 32] }],
  },
  archon_staff: {
    id: 'archon_staff',
    slot: 'weapon',
    name: 'Archon Staff',
    size: { w: 1, h: 4 },
    icon: '🪄',
    req: { level: 36, str: 41, int: 55 },
    implicit: [{ stat: 'spell_damage_pct', value: [28, 36] }],
  },
  lich_staff: {
    id: 'lich_staff',
    slot: 'weapon',
    name: 'Lich Staff',
    size: { w: 1, h: 4 },
    icon: '💀',
    req: { level: 43, str: 46, int: 61 },
    implicit: [{ stat: 'spell_damage_pct', value: [32, 40] }],
  },
  rune_staff: {
    id: 'rune_staff',
    slot: 'weapon',
    name: 'Rune Staff',
    size: { w: 1, h: 4 },
    icon: '🪄',
    req: { level: 50, str: 50, int: 66 },
    implicit: [{ stat: 'spell_damage_pct', value: [36, 44] }],
  },
  void_staff: {
    id: 'void_staff',
    slot: 'weapon',
    name: 'Void Staff',
    size: { w: 1, h: 4 },
    icon: '🕳️',
    req: { level: 57, str: 54, int: 70 },
    implicit: [{ stat: 'chaos_damage_pct', value: [16, 24] }],
  },
  leather_belt: {
    id: 'leather_belt',
    slot: 'belt',
    name: 'Leather Belt',
    size: { w: 2, h: 1 },
    icon: '💼',
    class: 'belt' as any,
  },
  battle_hardened_belt: {
    id: 'battle_hardened_belt',
    slot: 'belt',
    name: 'Battle-Hardened Belt',
    size: { w: 2, h: 1 },
    icon: '💼',
    class: 'belt' as any,
    req: { level: 3, str: 12 },
    implicit: [{ stat: 'hp_flat', value: [20, 35] }],
  },
  gold_ring: {
    id: 'gold_ring',
    slot: 'ring',
    name: 'Gold Ring',
    size: { w: 1, h: 1 },
    icon: '💍',
  },
  mana_ring: {
    id: 'mana_ring',
    slot: 'ring',
    name: 'Sapphire Ring',
    size: { w: 1, h: 1 },
    icon: '💍',
  },
  steel_helmet: {
    id: 'steel_helmet',
    slot: 'helmet',
    name: 'Steel Helmet',
    size: { w: 2, h: 2 },
    icon: '⛑️',
  },
  battle_hardened_helmet: {
    id: 'battle_hardened_helmet',
    slot: 'helmet',
    name: 'Battle-Hardened Helmet',
    size: { w: 2, h: 2 },
    icon: '⛑️',
    req: { level: 3, str: 15 },
    implicit: [{ stat: 'armor', value: [10, 15] }],
  },
  leather_chest: {
    id: 'leather_chest',
    slot: 'chest',
    name: 'Leather Chest',
    size: { w: 2, h: 3 },
    icon: '🦺',
  },
  battle_hardened_chest: {
    id: 'battle_hardened_chest',
    slot: 'chest',
    name: 'Battle-Hardened Chest',
    size: { w: 2, h: 3 },
    icon: '🦺',
    req: { level: 3, str: 20 },
    implicit: [{ stat: 'armor', value: [15, 25] }],
  },

  // Maps
  dungeon_map: {
    id: 'dungeon_map',
    slot: 'map',
    name: 'Dungeon Map',
    size: { w: 1, h: 1 },
    icon: '🗺️',
    req: { level: 1 },
    implicit: [],
    mapMods: {
      monsterPackSize: 1.0,
      monsterRarity: 0.05,
      monsterLevel: 0,
      itemQuantity: 1.0,
      itemRarity: 0.1,
      bossChance: 0.05,
      areaLevel: 1
    }
  },
  infested_dungeon_map: {
    id: 'infested_dungeon_map',
    slot: 'map',
    name: 'Infested Dungeon Map',
    size: { w: 1, h: 1 },
    icon: '🗺️',
    req: { level: 5 },
    implicit: [],
    mapMods: {
      monsterPackSize: 1.5,
      monsterRarity: 0.08,
      monsterLevel: 1,
      itemQuantity: 1.2,
      itemRarity: 0.12,
      bossChance: 0.08,
      areaLevel: 5
    }
  },
  haunted_dungeon_map: {
    id: 'haunted_dungeon_map',
    slot: 'map',
    name: 'Haunted Dungeon Map',
    size: { w: 1, h: 1 },
    icon: '🗺️',
    req: { level: 10 },
    implicit: [],
    mapMods: {
      monsterPackSize: 1.3,
      monsterRarity: 0.15,
      monsterLevel: 2,
      itemQuantity: 1.1,
      itemRarity: 0.18,
      bossChance: 0.12,
      areaLevel: 10
    }
  },
  cursed_dungeon_map: {
    id: 'cursed_dungeon_map',
    slot: 'map',
    name: 'Cursed Dungeon Map',
    size: { w: 1, h: 1 },
    icon: '🗺️',
    req: { level: 15 },
    implicit: [],
    mapMods: {
      monsterPackSize: 1.4,
      monsterRarity: 0.20,
      monsterLevel: 3,
      itemQuantity: 1.3,
      itemRarity: 0.22,
      bossChance: 0.15,
      areaLevel: 15
    }
  },
  corrupted_dungeon_map: {
    id: 'corrupted_dungeon_map',
    slot: 'map',
    name: 'Corrupted Dungeon Map',
    size: { w: 1, h: 1 },
    icon: '🗺️',
    req: { level: 20 },
    implicit: [],
    mapMods: {
      monsterPackSize: 1.6,
      monsterRarity: 0.25,
      monsterLevel: 4,
      itemQuantity: 1.4,
      itemRarity: 0.25,
      bossChance: 0.20,
      areaLevel: 20
    }
  },
};

// Item sets and set bonuses
export interface ItemSet {
  id: string;
  name: string;
  items: ItemId[];
  bonuses: {
    pieces: number;
    stats: { stat: string; value: number }[];
  }[];
}

export const ItemSets: Record<string, ItemSet> = {
  battle_hardened: {
    id: 'battle_hardened',
    name: 'Battle-Hardened',
    items: ['battle_hardened_helmet', 'battle_hardened_chest', 'battle_hardened_belt'],
    bonuses: [
      {
        pieces: 2,
        stats: [
          { stat: 'armor', value: 15 },
          { stat: 'hp_flat', value: 25 }
        ]
      },
      {
        pieces: 3,
        stats: [
          { stat: 'armor', value: 30 },
          { stat: 'hp_flat', value: 50 },
          { stat: 'str', value: 10 }
        ]
      }
    ]
  }
};

// Rarity colors
export const RarityColors: Record<Rarity, string> = {
  normal: '#c8c8c8',
  magic: '#8888ff',
  rare: '#ffff77',
  unique: '#ff8800',
};

/** Create an item instance */
export function createItem(baseId: ItemId, affixes: Affix[] = [], rarity: Rarity = 'normal'): ItemInstance {
  return {
    uid: `${baseId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    baseId,
    rarity,
    affixes,
    level: 1,
  };
}

/** Get item base by ID */
export function getItemBase(baseId: ItemId): ItemBase | undefined {
  return ItemBases[baseId];
}

/** Check if an item can fit at a position in the grid */
export function canPlaceItem(
  grid: InventoryGrid,
  item: ItemInstance,
  x: number,
  y: number,
  excludeUid?: string
): boolean {
  const base = getItemBase(item.baseId);
  if (!base) return false;
  
  // Check bounds
  if (x < 0 || y < 0 || x + base.size.w > grid.width || y + base.size.h > grid.height) {
    return false;
  }
  
  // Check overlaps with other items
  for (const gridItem of grid.items) {
    if (excludeUid && gridItem.item.uid === excludeUid) continue;
    
    const otherBase = getItemBase(gridItem.item.baseId);
    if (!otherBase) continue;
    
    // Check rectangle overlap
    if (
      x < gridItem.x + otherBase.size.w &&
      x + base.size.w > gridItem.x &&
      y < gridItem.y + otherBase.size.h &&
      y + base.size.h > gridItem.y
    ) {
      return false;
    }
  }
  
  return true;
}

/** Add item to grid at position */
export function addItemToGrid(grid: InventoryGrid, item: ItemInstance, x: number, y: number): boolean {
  if (!canPlaceItem(grid, item, x, y)) {
    return false;
  }
  
  grid.items.push({ item, x, y });
  return true;
}

/** Remove item from grid by UID */
export function removeItemFromGrid(grid: InventoryGrid, uid: string): ItemInstance | null {
  const index = grid.items.findIndex(i => i.item.uid === uid);
  if (index === -1) return null;
  
  const removed = grid.items.splice(index, 1)[0];
  return removed.item;
}

/** Get item at grid position */
export function getItemAtPosition(grid: InventoryGrid, x: number, y: number): { item: ItemInstance; x: number; y: number } | null {
  for (const gridItem of grid.items) {
    const base = getItemBase(gridItem.item.baseId);
    if (!base) continue;

    if (
      x >= gridItem.x &&
      x < gridItem.x + base.size.w &&
      y >= gridItem.y &&
      y < gridItem.y + base.size.h
    ) {
      return gridItem;
    }
  }

  return null;
}

/** Check if player meets item requirements */
export function meetsRequirements(item: ItemInstance, playerStats: { level: number; str: number; dex: number; int: number }): boolean {
  const base = getItemBase(item.baseId);
  if (!base || !base.req) return true;

  if (base.req.level && playerStats.level < base.req.level) return false;
  if (base.req.str && playerStats.str < base.req.str) return false;
  if (base.req.dex && playerStats.dex < base.req.dex) return false;
  if (base.req.int && playerStats.int < base.req.int) return false;

  return true;
}

/** Get set bonus stats for equipped items */
export function getSetBonuses(equipment: EquipmentState): { stat: string; value: number }[] {
  const bonuses: { stat: string; value: number }[] = [];
  const equippedSets: Record<string, number> = {};

  // Count equipped items from each set
  Object.values(equipment).forEach(item => {
    if (item && item.setId) {
      equippedSets[item.setId] = (equippedSets[item.setId] || 0) + 1;
    }
  });

  // Apply bonuses for each set
  Object.entries(equippedSets).forEach(([setId, count]) => {
    const set = ItemSets[setId];
    if (set) {
      set.bonuses.forEach(bonus => {
        if (count >= bonus.pieces) {
          bonuses.push(...bonus.stats);
        }
      });
    }
  });

  return bonuses;
}

/** Update flask charges over time */
export function updateFlaskCharges(item: ItemInstance, deltaTime: number): boolean {
  const base = getItemBase(item.baseId);
  if (!base?.flask || item.flaskCharges === undefined) return false;

  const maxCharges = base.flask.maxCharges;
  const chargeTime = base.flask.chargeTime;

  // If already at max charges, nothing to do
  if (item.flaskCharges >= maxCharges) return false;

  // Initialize charge time if not set
  if (item.flaskChargeTime === undefined) {
    item.flaskChargeTime = Date.now();
    return false;
  }

  const timeSinceLastCharge = (Date.now() - item.flaskChargeTime) / 1000; // Convert to seconds

  if (timeSinceLastCharge >= chargeTime) {
    const chargesToGain = Math.floor(timeSinceLastCharge / chargeTime);
    item.flaskCharges = Math.min(maxCharges, item.flaskCharges + chargesToGain);
    item.flaskChargeTime = Date.now() - (timeSinceLastCharge % chargeTime) * 1000;
    return true; // Charges were gained
  }

  return false;
}

/** Use a flask and apply its effects */
export function useFlask(item: ItemInstance, currentStats: any, healCallback: (amount: number) => void, effectCallback: (effects: any[]) => void): boolean {
  const base = getItemBase(item.baseId);
  if (!base?.flask || !item.flaskCharges || item.flaskCharges <= 0) return false;

  // Apply instant heal if present
  if (base.flask.instantHeal) {
    healCallback(base.flask.instantHeal);
  }

  // Apply effects if present
  if (base.flask.effect && base.flask.effect.length > 0) {
    effectCallback(base.flask.effect);
  }

  // Consume a charge
  item.flaskCharges--;

  // Reset charge timer
  item.flaskChargeTime = Date.now();

  return true;
}

/** Check if flask can be used */
export function canUseFlask(item: ItemInstance): boolean {
  const base = getItemBase(item.baseId);
  return base?.flask !== undefined && item.flaskCharges !== undefined && item.flaskCharges > 0;
}

/** Initialize flask charges for a new flask instance */
export function initializeFlaskCharges(item: ItemInstance): void {
  const base = getItemBase(item.baseId);
  if (base?.flask) {
    item.flaskCharges = base.flask.maxCharges;
    item.flaskChargeTime = Date.now();
  }
}

/** Apply currency effect to an item */
export function applyCurrencyToItem(item: ItemInstance, currencyItem: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  const currencyBase = getItemBase(currencyItem.baseId);
  if (!currencyBase?.currency) {
    return { success: false, message: "Invalid currency item" };
  }

  const action = currencyBase.currency.action;

  switch (action) {
    case 'upgrade_rarity':
      return upgradeItemRarity(item);
    case 'add_mod':
      return addRandomModifier(item);
    case 'remove_mods':
      return removeAllModifiers(item);
    case 'reroll':
      return rerollItemModifiers(item);
    case 'identify':
      return identifyItem(item);
    case 'portal':
      return createPortal();
    case 'wisdom':
      return identifyItem(item); // Wisdom scroll identifies
    case 'transmute':
      return upgradeNormalToMagic(item);
    case 'augment':
      return addModifierToMagic(item);
    case 'alteration':
      return rerollMagicModifiers(item);
    case 'regal':
      return upgradeMagicToRare(item);
    case 'chaos':
      return rerollRareModifiers(item);
    case 'exalted':
      return addModifierToRare(item);
    case 'divine':
      return randomizeModifierValues(item);
    case 'blessed':
      return randomizeImplicitValues(item);
    case 'scouring':
      return removeAllModifiers(item);
    case 'annulment':
      return removeRandomModifier(item);
    default:
      return { success: false, message: "Unknown currency action" };
  }
}

/** Upgrade item rarity (normal -> magic, magic -> rare) */
function upgradeItemRarity(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  if (item.rarity === 'normal') {
    item.rarity = 'magic';
    // Add 1-2 random modifiers for magic items
    const numMods = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < numMods; i++) {
      addRandomModifierToItem(item);
    }
    return { success: true, message: "Item upgraded to magic rarity", item };
  } else if (item.rarity === 'magic') {
    item.rarity = 'rare';
    // Add 2-3 more modifiers for rare items
    const additionalMods = Math.random() < 0.5 ? 2 : 3;
    for (let i = 0; i < additionalMods; i++) {
      addRandomModifierToItem(item);
    }
    return { success: true, message: "Item upgraded to rare rarity", item };
  }
  return { success: false, message: "Item cannot be upgraded further" };
}

/** Upgrade normal item to magic */
function upgradeNormalToMagic(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  if (item.rarity !== 'normal') {
    return { success: false, message: "Item must be normal rarity" };
  }
  return upgradeItemRarity(item);
}

/** Add modifier to magic item */
function addModifierToMagic(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  if (item.rarity !== 'magic') {
    return { success: false, message: "Item must be magic rarity" };
  }
  return addRandomModifier(item);
}

/** Reroll magic item modifiers */
function rerollMagicModifiers(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  if (item.rarity !== 'magic') {
    return { success: false, message: "Item must be magic rarity" };
  }
  // Remove existing modifiers
  item.affixes = [];
  // Add new ones
  const numMods = Math.random() < 0.5 ? 1 : 2;
  for (let i = 0; i < numMods; i++) {
    addRandomModifierToItem(item);
  }
  return { success: true, message: "Magic item modifiers rerolled", item };
}

/** Upgrade magic to rare */
function upgradeMagicToRare(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  if (item.rarity !== 'magic') {
    return { success: false, message: "Item must be magic rarity" };
  }
  item.rarity = 'rare';
  // Add 1-2 more modifiers
  const additionalMods = Math.random() < 0.5 ? 1 : 2;
  for (let i = 0; i < additionalMods; i++) {
    addRandomModifierToItem(item);
  }
  return { success: true, message: "Item upgraded to rare with additional modifier", item };
}

/** Reroll rare item modifiers */
function rerollRareModifiers(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  if (item.rarity !== 'rare') {
    return { success: false, message: "Item must be rare rarity" };
  }
  // Remove existing modifiers
  item.affixes = [];
  // Add new ones (3-6 for rare items)
  const numMods = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < numMods; i++) {
    addRandomModifierToItem(item);
  }
  return { success: true, message: "Rare item modifiers rerolled", item };
}

/** Add modifier to rare item */
function addModifierToRare(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  if (item.rarity !== 'rare') {
    return { success: false, message: "Item must be rare rarity" };
  }
  return addRandomModifier(item);
}

/** Randomize modifier values */
function randomizeModifierValues(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  // Randomize the numeric values of existing modifiers
  for (const affix of item.affixes) {
    // This would require a more complex system to know the value ranges
    // For now, just add a small random variation
    affix.value += (Math.random() - 0.5) * affix.value * 0.2;
  }
  return { success: true, message: "Modifier values randomized", item };
}

/** Randomize implicit modifier values */
function randomizeImplicitValues(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  const base = getItemBase(item.baseId);
  if (!base?.implicit) return { success: false, message: "Item has no implicit modifiers" };

  // This would need to modify the base item's implicit values
  // For now, just return success
  return { success: true, message: "Implicit modifier values randomized", item };
}

/** Remove all modifiers */
function removeAllModifiers(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  item.affixes = [];
  if (item.rarity !== 'unique') {
    item.rarity = 'normal';
  }
  return { success: true, message: "All modifiers removed", item };
}

/** Reroll item modifiers (generic) */
function rerollItemModifiers(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  if (item.rarity === 'normal') {
    return { success: false, message: "Normal items have no modifiers to reroll" };
  }

  item.affixes = [];

  if (item.rarity === 'magic') {
    const numMods = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < numMods; i++) {
      addRandomModifierToItem(item);
    }
  } else if (item.rarity === 'rare') {
    const numMods = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numMods; i++) {
      addRandomModifierToItem(item);
    }
  }

  return { success: true, message: "Item modifiers rerolled", item };
}

/** Remove random modifier */
function removeRandomModifier(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  if (item.affixes.length === 0) {
    return { success: false, message: "Item has no modifiers to remove" };
  }
  const index = Math.floor(Math.random() * item.affixes.length);
  item.affixes.splice(index, 1);
  return { success: true, message: "Random modifier removed", item };
}

/** Identify an unidentified item */
function identifyItem(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  // In a real game, unidentified items would have different display
  // For now, just return success
  return { success: true, message: "Item identified", item };
}

/** Create a portal to town */
function createPortal(): { success: boolean; message: string; item?: ItemInstance } {
  // This would create a portal object in the world
  return { success: true, message: "Portal to town created" };
}

/** Add random modifier to item */
function addRandomModifier(item: ItemInstance): { success: boolean; message: string; item?: ItemInstance } {
  addRandomModifierToItem(item);
  return { success: true, message: "Random modifier added", item };
}

/** Helper function to add a random modifier */
function addRandomModifierToItem(item: ItemInstance): void {
  // This would need a proper affix system
  // For now, add a simple random stat
  const possibleStats = ['str', 'dex', 'int', 'life_flat', 'mana_flat', 'armor'];
  const stat = possibleStats[Math.floor(Math.random() * possibleStats.length)];
  const value = Math.floor(Math.random() * 10) + 1;

  item.affixes.push({
    group: stat,
    stat: stat,
    tier: 1,
    value: value
  });
}

/** Socket a gem into an item */
export function socketGem(item: ItemInstance, gemId: string, socketIndex?: number): { success: boolean; message: string } {
  const base = getItemBase(item.baseId);
  const gemBase = getItemBase(gemId);

  if (!base || !gemBase?.socketable) {
    return { success: false, message: "Invalid item or gem" };
  }

  // Initialize sockets if not present
  if (!item.sockets) {
    item.sockets = { supports: 0, gems: [] };
  }

  if (!item.sockets.gems) {
    item.sockets.gems = [];
  }

  // Check if item can accept this type of gem
  const gemType = gemBase.socketable.type;
  const itemSlot = base.slot;

  // Weapons can accept both active and support gems
  // Armor can only accept support gems (for now)
  if (itemSlot !== 'weapon' && itemSlot !== 'offhand' && gemType === 'active_skill') {
    return { success: false, message: "Only weapons can accept active skill gems" };
  }

  // Check gem tags (weapon types it works with)
  if (gemBase.socketable.tags && itemSlot === 'weapon') {
    const weaponClass = base.class;
    if (weaponClass && !gemBase.socketable.tags.includes(weaponClass)) {
      return { success: false, message: "This gem cannot be socketed in this weapon type" };
    }
  }

  // Add gem to socket
  const index = socketIndex !== undefined ? socketIndex : item.sockets.gems.length;
  if (index >= item.sockets.gems.length) {
    item.sockets.gems.push(gemId);
  } else {
    item.sockets.gems[index] = gemId;
  }

  return { success: true, message: `Socketed ${gemBase.name} into ${base.name}` };
}

/** Remove a gem from an item */
export function removeGem(item: ItemInstance, socketIndex: number): { success: boolean; message: string; gemId?: string } {
  if (!item.sockets?.gems || socketIndex >= item.sockets.gems.length) {
    return { success: false, message: "No gem in that socket" };
  }

  const gemId = item.sockets.gems[socketIndex];
  item.sockets.gems.splice(socketIndex, 1);

  const gemBase = getItemBase(gemId);
  return { success: true, message: `Removed ${gemBase?.name || 'gem'} from socket`, gemId };
}

/** Get gem effects from an item */
export function getGemEffects(item: ItemInstance): Record<string, number> {
  const effects: Record<string, number> = {};

  if (!item.sockets?.gems) return effects;

  for (const gemId of item.sockets.gems) {
    const gemBase = getItemBase(gemId);
    if (gemBase?.socketable?.effect) {
      for (const effect of gemBase.socketable.effect) {
        const stat = effect.stat;
        const value = Array.isArray(effect.value) ?
          (effect.value[0] + Math.random() * (effect.value[1] - effect.value[0])) :
          effect.value;

        effects[stat] = (effects[stat] || 0) + value;
      }
    }
  }

  return effects;
}

/** Check if item can accept more gems */
export function canSocketGem(item: ItemInstance): boolean {
  const base = getItemBase(item.baseId);
  if (!base) return false;

  // For now, allow unlimited sockets (in PoE this would be based on item level/socket count)
  return true;
}

/** Get available sockets on an item */
export function getAvailableSockets(item: ItemInstance): number {
  const base = getItemBase(item.baseId);
  if (!base) return 0;

  // For now, return a fixed number based on item level
  // In PoE this would be more complex
  const level = item.level || 1;
  return Math.min(6, Math.floor(level / 10) + 1);
}

/** Calculate total stats from item (base + affixes + implicits + gems) */
export function getItemStats(item: ItemInstance): Record<string, number> {
  const stats: Record<string, number> = {};
  const base = getItemBase(item.baseId);

  if (!base) return stats;

  // Add implicit stats
  if (base.implicit) {
    base.implicit.forEach(imp => {
      if (typeof imp.value === 'number') {
        stats[imp.stat] = (stats[imp.stat] || 0) + imp.value;
      } else {
        // Roll a random value within the range
        const [min, max] = imp.value;
        stats[imp.stat] = (stats[imp.stat] || 0) + (min + Math.floor(Math.random() * (max - min + 1)));
      }
    });
  }

  // Add affix stats
  item.affixes.forEach(affix => {
    stats[affix.stat] = (stats[affix.stat] || 0) + affix.value;
  });

  // Add gem effects
  const gemEffects = getGemEffects(item);
  Object.entries(gemEffects).forEach(([stat, value]) => {
    stats[stat] = (stats[stat] || 0) + value;
  });

  return stats;
}

