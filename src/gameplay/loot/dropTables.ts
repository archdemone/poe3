// Drop tables - manages base item pools and selection

import type { ItemBase } from '../../systems/items';
import { ItemBases } from '../../systems/items';
import swordsData from '../../../data/items/bases_one_hand_swords.json';
import bowsData from '../../../data/items/bases_bows.json';
import helmetsData from '../../../data/items/bases_helmets.json';
import chestArmorData from '../../../data/items/bases_chest_armor.json';
import glovesData from '../../../data/items/bases_gloves.json';
import bootsData from '../../../data/items/bases_boots.json';
import amuletsData from '../../../data/items/bases_amulets.json';
import ringsData from '../../../data/items/bases_rings.json';
import beltsData from '../../../data/items/bases_belts.json';
import flasksData from '../../../data/items/bases_flasks.json';
import currencyData from '../../../data/items/bases_currency.json';
import socketablesData from '../../../data/items/bases_socketables.json';

// Sword base IDs
const swordBaseIds = [
  'golden_blade',
  'energy_blade',
  'shortsword',
  'broadsword',
  'vampiric_blade',
  'scimitar',
  'charred_shortsword',
  'sickle_sword',
  'falchion',
  'treasured_blade',
  'cutlass',
  'runic_shortsword',
  'messer',
  'commander_sword',
  'dark_blade'
];

// Bow base IDs
const bowBaseIds = [
  'crude_bow',
  'hunters_bow',
  'bone_bow',
  'royal_bow',
  'grove_bow',
  'barbed_bow',
  'iron_bow',
  'thorn_bow',
  'steel_bow',
  'ebony_bow',
  'imperial_bow'
];

// One Hand Axe base IDs
const axeBaseIds = [
  'hand_axe',
  'war_axe',
  'broad_axe',
  'battle_axe',
  'great_axe',
  'royal_axe',
  'infernal_axe',
  'legion_axe',
  'decapitating_axe',
];

// One Hand Mace base IDs
const maceBaseIds = [
  'club',
  'mace',
  'morning_star',
  'flanged_mace',
  'war_hammer',
  'battle_hammer',
  'great_maul',
  'thunder_maul',
  'earthquake_maul',
];

// Dagger base IDs
const daggerBaseIds = [
  'dagger',
  'kukri',
  'skinning_knife',
  'carving_knife',
  'stiletto',
  'boot_knife',
  'royal_dagger',
  'fiend_dagger',
  'gutting_knife',
  'poinard',
];

// Claw base IDs
const clawBaseIds = [
  'splintered_claw',
  'tiger_claw',
  'gut_ripper',
  'shark_tooth',
  'terror_claw',
  'demon_claw',
  'eagle_talon',
  'imperial_claw',
  'dragon_talon',
];

// Sceptre base IDs
const sceptreBaseIds = [
  'drifters_sceptre',
  'dark_sceptre',
  'bronze_sceptre',
  'quartz_sceptre',
  'iron_sceptre',
  'blood_sceptre',
  'shadow_sceptre',
  'grim_sceptre',
  'opal_sceptre',
];

// Spear base IDs
const spearBaseIds = [
  'wooden_spear',
  'bronze_spear',
  'iron_spear',
  'steel_spear',
  'partisan',
  'pike',
  'corsairs_pike',
  'halberd',
  'trident',
];

// Flail base IDs
const flailBaseIds = [
  'wooden_flail',
  'spiked_flail',
  'ball_flail',
  'morning_flail',
  'chain_flail',
  'knuckle_flail',
  'battle_flail',
  'infernal_flail',
  'dread_flail',
];

const shieldBaseIds = [
  'buckler',
  'round_shield',
  'kite_shield',
  'spiked_shield',
  'tower_shield',
  'bone_shield',
  'spiked_round_shield',
  'heater_shield',
  'imperial_shield',
];

const quiverBaseIds = [
  'arrow_quiver',
  'blunt_arrow_quiver',
  'fire_arrow_quiver',
  'serrated_arrow_quiver',
  'two_point_quiver',
  'broadhead_quiver',
  'featherfall_quiver',
  'blunt_quiver',
  'imperial_quiver',
];

const twoHandSwordBaseIds = [
  'bastard_sword',
  'longsword',
  'greatsword',
  'war_sword',
  'battle_sword',
  'royal_sword',
  'legion_sword',
  'highland_sword',
  'eternal_sword',
];

const twoHandAxeBaseIds = [
  'woodcutters_axe',
  'poleaxe',
  'double_axe',
  'greataxe',
  'arreats_axe',
  'champion_axe',
  'grim_reaper',
  'hellslayer',
  'messerschmidt',
];

const twoHandMaceBaseIds = [
  'great_club',
  'flanged_maul',
  'war_maul',
  'two_hand_great_maul',
  'ogre_maul',
  'thunder_maul_2h',
  'godly_maul',
  'sacred_hammer',
  'legend_spike',
];

const staffBaseIds = [
  'gnarled_staff',
  'quarterstaff',
  'cedar_staff',
  'lunar_staff',
  'elder_staff',
  'archon_staff',
  'lich_staff',
  'rune_staff',
  'void_staff',
];

// Wand base IDs (manually defined for now)
const wandBaseIds = [
  'withered_wand',
  'bone_wand',
  'attuned_wand',
  'siphoning_wand',
  'volatile_wand',
  'galvanic_wand',
  'acrid_wand',
  'offering_wand',
  'frigid_wand',
  'torture_wand',
  'critical_wand',
  'primordial_wand',
  'dueling_wand'
];

// Helmet base IDs
const helmetBaseIds = [
  'leather_cap',
  'iron_helmet',
  'steel_helmet',
  'full_helmet',
  'great_helmet',
  'royal_helmet',
  'bone_helmet',
  'wizard_hat',
  'conical_helmet',
  'horned_helmet',
  'spiked_helmet',
  'crown'
];

// Chest armor base IDs
const chestArmorBaseIds = [
  'leather_tunic',
  'chain_mail',
  'plate_mail',
  'field_armor',
  'battle_plate',
  'full_plate',
  'brigandine',
  'studded_leather',
  'scale_armor',
  'splint_armor',
  'light_plate',
  'crusader_plate',
  'robe',
  'silk_robe',
  'scholar_robe'
];

// Gloves base IDs
const glovesBaseIds = [
  'leather_gloves',
  'chain_gloves',
  'plate_gloves',
  'gauntlets',
  'crusader_gloves',
  'wrapped_mitts',
  'strapped_gloves',
  'clasped_mitts',
  'fingerless_silk_gloves',
  'wool_gloves',
  'velvet_gloves',
  'silk_gloves'
];

// Boots base IDs
const bootsBaseIds = [
  'leather_boots',
  'chain_boots',
  'plate_boots',
  'greaves',
  'soldier_boots',
  'wrapped_boots',
  'strapped_boots',
  'clasped_boots',
  'wool_shoes',
  'velvet_slippers',
  'silk_slippers',
  'scholar_boots'
];

// Amulet base IDs
const amuletBaseIds = [
  'amber_amulet',
  'coral_amulet',
  'lapis_amulet',
  'jade_amulet',
  'gold_amulet',
  'agate_amulet',
  'turquoise_amulet',
  'citrine_amulet',
  'onyx_amulet',
  'ruby_amulet',
  'sapphire_amulet',
  'topaz_amulet',
  'emerald_amulet',
  'prismatic_amulet',
  'astral_amulet'
];

// Ring base IDs
const ringBaseIds = [
  'iron_ring',
  'cerulean_ring',
  'sapphire_ring',
  'golden_hoop',
  'topaz_ring',
  'ruby_ring',
  'amethyst_ring',
  'diamond_ring',
  'opal_ring',
  'emerald_ring',
  'moonstone_ring',
  'two_toned_ring',
  'jet_ring',
  'bone_ring',
  'prismatic_ring',
  'void_ring',
  'crystal_ring'
];

// Belt base IDs
const beltBaseIds = [
  'leather_belt',
  'heavy_belt',
  'studded_belt',
  'ornate_belt',
  'wide_belt',
  'warriors_belt',
  'constrictor_belt',
  'occultist_belt',
  'belt_of_the_deceiver',
  'crystal_belt',
  'noble_belt',
  'saintly_chain_belt',
  'vambraces',
  'triumphant_lamellar',
  'miasmal_guard'
];

// Flask base IDs
const flaskBaseIds = [
  'small_life_flask',
  'medium_life_flask',
  'large_life_flask',
  'greater_life_flask',
  'grand_life_flask',
  'giant_life_flask',
  'colossal_life_flask',
  'sacred_life_flask',
  'hallowed_life_flask',
  'sanctified_life_flask',
  'divine_life_flask',
  'eternal_life_flask',
  'small_mana_flask',
  'medium_mana_flask',
  'large_mana_flask',
  'greater_mana_flask',
  'grand_mana_flask',
  'giant_mana_flask',
  'colossal_mana_flask',
  'sacred_mana_flask',
  'hallowed_mana_flask',
  'sanctified_mana_flask',
  'divine_mana_flask',
  'eternal_mana_flask',
  'quicksilver_flask',
  'basalt_flask',
  'aquamarine_flask',
  'stibnite_flask',
  'sulphur_flask',
  'silver_flask',
  'ruby_flask',
  'granite_flask',
  'jade_flask',
  'topaz_flask',
  'sapphire_flask',
  'corundum_flask'
];

// Currency base IDs
const currencyBaseIds = [
  'portal_scroll',
  'wisdom_scroll',
  'orb_of_transmutation',
  'orb_of_augmentation',
  'orb_of_alteration',
  'regal_orb',
  'chaos_orb',
  'exalted_orb',
  'divine_orb',
  'blessed_orb',
  'orb_of_scouring',
  'orb_of_annulment',
  'mirror_of_kalandra',
  'eternal_orb',
  'orb_of_horizons'
];

// Socketable base IDs
const socketableBaseIds = [
  'heavy_strike',
  'lightning_strike',
  'fire_strike',
  'ice_strike',
  'cleave',
  'double_strike',
  'dual_strike',
  'frenzy',
  'spark',
  'fireball',
  'frostbolt',
  'immolate',
  'glacial_hammer',
  'infernal_blow',
  'cyclone',
  'lacerate',
  'rain_of_arrows',
  'explosive_arrow',
  'split_arrow',
  'added_fire_damage',
  'added_cold_damage',
  'added_lightning_damage',
  'increased_damage',
  'increased_critical_strikes',
  'increased_area_damage',
  'faster_casting',
  'faster_attacks',
  'multistrike',
  'chain',
  'fork',
  'increased_duration',
  'lesser_multiple_projectiles',
  'pierce',
  'knockback',
  'stun',
  'item_rarity',
  'item_quantity'
];

// Loaded base pools
const swordBases: ItemBase[] = [
  ...swordsData.map((s: any) => ({
    ...s,
    size: { w: 1, h: 3 },
    icon: '⚔️',
  })),
  ...swordBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

const bowBases: ItemBase[] = [
  ...bowsData.map((b: any) => ({
    ...b,
    size: { w: 2, h: 3 },
    icon: '🏹',
  })),
  ...bowBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

const axeBases: ItemBase[] = axeBaseIds.map(id => ItemBases[id]).filter(Boolean);
const maceBases: ItemBase[] = maceBaseIds.map(id => ItemBases[id]).filter(Boolean);
const daggerBases: ItemBase[] = daggerBaseIds.map(id => ItemBases[id]).filter(Boolean);
const clawBases: ItemBase[] = clawBaseIds.map(id => ItemBases[id]).filter(Boolean);
const sceptreBases: ItemBase[] = sceptreBaseIds.map(id => ItemBases[id]).filter(Boolean);
const spearBases: ItemBase[] = spearBaseIds.map(id => ItemBases[id]).filter(Boolean);
const flailBases: ItemBase[] = flailBaseIds.map(id => ItemBases[id]).filter(Boolean);
const wandBases: ItemBase[] = wandBaseIds.map(id => ItemBases[id]).filter(Boolean);
const shieldBases: ItemBase[] = shieldBaseIds.map(id => ItemBases[id]).filter(Boolean);
const quiverBases: ItemBase[] = quiverBaseIds.map(id => ItemBases[id]).filter(Boolean);
const twoHandSwordBases: ItemBase[] = twoHandSwordBaseIds.map(id => ItemBases[id]).filter(Boolean);
const twoHandAxeBases: ItemBase[] = twoHandAxeBaseIds.map(id => ItemBases[id]).filter(Boolean);
const twoHandMaceBases: ItemBase[] = twoHandMaceBaseIds.map(id => ItemBases[id]).filter(Boolean);
const staffBases: ItemBase[] = staffBaseIds.map(id => ItemBases[id]).filter(Boolean);

// Armor base pools
const helmetBases: ItemBase[] = [
  ...helmetsData.map((h: any) => ({
    ...h,
    size: { w: 2, h: 2 },
    icon: '⛑️',
  })),
  ...helmetBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

const chestArmorBases: ItemBase[] = [
  ...chestArmorData.map((c: any) => ({
    ...c,
    size: { w: 2, h: 3 },
    icon: '🦺',
  })),
  ...chestArmorBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

const glovesBases: ItemBase[] = [
  ...glovesData.map((g: any) => ({
    ...g,
    size: { w: 2, h: 2 },
    icon: '🧤',
  })),
  ...glovesBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

const bootsBases: ItemBase[] = [
  ...bootsData.map((b: any) => ({
    ...b,
    size: { w: 2, h: 2 },
    icon: '👢',
  })),
  ...bootsBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

// Jewelry base pools
const amuletBases: ItemBase[] = [
  ...amuletsData.map((a: any) => ({
    ...a,
    size: { w: 1, h: 1 },
    icon: '📿',
  })),
  ...amuletBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

const ringBases: ItemBase[] = [
  ...ringsData.map((r: any) => ({
    ...r,
    size: { w: 1, h: 1 },
    icon: '💍',
  })),
  ...ringBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

const beltBases: ItemBase[] = [
  ...beltsData.map((b: any) => ({
    ...b,
    size: { w: 2, h: 1 },
    icon: '💼',
  })),
  ...beltBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

// Flask base pools
const flaskBases: ItemBase[] = [
  ...flasksData.map((f: any) => ({
    ...f,
    size: { w: 1, h: 2 },
    icon: '🧪',
  })),
  ...flaskBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

// Currency base pools
const currencyBases: ItemBase[] = [
  ...currencyData.map((c: any) => ({
    ...c,
    size: { w: 1, h: 1 },
    icon: c.id.includes('scroll') ? '📜' : '🔮',
  })),
  ...currencyBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

// Socketable base pools
const socketableBases: ItemBase[] = [
  ...socketablesData.map((s: any) => ({
    ...s,
    size: { w: 1, h: 1 },
    icon: '💎',
  })),
  ...socketableBaseIds.map(id => ItemBases[id]).filter(Boolean)
];

// Register all bases in ItemBases for global access
[...swordBases, ...bowBases, ...axeBases, ...maceBases, ...daggerBases, ...clawBases, ...sceptreBases, ...spearBases, ...flailBases, ...wandBases, ...shieldBases, ...quiverBases, ...twoHandSwordBases, ...twoHandAxeBases, ...twoHandMaceBases, ...staffBases, ...helmetBases, ...chestArmorBases, ...glovesBases, ...bootsBases, ...amuletBases, ...ringBases, ...beltBases, ...flaskBases, ...currencyBases, ...socketableBases].forEach(base => {
  ItemBases[base.id] = base;
});

export type BaseClass = 'one_hand_sword' | 'bow' | 'axe' | 'mace' | 'dagger' | 'claw' | 'sceptre' | 'spear' | 'flail' | 'wand' | 'shield' | 'quiver' | 'two_hand_sword' | 'two_hand_axe' | 'two_hand_mace' | 'staff' | 'helmet' | 'chest' | 'gloves' | 'boots' | 'amulet' | 'ring' | 'belt' | 'flask' | 'currency' | 'socketable';

/**
 * Get the pool of eligible base items for a given area level
 * @param areaLevel Current area/dungeon level
 * @param classFilter Optional filter for specific item class
 * @returns Array of eligible ItemBase objects
 */
export function getBasePool(areaLevel: number, classFilter?: BaseClass): ItemBase[] {
  let pool: ItemBase[] = [];

  if (classFilter === 'one_hand_sword') {
    pool = swordBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'bow') {
    pool = bowBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'axe') {
    pool = axeBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'mace') {
    pool = maceBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'dagger') {
    pool = daggerBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'claw') {
    pool = clawBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'sceptre') {
    pool = sceptreBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'spear') {
    pool = spearBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'flail') {
    pool = flailBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'wand') {
    pool = wandBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'shield') {
    pool = shieldBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'quiver') {
    pool = quiverBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'two_hand_sword') {
    pool = twoHandSwordBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'two_hand_axe') {
    pool = twoHandAxeBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'two_hand_mace') {
    pool = twoHandMaceBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'staff') {
    pool = staffBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'helmet') {
    pool = helmetBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'chest') {
    pool = chestArmorBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'gloves') {
    pool = glovesBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'boots') {
    pool = bootsBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'amulet') {
    pool = amuletBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'ring') {
    pool = ringBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'belt') {
    pool = beltBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'flask') {
    pool = flaskBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'currency') {
    pool = currencyBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else if (classFilter === 'socketable') {
    pool = socketableBases.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  } else {
    // Random selection between all item types (weapons, armor, jewelry, flasks, currency, socketables)
    const rand = Math.random();
    let sourcePool: ItemBase[];
    if (rand < 0.025) {
      sourcePool = swordBases;
    } else if (rand < 0.05) {
      sourcePool = bowBases;
    } else if (rand < 0.075) {
      sourcePool = axeBases;
    } else if (rand < 0.1) {
      sourcePool = maceBases;
    } else if (rand < 0.125) {
      sourcePool = daggerBases;
    } else if (rand < 0.15) {
      sourcePool = clawBases;
    } else if (rand < 0.175) {
      sourcePool = sceptreBases;
    } else if (rand < 0.2) {
      sourcePool = spearBases;
    } else if (rand < 0.225) {
      sourcePool = flailBases;
    } else if (rand < 0.25) {
      sourcePool = wandBases;
    } else if (rand < 0.275) {
      sourcePool = twoHandSwordBases;
    } else if (rand < 0.3) {
      sourcePool = twoHandAxeBases;
    } else if (rand < 0.325) {
      sourcePool = twoHandMaceBases;
    } else if (rand < 0.35) {
      sourcePool = staffBases;
    } else if (rand < 0.375) {
      sourcePool = shieldBases;
    } else if (rand < 0.4) {
      sourcePool = quiverBases;
    } else if (rand < 0.45) {
      sourcePool = helmetBases;
    } else if (rand < 0.5) {
      sourcePool = chestArmorBases;
    } else if (rand < 0.55) {
      sourcePool = glovesBases;
    } else if (rand < 0.6) {
      sourcePool = bootsBases;
    } else if (rand < 0.65) {
      sourcePool = amuletBases;
    } else if (rand < 0.7) {
      sourcePool = ringBases;
    } else if (rand < 0.75) {
      sourcePool = beltBases;
    } else if (rand < 0.8) {
      sourcePool = flaskBases;
    } else if (rand < 0.9) {
      sourcePool = currencyBases;
    } else {
      sourcePool = socketableBases;
    }
    pool = sourcePool.filter(b => !b.req?.level || b.req.level <= areaLevel + 5);
  }

  return pool.length > 0 ? pool : swordBases;
}

/**
 * Pick a random base from the pool
 */
export function pickRandomBase(areaLevel: number, classFilter?: BaseClass): ItemBase | null {
  const pool = getBasePool(areaLevel, classFilter);
  if (pool.length === 0) return null;
  
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

