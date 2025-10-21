// Save system for managing 3 save slots with localStorage persistence.
// Each slot stores metadata (for quick display in menus) and complete
// game state (for loading into the world).

import type { Vector3 } from 'babylonjs';

/** Metadata for a save slot. Displayed in save/load menus without
 * loading full save data. */
export interface SaveMeta {
  slot: 0 | 1 | 2;
  name: string;
  class: 'warrior' | 'archer';
  level: number;
  playtime: number; // seconds
  lastPlayed: number; // timestamp
}

/** Complete save data for a character and world state. */
export interface SaveData {
  meta: SaveMeta;
  character: {
    name: string;
    class: 'warrior' | 'archer';
    stats: {
      // Core attributes
      strength: number;
      dexterity: number;
      intelligence: number;
      // Resources
      hp: number;
      maxHp: number;
      mp: number;
      maxMp: number;
      // Defense
      armor: number;
      evasion: number;
    };
  };
  inventory: {
    grid: {
      width: number;
      height: number;
      items: Array<{
        item: any; // ItemInstance
        x: number;
        y: number;
      }>;
    };
  };
  equipment: {
    weapon?: any; // ItemInstance
    offhand?: any;
    helmet?: any;
    chest?: any;
    gloves?: any;
    boots?: any;
    amulet?: any;
    ring?: any;
    ring2?: any;
    belt?: any;
  };
  skills: {
    equippedActiveSkill: string; // Skill ID
    unlocked: string[]; // Array of unlocked skill IDs
    slotBindings: Record<string, string | null>;
  };
  skillTree: {
    allocatedNodes: string[]; // Node IDs
    availablePoints: number;
  };
  world: {
    currentScene: 'hideout' | 'dungeon';
    position: { x: number; y: number; z: number };
  };
  progress: {
    questFlags: Record<string, boolean>;
  };
  loot?: {
    gold: number;
    groundItems: Array<{
      item: any; // ItemInstance
      pos: { x: number; y: number; z: number };
    }>;
    vendorState: {
      items: any[]; // ItemInstance[]
      lastRefresh: number;
    };
  };
}

const SLOT_KEY = (slot: number) => `mmorpg-slot-${slot}`;
const META_KEY = (slot: number) => `mmorpg-meta-${slot}`;

/** Load metadata for a specific save slot. Returns null if slot is empty. */
export function loadSlotMeta(slot: 0 | 1 | 2): SaveMeta | null {
  try {
    const json = localStorage.getItem(META_KEY(slot));
    if (!json) return null;
    return JSON.parse(json) as SaveMeta;
  } catch (err) {
    console.warn(`Failed to load meta for slot ${slot}`, err);
    return null;
  }
}

/** Load all slot metadata for displaying in menus. */
export function loadAllSlotMeta(): (SaveMeta | null)[] {
  return [loadSlotMeta(0), loadSlotMeta(1), loadSlotMeta(2)];
}

/** Save complete game state to a slot. Updates both metadata and full data. */
export function saveGame(slot: 0 | 1 | 2, data: SaveData): void {
  try {
    // Update last played timestamp
    data.meta.lastPlayed = Date.now();
    // Save metadata separately for quick access
    localStorage.setItem(META_KEY(slot), JSON.stringify(data.meta));
    // Save full data
    localStorage.setItem(SLOT_KEY(slot), JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save to slot ${slot}`, err);
    throw err;
  }
}

/** Load complete game state from a slot. Returns null if slot is empty. */
export function loadGame(slot: 0 | 1 | 2): SaveData | null {
  try {
    const json = localStorage.getItem(SLOT_KEY(slot));
    if (!json) return null;
    return JSON.parse(json) as SaveData;
  } catch (err) {
    console.warn(`Failed to load game from slot ${slot}`, err);
    return null;
  }
}

/** Delete a save slot, removing both metadata and full data. */
export function deleteSlot(slot: 0 | 1 | 2): void {
  localStorage.removeItem(META_KEY(slot));
  localStorage.removeItem(SLOT_KEY(slot));
}

/** Create a new save with starter configuration based on class. */
export function createNewSave(
  slot: 0 | 1 | 2,
  name: string,
  characterClass: 'warrior' | 'archer'
): SaveData {
  const meta: SaveMeta = {
    slot,
    name,
    class: characterClass,
    level: 1,
    playtime: 0,
    lastPlayed: Date.now(),
  };

  // Starter equipment based on class
  const starterWeapon = characterClass === 'warrior' ? 'iron_sword' : 'short_bow';
  const starterSkill = characterClass === 'warrior' ? 'heavyStrike' : 'splitShot';

  // Starter stats based on class
  const starterStats = characterClass === 'warrior' 
    ? {
        strength: 20,
        dexterity: 10,
        intelligence: 10,
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        armor: 10,
        evasion: 5,
      }
    : {
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

  const saveData: SaveData = {
    meta,
    character: {
      name,
      class: characterClass,
      stats: starterStats,
    },
    inventory: {
      grid: {
        width: 10,
        height: 6,
        items: [], // Empty starting inventory (weapon is equipped)
      },
    },
    equipment: {
      // No equipment to start (will be added via dev chest)
    },
    skills: {
      equippedActiveSkill: starterSkill,
      unlocked: [starterSkill], // Start with class-appropriate skill
      slotBindings: {
        lmb: 'auto',
        mmb: null,
        rmb: null,
        q: null,
        w: null,
        e: null,
        r: null,
        t: null,
      },
    },
    skillTree: {
      allocatedNodes: ['start'], // Start node is always allocated
      availablePoints: 3, // Start with 3 points (from start node grant)
    },
    world: {
      currentScene: 'hideout',
      position: { x: 0, y: 0.5, z: 0 },
    },
    progress: {
      questFlags: {},
    },
    loot: {
      gold: 100,
      groundItems: [],
      vendorState: {
        items: [],
        lastRefresh: 0,
      },
    },
  };

  return saveData;
}

/** Update playtime in a save. Call this periodically during gameplay. */
export function updatePlaytime(slot: 0 | 1 | 2, deltaSeconds: number): void {
  const meta = loadSlotMeta(slot);
  if (!meta) return;
  meta.playtime += deltaSeconds;
  localStorage.setItem(META_KEY(slot), JSON.stringify(meta));
}

