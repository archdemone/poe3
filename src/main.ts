// Comprehensive entry point for the browser MMORPG. This module now
// integrates a tiny ECS with movement, projectile and health systems,
// spawns a player entity and an invulnerable target dummy, wires up
// WASD movement and ground picking, and displays floating damage
// numbers when enemies take hits. It preserves the existing HTML UI
// behaviour for the skill bar modal and G‑menu.

import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Scene } from '@babylonjs/core/scene';

import {
  World,
  MovementSystem,
  ProjectileSystem,
  HealthSystem,
  Transform,
  Velocity,
  Health,
  EnemyTag,
  PlayerTag,
  Projectile,
  Entity,
  ChaseSystem,
  Combatant,
  Hurtbox,
  Hitbox,
  EnemyAI,
  PlayerState,
  EnemyAISystem,
  CombatSystem,
} from './ecs';
import { stateManager, GameState } from './state/gameState';
import { loadUI, unloadUI } from './ui/loader';
import type { SaveData } from './state/save';
import { saveGame, updatePlaytime, createNewSave } from './state/save';
import type { CharacterStats } from './gameplay/stats';
import { calculateSkillDamage, calculateDerivedStats } from './gameplay/stats';
import { getAssetLoader, disposeAssetLoader , getModelManager, disposeModelManager } from './systems/assetManager';
import { createTorchFlame, createMagicalAura, createPortalEffect, createAmbientDust } from './systems/particleEffects';

// Feature flags
const ENABLE_POE_STYLE_CREATOR = import.meta.env.DEV; // Enable Path of Exile-style character creator (dev only)

  // Diagnostic modules (only active in debug mode)
import { logRouteChange, logFeatureFlag, logError } from './devtools/routeDebug';
import { logSceneEvent } from './devtools/sceneDebug';
import { installWatchdog } from './features/characterCreation/guard';

// Watchdog telemetry for CI - should be 0 in happy path
(window as any).__ccDebug = (window as any).__ccDebug || {};
(window as any).__ccDebug.watchdogHits = 0;
import { installParticleDebugCommands } from './systems/particleDebug';
import { createStoneTexture, createWoodTexture, createMetalTexture, createCrystalTexture, createGroundTileTexture, createDirtTexture } from './systems/proceduralTextures';

import { updateCharacterSheet, initDebugSliders } from '../ui/charSheet';

import { loadSkillTree, setAllocatedNodes, getAllocatedNodeIds, computePassiveBonuses, getSkillTree, setPassivePoints, getTreeState } from './gameplay/skillTree';
import type { DerivedBonuses } from './gameplay/skillTree';

import { initSkillTree, refreshTree } from '../ui/skillTree';

import type { ItemInstance, EquipmentState, InventoryGrid, MapModifiers } from './systems/items';
import { createItem, getItemBase, removeItemFromGrid, updateFlaskCharges, useFlask, canUseFlask, applyCurrencyToItem } from './systems/items';
import { computeEquipBonuses, zeroEquip } from './gameplay/equipBonuses';
import type { EquipBonuses } from './gameplay/equipBonuses';
import { initInventoryCompact, getEquipment as getEquipmentCompact, getInventory as getInventoryCompact, addItem as addItemToInventoryCompact, updateInventoryData as updateInventoryDataCompact } from './ui/inventory/compact/index';
import { initInventoryStandalone, getEquipment as getEquipmentStandalone, getInventory as getInventoryStandalone, addItem as addItemToInventoryStandalone, updateInventoryData as updateInventoryDataStandalone, refreshInventory } from './ui/inventory/standalone/index';

// Helper to add item to whichever inventory is visible
function addItemToInventory(item: ItemInstance): boolean {
  const standaloneVisible = !document.getElementById('inventoryStandalone')?.classList.contains('is-hidden');
  const compactVisible = !document.getElementById('inventoryCompact')?.classList.contains('is-hidden');
  
  if (standaloneVisible) {
    return addItemToInventoryStandalone(item);
  } else if (compactVisible) {
    return addItemToInventoryCompact(item);
  } else {
    // Neither visible, add to standalone (default)
    return addItemToInventoryStandalone(item);
  }
}

// Helper to get current equipment from either inventory
function getEquipment(): EquipmentState {
  const standaloneVisible = !document.getElementById('inventoryStandalone')?.classList.contains('is-hidden');
  return standaloneVisible ? getEquipmentStandalone() : getEquipmentCompact();
}

// Helper to get current inventory from either inventory
function getInventory(): InventoryGrid {
  const standaloneVisible = !document.getElementById('inventoryStandalone')?.classList.contains('is-hidden');
  return standaloneVisible ? getInventoryStandalone() : getInventoryCompact();
}

// Helper to update both inventories with new data
function updateInventoryData(equipment: EquipmentState, inventory: InventoryGrid): void {
  updateInventoryDataStandalone(equipment, inventory);
  updateInventoryDataCompact(equipment, inventory);
}

// Save current game state to the active slot
function saveState(): void {
  try {
    // Get current game state
    const equipment = getEquipment();
    const inventory = getInventory();

    // Create basic save data structure
    const saveData = {
      meta: {
        slot: 0, // Use slot 0 as default for now
        name: "Current Game",
        class: "warrior" as const, // TODO: get from character state
        level: 1, // TODO: get from character stats
        playtime: 0, // TODO: implement playtime tracking
        lastPlayed: Date.now()
      },
      character: {
        name: "Player",
        class: "warrior" as const, // TODO: get from actual character
        stats: {
          strength: 10,
          dexterity: 10,
          intelligence: 10,
          hp: 100,
          maxHp: 100,
          mp: 50,
          maxMp: 50,
          armor: 0,
          evasion: 0
        }
      },
      inventory: {
        grid: inventory
      },
      equipment: equipment,
      gold: playerGold,
      world: {
        portals: mapDeviceState.portals,
        activePortals: mapDeviceState.activePortals
      }
    };

    // Import and use saveGame function
    import('./state/save').then(({ saveGame }) => {
      saveGame(0, saveData as any); // TODO: fix typing
      console.log('Game saved successfully');
    }).catch(error => {
      console.error('Failed to import save functions:', error);
    });
  } catch (error) {
    console.error('Failed to save game:', error);
  }
}

// Player gold variable (TODO: implement proper currency system)
export let playerGold = 0;

// Function to add gold (used by vendor system)
export function addGold(amount: number): void {
  playerGold += amount;
}

// Alias for addItem function (calls addItemToInventory)
function addItem(item: ItemInstance): boolean {
  return addItemToInventory(item);
}
import { openVendorAndInventory, attachPanelClosers } from '../ui/layout';
import { ensureTwoDock } from '../ui/mount';
import { setupIndependentToggles } from '../ui/toggles';
import { initVendorUI, showVendor, hideVendor } from '../ui/vendor';

import { DeathSystem } from './ecs/systems/deathSystem';
import { spawnMeleeHitbox } from './gameplay/combat/spawnHitbox';
import { rollAffixes } from './gameplay/loot/affixes';
import { pickRandomBase } from './gameplay/loot/dropTables';
import { initGroundItems, spawnGroundItem, updateLabels, toggleLabels, cleanupGroundItems, getAllGroundItems, restoreGroundItems } from './gameplay/loot/groundItems';
import { generateItem } from './gameplay/loot/itemGen';
import { initVendor as initVendorData, setGold, getGold, saveVendorState, loadVendorState } from './gameplay/loot/vendor';

// Grab the canvas and set up the engine and scene.
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('Canvas element not found');
}
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = new Color3(0.1, 0.1, 0.15).toColor4();

// Expose scene and canvas for debugging and testing
(window as any).scene = scene;
(window as any).canvas = canvas;
(window as any).engine = engine;

// Install particle debugging commands
installParticleDebugCommands(scene);

// Initialize asset management system
const assetLoader = getAssetLoader(scene);
const modelManager = getModelManager(scene, assetLoader);
console.log('Asset management system initialized');

// Create a default camera immediately so render loop doesn't error
// This will be replaced when the game initializes
const defaultCamera = new ArcRotateCamera('defaultCam', 0, 0, 10, Vector3.Zero(), scene);
scene.activeCamera = defaultCamera;

// Global game state
let currentSaveData: SaveData | null = null;
let currentSlot: 0 | 1 | 2 = 0;
let gameInitialized = false;
let currentStats: CharacterStats | null = null;

// ---------------------------------------------------------------------
// Camera setup
// A fixed isometric ArcRotateCamera. Alpha and beta are locked via the
// lower/upper limits so the player cannot rotate the view. Zoom is
// enabled via the mouse wheel within specified bounds.
function createIsometricCamera(): ArcRotateCamera {
  const deg2rad = (deg: number) => (deg * Math.PI) / 180;
  const alpha = deg2rad(45);
  const beta = deg2rad(35);
  const radius = 20;
  const target = new Vector3(0, 0, 0);
  const cam = new ArcRotateCamera('isoCam', alpha, beta, radius, target, scene);
  cam.attachControl(canvas, true);
  cam.lowerAlphaLimit = alpha;
  cam.upperAlphaLimit = alpha;
  cam.lowerBetaLimit = beta;
  cam.upperBetaLimit = beta;
  cam.lowerRadiusLimit = 5;
  cam.upperRadiusLimit = 50;
  // Disable panning with right mouse button
  cam.inputs.attached.pointers.buttons = [0, 1]; // Only left and middle mouse
  // Set as the active camera for the scene
  scene.activeCamera = cam;
  return cam;
}

// Populate the scene with a light and a ground plane.
function populateScene(): void {
  new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  MeshBuilder.CreateGround('ground', { width: 50, height: 50 }, scene);
}

// ---------------------------------------------------------------------
// ECS world and systems
const world = new World();
// Systems will be registered after the damage number manager is
// constructed so that the projectile system can spawn floating
// numbers. Movement and health systems can be registered immediately.
world.addSystem(new MovementSystem());
world.addSystem(new HealthSystem());

// Scene management variables. The game has two scenes: a hideout and
// a dungeon. Each scene has its own set of meshes. Switching
// between scenes hides/shows the appropriate meshes and resets
// world state as needed.
let currentScene: 'hideout' | 'dungeon' = 'hideout';
// Meshes that belong to the hideout. These are hidden when
// entering the dungeon and shown again upon exiting.
const hideoutMeshes: any[] = [];
// Meshes that belong to the dungeon (ground, walls, etc.). These are
// created when entering the dungeon and disposed when leaving.
const dungeonMeshes: any[] = [];
// Enemy entities spawned in the dungeon. Removed when leaving.
let dungeonEnemies: Entity[] = [];
// The map device mesh (part of hideout) which opens the dungeon.
let mapDevice: any | null = null;

// Map Device System
interface PortalInstance {
  id: string;
  mesh: AbstractMesh;
  position: Vector3;
  isActive: boolean;
  mapItem: ItemInstance | null;
  mapModifiers: MapModifiers | null;
  particles?: ParticleSystem;
}

interface MapDeviceState {
  insertedMap: ItemInstance | null;
  portals: PortalInstance[];
  activePortals: number;
}

const mapDeviceState: MapDeviceState = {
  insertedMap: null,
  portals: [],
  activePortals: 0
};

// Current map modifiers applied to dungeon
let currentMapModifiers: MapModifiers | null = null;
let currentPortalInstanceId: string | null = null;
// The target dummy entity in the hideout. Hidden when entering
// dungeon and shown when leaving.
let dummyEntity: Entity | null = null;
// Note: Enemy AI is now handled by EnemyAISystem registered in the world,
// no manual update needed

// Floating damage numbers. Each number is an absolutely positioned
// span in the UI that rises and fades over one second.
class DamageNumberManager {
  private items: {
    element: HTMLSpanElement;
    position: Vector3;
    life: number;
    offset: number;
  }[] = [];
  private container: HTMLElement;
  constructor(container: HTMLElement) {
    this.container = container;
  }
  spawn(pos: Vector3, amount: number) {
    const span = document.createElement('span');
    span.className = 'damage-number';
    span.textContent = amount.toString();
    span.style.position = 'absolute';
    span.style.pointerEvents = 'none';
    span.style.color = '#ff4444';
    span.style.fontWeight = 'bold';
    span.style.transform = 'translate(-50%, -50%)';
    this.container.appendChild(span);
    this.items.push({ element: span, position: pos.clone(), life: 1.0, offset: 0 });
  }
  update() {
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const transform = scene.getViewMatrix().multiply(scene.getProjectionMatrix());
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life -= 1 / 60;
      item.offset += 0.5 * (1 / 60);
      const pos = item.position.add(new Vector3(0, item.offset, 0));
      const screen = Vector3.Project(pos, Matrix.Identity(), transform, new Viewport(0, 0, width, height));
      const x = screen.x;
      const y = height - screen.y;
      item.element.style.left = `${x}px`;
      item.element.style.top = `${y}px`;
      item.element.style.opacity = `${item.life}`;
      if (item.life <= 0) {
        item.element.remove();
        this.items.splice(i, 1);
      }
    }
  }
}

// Reference to the UI root for attaching damage numbers.
const uiRoot = document.getElementById('ui') as HTMLDivElement;
const damageNumbers = new DamageNumberManager(uiRoot);

// Store reference to UI keydown handler so we can remove it during cleanup
let uiKeydownHandler: ((ev: KeyboardEvent) => void) | null = null;

// Function to update health and mana orbs
function updateResourceOrbs() {
  if (!currentStats || !gameInitialized) {
    return;
  }
  
  if (playerEntity === null || playerEntity === undefined) {
    return;
  }
  
  // Get real-time health from ECS world
  const health = world.getComponent<Health>(playerEntity, 'health');
  if (!health) {
    return;
  }
  
  const healthText = document.getElementById('health-text');
  const manaText = document.getElementById('mana-text');
  const healthFill = document.getElementById('health-fill');
  const manaFill = document.getElementById('mana-fill');
  
  if (!healthText || !manaText || !healthFill || !manaFill) {
    return;
  }
  
  // Update text with real-time values
  const healthValue = Math.floor(health.current);
  const manaValue = Math.floor(currentStats.mp);
  
  // Update text
  healthText.textContent = healthValue.toString();
  manaText.textContent = manaValue.toString();
  
  // Update fill height (percentage)
  const healthPercent = (health.current / health.max) * 100;
  const manaPercent = (currentStats.mp / currentStats.maxMp) * 100;
  
  const newHealthHeight = `${Math.max(0, Math.min(100, healthPercent))}%`;
  const newManaHeight = `${Math.max(0, Math.min(100, manaPercent))}%`;
  
  healthFill.style.height = newHealthHeight;
  manaFill.style.height = newManaHeight;
}

// Enemy health bars manager
class EnemyHealthBarManager {
  private bars: Map<Entity, HTMLDivElement> = new Map();
  private container: HTMLElement;
  
  constructor(container: HTMLElement) {
    this.container = container;
  }
  
  update() {
    if (!scene.activeCamera || !gameInitialized) return;
    
    const enemies = world.getEntitiesWith('transform', 'health', 'enemy');
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    
    // Remove bars for dead enemies
    for (const [entityId, bar] of this.bars.entries()) {
      if (!enemies.includes(entityId)) {
        bar.remove();
        this.bars.delete(entityId);
      }
    }
    
    // Update or create bars for each enemy
    for (const enemyId of enemies) {
      const entityTransform = world.getComponent<Transform>(enemyId, 'transform');
      const health = world.getComponent<Health>(enemyId, 'health');
      if (!entityTransform || !health || health.infinite) continue;
      
      // Get or create bar
      let bar = this.bars.get(enemyId);
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'enemy-health-bar';
        bar.innerHTML = `
          <div class="health-bar-bg">
            <div class="health-bar-fill"></div>
          </div>
        `;
        this.container.appendChild(bar);
        this.bars.set(enemyId, bar);
      }
      
      // Update health percentage
      const fill = bar.querySelector('.health-bar-fill') as HTMLElement;
      if (fill) {
        const percent = Math.max(0, Math.min(100, (health.current / health.max) * 100));
        fill.style.width = `${percent}%`;
      }
      
      // Position above enemy using proper projection
      const worldPos = entityTransform.position.add(new Vector3(0, 1.2, 0));
      const screenPos = Vector3.Project(
        worldPos,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        scene.activeCamera.viewport.toGlobal(width, height)
      );
      
      // Check if on screen
      if (screenPos.z >= 0 && screenPos.z <= 1) {
        bar.style.left = `${screenPos.x}px`;
        bar.style.top = `${screenPos.y}px`;
        bar.style.display = 'block';
      } else {
        bar.style.display = 'none';
      }
    }
  }
  
  clear() {
    for (const bar of this.bars.values()) {
      bar.remove();
    }
    this.bars.clear();
  }
}

const enemyHealthBars = new EnemyHealthBarManager(uiRoot);

// Current passive bonuses from skill tree
let passiveBonuses: DerivedBonuses = {
  str: 0,
  dex: 0,
  int: 0,
  hp_flat: 0,
  mp_flat: 0,
  melee_pct: 0,
  bow_pct: 0,
};

// Current equipment bonuses
let equipmentBonuses: EquipBonuses = { ...zeroEquip };

// Current equipment and inventory state
let currentEquipment: EquipmentState = {};
let currentInventoryGrid: InventoryGrid = {
  width: 10,
  height: 7,
  items: [],
};

// Aggregate all stats: base + passive tree + equipment
function aggregateAllStats(): void {
  if (!currentStats || !currentSaveData) return;
  
  try {
    // Compute passive bonuses from tree
    const tree = getSkillTree();
    if (tree) {
      passiveBonuses = computePassiveBonuses(tree);
    }
    
    // Compute equipment bonuses
    equipmentBonuses = computeEquipBonuses(currentEquipment);
    
    // Save the base stats (without bonuses) if not already saved
    if (!(currentSaveData as any).baseStats) {
      (currentSaveData as any).baseStats = {
        strength: currentSaveData.character.stats.strength,
        dexterity: currentSaveData.character.stats.dexterity,
        intelligence: currentSaveData.character.stats.intelligence,
        maxHp: currentSaveData.character.stats.maxHp,
        maxMp: currentSaveData.character.stats.maxMp,
        armor: currentSaveData.character.stats.armor,
        evasion: currentSaveData.character.stats.evasion,
      };
    }
    
    const base = (currentSaveData as any).baseStats;
    
    // Final stats = base + passive + equip
    currentStats.strength = base.strength + passiveBonuses.str + equipmentBonuses.str;
    currentStats.dexterity = base.dexterity + passiveBonuses.dex + equipmentBonuses.dex;
    currentStats.intelligence = base.intelligence + passiveBonuses.int + equipmentBonuses.int;
    currentStats.maxHp = base.maxHp + passiveBonuses.hp_flat + equipmentBonuses.hp_flat;
    currentStats.maxMp = base.maxMp + passiveBonuses.mp_flat + equipmentBonuses.mp_flat;
    currentStats.armor = base.armor + equipmentBonuses.armor;
    currentStats.evasion = base.evasion + equipmentBonuses.evasion;
    
    // Update in save data
    currentSaveData.character.stats = currentStats;
    
    // Update displays
    updateCharacterSheet(currentStats, playerClass);
    updateResourceOrbs();
  } catch (err) {
    console.warn('Could not aggregate stats:', err);
  }
}

// Backward compatibility alias
function applySkillTreeBonuses(): void {
  aggregateAllStats();
}

// Global function to show death screen
function showDeathScreen(): void {
  const deathScreen = document.getElementById('death-screen');
  if (deathScreen) {
    deathScreen.classList.remove('hidden');
  }
}

// Now that the damage number manager exists we can register the
// projectile system with a callback to spawn floating numbers on
// hits. This system will handle projectile movement and impact.
world.addSystem(new ProjectileSystem(
  (pos, dmg) => {
    damageNumbers.spawn(pos, dmg);
  },
  (targetId) => {
    // Update UI when damage is applied
    updateResourceOrbs();
  }
));

// Register combat system with callbacks for hit effects
world.addSystem(new CombatSystem(
  (ms) => {
    // Hit pause callback (optional - could implement later)
  },
  (pos, text, kind) => {
    // Float text callback
    damageNumbers.spawn(pos, parseInt(text));
  },
  (entityId) => {
    // Death callback (player death)
    showDeathScreen();
  },
  (targetId) => {
    // Update UI when damage is applied
    updateResourceOrbs();
  }
));

// Register enemy AI system for advanced enemy behavior
world.addSystem(new EnemyAISystem());

// Register centralized death system for XP and loot attribution
world.addSystem(new DeathSystem({
  onEnemyKilled: (enemyId, killerPlayerId) => {
    // Only drop loot if we're in dungeon and player killed the enemy
    if (currentScene === 'dungeon' && killerPlayerId === playerEntity) {
      const transform = world.getComponent<Transform>(enemyId, 'transform');
      if (transform) {
        const item = generateItem(currentStats?.level || 1);
        if (item) {
          console.log('[Loot] Generated item:', item.rarity, item.baseId, 'at position', transform.position, 'killed by player');
          spawnGroundItem(item, transform.position.clone());
          
          // Check for SkullHunter unique effect
          const beltItem = currentEquipment?.belt;
          if (beltItem && beltItem.uniqueId === 'skullhunter_unique_belt') {
            // For now, any enemy kill triggers the effect
            // In future, check if enemy is Rare or Unique
            console.log('[Unique] SkullHunter: stole mods (placeholder buff applied)');
            
            // TODO: Apply actual timed buff (+10% all damage for 60s)
            // For now, just log the effect
          }
        } else {
          console.warn('[Loot] Failed to generate item at', transform.position);
        }
      }
    }
    
    // TODO: Add XP system here
    // grantXP(killerPlayerId, calcXPFor(enemyId));
  },
  onPlayerKilled: (playerId) => {
    // Handle map device portal deactivation on death
    onPlayerDeath();

    // TODO: Show death overlay and respawn logic
    console.log('[DeathSystem] Player died');
  }
}));

// ---------------------------------------------------------------------
// Map Device System Functions

/**
 * Shows the map device modal and initializes drag/drop functionality
 */
function showMapDeviceModal(): void {
  const modal = document.getElementById('map-device-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  updateMapDeviceUI();
  setupMapDeviceDragDrop();
}

/**
 * Updates the map device UI to reflect current state
 */
function updateMapDeviceUI(): void {
  const slotElement = document.getElementById('map-device-slot');
  const infoElement = document.getElementById('map-info-display');
  const activateBtn = document.getElementById('activate-map-device-btn') as HTMLButtonElement;

  if (!slotElement || !infoElement || !activateBtn) return;

  if (mapDeviceState.insertedMap) {
    // Get base item info
    const base = getItemBase(mapDeviceState.insertedMap.baseId);
    if (!base) return;

    // Show inserted map
    slotElement.classList.remove('empty');
    slotElement.innerHTML = `
      <div class="map-item-display">
        <div class="map-icon">${base.icon}</div>
        <div class="map-name">${base.name}</div>
      </div>
    `;

    // Show map info
    if (base.mapMods) {
      infoElement.innerHTML = `
        <div class="map-info-content">
          <h4>${base.name}</h4>
          <div class="map-modifiers">
            ${base.mapMods.monsterPackSize ? `<div class="map-modifier"><span class="modifier-label">More Monsters</span><span class="modifier-value">${Math.round((base.mapMods.monsterPackSize! - 1) * 100)}%</span></div>` : ''}
            ${base.mapMods.monsterRarity ? `<div class="map-modifier"><span class="modifier-label">Rarer Monsters</span><span class="modifier-value">${Math.round(base.mapMods.monsterRarity! * 100)}%</span></div>` : ''}
            ${base.mapMods.monsterLevel ? `<div class="map-modifier"><span class="modifier-label">Stronger Monsters</span><span class="modifier-value">+${base.mapMods.monsterLevel}</span></div>` : ''}
            ${base.mapMods.itemQuantity ? `<div class="map-modifier"><span class="modifier-label">More Items</span><span class="modifier-value">${Math.round((base.mapMods.itemQuantity! - 1) * 100)}%</span></div>` : ''}
            ${base.mapMods.itemRarity ? `<div class="map-modifier"><span class="modifier-label">Better Items</span><span class="modifier-value">${Math.round(base.mapMods.itemRarity! * 100)}%</span></div>` : ''}
            ${base.mapMods.bossChance ? `<div class="map-modifier"><span class="modifier-label">Boss Monsters</span><span class="modifier-value">${Math.round(base.mapMods.bossChance! * 100)}%</span></div>` : ''}
            ${base.mapMods.areaLevel ? `<div class="map-modifier"><span class="modifier-label">Area Level</span><span class="modifier-value">${base.mapMods.areaLevel}</span></div>` : ''}
          </div>
        </div>
      `;
    }

    activateBtn.disabled = false;
  } else {
    // Show empty slot
    slotElement.classList.add('empty');
    slotElement.innerHTML = '<div class="slot-placeholder">Drop map here</div>';
    infoElement.innerHTML = '<p class="no-map-selected">No map selected</p>';
    activateBtn.disabled = true;
  }
}

/**
 * Sets up drag and drop functionality for the map device
 */
function setupMapDeviceDragDrop(): void {
  const slotElement = document.getElementById('map-device-slot');
  if (!slotElement) return;

  // Remove existing listeners to avoid duplicates
  slotElement.removeEventListener('dragover', handleMapDragOver);
  slotElement.removeEventListener('drop', handleMapDrop);

  slotElement.addEventListener('dragover', handleMapDragOver);
  slotElement.addEventListener('drop', handleMapDrop);
}

function handleMapDragOver(e: DragEvent): void {
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'move';

  const slotElement = e.target as HTMLElement;
  if (slotElement.id === 'map-device-slot') {
    slotElement.style.borderColor = 'rgba(100, 200, 100, 0.8)';
    slotElement.style.background = 'rgba(40, 60, 40, 0.8)';
  }
}

function handleMapDrop(e: DragEvent): void {
  e.preventDefault();
  console.log('[MapDevice] Drop event fired');

  const slotElement = e.target as HTMLElement;
  slotElement.style.borderColor = '';
  slotElement.style.background = '';

  try {
    const dataString = e.dataTransfer!.getData('application/json');
    console.log('[MapDevice] Drag data:', dataString);
    
    const data = JSON.parse(dataString);
    console.log('[MapDevice] Parsed data:', data);
    
    if (data.type === 'inventory-item' && data.item) {
      const item = data.item as ItemInstance;
      console.log('[MapDevice] Item:', item);
      
      const base = getItemBase(item.baseId); // FIX: was item.id, should be item.baseId
      console.log('[MapDevice] Base:', base);

      if (base && base.slot === 'map') {
        console.log('[MapDevice] Inserting map into device');
        insertMapIntoDevice(item);
      } else {
        console.warn('[MapDevice] Not a map item. Base slot:', base?.slot);
      }
    } else {
      console.warn('[MapDevice] Invalid drag data type or missing item');
    }
  } catch (error) {
    console.warn('[MapDevice] Failed to parse drop data:', error);
  }
}

/**
 * Inserts a map into the map device
 */
function insertMapIntoDevice(item: ItemInstance): void {
  console.log('[MapDevice] insertMapIntoDevice called with:', item);
  
  if (mapDeviceState.insertedMap) {
    // Return existing map to inventory
    console.log('[MapDevice] Returning existing map to inventory');
    addItem(mapDeviceState.insertedMap);
  }

  // Remove map from inventory using UID (not id)
  // Get the current inventory (standalone or compact)
  const currentInventory = getInventory();
  console.log('[MapDevice] Current inventory:', currentInventory);
  console.log('[MapDevice] Removing item from inventory, UID:', item.uid);
  const removed = removeItemFromGrid(currentInventory, item.uid);
  console.log('[MapDevice] Item removed from inventory:', removed);
  
  // Refresh inventory UI
  refreshInventory();

  // Insert new map
  mapDeviceState.insertedMap = item;
  updateMapDeviceUI();
  
  console.log('[MapDevice] Map device state updated');
}

/**
 * Removes the map from the device
 */
function removeMapFromDevice(): void {
  if (mapDeviceState.insertedMap) {
    addItem(mapDeviceState.insertedMap);
    mapDeviceState.insertedMap = null;
    updateMapDeviceUI();
  }
}

/**
 * Activates the map device, creating portals
 */
function activateMapDevice(): void {
  console.log('[MapDevice] Activate button clicked');
  
  if (!mapDeviceState.insertedMap) {
    console.log('[MapDevice] No map inserted');
    return;
  }

  console.log('[MapDevice] Inserted map:', mapDeviceState.insertedMap);
  const base = getItemBase(mapDeviceState.insertedMap.baseId);
  console.log('[MapDevice] Map base:', base);
  
  if (!base || !base.mapMods) {
    console.log('[MapDevice] No base or mapMods found');
    return;
  }

  console.log('[MapDevice] Creating portals with mods:', base.mapMods);
  // Create 6 portals around the map device
  createMapPortals(base.mapMods);

  // Close the modal
  const modal = document.getElementById('map-device-modal');
  if (modal) modal.classList.add('hidden');

  // Clear the inserted map (it's consumed)
  mapDeviceState.insertedMap = null;
  updateMapDeviceUI();
  console.log('[MapDevice] Portals created, map consumed');
}

/**
 * Creates 6 portals around the map device
 */
function createMapPortals(mapMods: MapModifiers): void {
  // Clear existing portals
  clearMapPortals();

  // Portal positions in a circle around the map device
  const portalPositions: Vector3[] = [];
  const centerPos = mapDevice ? mapDevice.position.clone() : new Vector3(0, 1, -5);
  const radius = 4;

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const pos = new Vector3(
      centerPos.x + Math.cos(angle) * radius,
      centerPos.y,
      centerPos.z + Math.sin(angle) * radius
    );
    portalPositions.push(pos);
  }

  // Create portal meshes
  portalPositions.forEach((pos, index) => {
    const portalMesh = MeshBuilder.CreateCylinder(`portal_${index}`, {
      diameter: 1.5,
      height: 0.1
    }, scene);

    portalMesh.position = pos;
    portalMesh.rotation.x = Math.PI / 2; // Lay flat

    // Portal material - glowing effect
    const portalMaterial = new StandardMaterial(`portal_material_${index}`, scene);
    portalMaterial.emissiveColor = new Color3(0.2, 0.8, 1.0);
    portalMaterial.alpha = 0.8;
    portalMesh.material = portalMaterial;

    // Add to hideout meshes so it's cleaned up properly
    hideoutMeshes.push(portalMesh);

    // HIGH-QUALITY Portal particle effects with GPU acceleration
    const portalParticles = createPortalEffect(`portalEffect_${index}`, portalMesh, scene);
    portalParticles.start();
    console.log(`[Particles] Started portal effect ${index}`);

    const portal: PortalInstance = {
      id: `portal_${index}`,
      mesh: portalMesh,
      position: pos,
      isActive: true,
      mapItem: mapDeviceState.insertedMap,
      mapModifiers: mapMods
      // particles: portalParticles
    };

    mapDeviceState.portals.push(portal);
  });

  mapDeviceState.activePortals = 6;
  console.log('Created 6 map portals with particle effects');
}

/**
 * Clears all active portals
 */
function clearMapPortals(): void {
  mapDeviceState.portals.forEach(portal => {
    portal.mesh.dispose();
    // Dispose of particle systems
    if (portal.particles) {
      portal.particles.dispose();
    }
    // Remove from hideout meshes
    const index = hideoutMeshes.indexOf(portal.mesh);
    if (index > -1) {
      hideoutMeshes.splice(index, 1);
    }
  });

  mapDeviceState.portals = [];
  mapDeviceState.activePortals = 0;
}

/**
 * Handles player entering a portal
 */
function enterPortal(portalIndex: number): void {
  const portal = mapDeviceState.portals[portalIndex];
  if (!portal || !portal.isActive || !portal.mapModifiers) return;

  // Apply map modifiers to dungeon generation
  currentMapModifiers = portal.mapModifiers;

  // Set portal instance ID for tracking
  currentPortalInstanceId = portal.id;

  // Start dungeon with map modifiers
  setupDungeon();
  autoSave();
}

/**
 * Called when player dies - close one portal
 */
function onPlayerDeath(): void {
  if (mapDeviceState.activePortals > 0) {
    // Find and deactivate the first active portal
    const activePortal = mapDeviceState.portals.find(p => p.isActive);
    if (activePortal) {
      activePortal.isActive = false;

      // Make portal visually inactive
      const material = activePortal.mesh.material as StandardMaterial;
      if (material) {
        material.emissiveColor = new Color3(0.5, 0.1, 0.1); // Red glow for inactive
        material.alpha = 0.3;
      }

      mapDeviceState.activePortals--;
      console.log(`Portal ${activePortal.id} deactivated. ${mapDeviceState.activePortals} portals remaining.`);
    }
  }
}

// ---------------------------------------------------------------------
// Scene setup functions

/** Set up the hideout scene by creating gothic-themed environment with
 *  better 3D assets, atmospheric lighting, and decorative elements.
 *  Meshes are added to hideoutMeshes so they can be hidden when entering dungeon. */
async function setupHideout(): Promise<void> {
  console.log('[HIDEOUT] Starting hideout setup...');
  currentScene = 'hideout';

  try {
    // Enhanced lighting setup for gothic atmosphere
    console.log('[HIDEOUT] Setting up lighting...');
    setupGothicLighting();

    // Create gothic-style ground and environment
    console.log('[HIDEOUT] Creating ground...');
    createGothicGround();

    // Create gothic castle walls and structures
    console.log('[HIDEOUT] Creating castle...');
    createGothicCastle();

    // Create enhanced map device with gothic styling
    console.log('[HIDEOUT] Creating map device...');
    await createGothicMapDevice();

    // Create target dummy with gothic styling
    console.log('[HIDEOUT] Creating target dummy...');
    await createGothicTargetDummy();

    // Create gothic-style treasure chest
    console.log('[HIDEOUT] Creating treasure chest...');
    createGothicTreasureChest();

    // Create gothic vendor NPC
    console.log('[HIDEOUT] Creating vendor NPC...');
    createGothicVendorNPC();

    // Add decorative elements
    console.log('[HIDEOUT] Adding decorations...');
    addGothicDecorations();

    // HIGH-QUALITY Ambient dust particles for atmosphere
    console.log('[HIDEOUT] Creating ambient dust particles...');
    const dustParticles = createAmbientDust('hideoutDust', new Vector3(0, 2, 0), 15, scene);
    dustParticles.start();
    console.log('[Particles] Started ambient dust in hideout');

    console.log('='.repeat(60));
    console.log('[HIDEOUT] Gothic hideout setup complete!');
    console.log('[HIDEOUT] Total meshes created:', hideoutMeshes.length);
    console.log('[HIDEOUT] Checking mesh visibility...');
    
    // Debug: Check if meshes are visible
    let visibleCount = 0;
    let invisibleCount = 0;
    hideoutMeshes.forEach((mesh, i) => {
      if (mesh.isVisible) {
        visibleCount++;
      } else {
        invisibleCount++;
        console.warn(`[HIDEOUT] Mesh ${i} (${mesh.name}) is INVISIBLE!`);
      }
    });
    console.log(`[HIDEOUT] Visible: ${visibleCount}, Invisible: ${invisibleCount}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('[HIDEOUT] Error during hideout setup:', error);
    alert(`HIDEOUT SETUP ERROR: ${error}`);
    throw error;
  }
}

/**
 * Setup atmospheric lighting for gothic theme
 */
function setupGothicLighting(): void {
  // Main hemispheric light - BRIGHTER and more neutral
  const mainLight = new HemisphericLight('hideoutMainLight', new Vector3(0.3, 1, 0.3), scene);
  mainLight.intensity = 1.2; // Increased from 0.7
  mainLight.diffuse = new Color3(0.7, 0.65, 0.75); // Lighter, less purple
  mainLight.groundColor = new Color3(0.3, 0.3, 0.35); // Much brighter ground reflection

  // Torch-like point lights for atmosphere - MORE LIGHTS, BRIGHTER
  const torchPositions = [
    // Corner torches (brighter)
    new Vector3(-10, 4, -10),
    new Vector3(10, 4, -10),
    new Vector3(-10, 4, 10),
    new Vector3(10, 4, 10),
    // Center area lights (new)
    new Vector3(0, 5, 0),      // Center overhead
    new Vector3(-5, 3, -5),    // Near chest
    new Vector3(5, 3, -5),     // Near vendor
    new Vector3(0, 3, -5),     // Near map device
    new Vector3(5, 3, 5),      // Near dummy
    // Wall lights (new)
    new Vector3(0, 4, 12),     // North wall
    new Vector3(0, 4, -12),    // South wall
    new Vector3(12, 4, 0),     // East wall
    new Vector3(-12, 4, 0)     // West wall
  ];

  torchPositions.forEach((pos, index) => {
    const torchLight = new PointLight(`torchLight${index}`, pos, scene);
    torchLight.intensity = 1.5; // Increased from 0.8
    torchLight.diffuse = new Color3(1.0, 0.9, 0.7); // Warmer, brighter light
    torchLight.range = 15; // Increased from 8
    
    // HIGH-QUALITY Torch flame particles with GPU acceleration
    const flameParticles = createTorchFlame(`torchFlame${index}`, pos, scene);
    flameParticles.start();
  });
  console.log('[Particles] Started hideout torch flames');

  // Add ambient fog for gothic atmosphere - MUCH LIGHTER
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = new Color3(0.2, 0.18, 0.25); // Lighter fog color
  scene.fogDensity = 0.001; // Reduced from 0.002 for even less fog
}

/**
 * Create gothic-style ground with stone texture
 */
function createGothicGround(): void {
  // Main ground plane
  const ground = MeshBuilder.CreateGround('hideoutGround', { width: 50, height: 50 }, scene);

  // HIGH-QUALITY Gothic stone material with procedural texture
  const groundMat = new StandardMaterial('gothicGroundMat', scene);
  const groundTexture = createGroundTileTexture('groundTiles', scene, 1024);
  groundTexture.uScale = 4; // Repeat texture
  groundTexture.vScale = 4;
  
  groundMat.diffuseTexture = groundTexture;
  groundMat.diffuseColor = new Color3(1, 1, 1); // White to show texture colors
  groundMat.specularColor = new Color3(0.2, 0.2, 0.2); // Subtle shine
  groundMat.specularPower = 64; // Sharp specular for wet stone look
  groundMat.ambientColor = new Color3(0.3, 0.3, 0.3);

  ground.material = groundMat;
  ground.receiveShadows = true;
  hideoutMeshes.push(ground);

  // Add some stone tiles around key areas
  createStoneTiles();
}

/**
 * Create simple stone bump texture
 */
function createStoneBumpTexture(): Texture {
  // Create a basic texture for now - will be replaced with proper bump texture later
  // For performance, we'll skip bump mapping for now
  return null as any;
}

/**
 * Create stone tiles around key areas
 */
function createStoneTiles(): void {
  const tilePositions = [
    new Vector3(0, 0.01, -5), // Around map device
    new Vector3(-5, 0.01, -5), // Around chest
    new Vector3(5, 0.01, -5), // Around vendor
    new Vector3(5, 0.01, 5) // Around dummy
  ];

  // Create shared stone texture for tiles
  const stoneTexture = createStoneTexture('stoneTiles', scene, 512);

  tilePositions.forEach((pos, index) => {
    const tile = MeshBuilder.CreateGround(`stoneTile${index}`, { width: 6, height: 6 }, scene);
    tile.position = pos;

    const tileMat = new StandardMaterial(`tileMat${index}`, scene);
    tileMat.diffuseTexture = stoneTexture;
    tileMat.diffuseColor = new Color3(1, 1, 1);
    tileMat.specularColor = new Color3(0.3, 0.3, 0.3);
    tileMat.specularPower = 64;

    tile.material = tileMat;
    hideoutMeshes.push(tile);
  });
}

/**
 * Create gothic castle walls and structures
 */
function createGothicCastle(): void {
  // Main castle walls
  const wallPositions = [
    { pos: new Vector3(0, 2.5, 15), rot: new Vector3(0, 0, 0), size: { w: 30, h: 5, d: 1 } }, // North wall
    { pos: new Vector3(0, 2.5, -15), rot: new Vector3(0, 0, 0), size: { w: 30, h: 5, d: 1 } }, // South wall
    { pos: new Vector3(15, 2.5, 0), rot: new Vector3(0, Math.PI/2, 0), size: { w: 30, h: 5, d: 1 } }, // East wall
    { pos: new Vector3(-15, 2.5, 0), rot: new Vector3(0, Math.PI/2, 0), size: { w: 30, h: 5, d: 1 } }  // West wall
  ];

  // Create shared high-quality stone texture for walls
  const wallStoneTexture = createStoneTexture('wallStone', scene, 512);
  wallStoneTexture.uScale = 3;
  wallStoneTexture.vScale = 2;

  wallPositions.forEach((wall, index) => {
    const wallMesh = MeshBuilder.CreateBox(`castleWall${index}`, wall.size, scene);
    wallMesh.position = wall.pos;
    wallMesh.rotation = wall.rot;

    const wallMat = new StandardMaterial(`wallMat${index}`, scene);
    wallMat.diffuseTexture = wallStoneTexture;
    wallMat.diffuseColor = new Color3(1, 1, 1);
    wallMat.specularColor = new Color3(0.2, 0.2, 0.2);
    wallMat.specularPower = 64;
    wallMat.ambientColor = new Color3(0.3, 0.3, 0.3);

    wallMesh.material = wallMat;
    hideoutMeshes.push(wallMesh);
  });

  // Add gothic towers at corners
  createGothicTowers();
}

/**
 * Create gothic towers at castle corners
 */
function createGothicTowers(): void {
  const towerPositions = [
    new Vector3(12, 0, 12),
    new Vector3(-12, 0, 12),
    new Vector3(12, 0, -12),
    new Vector3(-12, 0, -12)
  ];

  // Create shared tower texture
  const towerTexture = createStoneTexture('towerStone', scene, 512);
  towerTexture.uScale = 2;
  towerTexture.vScale = 3;

  towerPositions.forEach((pos, index) => {
    // Tower base
    const towerBase = MeshBuilder.CreateCylinder(`towerBase${index}`, {
      height: 6,
      diameter: 3,
      tessellation: 8
    }, scene);
    towerBase.position = new Vector3(pos.x, 3, pos.z);

    // Tower top (smaller)
    const towerTop = MeshBuilder.CreateCylinder(`towerTop${index}`, {
      height: 4,
      diameter: 2.5,
      tessellation: 8
    }, scene);
    towerTop.position = new Vector3(pos.x, 7, pos.z);

    // Spire
    const spire = MeshBuilder.CreateCylinder(`spire${index}`, {
      height: 3,
      diameterTop: 0.5,
      diameterBottom: 1.5,
      tessellation: 6
    }, scene);
    spire.position = new Vector3(pos.x, 9.5, pos.z);

    const stoneMat = new StandardMaterial(`towerMat${index}`, scene);
    stoneMat.diffuseTexture = towerTexture;
    stoneMat.diffuseColor = new Color3(1, 1, 1);
    stoneMat.specularColor = new Color3(0.3, 0.3, 0.3);
    stoneMat.specularPower = 64;
    stoneMat.ambientColor = new Color3(0.3, 0.3, 0.3);

    towerBase.material = stoneMat;
    towerTop.material = stoneMat;
    spire.material = stoneMat;

    hideoutMeshes.push(towerBase, towerTop, spire);
  });
}

/**
 * Create enhanced gothic map device
 */
async function createGothicMapDevice(): Promise<void> {
  // Main pedestal
  const pedestal = MeshBuilder.CreateCylinder('mapPedestal', {
    height: 1.5,
    diameter: 2.5,
    tessellation: 12
  }, scene);
  pedestal.position = new Vector3(0, 0.75, -5);

  // Upper platform
  const platform = MeshBuilder.CreateCylinder('mapPlatform', {
    height: 0.3,
    diameter: 3.5,
    tessellation: 12
  }, scene);
  platform.position = new Vector3(0, 1.65, -5);

  // Central crystal/map device
  mapDevice = MeshBuilder.CreateCylinder('mapCrystal', {
    height: 1.2,
    diameterTop: 0.8,
    diameterBottom: 1.2,
    tessellation: 8
  }, scene);
  mapDevice.position = new Vector3(0, 2.4, -5);

  // HIGH-QUALITY stone material for pedestal with texture
  const stoneMat = new StandardMaterial('pedestalMat', scene);
  const pedestalTexture = createStoneTexture('pedestalStone', scene, 512);
  pedestalTexture.uScale = 2;
  pedestalTexture.vScale = 2;
  stoneMat.diffuseTexture = pedestalTexture;
  stoneMat.diffuseColor = new Color3(1, 1, 1);
  stoneMat.specularColor = new Color3(0.3, 0.3, 0.3);
  stoneMat.specularPower = 64;

  // HIGH-QUALITY Glowing crystal material with procedural texture
  const crystalMat = new StandardMaterial('crystalMat', scene);
  const crystalTexture = createCrystalTexture('mapCrystal', scene, 512);
  crystalMat.diffuseTexture = crystalTexture;
  crystalMat.diffuseColor = new Color3(1, 1, 1);
  crystalMat.emissiveColor = new Color3(0.3, 0.5, 0.8); // Bright magical glow
  crystalMat.emissiveTexture = crystalTexture; // Make texture glow
  crystalMat.specularColor = new Color3(1.0, 1.0, 1.0);
  crystalMat.specularPower = 256; // Very glossy crystal
  crystalMat.alpha = 0.95;

  pedestal.material = stoneMat;
  platform.material = stoneMat;
  mapDevice.material = crystalMat;

  hideoutMeshes.push(pedestal, platform, mapDevice);
  
  // HIGH-QUALITY Magical aura particles for map device with GPU acceleration
  const auraParticles = createMagicalAura('mapDeviceAura', mapDevice, scene);
  auraParticles.start();
  console.log('[Particles] Started map device magical aura');
}

/**
 * Create gothic target dummy
 */
async function createGothicTargetDummy(): Promise<void> {
  dummyEntity = await createTargetDummy(new Vector3(5, 1, 5));
  const dTransform = world.getComponent<Transform>(dummyEntity, 'transform');
  if (dTransform && dTransform.mesh) {
    hideoutMeshes.push(dTransform.mesh);
  }
}

/**
 * Create gothic-style treasure chest
 */
function createGothicTreasureChest(): void {
  // ENHANCED Chest base with better shape
  const chestBase = MeshBuilder.CreateBox('chestBase', { width: 1.5, height: 0.85, depth: 1 }, scene);
  chestBase.position = new Vector3(-5, 0.425, -5);

  // Chest lid (curved top for more realistic look)
  const chestLid = MeshBuilder.CreateCylinder('chestLid', { 
    height: 1.6, 
    diameter: 1, 
    tessellation: 16,
    arc: 0.5 // Half cylinder for curved lid
  }, scene);
  chestLid.position = new Vector3(-5, 0.95, -5);
  chestLid.rotation.z = Math.PI / 2;

  // Metal bands across chest
  for (let i = 0; i < 3; i++) {
    const band = MeshBuilder.CreateBox(`chestBand${i}`, { width: 1.65, height: 0.08, depth: 0.05 }, scene);
    band.position = new Vector3(-5, 0.2 + (i * 0.35), -4.48);
  }

  // Lock in front
  const lock = MeshBuilder.CreateBox('chestLock', { width: 0.25, height: 0.3, depth: 0.15 }, scene);
  lock.position = new Vector3(-5, 0.5, -4.42);

  const lockDetail = MeshBuilder.CreateCylinder('lockHole', { height: 0.16, diameter: 0.08, tessellation: 8 }, scene);
  lockDetail.position = new Vector3(-5, 0.5, -4.41);
  lockDetail.rotation.x = Math.PI / 2;

  // Gothic decorations (hinges)
  const hinge1 = MeshBuilder.CreateBox('chestHinge1', { width: 0.15, height: 0.08, depth: 0.25 }, scene);
  hinge1.position = new Vector3(-5.4, 0.85, -4.48);

  const hinge2 = MeshBuilder.CreateBox('chestHinge2', { width: 0.15, height: 0.08, depth: 0.25 }, scene);
  hinge2.position = new Vector3(-4.6, 0.85, -4.48);

  // Decorative corner studs
  const corners = [
    new Vector3(-5.7, 0.1, -5.45),
    new Vector3(-4.3, 0.1, -5.45),
    new Vector3(-5.7, 0.1, -4.55),
    new Vector3(-4.3, 0.1, -4.55)
  ];
  
  corners.forEach((pos, i) => {
    const stud = MeshBuilder.CreateSphere(`chestStud${i}`, { diameter: 0.12, segments: 8 }, scene);
    stud.position = pos;
  });

  // HIGH-QUALITY Materials with procedural textures
  const woodMat = new StandardMaterial('chestWoodMat', scene);
  const woodTexture = createWoodTexture('chestWood', scene, 512);
  woodTexture.uScale = 1;
  woodTexture.vScale = 1;
  woodMat.diffuseTexture = woodTexture;
  woodMat.diffuseColor = new Color3(1, 1, 1);
  woodMat.specularColor = new Color3(0.15, 0.15, 0.15);
  woodMat.specularPower = 32;

  const metalMat = new StandardMaterial('chestMetalMat', scene);
  const metalTexture = createMetalTexture('chestMetal', scene, 256);
  metalMat.diffuseTexture = metalTexture;
  metalMat.diffuseColor = new Color3(1, 1, 1);
  metalMat.specularColor = new Color3(0.7, 0.7, 0.8);
  metalMat.specularPower = 128; // Very shiny metal

  // Apply materials to all chest parts
  chestBase.material = woodMat;
  chestLid.material = woodMat;
  
  // Apply metal material to all metal parts
  const metalParts = scene.meshes.filter(m => 
    m.name.includes('chestBand') || 
    m.name.includes('chestLock') || 
    m.name.includes('chestHinge') || 
    m.name.includes('chestStud') ||
    m.name === 'lockHole'
  );
  metalParts.forEach(part => {
    part.material = metalMat;
  });

  // Collect all chest parts for hideout meshes and click handling
  const allChestParts = [chestBase, chestLid, ...metalParts];
  hideoutMeshes.push(...allChestParts);
  
  // Store references for click handling
  (window as any).devChest = chestBase;
  (window as any).devChestParts = allChestParts;
}

/**
 * Create gothic vendor NPC
 */
function createGothicVendorNPC(): void {
  // Body (robe-like)
  const vendorBody = MeshBuilder.CreateCylinder('vendorBody', { height: 1.8, diameter: 1.2 }, scene);
  vendorBody.position = new Vector3(5, 0.9, -5);

  // Head
  const vendorHead = MeshBuilder.CreateSphere('vendorHead', { diameter: 0.6 }, scene);
  vendorHead.position = new Vector3(5, 2.1, -5);

  // Hood/cloak
  const vendorHood = MeshBuilder.CreateCylinder('vendorHood', {
    height: 0.8,
    diameterTop: 0.8,
    diameterBottom: 1.0
  }, scene);
  vendorHood.position = new Vector3(5, 2.5, -5);

  // Materials
  const robeMat = new StandardMaterial('robeMat', scene);
  robeMat.diffuseColor = new Color3(0.2, 0.1, 0.3); // Dark robe

  const skinMat = new StandardMaterial('skinMat', scene);
  skinMat.diffuseColor = new Color3(0.8, 0.6, 0.4); // Skin tone

  vendorBody.material = robeMat;
  vendorHead.material = skinMat;
  vendorHood.material = robeMat;

  const vendorNPC = vendorBody; // Use body as main clickable object
  hideoutMeshes.push(vendorBody, vendorHead, vendorHood);
  
  // Store reference for click handling
  (window as any).vendorNPC = vendorNPC;
}

/**
 * Add gothic decorative elements
 */
function addGothicDecorations(): void {
  // Gothic trees
  createGothicTrees();

  // Stone pillars
  createStonePillars();

  // Gothic statues
  createGothicStatues();
}

/**
 * Create gothic trees
 */
function createGothicTrees(): void {
  const treePositions = [
    new Vector3(-10, 0, 10),
    new Vector3(10, 0, 10),
    new Vector3(-10, 0, -10),
    new Vector3(10, 0, -10)
  ];

  treePositions.forEach((pos, index) => {
    // Trunk
    const trunk = MeshBuilder.CreateCylinder(`treeTrunk${index}`, {
      height: 4,
      diameter: 0.6,
      tessellation: 8
    }, scene);
    trunk.position = new Vector3(pos.x, 2, pos.z);

    // Branches (stylized gothic)
    const branches = MeshBuilder.CreateCylinder(`treeBranches${index}`, {
      height: 3,
      diameterTop: 3,
      diameterBottom: 1.5,
      tessellation: 6
    }, scene);
    branches.position = new Vector3(pos.x, 4.5, pos.z);

    // Materials
    const barkMat = new StandardMaterial(`barkMat${index}`, scene);
    barkMat.diffuseColor = new Color3(0.25, 0.15, 0.1);

    const foliageMat = new StandardMaterial(`foliageMat${index}`, scene);
    foliageMat.diffuseColor = new Color3(0.1, 0.2, 0.1); // Dark foliage

    trunk.material = barkMat;
    branches.material = foliageMat;

    hideoutMeshes.push(trunk, branches);
  });
}

/**
 * Create stone pillars
 */
function createStonePillars(): void {
  const pillarPositions = [
    new Vector3(-8, 0, 0),
    new Vector3(8, 0, 0),
    new Vector3(0, 0, 8),
    new Vector3(0, 0, -8)
  ];

  pillarPositions.forEach((pos, index) => {
    const pillar = MeshBuilder.CreateCylinder(`stonePillar${index}`, {
      height: 5,
      diameter: 0.8,
      tessellation: 12
    }, scene);
    pillar.position = new Vector3(pos.x, 2.5, pos.z);

    // Capital (top decoration)
    const capital = MeshBuilder.CreateCylinder(`pillarCapital${index}`, {
      height: 0.5,
      diameterTop: 1.2,
      diameterBottom: 0.8,
      tessellation: 12
    }, scene);
    capital.position = new Vector3(pos.x, 5.25, pos.z);

    const stoneMat = new StandardMaterial(`pillarMat${index}`, scene);
    stoneMat.diffuseColor = new Color3(0.3, 0.25, 0.35);

    pillar.material = stoneMat;
    capital.material = stoneMat;

    hideoutMeshes.push(pillar, capital);
  });
}

/**
 * Create gothic statues
 */
function createGothicStatues(): void {
  const statuePositions = [
    new Vector3(-12, 0, -2),
    new Vector3(12, 0, -2)
  ];

  statuePositions.forEach((pos, index) => {
    // Statue base
    const base = MeshBuilder.CreateCylinder(`statueBase${index}`, {
      height: 0.5,
      diameter: 1.5,
      tessellation: 8
    }, scene);
    base.position = new Vector3(pos.x, 0.25, pos.z);

    // Statue figure (simplified gothic warrior)
    const figure = MeshBuilder.CreateCylinder(`statueFigure${index}`, {
      height: 2.5,
      diameter: 0.8,
      tessellation: 8
    }, scene);
    figure.position = new Vector3(pos.x, 1.75, pos.z);

    // Statue head
    const head = MeshBuilder.CreateSphere(`statueHead${index}`, { diameter: 0.6 }, scene);
    head.position = new Vector3(pos.x, 3.2, pos.z);

    const stoneMat = new StandardMaterial(`statueMat${index}`, scene);
    stoneMat.diffuseColor = new Color3(0.25, 0.22, 0.28);

    base.material = stoneMat;
    figure.material = stoneMat;
    head.material = stoneMat;

    hideoutMeshes.push(base, figure, head);
  });
}

/** Build the dungeon scene. Hides hideout meshes, spawns a long
 *  corridor and a handful of enemies. The player is repositioned to
 *  the start of the corridor. */
function setupDungeon(): void {
  currentScene = 'dungeon';
  // Hide hideout meshes and dummy
  for (const m of hideoutMeshes) {
    m.isVisible = false;
  }
  if (dummyEntity) {
    const dTrans = world.getComponent<Transform>(dummyEntity, 'transform');
    if (dTrans && dTrans.mesh) dTrans.mesh.isVisible = false;
  }
  if (mapDevice) mapDevice.isVisible = false;

  // Disable fog in dungeon for better visibility
  scene.fogMode = Scene.FOGMODE_NONE;

  // Enhanced dungeon generation with stone corridors
  createStoneCorridor();
  
  // Reposition player at the start of the corridor
  const pTrans = world.getComponent<Transform>(playerEntity, 'transform');
  if (pTrans) {
    pTrans.position.x = 0;
    pTrans.position.z = 5; // Start near the beginning of the corridor (corridor is at z=30, length=60, so starts at z=0)
    pTrans.position.y = 0.5;
    if (pTrans.mesh) pTrans.mesh.position.copyFrom(pTrans.position);
    console.log('[Dungeon] Player repositioned to:', pTrans.position);
  }
}

/**
 * Creates an enhanced stone corridor dungeon with walls, torches, and props
 */
function createStoneCorridor(): void {
  console.log('='.repeat(60));
  console.log('[DUNGEON] CREATING STONE CORRIDOR - THIS IS THE NEW CODE!');
  console.log('='.repeat(60));
  
  const corridorLength = 60;
  const corridorWidth = 6;
  const wallHeight = 5;

  // Add bright ambient light for dungeon visibility
  const dungeonLight = new HemisphericLight('dungeonAmbient', new Vector3(0, 1, 0), scene);
  dungeonLight.intensity = 1.5;
  dungeonLight.diffuse = new Color3(0.9, 0.85, 0.8);
  dungeonLight.groundColor = new Color3(0.3, 0.3, 0.4);

  // HIGH-QUALITY Stone material for walls and floor with detailed texture
  const stoneMat = new StandardMaterial('dungeonStoneMat', scene);
  const dungeonStoneTexture = createStoneTexture('dungeonStone', scene, 512);
  dungeonStoneTexture.uScale = 6;
  dungeonStoneTexture.vScale = 6;
  stoneMat.diffuseTexture = dungeonStoneTexture;
  stoneMat.diffuseColor = new Color3(1, 1, 1);
  stoneMat.specularColor = new Color3(0.15, 0.15, 0.15);
  stoneMat.specularPower = 64;
  stoneMat.emissiveColor = new Color3(0.08, 0.08, 0.1); // Slight glow for visibility
  stoneMat.ambientColor = new Color3(0.4, 0.4, 0.45);

  // Floor
  const ground = MeshBuilder.CreateGround('dungeonGround', { width: corridorWidth, height: corridorLength }, scene);
  ground.position = new Vector3(0, 0, 30);
  ground.material = stoneMat;
  ground.isVisible = true; // Explicitly set visible
  dungeonMeshes.push(ground);
  console.log('[Dungeon] Ground created at', ground.position, 'visible:', ground.isVisible);

  // Left wall
  const leftWall = MeshBuilder.CreateBox('leftWall', { width: 0.5, height: wallHeight, depth: corridorLength }, scene);
  leftWall.position = new Vector3(-corridorWidth / 2, wallHeight / 2, 30);
  leftWall.material = stoneMat;
  leftWall.isVisible = true;
  dungeonMeshes.push(leftWall);

  // Right wall
  const rightWall = MeshBuilder.CreateBox('rightWall', { width: 0.5, height: wallHeight, depth: corridorLength }, scene);
  rightWall.position = new Vector3(corridorWidth / 2, wallHeight / 2, 30);
  rightWall.material = stoneMat;
  rightWall.isVisible = true;
  dungeonMeshes.push(rightWall);

  // Ceiling (optional, for atmosphere)
  const ceiling = MeshBuilder.CreateGround('dungeonCeiling', { width: corridorWidth, height: corridorLength }, scene);
  ceiling.position = new Vector3(0, wallHeight, 30);
  ceiling.rotation.x = Math.PI; // Flip upside down
  ceiling.material = stoneMat;
  ceiling.isVisible = true;
  dungeonMeshes.push(ceiling);
  
  console.log('[Dungeon] Walls and ceiling created. Total meshes:', dungeonMeshes.length);

  // Add wall torches and pillars along the corridor
  for (let z = 0; z < corridorLength; z += 10) {
    const zPos = ground.position.z - corridorLength / 2 + z;

    // Left wall torch
    const leftTorchPos = new Vector3(-corridorWidth / 2 + 0.5, 3, zPos);
    const leftTorch = createDungeonTorch(leftTorchPos);
    dungeonMeshes.push(leftTorch);

    // Right wall torch
    const rightTorchPos = new Vector3(corridorWidth / 2 - 0.5, 3, zPos);
    const rightTorch = createDungeonTorch(rightTorchPos);
    dungeonMeshes.push(rightTorch);

    // Add stone pillars every 20 units
    if (z % 20 === 0 && z > 0) {
      const leftPillar = MeshBuilder.CreateCylinder(`dungeonPillarLeft_${z}`, { height: wallHeight - 1, diameter: 0.8 }, scene);
      leftPillar.position = new Vector3(-corridorWidth / 2 + 1, wallHeight / 2, zPos);
      leftPillar.material = stoneMat;
      dungeonMeshes.push(leftPillar);

      const rightPillar = MeshBuilder.CreateCylinder(`dungeonPillarRight_${z}`, { height: wallHeight - 1, diameter: 0.8 }, scene);
      rightPillar.position = new Vector3(corridorWidth / 2 - 1, wallHeight / 2, zPos);
      rightPillar.material = stoneMat;
      dungeonMeshes.push(rightPillar);
    }
  }

  // Add some debris/props for atmosphere
  for (let i = 0; i < 6; i++) {
    const debrisX = (Math.random() - 0.5) * (corridorWidth - 2);
    const debrisZ = ground.position.z - corridorLength / 2 + Math.random() * corridorLength;
    const debris = MeshBuilder.CreateBox(`debris_${i}`, { width: 0.5, height: 0.3, depth: 0.4 }, scene);
    debris.position = new Vector3(debrisX, 0.15, debrisZ);
    debris.rotation.y = Math.random() * Math.PI;
    debris.material = stoneMat;
    dungeonMeshes.push(debris);
  }

  // Spawn enemies at strategic positions
  dungeonEnemies = [];
  const enemyCount = currentMapModifiers?.monsterPackSize ? Math.floor(6 * currentMapModifiers.monsterPackSize) : 6;
  
  for (let i = 0; i < enemyCount; i++) {
    const x = (Math.random() - 0.5) * (corridorWidth - 2);
    const z = ground.position.z - corridorLength / 2 + 10 + Math.random() * (corridorLength - 20);
    const enemy = createEnemy(new Vector3(x, 0.4, z));
    dungeonEnemies.push(enemy);
    const etrans = world.getComponent<Transform>(enemy, 'transform');
    if (etrans && etrans.mesh) {
      dungeonMeshes.push(etrans.mesh);
    }
  }

  // Boss room at the end
  createBossRoom(new Vector3(0, 0, ground.position.z + corridorLength / 2 + 10));
}

/**
 * Creates a torch for dungeon walls
 */
function createDungeonTorch(position: Vector3): AbstractMesh {
  const torch = MeshBuilder.CreateCylinder('dungeonTorch', { height: 0.8, diameter: 0.15 }, scene);
  torch.position = position;

  const torchMat = new StandardMaterial('dungeonTorchMat', scene);
  torchMat.diffuseColor = new Color3(0.3, 0.2, 0.1); // Dark wood
  torch.material = torchMat;

  // Add torch light
  const torchLight = new PointLight(`dungeonTorchLight_${position.z}`, position, scene);
  torchLight.intensity = 1.0;
  torchLight.diffuse = new Color3(1.0, 0.7, 0.4); // Orange flame light
  torchLight.range = 8;

  // HIGH-QUALITY Dungeon torch flame particles with GPU acceleration
  const flameParticles = createTorchFlame(`dungeonTorchFlame_${position.z}`, position, scene);
  flameParticles.start();

  return torch;
}

/**
 * Creates a boss room at the end of the corridor
 */
function createBossRoom(centerPos: Vector3): void {
  const roomSize = 15;
  const wallHeight = 6;

  const stoneMat = new StandardMaterial('bossRoomStoneMat', scene);
  stoneMat.diffuseColor = new Color3(0.2, 0.2, 0.25); // Darker stone for boss room
  stoneMat.specularColor = new Color3(0.15, 0.15, 0.15);
  stoneMat.emissiveColor = new Color3(0.03, 0.02, 0.04); // Slight purple glow

  // Boss room floor
  const bossFloor = MeshBuilder.CreateGround('bossRoomFloor', { width: roomSize, height: roomSize }, scene);
  bossFloor.position = centerPos;
  bossFloor.material = stoneMat;
  dungeonMeshes.push(bossFloor);

  // Boss room walls (4 sides)
  const wallPositions = [
    { x: 0, z: -roomSize / 2, width: roomSize, depth: 0.5 }, // Front wall (with gap for entrance)
    { x: 0, z: roomSize / 2, width: roomSize, depth: 0.5 },  // Back wall
    { x: -roomSize / 2, z: 0, width: 0.5, depth: roomSize }, // Left wall
    { x: roomSize / 2, z: 0, width: 0.5, depth: roomSize }   // Right wall
  ];

  wallPositions.forEach((wallPos, index) => {
    // Skip part of the front wall for entrance
    if (index === 0) {
      // Create two shorter walls for entrance
      const leftPart = MeshBuilder.CreateBox('bossWallLeftEntrance', { width: (roomSize - 4) / 2, height: wallHeight, depth: 0.5 }, scene);
      leftPart.position = new Vector3(centerPos.x - roomSize / 4 - 1, centerPos.y + wallHeight / 2, centerPos.z + wallPos.z);
      leftPart.material = stoneMat;
      dungeonMeshes.push(leftPart);

      const rightPart = MeshBuilder.CreateBox('bossWallRightEntrance', { width: (roomSize - 4) / 2, height: wallHeight, depth: 0.5 }, scene);
      rightPart.position = new Vector3(centerPos.x + roomSize / 4 + 1, centerPos.y + wallHeight / 2, centerPos.z + wallPos.z);
      rightPart.material = stoneMat;
      dungeonMeshes.push(rightPart);
    } else {
      const wall = MeshBuilder.CreateBox(`bossWall_${index}`, { width: wallPos.width, height: wallHeight, depth: wallPos.depth }, scene);
      wall.position = new Vector3(centerPos.x + wallPos.x, centerPos.y + wallHeight / 2, centerPos.z + wallPos.z);
      wall.material = stoneMat;
      dungeonMeshes.push(wall);
    }
  });

  // Add corner pillars
  const cornerPositions = [
    new Vector3(-roomSize / 2 + 0.5, 0, -roomSize / 2 + 0.5),
    new Vector3(roomSize / 2 - 0.5, 0, -roomSize / 2 + 0.5),
    new Vector3(-roomSize / 2 + 0.5, 0, roomSize / 2 - 0.5),
    new Vector3(roomSize / 2 - 0.5, 0, roomSize / 2 - 0.5)
  ];

  cornerPositions.forEach((cornerPos, index) => {
    const pillar = MeshBuilder.CreateCylinder(`bossPillar_${index}`, { height: wallHeight - 0.5, diameter: 1 }, scene);
    pillar.position = new Vector3(centerPos.x + cornerPos.x, wallHeight / 2, centerPos.z + cornerPos.z);
    pillar.material = stoneMat;
    dungeonMeshes.push(pillar);

    // Add lights to pillars
    const pillarLight = new PointLight(`bossPillarLight_${index}`, pillar.position.clone().add(new Vector3(0, 2, 0)), scene);
    pillarLight.intensity = 1.5;
    pillarLight.diffuse = new Color3(0.6, 0.3, 0.9); // Purple mystical light
    pillarLight.range = 10;
  });

  // Always spawn a boss in the boss room
  const boss = createEnemy(new Vector3(centerPos.x, 0.4, centerPos.z + 5));
  
  // Make boss much stronger based on map level and modifiers
  const baseHealth = 150;
  const monsterLevel = currentMapModifiers?.monsterLevel || 1;
  const bossHealth = world.getComponent<Health>(boss, 'health');
  if (bossHealth) {
    bossHealth.max = baseHealth * monsterLevel;
    bossHealth.current = bossHealth.max;
  }
  
  dungeonEnemies.push(boss);
  const btrans = world.getComponent<Transform>(boss, 'transform');
  if (btrans && btrans.mesh) {
    // Make boss much bigger and more imposing
    btrans.mesh.scaling = new Vector3(2.0, 2.0, 2.0);
    dungeonMeshes.push(btrans.mesh);
  }
  
  console.log(`[BossRoom] Spawned boss with ${bossHealth?.max} HP (monster level: ${monsterLevel})`);
}

/** Tear down the dungeon and return to the hideout. Cleans up all
 *  dungeon entities and meshes, shows hideout objects and dummy and
 *  moves the player back near the map device. */
function leaveDungeon(): void {
  currentScene = 'hideout';
  // Dispose of dungeon meshes
  for (const m of dungeonMeshes) {
    m.dispose();
  }
  dungeonMeshes.length = 0;
  // Remove dungeon enemies from world
  for (const e of dungeonEnemies) {
    const t = world.getComponent<Transform>(e, 'transform');
    if (t && t.mesh) {
      t.mesh.dispose();
    }
    (world as any)['components'].delete(e);
  }
  dungeonEnemies = [];
  
  // Clear enemy health bars
  enemyHealthBars.clear();

  // Clear ground items from dungeon
  cleanupGroundItems();

  // Clear map modifiers and portal instance tracking
  currentMapModifiers = null;
  currentPortalInstanceId = null;
  
  // Clear all portals when completing dungeon
  clearMapPortals();
  console.log('[MapDevice] Portals cleared on dungeon completion');
  
  // Re-enable fog for hideout atmosphere
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = new Color3(0.2, 0.18, 0.25);
  scene.fogDensity = 0.001;
  
  // Show hideout meshes and dummy
  for (const m of hideoutMeshes) {
    m.isVisible = true;
  }
  if (dummyEntity) {
    const dTrans = world.getComponent<Transform>(dummyEntity, 'transform');
    if (dTrans && dTrans.mesh) dTrans.mesh.isVisible = true;
  }
  if (mapDevice) mapDevice.isVisible = true;
  // Move player back near the map device
  const pTrans = world.getComponent<Transform>(playerEntity, 'transform');
  if (pTrans) {
    pTrans.position.x = 0;
    pTrans.position.z = -6;
    pTrans.position.y = 0.5;
    if (pTrans.mesh) pTrans.mesh.position.copyFrom(pTrans.position);
  }
}

// Old persistence helpers removed - now using the new save system in src/state/save.ts

// ---------------------------------------------------------------------
// Skill system and weapon gem management

/** List of available active skill gems. Each skill has a unique id,
 *  display name and a type indicating how it should be executed.
 *  Additional properties can be added later (e.g. damage, cooldown). */
interface SkillDef {
  id: string;
  name: string;
  type: 'melee' | 'projectile' | 'spell';
}

const skills: Record<string, SkillDef> = {
  heavyStrike: { id: 'heavyStrike', name: 'Heavy Strike', type: 'melee' },
  splitShot: { id: 'splitShot', name: 'Split Shot', type: 'projectile' },
  chainSpark: { id: 'chainSpark', name: 'Chain Spark', type: 'spell' },
};

/** The id of the skill gem currently equipped into the active weapon
 *  socket. Defaults to Heavy Strike. */
let equippedActiveSkill = 'heavyStrike';

/** Mapping from skill bar slots to skill ids or special values. The
 *  left mouse button (lmb) can be bound to 'auto' (basic attack),
 *  'move' (click to move) or a skill id. Other slots can be set to
 *  null (unassigned) or a skill id. */
const slotBindings: Record<string, string | null> = {
  lmb: 'auto',
  mmb: null,
  rmb: null,
  q: null,
  w: null,
  e: null,
  r: null,
  t: null,
};

/** The current click‑to‑move target. When set, the player will move
 *  towards this point each frame until reached. */
let moveTarget: Vector3 | null = null;

/** The last known mouse world position for skill targeting. */
let lastMouseWorldPos: Vector3 | null = null;

/** Tracks the last usage timestamp (in seconds) for each skill. This
 *  enables per‑skill cooldown enforcement. */
const lastSkillUse: Record<string, number> = {
  heavyStrike: 0,
  splitShot: 0,
  chainSpark: 0,
};

// ---------------------------------------------------------------------
// Player state
// The player's class (warrior or archer). Defaults to warrior. Declared
// here before any use to avoid temporal dead zone issues. The class
// affects appearance and default auto‑attack behaviour.
let playerClass: 'warrior' | 'archer' = 'warrior';

// Timestamp of the last use of the basic auto‑attack in seconds.
// Used to enforce cooldowns on the default attack when lmb is bound
// to 'auto'. Each skill may implement its own cooldown later.
const lastAutoAttack = 0;

/** Update the weapon gem panel and skills list in the G menu. The
 *  active socket displays the currently equipped skill gem and the
 *  support sockets are inert placeholders. The skills list shows
 *  available skill gems that can be equipped into the active slot. */
function populateGMenuUI(): void {
  const socketsContainer = document.getElementById('weapon-sockets');
  const skillsList = document.getElementById('skills-list');
  if (!socketsContainer || !skillsList) return;
  // Clear previous contents
  socketsContainer.innerHTML = '';
  skillsList.innerHTML = '';
  // Create the active socket
  const activeSocket = document.createElement('div');
  activeSocket.className = 'socket active';
  activeSocket.textContent = skills[equippedActiveSkill].name;
  activeSocket.title = 'Active socket';
  activeSocket.addEventListener('click', () => {
    // When clicking the active socket, cycle through available skills
    // for convenience. You could open a dedicated modal here. For now
    // iterate through skills and equip the next one.
    const ids = Object.keys(skills);
    const currentIndex = ids.indexOf(equippedActiveSkill);
    const next = ids[(currentIndex + 1) % ids.length];
    equippedActiveSkill = next;
    populateGMenuUI();
    saveState();
  });
  socketsContainer.appendChild(activeSocket);
  // Create two support sockets (disabled)
  for (let i = 0; i < 2; i++) {
    const support = document.createElement('div');
    support.className = 'socket support disabled';
    support.textContent = '';
    socketsContainer.appendChild(support);
  }
  // Populate skills list buttons
  for (const id of Object.keys(skills)) {
    const skill = skills[id];
    const btn = document.createElement('button');
    btn.className = 'skill-btn';
    btn.textContent = skill.name;
    btn.addEventListener('click', () => {
      equippedActiveSkill = id;
      populateGMenuUI();
      saveState();
    });
    skillsList.appendChild(btn);
  }
}

// Input handling for WASD.
const input: Record<string, boolean> = {};
window.addEventListener('keydown', (ev) => {
  input[ev.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (ev) => {
  input[ev.key.toLowerCase()] = false;
});

// Create a player entity with a visible mesh.
function createPlayer(): Entity {
  const e = world.createEntity();
  
  // Create ENHANCED procedural character model with better details
  const parentMesh = new AbstractMesh('player', scene);
  parentMesh.position = new Vector3(0, 0.5, 0);
  
  // Body (torso) - more detailed with better shape
  const body = MeshBuilder.CreateCylinder('playerBody', { 
    height: 1.1, 
    diameterTop: 0.55, 
    diameterBottom: 0.65,
    tessellation: 12 
  }, scene);
  body.parent = parentMesh;
  body.position.y = 0.05;
  const bodyMat = new StandardMaterial('playerBodyMat', scene);
  bodyMat.diffuseColor = new Color3(0.15, 0.25, 0.45); // Deep blue armor
  bodyMat.specularColor = new Color3(0.6, 0.6, 0.7);
  bodyMat.specularPower = 128;
  body.material = bodyMat;
  
  // Chest plate detail
  const chestPlate = MeshBuilder.CreateBox('playerChest', { width: 0.5, height: 0.4, depth: 0.15 }, scene);
  chestPlate.parent = parentMesh;
  chestPlate.position.set(0, 0.3, -0.28);
  chestPlate.material = bodyMat;
  
  // Shoulder pads
  const leftShoulder = MeshBuilder.CreateSphere('leftShoulder', { diameter: 0.35, segments: 8 }, scene);
  leftShoulder.parent = parentMesh;
  leftShoulder.position.set(-0.45, 0.5, 0);
  leftShoulder.scaling.y = 0.6;
  leftShoulder.material = bodyMat;
  
  const rightShoulder = MeshBuilder.CreateSphere('rightShoulder', { diameter: 0.35, segments: 8 }, scene);
  rightShoulder.parent = parentMesh;
  rightShoulder.position.set(0.45, 0.5, 0);
  rightShoulder.scaling.y = 0.6;
  rightShoulder.material = bodyMat;
  
  // Head
  const head = MeshBuilder.CreateSphere('playerHead', { diameter: 0.42, segments: 12 }, scene);
  head.parent = parentMesh;
  head.position.y = 0.85;
  const headMat = new StandardMaterial('playerHeadMat', scene);
  headMat.diffuseColor = new Color3(0.85, 0.75, 0.65); // Better skin tone
  headMat.specularColor = new Color3(0.2, 0.2, 0.2);
  headMat.specularPower = 32;
  head.material = headMat;
  
  // Helmet/hood
  const helmet = MeshBuilder.CreateSphere('playerHelmet', { diameter: 0.46, segments: 12 }, scene);
  helmet.parent = parentMesh;
  helmet.position.y = 0.88;
  helmet.scaling.y = 0.7; // Flatten for helmet shape
  const helmetMat = new StandardMaterial('helmetMat', scene);
  helmetMat.diffuseColor = new Color3(0.3, 0.3, 0.35); // Dark metal
  helmetMat.specularColor = new Color3(0.7, 0.7, 0.8);
  helmetMat.specularPower = 256;
  helmet.material = helmetMat;
  
  // Arms with better tapering
  const leftArm = MeshBuilder.CreateCylinder('playerLeftArm', { 
    height: 0.85, 
    diameterTop: 0.18, 
    diameterBottom: 0.15,
    tessellation: 8 
  }, scene);
  leftArm.parent = parentMesh;
  leftArm.position.set(-0.42, 0, 0);
  leftArm.rotation.z = 0.2;
  leftArm.material = bodyMat;
  
  const rightArm = MeshBuilder.CreateCylinder('playerRightArm', { 
    height: 0.85, 
    diameterTop: 0.18, 
    diameterBottom: 0.15,
    tessellation: 8 
  }, scene);
  rightArm.parent = parentMesh;
  rightArm.position.set(0.42, 0, 0);
  rightArm.rotation.z = -0.2;
  rightArm.material = bodyMat;
  
  // Legs with better shape
  const leftLeg = MeshBuilder.CreateCylinder('playerLeftLeg', { 
    height: 0.9, 
    diameterTop: 0.24, 
    diameterBottom: 0.2,
    tessellation: 8 
  }, scene);
  leftLeg.parent = parentMesh;
  leftLeg.position.set(-0.18, -0.95, 0);
  leftLeg.material = bodyMat;
  
  const rightLeg = MeshBuilder.CreateCylinder('playerRightLeg', { 
    height: 0.9, 
    diameterTop: 0.24, 
    diameterBottom: 0.2,
    tessellation: 8 
  }, scene);
  rightLeg.parent = parentMesh;
  rightLeg.position.set(0.18, -0.95, 0);
  rightLeg.material = bodyMat;
  
  // Belt
  const belt = MeshBuilder.CreateCylinder('playerBelt', { height: 0.08, diameter: 0.68, tessellation: 12 }, scene);
  belt.parent = parentMesh;
  belt.position.y = -0.45;
  const beltMat = new StandardMaterial('beltMat', scene);
  beltMat.diffuseColor = new Color3(0.3, 0.2, 0.1); // Leather
  beltMat.specularColor = new Color3(0.2, 0.2, 0.2);
  belt.material = beltMat;
  
  const transform: Transform = { position: parentMesh.position.clone(), mesh: parentMesh };
  const velocity: Velocity = { value: new Vector3(0, 0, 0) };
  const health: Health = { current: 100, max: 100 };
  const tag: PlayerTag = {};
  const combatant: Combatant = {
    team: 'player',
    armour: 10,
    evasion: 5,
    critChance: 0.05,
    critMult: 1.5,
    iFrameMs: 300,
    lastHitAt: -1000,
  };
  const hurtbox: Hurtbox = { radius: 0.6 };
  const playerState: PlayerState = {
    isDead: false,
  };
  
  world.addComponent(e, 'transform', transform);
  world.addComponent(e, 'velocity', velocity);
  world.addComponent(e, 'health', health);
  world.addComponent(e, 'player', tag);
  world.addComponent(e, 'combatant', combatant);
  world.addComponent(e, 'hurtbox', hurtbox);
  world.addComponent(e, 'playerState', playerState);
  return e;
}

// Create a stationary target dummy with infinite health.
async function createTargetDummy(pos: Vector3): Promise<Entity> {
  const e = world.createEntity();

  // Use procedural mesh (no external assets needed)
  const mesh = MeshBuilder.CreateCylinder('dummy', { diameter: 1, height: 2 }, scene);
  mesh.position = pos.clone();
  
  // Add a simple material
  const dummyMat = new StandardMaterial('dummyMat', scene);
  dummyMat.diffuseColor = new Color3(0.8, 0.7, 0.6); // Tan color
  mesh.material = dummyMat;

  const transform: Transform = { position: mesh.position.clone(), mesh };
  const velocity: Velocity = { value: new Vector3(0, 0, 0) };
  const health: Health = { current: Infinity, max: Infinity, infinite: true };
  const tag: EnemyTag = {};
  const combatant: Combatant = {
    team: 'enemy',
    armour: 0,
    evasion: 0,
    critChance: 0,
    critMult: 1,
    iFrameMs: 0,
    lastHitAt: -1000,
  };
  const hurtbox: Hurtbox = { radius: 0.6 };
  
  world.addComponent(e, 'transform', transform);
  world.addComponent(e, 'velocity', velocity);
  world.addComponent(e, 'health', health);
  world.addComponent(e, 'enemy', tag);
  world.addComponent(e, 'combatant', combatant);
  world.addComponent(e, 'hurtbox', hurtbox);
  return e;
}

// Create a simple melee enemy for the dungeon. Enemies have AI state
// machine and can attack the player.
function createEnemy(pos: Vector3): Entity {
  const e = world.createEntity();
  
  // Create ENHANCED procedural enemy model - more menacing and detailed
  const parentMesh = new AbstractMesh(`enemy_${e}`, scene);
  parentMesh.position = pos.clone();
  
  // Body (bulkier, hunched posture)
  const body = MeshBuilder.CreateCylinder(`enemyBody_${e}`, { 
    height: 1.0, 
    diameterTop: 0.7, 
    diameterBottom: 0.8,
    tessellation: 10 
  }, scene);
  body.parent = parentMesh;
  body.position.y = 0;
  body.rotation.x = 0.2; // Slight forward hunch
  const bodyMat = new StandardMaterial(`enemyBodyMat_${e}`, scene);
  bodyMat.diffuseColor = new Color3(0.35, 0.2, 0.15); // Dark reddish brown
  bodyMat.emissiveColor = new Color3(0.15, 0.05, 0.02); // Evil red glow
  bodyMat.specularColor = new Color3(0.3, 0.2, 0.2);
  bodyMat.specularPower = 64;
  body.material = bodyMat;
  
  // Spiky shoulder guards
  const leftSpike = MeshBuilder.CreateCylinder(`leftSpike_${e}`, { 
    height: 0.4, 
    diameterTop: 0.05, 
    diameterBottom: 0.2,
    tessellation: 6 
  }, scene);
  leftSpike.parent = parentMesh;
  leftSpike.position.set(-0.5, 0.5, 0);
  leftSpike.rotation.z = -0.5;
  leftSpike.material = bodyMat;
  
  const rightSpike = MeshBuilder.CreateCylinder(`rightSpike_${e}`, { 
    height: 0.4, 
    diameterTop: 0.05, 
    diameterBottom: 0.2,
    tessellation: 6 
  }, scene);
  rightSpike.parent = parentMesh;
  rightSpike.position.set(0.5, 0.5, 0);
  rightSpike.rotation.z = 0.5;
  rightSpike.material = bodyMat;
  
  // Head (more monster-like, larger)
  const head = MeshBuilder.CreateSphere(`enemyHead_${e}`, { diameter: 0.5, segments: 10 }, scene);
  head.parent = parentMesh;
  head.position.y = 0.75;
  head.scaling.set(1, 0.9, 1.1); // Make it more brutish
  const headMat = new StandardMaterial(`enemyHeadMat_${e}`, scene);
  headMat.diffuseColor = new Color3(0.45, 0.35, 0.3); // Grayish skin
  headMat.specularColor = new Color3(0.2, 0.2, 0.2);
  head.material = headMat;
  
  // Glowing red eyes
  const leftEye = MeshBuilder.CreateSphere(`leftEye_${e}`, { diameter: 0.08 }, scene);
  leftEye.parent = parentMesh;
  leftEye.position.set(-0.12, 0.8, -0.22);
  const eyeMat = new StandardMaterial(`eyeMat_${e}`, scene);
  eyeMat.emissiveColor = new Color3(1, 0.1, 0); // Bright red glow
  eyeMat.diffuseColor = new Color3(0.8, 0, 0);
  leftEye.material = eyeMat;
  
  const rightEye = MeshBuilder.CreateSphere(`rightEye_${e}`, { diameter: 0.08 }, scene);
  rightEye.parent = parentMesh;
  rightEye.position.set(0.12, 0.8, -0.22);
  rightEye.material = eyeMat;
  
  // Arms (muscular, menacing)
  const leftArm = MeshBuilder.CreateCylinder(`enemyLeftArm_${e}`, { 
    height: 0.8, 
    diameterTop: 0.28, 
    diameterBottom: 0.22,
    tessellation: 8 
  }, scene);
  leftArm.parent = parentMesh;
  leftArm.position.set(-0.5, -0.1, 0);
  leftArm.rotation.z = 0.5;
  leftArm.material = bodyMat;
  
  // Clawed hand
  const leftHand = MeshBuilder.CreateSphere(`leftHand_${e}`, { diameter: 0.25, segments: 8 }, scene);
  leftHand.parent = parentMesh;
  leftHand.position.set(-0.75, -0.65, 0);
  leftHand.scaling.set(1.2, 0.8, 0.8);
  leftHand.material = bodyMat;
  
  const rightArm = MeshBuilder.CreateCylinder(`enemyRightArm_${e}`, { 
    height: 0.8, 
    diameterTop: 0.28, 
    diameterBottom: 0.22,
    tessellation: 8 
  }, scene);
  rightArm.parent = parentMesh;
  rightArm.position.set(0.5, -0.1, 0);
  rightArm.rotation.z = -0.5;
  rightArm.material = bodyMat;
  
  const rightHand = MeshBuilder.CreateSphere(`rightHand_${e}`, { diameter: 0.25, segments: 8 }, scene);
  rightHand.parent = parentMesh;
  rightHand.position.set(0.75, -0.65, 0);
  rightHand.scaling.set(1.2, 0.8, 0.8);
  rightHand.material = bodyMat;
  
  // Legs (thick, powerful)
  const leftLeg = MeshBuilder.CreateCylinder(`enemyLeftLeg_${e}`, { 
    height: 0.75, 
    diameterTop: 0.28, 
    diameterBottom: 0.24,
    tessellation: 8 
  }, scene);
  leftLeg.parent = parentMesh;
  leftLeg.position.set(-0.22, -0.85, 0);
  leftLeg.material = bodyMat;
  
  const rightLeg = MeshBuilder.CreateCylinder(`enemyRightLeg_${e}`, { 
    height: 0.75, 
    diameterTop: 0.28, 
    diameterBottom: 0.24,
    tessellation: 8 
  }, scene);
  rightLeg.parent = parentMesh;
  rightLeg.position.set(0.22, -0.85, 0);
  rightLeg.material = bodyMat;
  
  const transform: Transform = { position: parentMesh.position.clone(), mesh: parentMesh };
  const velocity: Velocity = { value: new Vector3(0, 0, 0) };
  const health: Health = { current: 30, max: 30 };
  const tag: EnemyTag = {};
  const combatant: Combatant = {
    team: 'enemy',
    armour: 5,
    evasion: 10,
    critChance: 0.05,
    critMult: 1.5,
    iFrameMs: 100,
    lastHitAt: -1000,
  };
  const hurtbox: Hurtbox = { radius: 0.5 };
  const ai: EnemyAI = {
    state: 'idle',
    t: 0,
    attackRange: 1.5,
    aggroRange: 8,
    windupMs: 500,
    recoverMs: 800,
    dpsHint: 10,
  };
  
  world.addComponent(e, 'transform', transform);
  world.addComponent(e, 'velocity', velocity);
  world.addComponent(e, 'health', health);
  world.addComponent(e, 'enemy', tag);
  world.addComponent(e, 'combatant', combatant);
  world.addComponent(e, 'hurtbox', hurtbox);
  world.addComponent(e, 'enemyAI', ai);
  
  console.log(`Created enemy ${e} at`, pos, 'with AI component');
  
  return e;
}

// Update the player's appearance based on the selected class. The
// warrior is coloured red and the archer is coloured blue. If the
// player's mesh does not yet have a material attached one will be
// created.
function updatePlayerAppearance(): void {
  const transform = world.getComponent<Transform>(playerEntity, 'transform');
  if (!transform || !transform.mesh) return;
  const mesh = transform.mesh;
  // Ensure the mesh has a StandardMaterial attached so we can set
  // colours. If none exists create one.
  let material = mesh.material as StandardMaterial | null;
  if (!material) {
    material = new StandardMaterial('playerMat', scene);
    mesh.material = material;
  }
  if (playerClass === 'warrior') {
    // Warriors are slightly larger and coloured red
    mesh.scaling = new Vector3(1.2, 1.2, 1.2);
    material.diffuseColor = new Color3(0.8, 0.2, 0.2);
  } else {
    // Archers are smaller and coloured blue
    mesh.scaling = new Vector3(1.0, 1.0, 1.0);
    material.diffuseColor = new Color3(0.2, 0.2, 0.8);
  }
}

// Update the LMB slot text to reflect the current binding. This
// modifies the inner text of the element with class 'lmb' under the
// skill bar.
function updateLmbSlotText(): void {
  const slot = document.querySelector<HTMLDivElement>('#skill-bar .slot.lmb');
  if (!slot) return;
  const binding = slotBindings['lmb'];
  
  // Add visual class for bound skills
  if (binding && (binding === 'auto' || binding === 'move' || skills[binding])) {
    slot.classList.add('has-skill');
  } else {
    slot.classList.remove('has-skill');
  }
  
  if (binding === 'auto') {
    slot.textContent = 'LMB\nAuto';
  } else if (binding === 'move') {
    slot.textContent = 'LMB\nMove';
  } else if (binding && skills[binding]) {
    slot.textContent = 'LMB\n' + skills[binding].name;
  } else {
    slot.textContent = 'LMB';
  }
}

// Update all skill bar slots to reflect their current bindings. The
// slot text will display the key or mouse button and, when bound,
// the name of the assigned skill or special action. This function
// should be called whenever slotBindings are modified.
function updateSkillBarSlotsUI(): void {
  // Update LMB separately using its helper
  updateLmbSlotText();
  document.querySelectorAll<HTMLDivElement>('#skill-bar .slot').forEach((slotEl) => {
    // Determine the slot key. Mouse slots use classes lmb/mmb/rmb; keyboard slots use data-key.
    let key: string | null = null;
    if (slotEl.classList.contains('lmb')) key = 'lmb';
    else if (slotEl.classList.contains('mmb')) key = 'mmb';
    else if (slotEl.classList.contains('rmb')) key = 'rmb';
    else if (slotEl.dataset.key) key = slotEl.dataset.key.toLowerCase();
    if (!key || key === 'lmb') return;
    const binding = slotBindings[key];
    // Base label is the uppercase key (e.g. Q)
    let label = slotEl.dataset.key ? slotEl.dataset.key.toUpperCase() : key.toUpperCase();
    
    // Add visual class if skill is assigned
    if (binding && skills[binding]) {
      label += '\n' + skills[binding].name;
      slotEl.classList.add('has-skill');
    } else {
      slotEl.classList.remove('has-skill');
    }
    
    slotEl.textContent = label;
  });
}

// Display a modal that allows the player to bind the left mouse button
// to either auto‑attack or move. The modal content is built
// dynamically. When the user selects an option the binding is
// updated and the modal is closed.
function openLMBModal(): void {
  const modalContent = assignModal.querySelector('.modal-content') as HTMLDivElement;
  // Clear existing content
  while (modalContent.firstChild) modalContent.removeChild(modalContent.firstChild);
  const title = document.createElement('h2');
  title.textContent = 'Bind Left Mouse';
  modalContent.appendChild(title);
  // Option for auto‑attack
  const autoBtn = document.createElement('button');
  autoBtn.textContent = 'Auto‑Attack';
  autoBtn.addEventListener('click', () => {
    slotBindings['lmb'] = 'auto';
    updateSkillBarSlotsUI();
    saveState();
    assignModal.classList.add('hidden');
  });
  modalContent.appendChild(autoBtn);
  // Option for click‑to‑move
  const moveBtn = document.createElement('button');
  moveBtn.textContent = 'Move Only';
  moveBtn.addEventListener('click', () => {
    slotBindings['lmb'] = 'move';
    updateSkillBarSlotsUI();
    saveState();
    assignModal.classList.add('hidden');
  });
  modalContent.appendChild(moveBtn);
  // Options for each available skill
  for (const id of Object.keys(skills)) {
    const skillBtn = document.createElement('button');
    skillBtn.textContent = skills[id].name;
    skillBtn.addEventListener('click', () => {
      slotBindings['lmb'] = id;
      updateSkillBarSlotsUI();
      saveState();
      assignModal.classList.add('hidden');
    });
    modalContent.appendChild(skillBtn);
  }
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Cancel';
  closeBtn.addEventListener('click', () => {
    assignModal.classList.add('hidden');
  });
  modalContent.appendChild(closeBtn);
  assignModal.classList.remove('hidden');
}

// Open a modal for skill assignment on arbitrary slots (including
// mouse buttons and keyboard keys). The slotKey identifies the slot
// (e.g. 'q', 'e', 'r', 'mmb'). The modal lists all available skills
// and a clear option to unassign. Selecting an entry binds the
// chosen skill to the slot and updates the skill bar UI.
function openGenericAssignModal(slotKey: string): void {
  const modalContent = assignModal.querySelector('.modal-content') as HTMLDivElement;
  while (modalContent.firstChild) modalContent.removeChild(modalContent.firstChild);
  const h2 = document.createElement('h2');
  h2.textContent = `Assign skill to ${slotKey.toUpperCase()}`;
  modalContent.appendChild(h2);
  // List available skills
  for (const id of Object.keys(skills)) {
    const btn = document.createElement('button');
    btn.textContent = skills[id].name;
    btn.addEventListener('click', () => {
      slotBindings[slotKey] = id;
      updateSkillBarSlotsUI();
      saveState();
      assignModal.classList.add('hidden');
    });
    modalContent.appendChild(btn);
  }
  // Option to clear the slot
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Unassign';
  clearBtn.addEventListener('click', () => {
    slotBindings[slotKey] = null;
    updateSkillBarSlotsUI();
    saveState();
    assignModal.classList.add('hidden');
  });
  modalContent.appendChild(clearBtn);
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Cancel';
  closeBtn.addEventListener('click', () => {
    assignModal.classList.add('hidden');
  });
  modalContent.appendChild(closeBtn);
  assignModal.classList.remove('hidden');
}

// Camera and player entity - initialized when game starts
let camera: ArcRotateCamera | null = null;
let playerEntity: Entity;

// Ground picking on left click. This currently logs the clicked
// position but can be extended to spawn projectiles or move the
// player. Left click does not attack the dummy yet.
// Track whether the left mouse button is currently held down. Used for
// continuous click‑to‑move.
let isLmbDown = false;

scene.onPointerObservable.add((pointerInfo) => {
  // Always update mouse world position for skill targeting
  if (pointerInfo.type === PointerEventTypes.POINTERMOVE || 
      pointerInfo.type === PointerEventTypes.POINTERDOWN) {
    const pick = scene.pick(scene.pointerX, scene.pointerY);
    if (pick && pick.pickedPoint) {
      lastMouseWorldPos = pick.pickedPoint.clone();
    }
  }
  
  // Left mouse button pressed
  if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) {
    isLmbDown = true;
    const pick = scene.pick(scene.pointerX, scene.pointerY);
    if (!pick) return;
    // If we're in the hideout and clicked the map device, open the
    // dungeon confirmation modal.
    if (currentScene === 'hideout' && mapDevice && pick.pickedMesh === mapDevice) {
      // Show the map device modal
      showMapDeviceModal();
      return;
    }
    
    // If clicked dev chest (any part of it), spawn test items
    const devChestParts = (window as any).devChestParts as Array<any> | undefined;
    if (currentScene === 'hideout' && devChestParts && devChestParts.includes(pick.pickedMesh)) {
      spawnDevItems();
      return;
    }
    
    // If clicked portal, enter it
    if (currentScene === 'hideout') {
      const clickedPortal = mapDeviceState.portals.find(p => p.mesh === pick.pickedMesh && p.isActive);
      if (clickedPortal) {
        const portalIndex = mapDeviceState.portals.indexOf(clickedPortal);
        enterPortal(portalIndex);
        return;
      }
    }
    
    // If clicked vendor NPC, open vendor UI
    const vendorNPC = (window as any).vendorNPC;
    console.log('[Click] Scene:', currentScene, 'VendorNPC:', vendorNPC, 'PickedMesh:', pick.pickedMesh);
        if (currentScene === 'hideout' && vendorNPC && pick.pickedMesh === vendorNPC) {
          console.log('[Click] Opening vendor UI');
          // Open only vendor panel, not both panels
          const dock = ensureTwoDock();
          const vendor = document.getElementById("vendorPanel");
          if (vendor && dock) {
            if (!dock.contains(vendor)) {
              dock.appendChild(vendor);
            }
            vendor.classList.remove("is-hidden");
          }
          return;
        }
    
    const binding = slotBindings['lmb'];
    // Determine behaviour based on binding
    if (binding === 'auto' || binding === null) {
      // Default auto‑attack uses class‑specific attack
      if (pick.pickedPoint) {
        performAutoAttack(pick.pickedPoint);
      }
    } else if (binding === 'move') {
      // Set target for click‑to‑move
      if (pick.pickedPoint) {
        movePlayerTo(pick.pickedPoint);
      }
    } else if (skills[binding]) {
      // Execute assigned skill directly
      if (pick.pickedPoint) {
        executeSkill(binding, pick.pickedPoint);
      }
    }
  }
  // Left mouse button released
  if (pointerInfo.type === PointerEventTypes.POINTERUP && pointerInfo.event.button === 0) {
    isLmbDown = false;
  }
});

// Compute and apply WASD movement. Updates the player's velocity
// vector based on input and desired speed. Movement is in world space.
function handlePlayerMovement(dt: number) {
  const velocity = world.getComponent<Velocity>(playerEntity, 'velocity');
  if (!velocity) return;
  const speed = 5;
  // Determine desired movement along forward and right axes based on
  // input. Positive forwardFactor means moving forward relative to
  // the camera's facing; positive rightFactor means moving right.
  let forwardFactor = 0;
  let rightFactor = 0;
  if (input['w']) forwardFactor += 1;
  if (input['s']) forwardFactor -= 1;
  if (input['d']) rightFactor += 1;
  if (input['a']) rightFactor -= 1;
  // If the user is manually moving via WASD, cancel any click‑to‑move target
  const hasManualInput = forwardFactor !== 0 || rightFactor !== 0;
  if (hasManualInput) {
    moveTarget = null;
  }
  // Player's current position
  const transform = world.getComponent<Transform>(playerEntity, 'transform');
  if (!transform) return;
  const pos = transform.position;
  // Determine desired direction
  let moveDir = new Vector3(0, 0, 0);
  if (moveTarget && !hasManualInput) {
    // Move towards the target point on the XZ plane
    const dir = moveTarget.subtract(pos);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 0.1) {
      // Reached target
      moveTarget = null;
      velocity.value.set(0, 0, 0);
      return;
    }
    dir.normalize();
    moveDir = dir;
  } else {
    // Compute camera‑relative basis vectors. Forward is the vector from
    // the camera to its target projected onto the horizontal plane.
    if (!camera) return;
    const forwardVec = camera.target.subtract(camera.position);
    forwardVec.y = 0;
    forwardVec.normalize();
    // Right is the cross product of up and forward. This yields the
    // correct right direction in a right‑handed coordinate system.
    const rightVec = Vector3.Cross(Vector3.Up(), forwardVec).normalize();
    moveDir = forwardVec.scale(forwardFactor).add(rightVec.scale(rightFactor));
    if (moveDir.length() > 0) moveDir.normalize();
  }
  velocity.value.x = moveDir.x * speed;
  velocity.value.y = 0;
  velocity.value.z = moveDir.z * speed;
}

// Perform an auto‑attack depending on the player's class. For
// warriors this executes a melee swing in a 90° arc with a 2 unit
// range. For archers this spawns a projectile directed towards the
// clicked ground point. A cooldown of 0.25s applies between attacks.
function autoAttack(targetPoint?: Vector3): void {
  // Deprecated: autoAttack is no longer used directly. Use executeSkill
  // instead. This function remains for backwards compatibility and
  // simply delegates to the equipped skill.
  if (targetPoint) {
    executeSkill(equippedActiveSkill, targetPoint);
  }
}

/** Execute a skill by id at the given target point. Handles per‑skill
 *  behaviour and cooldown enforcement. */
function executeSkill(skillId: string, targetPoint: Vector3): void {
  const now = performance.now() / 1000;
  // Retrieve last use and cooldowns for each skill
  const cooldowns: Record<string, number> = {
    heavyStrike: 0.25,
    splitShot: 0.5,
    chainSpark: 0.7,
  };
  const lastUse = lastSkillUse[skillId] ?? 0;
  if (now - lastUse < (cooldowns[skillId] || 0)) {
    return;
  }
  lastSkillUse[skillId] = now;
  // Fetch player transform for origin
  const playerTransform = world.getComponent<Transform>(playerEntity, 'transform');
  if (!playerTransform) return;
  const origin = playerTransform.position.clone();
  
  // Calculate base damage based on stats
  let dmg = currentStats 
    ? calculateSkillDamage(skillId, currentStats, playerClass)
    : 15; // Fallback if stats not loaded
  
  // Apply percentage bonuses from skill tree + equipment
  const totalMeleePct = passiveBonuses.melee_pct + equipmentBonuses.melee_pct;
  if (skillId === 'heavyStrike' && totalMeleePct > 0) {
    dmg = Math.floor(dmg * (1 + totalMeleePct / 100));
  }
  
  if (skillId === 'heavyStrike') {
    // Melee attack: spawn hitbox in front of player
    
    // Calculate forward direction toward target
    let forwardVec = targetPoint.subtract(origin);
    forwardVec.y = 0;
    if (forwardVec.length() === 0 && camera) {
      forwardVec = camera.target.subtract(camera.position);
    }
    forwardVec.y = 0;
    if (forwardVec.length() > 0) {
      forwardVec.normalize();
    }
    
    // Spawn melee hitbox
    const forward = { x: forwardVec.x, z: forwardVec.z };
    spawnMeleeHitbox(
      world,
      playerEntity,
      forward,
      0.9,  // radius
      1.2,  // range
      0.12, // lifetime
      dmg   // damage
    );
  } else if (skillId === 'splitShot') {
    // Apply bow percentage bonus from tree + equipment
    const totalBowPct = passiveBonuses.bow_pct + equipmentBonuses.bow_pct;
    if (totalBowPct > 0) {
      dmg = Math.floor(dmg * (1 + totalBowPct / 100));
    }
    
    // Fire three projectiles in a small cone towards the target. Compute
    // forward direction on the XZ plane.
    const dir = targetPoint.subtract(origin);
    dir.y = 0;
    if (dir.length() === 0) return;
    dir.normalize();
    const angles = [0, 0.15, -0.15]; // radians offset for each arrow
    for (const a of angles) {
      // Rotate direction around Y axis
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const rx = dir.x * cos - dir.z * sin;
      const rz = dir.x * sin + dir.z * cos;
      const shotDir = new Vector3(rx, 0, rz);
      spawnProjectile(origin, shotDir, dmg);
    }
  } else if (skillId === 'chainSpark') {
    // Launch a slower spell projectile. For now it behaves like a
    // single arrow with higher damage. In a full implementation this
    // would chain between enemies.
    const dir = targetPoint.subtract(origin);
    dir.y = 0;
    if (dir.length() === 0) return;
    dir.normalize();
    spawnProjectile(origin, dir, dmg, 5);
  }
}

/** Helper to spawn a projectile entity travelling in the given
 *  direction. Damage and speed can be customised. */
function spawnProjectile(origin: Vector3, direction: Vector3, damage: number, lifeTime = 3): void {
  const speed = 10;
  const vel = direction.scale(speed);
  const projEntity = world.createEntity();
  // Visual representation: sphere for projectile
  const mesh = MeshBuilder.CreateSphere('proj', { diameter: 0.2 }, scene);
  mesh.position = origin.clone();
  const transform: Transform = { position: mesh.position.clone(), mesh };
  const velocity: Velocity = { value: vel };
  const projectile: Projectile = { damage, lifeTime, owner: playerEntity };
  world.addComponent(projEntity, 'transform', transform);
  world.addComponent(projEntity, 'velocity', velocity);
  world.addComponent(projEntity, 'projectile', projectile);
}

/** Perform the default auto‑attack for the current class. Warriors use
 *  Heavy Strike; archers fire a single arrow toward the clicked
 *  location. */
function performAutoAttack(targetPoint: Vector3): void {
  if (playerClass === 'warrior') {
    executeSkill('heavyStrike', targetPoint);
  } else if (playerClass === 'archer') {
    // Archer basic attack fires a single projectile towards the target
    const playerTransform = world.getComponent<Transform>(playerEntity, 'transform');
    if (!playerTransform) return;
    const origin = playerTransform.position.clone();
    const dir = targetPoint.subtract(origin);
    dir.y = 0;
    if (dir.length() === 0) return;
    dir.normalize();
    
    // Calculate damage based on stats (default ranged damage)
    let dmg = currentStats 
      ? calculateSkillDamage('auto', currentStats, playerClass)
      : 12; // Fallback
    
    // Apply bow percentage bonus for archers from tree + equipment
    const totalBowPct = passiveBonuses.bow_pct + equipmentBonuses.bow_pct;
    if (totalBowPct > 0) {
      dmg = Math.floor(dmg * (1 + totalBowPct / 100));
    }
    
    spawnProjectile(origin, dir, dmg);
  }
}

// Teleport the player to the clicked ground location. This is a
// placeholder for a proper pathfinding or movement system.
function movePlayerTo(point: Vector3): void {
  const transform = world.getComponent<Transform>(playerEntity, 'transform');
  if (!transform) return;
  // Set the target point for click‑to‑move. Preserve the player's
  // current Y coordinate (height) and clamp to ground level.
  moveTarget = new Vector3(point.x, transform.position.y, point.z);
}

// Handle player respawn after death
function handleRespawn(): void {
  const deathScreen = document.getElementById('death-screen');
  deathScreen?.classList.add('hidden');
  
  // Reset player health to full
  if (playerEntity !== null && playerEntity !== undefined && currentStats) {
    const health = world.getComponent<Health>(playerEntity, 'health');
    const playerState = world.getComponent<PlayerState>(playerEntity, 'playerState');
    
    if (health) {
      // Reset both the ECS health component AND currentStats
      health.max = currentStats.maxHp;
      health.current = currentStats.maxHp;
      currentStats.hp = currentStats.maxHp;
    }
    
    if (playerState) {
      playerState.isDead = false;
      playerState.deathTime = undefined;
    }
  }
  
  // Return to hideout if in dungeon
  if (currentScene === 'dungeon') {
    leaveDungeon();
  }
  
  // Force UI update after respawn
  updateResourceOrbs();
  
  // Save after everything is set correctly
  autoSave();
}

// Spawn dev items when clicking the chest
function spawnDevItems(): void {
  // Spawn random weapons for testing purposes
  console.log('Spawning random dev items...');

  // Generate 8-12 random items from different weapon types + maps
  const numItems = Math.floor(Math.random() * 5) + 8; // 8-12 items

  for (let i = 0; i < numItems; i++) {
    // Randomly select item type (70% weapons, 30% maps)
    const isMap = Math.random() < 0.3;

    if (isMap) {
      // Spawn a random map
      const mapTypes = [
        'dungeon_map', 'infested_dungeon_map', 'haunted_dungeon_map',
        'cursed_dungeon_map', 'corrupted_dungeon_map'
      ];
      const randomMapType = mapTypes[Math.floor(Math.random() * mapTypes.length)];

      const mapItem = createItem(randomMapType);
      addItemToInventory(mapItem);
    } else {
      // Spawn a random weapon
      const weaponTypes = [
        'one_hand_sword', 'bow', 'axe', 'mace', 'dagger', 'claw',
        'sceptre', 'spear', 'flail', 'two_hand_sword', 'two_hand_axe',
        'two_hand_mace', 'staff', 'shield', 'quiver'
      ];

      const randomType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];

      // Get random base item from selected type
      const baseItem = pickRandomBase(1, randomType); // Level 1 for easier testing
      if (baseItem) {
        // Create the item with random rarity
        const item = createItem(baseItem.id, [], 'normal');

        // 40% chance to make it magic, 20% chance to make it rare
        const rand = Math.random();
        if (rand < 0.4) {
          // Generate affixes for magic items
          item.affixes = rollAffixes('magic', 1);
          item.rarity = 'magic';
        } else if (rand < 0.6) {
          // Generate affixes for rare items
          item.affixes = rollAffixes('rare', 1);
          item.rarity = 'rare';
        }

        addItemToInventory(item);
      }
    }
  }

  console.log(`${numItems} random weapon types spawned! Press I to open inventory.`);
}

// ---------------------------------------------------------------------
// Game loop
const timestepMs = 1000 / 60;
let gameLoopInterval: number | null = null;
let playtimeAccumulator = 0;

/** Update charges for all flasks in inventory and equipment */
function updateAllFlaskCharges(dt: number): void {
  if (!currentSaveData?.inventory?.grid) return;

  // Update flasks in inventory
  for (const row of currentSaveData.inventory.grid) {
    for (const item of row) {
      if (item) {
        updateFlaskCharges(item, dt);
      }
    }
  }

  // Update flasks in equipment (if any equipment slots can hold flasks)
  // For now, flasks are only in inventory, but this could be extended
}

/** Use a flask from inventory */
function useFlaskFromInventory(flaskIndex: number): boolean {
  if (!currentSaveData?.inventory?.grid) return false;

  // Find flask in inventory (assuming they're in specific slots for now)
  // This is a simplified implementation - in a real game you'd have dedicated flask slots
  const flasks = [];
  for (const row of currentSaveData.inventory.grid) {
    for (const item of row) {
      if (item && getItemBase(item.baseId)?.slot === 'flask') {
        flasks.push(item);
      }
    }
  }

  if (flaskIndex >= flasks.length) return false;

  const flask = flasks[flaskIndex];
  if (!canUseFlask(flask)) return false;

  return useFlask(flask, currentStats,
    // Heal callback
    (amount: number) => {
      currentStats.hp = Math.min(currentStats.maxHp, currentStats.hp + amount);
      console.log(`Flask healed for ${amount} HP`);
      updateResourceOrbs(); // Update UI after healing
    },
    // Effect callback
    (effects: any[]) => {
      // Apply temporary effects (this would need a buff system)
      console.log('Flask effects applied:', effects);
      // For now, just apply simple stat bonuses
      for (const effect of effects) {
        if (effect.stat && effect.value) {
          // This is a simplified implementation - you'd want a proper buff system
          console.log(`Applied ${effect.stat}: ${effect.value}`);
        }
      }
    }
  );
}

/** Use currency on an item */
function useCurrencyOnItem(currencyItem: ItemInstance, targetItem: ItemInstance): { success: boolean; message: string } {
  const result = applyCurrencyToItem(targetItem, currencyItem);

  if (result.success) {
    // Remove one currency item from stack
    if (currencyItem.quantity && currencyItem.quantity > 1) {
      currencyItem.quantity--;
    } else {
      // Remove the currency item completely (this would need inventory management)
      console.log('Currency item consumed completely');
    }

    // Update UI
    refreshInventory();
  }

  return result;
}

/** Update flask UI to reflect current flask state */
function updateFlaskUI(): void {
  if (!currentSaveData?.inventory?.grid) return;

  // Find flasks in inventory
  const flasks = [];
  for (const row of currentSaveData.inventory.grid) {
    for (const item of row) {
      if (item && getItemBase(item.baseId)?.slot === 'flask') {
        flasks.push(item);
      }
    }
  }

  // Update each flask slot in the UI
  const flaskSlots = document.querySelectorAll('.flask-slot');
  flaskSlots.forEach((slot, index) => {
    const flaskElement = slot as HTMLElement;
    const iconElement = flaskElement.querySelector('.flask-icon') as HTMLElement;
    const chargesElement = flaskElement.querySelector('.flask-charges') as HTMLElement;

    if (index < flasks.length) {
      const flask = flasks[index];
      const flaskCharges = flask.flaskCharges || 0;
      const maxCharges = getItemBase(flask.baseId)?.flask?.maxCharges || 0;

      // Update charges display
      chargesElement.textContent = flaskCharges.toString();

      // Update visual state
      flaskElement.classList.remove('empty', 'ready', 'cooldown');
      if (flaskCharges === 0) {
        flaskElement.classList.add('empty');
      } else if (flaskCharges === maxCharges) {
        flaskElement.classList.add('ready');
      } else {
        flaskElement.classList.add('cooldown');
      }
    } else {
      // No flask in this slot
      chargesElement.textContent = '0';
      flaskElement.classList.remove('ready', 'cooldown');
      flaskElement.classList.add('empty');
    }
  });
}

function update() {
  const dt = 1 / 60;
  
  // Update playtime
  if (currentSaveData) {
    playtimeAccumulator += dt;
    if (playtimeAccumulator >= 30) { // Save playtime every 30 seconds
      updatePlaytime(currentSlot, playtimeAccumulator);
      playtimeAccumulator = 0;
      // Also auto-save the game
      autoSave();
    }
  }

  // Update flask charges
  updateAllFlaskCharges(dt);

  // Update UI elements
  updateResourceOrbs();
  updateFlaskUI();
  
  // If LMB is held and bound to move, continuously update the
  // destination based on the current mouse position
  if (isLmbDown && slotBindings['lmb'] === 'move') {
    const pick = scene.pick(scene.pointerX, scene.pointerY);
    if (pick && pick.pickedPoint) {
      movePlayerTo(pick.pickedPoint);
    }
  }
  handlePlayerMovement(dt);
  world.update(dt);
  // In dungeon, check for exit
  if (currentScene === 'dungeon') {
    // Check if player reached end of corridor (approx z > 58)
    const pTrans = world.getComponent<Transform>(playerEntity, 'transform');
    if (pTrans && pTrans.position.z > 58) {
      leaveDungeon();
      autoSave();
    }
  }
  // Update camera target before updating damage numbers so numbers
  // project correctly relative to the new view.
  const playerTransform = world.getComponent<Transform>(playerEntity, 'transform');
  if (playerTransform && camera) {
    camera.setTarget(playerTransform.position);
  }
  damageNumbers.update();
  updateResourceOrbs();
  enemyHealthBars.update();
}

function startGameLoop(): void {
  if (gameLoopInterval === null) {
    gameLoopInterval = setInterval(update, timestepMs) as any;
  }
}

function stopGameLoop(): void {
  if (gameLoopInterval !== null) {
    clearInterval(gameLoopInterval);
    gameLoopInterval = null;
  }
}

// Render loop - always running
engine.runRenderLoop(() => {
  // Only render if we have an active camera
  if (scene.activeCamera) {
    // Update ground item labels before rendering
    if (camera && gameInitialized) {
      updateLabels(camera, canvas);
    }
    
    scene.render();
  }
});

// Resize handling
window.addEventListener('resize', () => {
  engine.resize();
});

// UI handling: skill bar modal and G‑menu
let assignModal: HTMLDivElement;
let gMenu: HTMLDivElement;

// Dungeon modal elements and event handlers
let dungeonModal: HTMLDivElement;
let enterDungeonBtn: HTMLButtonElement;
let cancelDungeonBtn: HTMLButtonElement;

function initializeGameUI(): void {
  assignModal = document.getElementById('assign-modal') as HTMLDivElement;
  gMenu = document.getElementById('g-menu') as HTMLDivElement;
  dungeonModal = document.getElementById('dungeon-modal') as HTMLDivElement;
  enterDungeonBtn = document.getElementById('enter-dungeon-btn') as HTMLButtonElement;
  cancelDungeonBtn = document.getElementById('cancel-dungeon-btn') as HTMLButtonElement;
  
  // Character sheet setup
  const charSheet = document.getElementById('char-sheet');
  const closeCharSheet = document.getElementById('close-char-sheet');
  closeCharSheet?.addEventListener('click', () => {
    charSheet?.classList.add('hidden');
  });
  
  // Initialize debug sliders
  try {
    initDebugSliders((updatedStats) => {
      currentStats = updatedStats;
      if (currentSaveData) {
        currentSaveData.character.stats = updatedStats;
        // Recalculate base stats for tree bonuses
        (currentSaveData as any).baseStats = {
          strength: updatedStats.strength,
          dexterity: updatedStats.dexterity,
          intelligence: updatedStats.intelligence,
          maxHp: updatedStats.maxHp,
          maxMp: updatedStats.maxMp,
          armor: updatedStats.armor,
          evasion: updatedStats.evasion,
        };
      }
      applySkillTreeBonuses();
    });
  } catch (err) {
    console.warn('Failed to initialize debug sliders:', err);
  }
  
  // Skill tree setup
  const skillTree = document.getElementById('skill-tree');
  const closeSkillTree = document.getElementById('close-skill-tree');
  closeSkillTree?.addEventListener('click', () => {
    skillTree?.classList.add('hidden');
  });
  
  // Initialize skill tree when data is loaded
  loadSkillTree().then(() => {
    // Load tree state from save data
    if (currentSaveData?.skillTree) {
      setAllocatedNodes(currentSaveData.skillTree.allocatedNodes);
      setPassivePoints(currentSaveData.skillTree.availablePoints);
    }
    
    initSkillTree(() => {
      // Called when tree changes
      const state = getTreeState();
      if (currentSaveData) {
        currentSaveData.skillTree.allocatedNodes = getAllocatedNodeIds();
        currentSaveData.skillTree.availablePoints = state.passivePoints;
      }
      aggregateAllStats();
      autoSave();
    });
  }).catch(err => {
    console.error('Failed to initialize skill tree UI:', err);
  });
  
  // Attach panel closers for ESC and close buttons
  attachPanelClosers();
  
  // Setup independent panel toggles
  setupIndependentToggles();
  
  // Initialize both inventory UIs with shared state
  const inventoryChangeHandler = () => {
    // Called when equipment/inventory changes
    currentEquipment = getEquipment();
    currentInventoryGrid = getInventory();
    aggregateAllStats();
    autoSave();
  };
  
  initInventoryStandalone(currentEquipment, currentInventoryGrid, inventoryChangeHandler);
  initInventoryCompact(currentEquipment, currentInventoryGrid, inventoryChangeHandler);
  
  // ESC menu setup
  const escMenu = document.getElementById('esc-menu');
  const escResume = document.getElementById('esc-resume');
  const escSave = document.getElementById('esc-save');
  const escMainMenu = document.getElementById('esc-main-menu');
  const escQuit = document.getElementById('esc-quit');
  
  escResume?.addEventListener('click', () => {
    escMenu?.classList.add('hidden');
  });
  
  escSave?.addEventListener('click', () => {
    autoSave();
    alert('Game saved!');
  });
  
  escMainMenu?.addEventListener('click', () => {
    autoSave();
    escMenu?.classList.add('hidden');
    // cleanupGameWorld() will be called by the MAIN_MENU state handler
    stateManager.transitionTo(GameState.MAIN_MENU);
  });
  
  escQuit?.addEventListener('click', () => {
    autoSave();
    escMenu?.classList.add('hidden');
    window.close(); // Attempt to close window
  });
  
  // Death screen setup
  const deathScreen = document.getElementById('death-screen');
  const respawnBtn = document.getElementById('respawn-btn');
  respawnBtn?.addEventListener('click', () => {
    handleRespawn();
  });
  
  if (enterDungeonBtn && cancelDungeonBtn && dungeonModal) {
    enterDungeonBtn.addEventListener('click', () => {
      dungeonModal.classList.add('hidden');
      setupDungeon();
      autoSave();
    });
    cancelDungeonBtn.addEventListener('click', () => {
      dungeonModal.classList.add('hidden');
    });
  }

  // Reset progress button in the G menu
  const resetBtn = document.getElementById('reset-progress') as HTMLButtonElement;
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // Clear all save slots
      localStorage.clear();
      // Clear current save data
      currentSaveData = null;
      // cleanupGameWorld() will be called by the MAIN_MENU state handler
      stateManager.transitionTo(GameState.MAIN_MENU);
    });
  }
}

function initializeSkillBarHandlers(): void {
  document.querySelectorAll<HTMLDivElement>('#skill-bar .slot').forEach((slot) => {
    slot.addEventListener('click', (ev) => {
      ev.stopPropagation();
      // If this is the LMB slot open the custom binding modal; otherwise
      // show the generic skill assignment placeholder.
      if (slot.classList.contains('lmb')) {
        openLMBModal();
      } else {
        // Determine slot key: mmb, rmb or keyboard
        let key: string | null = null;
        if (slot.classList.contains('mmb')) key = 'mmb';
        else if (slot.classList.contains('rmb')) key = 'rmb';
        else if (slot.dataset.key) key = slot.dataset.key.toLowerCase();
        if (key) {
          openGenericAssignModal(key);
        }
      }
    });
  });

  // Create and store the keydown handler so we can remove it later
  uiKeydownHandler = (ev: KeyboardEvent) => {
    if (!gameInitialized) return; // Don't process game keys until game is loaded
    
    // ESC key closes topmost panel or toggles escape menu
    if (ev.key === 'Escape') {
      ev.preventDefault();
      // First try to close vendor/inventory panels
      // ESC handling is now managed by attachPanelClosers
      // If no panels were closed, toggle escape menu
      const escMenu = document.getElementById('esc-menu');
      if (escMenu && escMenu.classList.contains('hidden')) {
        escMenu.classList.remove('hidden');
      }
      return;
    }
    
    // C key toggles character sheet
    if (ev.key === 'c' || ev.key === 'C') {
      ev.preventDefault();
      const charSheet = document.getElementById('char-sheet');
      if (charSheet) {
        charSheet.classList.toggle('hidden');
      }
      return;
    }
    
    // T key toggles skill tree
    if (ev.key === 't' || ev.key === 'T') {
      ev.preventDefault();
      const skillTree = document.getElementById('skill-tree');
      if (skillTree) {
        const wasHidden = skillTree.classList.contains('hidden');
        skillTree.classList.toggle('hidden');
        // Refresh tree when opening
        if (wasHidden) {
          try {
            refreshTree();
          } catch (err) {
            console.warn('Could not refresh tree:', err);
          }
        }
      }
      return;
    }
    
    // I key toggles inventory (handled by setupIndependentToggles)
    // Removed to avoid conflict with setupIndependentToggles
    
    // Z key toggles ground item labels
    if (ev.key === 'z' || ev.key === 'Z') {
      ev.preventDefault();
      toggleLabels();
      return;
    }

    // Flask hotkeys (3, 4, 5)
    if (ev.key === '3') {
      ev.preventDefault();
      if (useFlaskFromInventory(0)) {
        console.log('Used flask 1');
      }
    } else if (ev.key === '4') {
      ev.preventDefault();
      if (useFlaskFromInventory(1)) {
        console.log('Used flask 2');
      }
    } else if (ev.key === '5') {
      ev.preventDefault();
      if (useFlaskFromInventory(2)) {
        console.log('Used flask 3');
      }
    }

    if (ev.key === 'g' || ev.key === 'G') {
      ev.preventDefault();
      gMenu.classList.toggle('hidden');
    }
    // Hotkeys 1 and 2 switch between warrior and archer classes.
    if (ev.key === '1') {
      playerClass = 'warrior';
      updatePlayerAppearance();
      autoSave();
    } else if (ev.key === '2') {
      playerClass = 'archer';
      updatePlayerAppearance();
      autoSave();
    }

    // Skill bar key activations (Q, W, E, R, T). When pressed, execute
    // the skill bound to that slot. The target point is the mouse position.
    const key = ev.key.toLowerCase();
    const valid = ['q', 'w', 'e', 'r', 't'];
    if (valid.includes(key)) {
      ev.preventDefault();
      const binding = slotBindings[key];
      // Only execute if there's an actual binding (not null)
      if (!binding) return; // No skill assigned, do nothing
      
      const transform = world.getComponent<Transform>(playerEntity, 'transform');
      if (transform) {
        // Use mouse world position if available, otherwise default to ahead of player
        let target: Vector3;
        if (lastMouseWorldPos) {
          target = lastMouseWorldPos;
        } else if (camera) {
          // Fallback: compute a target point 5 units ahead of the player
          const forwardVec = camera.target.subtract(camera.position);
          forwardVec.y = 0;
          if (forwardVec.length() === 0) return;
          forwardVec.normalize();
          target = transform.position.add(forwardVec.scale(5));
        } else {
          // No camera available, use forward direction
          target = transform.position.add(new Vector3(0, 0, 5));
        }
        
        if (binding === 'move') {
          movePlayerTo(target);
        } else if (binding === 'auto') {
          executeSkill(equippedActiveSkill, target);
        } else if (skills[binding]) {
          executeSkill(binding, target);
        }
      }
    }
  };
  
  // Add the event listener with our stored handler reference
  window.addEventListener('keydown', uiKeydownHandler);
}

// ---------------------------------------------------------------------
// Game initialization and state management

/** Clean up the game world when returning to main menu */
function cleanupGameWorld(): void {
  console.log('[CLEANUP] Cleaning up game world...');
  
  // Stop game loop if running
  stopGameLoop();
  
  // If in dungeon, clean up dungeon entities first
  if (currentScene === 'dungeon') {
    for (const e of dungeonEnemies) {
      const t = world.getComponent<Transform>(e, 'transform');
      if (t && t.mesh) {
        t.mesh.dispose();
      }
      (world as any)['components'].delete(e);
    }
  }
  
  // Dispose of all meshes and lights in the scene
  if (scene) {
    // Dispose player mesh
    if (playerEntity !== null && playerEntity !== undefined) {
      const playerTransform = world.getComponent<Transform>(playerEntity, 'transform');
      if (playerTransform && playerTransform.mesh) {
        playerTransform.mesh.dispose();
      }
    }
    
    // Dispose hideout meshes
    for (const mesh of hideoutMeshes) {
      mesh.dispose();
    }
    hideoutMeshes.length = 0;
    
    // Dispose dungeon meshes
    for (const mesh of dungeonMeshes) {
      mesh.dispose();
    }
    dungeonMeshes.length = 0;
    
    // Dispose all entities in the world
    const allEntities = world.getEntitiesWith('transform');
    for (const entityId of allEntities) {
      const transform = world.getComponent<Transform>(entityId, 'transform');
      if (transform && transform.mesh) {
        transform.mesh.dispose();
      }
    }
    
    // Dispose map device
    if (mapDevice) {
      mapDevice.dispose();
      mapDevice = null;
    }
    
    // Dispose all lights in the scene
    const lights = scene.lights.slice(); // Make a copy since we're modifying the array
    for (const light of lights) {
      light.dispose();
    }
    
    // Dispose camera if it exists
    if (camera) {
      camera.dispose();
      camera = null;
    }
  }
  
  // Clear ECS world
  (world as any)['components'].clear();
  (world as any)['nextEntityId'] = 0;
  
  // Clear entity arrays
  dungeonEnemies = [];
  dummyEntity = null;
  playerEntity = null;
  
  // Clear enemy health bars
  enemyHealthBars.clear();
  
  // Cleanup ground items
  cleanupGroundItems();
  console.log('[CLEANUP] Cleaned up ground items');
  
  // Remove UI keydown event handler
  if (uiKeydownHandler) {
    window.removeEventListener('keydown', uiKeydownHandler);
    uiKeydownHandler = null;
    console.log('[CLEANUP] Removed UI keydown handler');
  }
  
  // Reset game state flags and save data
  gameInitialized = false;
  currentSaveData = null;
  currentStats = null;
  
  console.log('[CLEANUP] Game world cleaned up');
}

/** Initialize the game world with player and scene. Called when entering HIDEOUT state. */
async function initializeGame(saveData: SaveData): Promise<void> {
  // Always do full initialization (cleanup should have been called before this)
  if (gameInitialized) {
    console.warn('[INIT] Game already initialized! This should not happen after proper cleanup.');
    return;
  }

  console.log('Starting game initialization...');
  
  // Create player first
  playerEntity = createPlayer();
  console.log('Player created');
  
  // Load save data into game state (may update player position)
  loadSaveIntoGame(saveData);
  console.log('Save data loaded');
  
  // Create camera targeting the player's position
  camera = createIsometricCamera();
  const playerTransform = world.getComponent<Transform>(playerEntity, 'transform');
  if (playerTransform) {
    camera.setTarget(playerTransform.position);
  }
  console.log('Camera created');
  
  // Setup hideout scene
  await setupHideout();
  console.log('Hideout setup');
  
  // Initialize ground items system
  initGroundItems((item: ItemInstance) => {
    // Callback to add item to inventory
    return addItemToInventory(item);
  });
  console.log('Ground items system initialized');
  
  // Initialize vendor UI
  initVendorUI((item: ItemInstance) => {
    // Callback to add purchased item to inventory
    return addItemToInventory(item);
  });
  // Initialize vendor data with starting gold
  initVendorData(currentStats?.level || 1);
  setGold(100);
  console.log('Vendor system initialized');
  
  initializeSkillBarHandlers();
  console.log('Skill bar handlers initialized');
  
  populateGMenuUI();
  console.log('G menu populated');
  
  // Apply player appearance and update UI
  updatePlayerAppearance();
  updateSkillBarSlotsUI();
  updateFlaskUI();
  console.log('Player appearance updated');
  
  // Start game loop
  startGameLoop();
  console.log('Game loop started');
  
  // Force an immediate render to ensure everything is visible
  scene.render();
  
  gameInitialized = true;
  console.log('='.repeat(60));
  console.log('GAME INITIALIZATION COMPLETE - NEW CODE VERSION!');
  console.log('Build timestamp:', new Date().toISOString());
  console.log('='.repeat(60));
  
  // Initialize UI with current health/mana values
  updateResourceOrbs();
}

/** Load save data into the game world. */
function loadSaveIntoGame(saveData: SaveData): void {
  currentSaveData = saveData;
  
  // Load character data
  playerClass = saveData.character.class;
  equippedActiveSkill = saveData.skills.equippedActiveSkill;
  slotBindings.lmb = saveData.skills.slotBindings.lmb;
  slotBindings.mmb = saveData.skills.slotBindings.mmb;
  slotBindings.rmb = saveData.skills.slotBindings.rmb;
  slotBindings.q = saveData.skills.slotBindings.q;
  slotBindings.w = saveData.skills.slotBindings.w;
  slotBindings.e = saveData.skills.slotBindings.e;
  slotBindings.r = saveData.skills.slotBindings.r;
  slotBindings.t = saveData.skills.slotBindings.t;
  
  // Load stats (base stats before tree bonuses)
  currentStats = { ...saveData.character.stats };
  
  // Load inventory and equipment
  if (saveData.inventory && saveData.inventory.grid) {
    currentInventoryGrid = saveData.inventory.grid;
    console.log('Loaded inventory:', currentInventoryGrid.items.length, 'items');
  } else {
    // Initialize empty inventory
    currentInventoryGrid = { width: 10, height: 6, items: [] };
  }
  
  if (saveData.equipment) {
    currentEquipment = saveData.equipment;
    console.log('Loaded equipment:', Object.keys(saveData.equipment).filter(k => saveData.equipment[k as any]).length, 'items equipped');
  } else {
    // Initialize empty equipment
    currentEquipment = {};
  }
  
  // Initialize UI after save data is loaded
  initializeGameUI();
  console.log('UI initialized');
  
  // Load skill tree allocation (only if tree is loaded)
  if (saveData.skillTree && saveData.skillTree.allocatedNodes) {
    try {
      setAllocatedNodes(saveData.skillTree.allocatedNodes);
      setPassivePoints(saveData.skillTree.availablePoints);
    } catch (err) {
      console.warn('Skill tree not loaded yet:', err);
    }
  }
  
  // Aggregate all stats (base + tree + equipment)
  aggregateAllStats();
  
  // Update inventory UI with loaded data
  if (gameInitialized) {
    updateInventoryData(currentEquipment, currentInventoryGrid);
  }
  
  // Update character sheet display
  updateCharacterSheet(currentStats, playerClass);
  
  // Update resource orbs
  updateResourceOrbs();
  
  // Load loot data (gold, ground items, vendor)
  if (saveData.loot) {
    setGold(saveData.loot.gold);
    
    // Restore ground items
    if (saveData.loot.groundItems && saveData.loot.groundItems.length > 0) {
      restoreGroundItems(saveData.loot.groundItems);
      console.log('Restored', saveData.loot.groundItems.length, 'ground items');
    }
    
    // Restore vendor state
    if (saveData.loot.vendorState) {
      loadVendorState(saveData.loot.vendorState);
      console.log('Restored vendor state');
    }
  }
  
  // Position player
  if (playerEntity) {
    const transform = world.getComponent<Transform>(playerEntity, 'transform');
    if (transform) {
      transform.position.x = saveData.world.position.x;
      transform.position.y = saveData.world.position.y;
      transform.position.z = saveData.world.position.z;
      if (transform.mesh) {
        transform.mesh.position.copyFrom(transform.position);
      }
    }
    
    // Update health from stats
    const health = world.getComponent<Health>(playerEntity, 'health');
    if (health) {
      health.current = saveData.character.stats.hp;
      health.max = saveData.character.stats.maxHp;
    }
  }
  
  // Update scene if needed
  currentScene = saveData.world.currentScene;
  
  // Force UI update after loading save data
  if (gameInitialized) {
    updateResourceOrbs();
    updateFlaskUI();
  }
}

/** Save current game state to the active slot. */
function autoSave(): void {
  if (!currentSaveData || !currentStats) return;
  
  // Update save data with current game state
  currentSaveData.character.class = playerClass;
  currentSaveData.skills.equippedActiveSkill = equippedActiveSkill;
  currentSaveData.skills.slotBindings = { ...slotBindings };
  currentSaveData.world.currentScene = currentScene;
  
  // Save skill tree allocation (if tree is loaded)
  try {
    const state = getTreeState();
    currentSaveData.skillTree.allocatedNodes = getAllocatedNodeIds();
    currentSaveData.skillTree.availablePoints = state.passivePoints;
  } catch (err) {
    console.warn('Could not save skill tree (not loaded yet)');
  }
  
  // Save inventory and equipment
  currentSaveData.inventory.grid = currentInventoryGrid;
  currentSaveData.equipment = currentEquipment;
  
  // Update player position and stats
  if (playerEntity) {
    const transform = world.getComponent<Transform>(playerEntity, 'transform');
    if (transform) {
      currentSaveData.world.position = {
        x: transform.position.x,
        y: transform.position.y,
        z: transform.position.z,
      };
    }
    
    const health = world.getComponent<Health>(playerEntity, 'health');
    if (health) {
      currentStats.hp = health.current;
      currentStats.maxHp = health.max;
    }
  }
  
  // Save updated stats
  currentSaveData.character.stats = currentStats;
  
  // Save loot data (gold, ground items, vendor)
  currentSaveData.loot = {
    gold: getGold(),
    groundItems: getAllGroundItems(),
    vendorState: saveVendorState(),
  };
  
  // Save to localStorage
  saveGame(currentSlot, currentSaveData);
}

// ---------------------------------------------------------------------
// State machine handlers

stateManager.on(GameState.MAIN_MENU, async () => {
  console.log('Entering MAIN_MENU state');
  
  // Clean up the game world when returning to main menu
  if (gameInitialized) {
    cleanupGameWorld();
  }
  
  stopGameLoop();
  await loadUI('/ui/mainMenu.html');
});

stateManager.on(GameState.CHARACTER_CREATE, async (data) => {
  console.log('Entering CHARACTER_CREATE state');
  logFeatureFlag('ENABLE_POE_STYLE_CREATOR', ENABLE_POE_STYLE_CREATOR);

  if (data?.slot !== undefined) {
    currentSlot = data.slot;
    // Store slot in window for the char create module to access
    (window as any).__charCreateSlot = data.slot;
  }

  try {
    if (ENABLE_POE_STYLE_CREATOR) {
      logRouteChange('#/character/create');
      await loadUI('/src/features/characterCreation/ui/index.html');
      logSceneEvent('CharacterCreationScene UI loaded');
    } else {
      // Fallback to legacy character creation or direct game start
      console.log('PoE-style creator disabled, using legacy flow');
      // For now, just transition to hideout - this would need legacy creator implementation
      const saveData = await createNewSave(currentSlot, 'Adventurer', 'warrior');
      stateManager.transitionTo(GameState.HIDEOUT, { saveData, slot: currentSlot });
    }
  } catch (error) {
    logError(error as Error);
    console.error('Failed to load character creation:', error);
    // Fallback to hideout on error
    try {
      const saveData = await createNewSave(currentSlot, 'Adventurer', 'warrior');
      stateManager.transitionTo(GameState.HIDEOUT, { saveData, slot: currentSlot });
    } catch (fallbackError) {
      logError(fallbackError as Error);
      console.error('Fallback also failed:', fallbackError);
    }
  }
});

stateManager.on(GameState.HIDEOUT, async (data) => {
  console.log('Entering HIDEOUT state');
  await unloadUI();
  
  if (data?.saveData) {
    currentSaveData = data.saveData;
    if (data.slot !== undefined) {
      currentSlot = data.slot;
    }
    await initializeGame(data.saveData);
  }
  
  // Ensure hideout scene is active
  if (currentScene !== 'hideout' && gameInitialized) {
    leaveDungeon();
    // Note: setupHideout() is called in initializeGame, so we don't need to call it here
  }
});

stateManager.on(GameState.DUNGEON, () => {
  console.log('Entering DUNGEON state');
  if (gameInitialized && currentScene !== 'dungeon') {
    setupDungeon();
    autoSave();
  }
});

// ---------------------------------------------------------------------
// Bootstrap - Start the application

// Initialize map device modal event listeners
function initMapDeviceModal(): void {
  const activateBtn = document.getElementById('activate-map-device-btn');
  const clearBtn = document.getElementById('clear-map-btn');
  const closeBtn = document.getElementById('close-map-device-btn');

  if (activateBtn) {
    activateBtn.addEventListener('click', activateMapDevice);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', removeMapFromDevice);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const modal = document.getElementById('map-device-modal');
      if (modal) modal.classList.add('hidden');
    });
  }

  // Close modal when clicking outside
  const modal = document.getElementById('map-device-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  }
}

// Wait for DOM to be ready, then start the state machine
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initMapDeviceModal();
    installWatchdog(); // Install character creation watchdog
    stateManager.transitionTo(GameState.MAIN_MENU);
  });
} else {
  // DOM already loaded
  initMapDeviceModal();
  installWatchdog(); // Install character creation watchdog
  stateManager.transitionTo(GameState.MAIN_MENU);
}