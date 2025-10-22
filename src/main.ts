// Comprehensive entry point for the browser MMORPG. This module now
// integrates a tiny ECS with movement, projectile and health systems,
// spawns a player entity and an invulnerable target dummy, wires up
// WASD movement and ground picking, and displays floating damage
// numbers when enemies take hits. It preserves the existing HTML UI
// behaviour for the skill bar modal and G‑menu.

import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  Matrix,
  Viewport,
  PointerEventTypes,
  Color3,
  Color4,
  StandardMaterial,
} from 'babylonjs';
import { ENABLE_POE_STYLE_CREATOR } from './config';

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
import { saveGame, updatePlaytime } from './state/save';
import type { CharacterStats } from './gameplay/stats';
import { calculateSkillDamage, calculateDerivedStats } from './gameplay/stats';
import { updateCharacterSheet, initDebugSliders } from '../ui/charSheet';
import { loadSkillTree, setAllocatedNodes, getAllocatedNodeIds, computePassiveBonuses, getSkillTree, setPassivePoints, getTreeState } from './gameplay/skillTree';
import type { DerivedBonuses } from './gameplay/skillTree';
import { initSkillTree, refreshTree } from '../ui/skillTree';
import type { ItemInstance, EquipmentState, InventoryGrid } from './systems/items';
import { createItem, getItemBase } from './systems/items';
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
import { spawnMeleeHitbox } from './gameplay/combat/spawnHitbox';
import { generateItem } from './gameplay/loot/itemGen';
import { initGroundItems, spawnGroundItem, updateLabels, toggleLabels, cleanupGroundItems, getAllGroundItems, restoreGroundItems } from './gameplay/loot/groundItems';
import { initVendorUI, showVendor, hideVendor } from '../ui/vendor';
import { openVendorAndInventory, attachPanelClosers } from '../ui/layout';
import { ensureTwoDock } from '../ui/mount';
import { setupIndependentToggles } from '../ui/toggles';
import { initVendor as initVendorData, setGold, getGold, saveVendorState, loadVendorState } from './gameplay/loot/vendor';
import { DeathSystem } from './ecs/systems/deathSystem';

// Grab the canvas and set up the engine and scene.
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = new Color3(0.1, 0.1, 0.15).toColor4();

// Create a default camera immediately so render loop doesn't error
// This will be replaced when the game initializes
const defaultCamera = new ArcRotateCamera('defaultCam', 0, 0, 10, Vector3.Zero(), scene);
scene.activeCamera = defaultCamera;

// Expose engine/scene for UI overlays (character creator) without tight coupling
// Safe for dev tooling; avoid relying on this outside UI overlays.
(window as any).__gameEngine = engine;
(window as any).__gameScene = scene;

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
  height: 6,
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
    // TODO: Show death overlay and respawn logic
    console.log('[DeathSystem] Player died');
  }
}));

// ---------------------------------------------------------------------
// Scene setup functions

/** Set up the hideout scene by creating the ground, map device and target
 *  dummy. Meshes are added to hideoutMeshes so they can be hidden
 *  when entering the dungeon. */
function setupHideout(): void {
  currentScene = 'hideout';
  // Lighting: ensure the scene has a hemispheric light so meshes are visible.
  new HemisphericLight('hideoutLight', new Vector3(0, 1, 0), scene);
  // Create or reuse ground
  const ground = MeshBuilder.CreateGround('hideoutGround', { width: 30, height: 30 }, scene);
  // Apply a simple material to the ground for a subtle colour
  const groundMat = new StandardMaterial('hideoutGroundMat', scene);
  groundMat.diffuseColor = new Color3(0.15, 0.15, 0.3);
  ground.material = groundMat;
  hideoutMeshes.push(ground);
  // Create a map device (purple cylinder). When clicked it opens the dungeon modal.
  mapDevice = MeshBuilder.CreateCylinder('mapDevice', { diameter: 1.5, height: 2 }, scene);
  mapDevice.position = new Vector3(0, 1, -5);
  // Colour the map device
  const mdMat = new StandardMaterial('mapDeviceMat', scene);
  mdMat.diffuseColor = new Color3(0.5, 0.2, 0.6);
  (mapDevice as any).material = mdMat;
  hideoutMeshes.push(mapDevice);
  // Create target dummy in hideout
  dummyEntity = createTargetDummy(new Vector3(5, 1, 5));
  const dTransform = world.getComponent<Transform>(dummyEntity, 'transform');
  if (dTransform && dTransform.mesh) {
    hideoutMeshes.push(dTransform.mesh);
  }
  
  // Create dev item chest (spawns test items)
  const devChest = MeshBuilder.CreateBox('devChest', { width: 1, height: 1, depth: 1 }, scene);
  devChest.position = new Vector3(-5, 0.5, -5);
  const chestMat = new StandardMaterial('chestMat', scene);
  chestMat.diffuseColor = new Color3(0.6, 0.4, 0.2);
  devChest.material = chestMat;
  hideoutMeshes.push(devChest);
  
  // Store reference for click handling
  (window as any).devChest = devChest;
  
  // Create vendor NPC (cylinder with label)
  const vendorNPC = MeshBuilder.CreateCylinder('vendorNPC', { diameter: 1, height: 2 }, scene);
  vendorNPC.position = new Vector3(5, 1, -5);
  const vendorMat = new StandardMaterial('vendorMat', scene);
  vendorMat.diffuseColor = new Color3(0.8, 0.6, 0.2); // Golden color
  vendorNPC.material = vendorMat;
  hideoutMeshes.push(vendorNPC);
  
  // Store reference for click handling
  (window as any).vendorNPC = vendorNPC;
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
  // Create narrow ground corridor
  const ground = MeshBuilder.CreateGround('dungeonGround', { width: 4, height: 60 }, scene);
  ground.position = new Vector3(0, 0, 30);
  // Apply a dark material so the corridor contrasts with the hideout
  const dgMat = new StandardMaterial('dungeonGroundMat', scene);
  dgMat.diffuseColor = new Color3(0.1, 0.1, 0.2);
  ground.material = dgMat;
  dungeonMeshes.push(ground);
  // Optionally add walls or other visuals (omitted for brevity)
  // Spawn enemies at random intervals along the corridor
  dungeonEnemies = [];
  for (let i = 0; i < 4; i++) {
    const z = 10 + i * 10;
    const enemy = createEnemy(new Vector3((Math.random() - 0.5) * 2, 0.4, ground.position.z - 30 + z));
    dungeonEnemies.push(enemy);
    const etrans = world.getComponent<Transform>(enemy, 'transform');
    if (etrans && etrans.mesh) {
      dungeonMeshes.push(etrans.mesh);
    }
  }
  // Reposition player at the start of the corridor
  const pTrans = world.getComponent<Transform>(playerEntity, 'transform');
  if (pTrans) {
    pTrans.position.x = 0;
    pTrans.position.z = ground.position.z - 30 - 5;
    pTrans.position.y = 0.5;
    if (pTrans.mesh) pTrans.mesh.position.copyFrom(pTrans.position);
  }
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
let equippedActiveSkill: string = 'heavyStrike';

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
let lastAutoAttack = 0;

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
  const mesh = MeshBuilder.CreateBox('player', { size: 1 }, scene);
  mesh.position = new Vector3(0, 0.5, 0);
  const transform: Transform = { position: mesh.position.clone(), mesh };
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
function createTargetDummy(pos: Vector3): Entity {
  const e = world.createEntity();
  const mesh = MeshBuilder.CreateCylinder('dummy', { diameter: 1, height: 2 }, scene);
  mesh.position = pos.clone();
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
  const mesh = MeshBuilder.CreateBox('enemy', { size: 0.8 }, scene);
  mesh.position = pos.clone();
  
  // Give enemy a material so we can change its color
  const mat = new StandardMaterial(`enemy_${e}`, scene);
  mat.diffuseColor = new Color3(0.5, 0.5, 0.5); // Default gray for idle
  mesh.material = mat;
  
  const transform: Transform = { position: mesh.position.clone(), mesh };
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
let camera: ArcRotateCamera;
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
      // Show the dungeon modal
      const dModal = document.getElementById('dungeon-modal');
      if (dModal) dModal.classList.remove('hidden');
      return;
    }
    
    // If clicked dev chest, spawn test items
    const devChest = (window as any).devChest;
    if (currentScene === 'hideout' && devChest && pick.pickedMesh === devChest) {
      spawnDevItems();
      return;
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
    if (forwardVec.length() === 0) {
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
    let dir = targetPoint.subtract(origin);
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
    let dir = targetPoint.subtract(origin);
    dir.y = 0;
    if (dir.length() === 0) return;
    dir.normalize();
    spawnProjectile(origin, dir, dmg, 5);
  }
}

/** Helper to spawn a projectile entity travelling in the given
 *  direction. Damage and speed can be customised. */
function spawnProjectile(origin: Vector3, direction: Vector3, damage: number, lifeTime: number = 3): void {
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
    let dir = targetPoint.subtract(origin);
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
  // Create starter items based on player class
  if (playerClass === 'warrior') {
    const sword = createItem('iron_sword', [
      { stat: 'str', value: 10 },
      { stat: 'melee_pct', value: 8 },
    ], 'magic');
    addItemToInventory(sword);
  } else {
    const bow = createItem('short_bow', [
      { stat: 'dex', value: 10 },
      { stat: 'bow_pct', value: 8 },
    ], 'magic');
    addItemToInventory(bow);
  }
  
  // Add some universal items
  const belt = createItem('leather_belt', [
    { stat: 'hp_flat', value: 50 },
  ], 'normal');
  addItemToInventory(belt);
  
  const ring1 = createItem('gold_ring', [
    { stat: 'mp_flat', value: 30 },
  ], 'normal');
  addItemToInventory(ring1);
  
  const ring2 = createItem('mana_ring', [
    { stat: 'int', value: 15 },
    { stat: 'mp_flat', value: 40 },
  ], 'rare');
  addItemToInventory(ring2);
  
  const helmet = createItem('steel_helmet', [
    { stat: 'armor', value: 15 },
    { stat: 'str', value: 8 },
  ], 'magic');
  addItemToInventory(helmet);
  
  const chest = createItem('leather_chest', [
    { stat: 'hp_flat', value: 80 },
    { stat: 'armor', value: 25 },
  ], 'rare');
  addItemToInventory(chest);
  
  console.log('Dev items spawned! Press I to open inventory.');
}

// ---------------------------------------------------------------------
// Game loop
const timestepMs = 1000 / 60;
let gameLoopInterval: number | null = null;
let playtimeAccumulator = 0;

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
  
  // Update UI elements
  updateResourceOrbs();
  
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
  if (playerTransform) {
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
        } else {
          // Fallback: compute a target point 5 units ahead of the player
          const forwardVec = camera.target.subtract(camera.position);
          forwardVec.y = 0;
          if (forwardVec.length() === 0) return;
          forwardVec.normalize();
          target = transform.position.add(forwardVec.scale(5));
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
  setupHideout();
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
  console.log('Player appearance updated');
  
  // Start game loop
  startGameLoop();
  console.log('Game loop started');
  
  // Force an immediate render to ensure everything is visible
  scene.render();
  
  gameInitialized = true;
  console.log('Game initialization complete!');
  
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
  if (data?.slot !== undefined) {
    currentSlot = data.slot;
    // Store slot in window for the char create module to access
    (window as any).__charCreateSlot = data.slot;
  }
  // Feature flag: load PoE-style creator when enabled, otherwise fallback
  if (ENABLE_POE_STYLE_CREATOR) {
    await loadUI('/src/features/characterCreation/ui/index.html');
  } else {
    await loadUI('/ui/charCreate.html');
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

// Wait for DOM to be ready, then start the state machine
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    stateManager.transitionTo(GameState.MAIN_MENU);
  });
} else {
  // DOM already loaded
  stateManager.transitionTo(GameState.MAIN_MENU);
}