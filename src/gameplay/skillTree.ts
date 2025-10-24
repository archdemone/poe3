// Skill tree system - POE2-style talent tree with advanced mechanics

export type NodeType = 'start' | 'small' | 'major' | 'notable' | 'keystone' | 'mastery';
export type EffectOp = 'add' | 'mul' | 'more' | 'less' | 'set' | 'convert';
export type WeaponTag = 'sword' | 'axe' | 'mace' | 'dagger' | 'staff' | 'bow' | 'wand' | 'shield';

export interface Effect {
  stat: string;
  op: EffectOp;
  value: number;
  scope?: 'global' | 'weapon' | 'spell' | 'minion';
  condition?: EffectCondition;
}

export interface EffectCondition {
  type: 'weaponTag' | 'allocated' | 'attribute' | 'enemyState';
  value: any;
}

export interface NodeRequirement {
  type: 'attribute' | 'level' | 'node' | 'class';
  value: number;
  attribute?: 'str' | 'dex' | 'int';
  nodeId?: string;
}

export interface SkillNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: NodeType;
  effects: Effect[];
  requirements: NodeRequirement[];
  tags: string[]; // For categorization and filtering
  iconRef?: string;
  clusterId?: string;
  ringId?: number;
  classStart?: 'warrior' | 'archer' | 'mage';
  isClassStart?: boolean;
  description?: string;
  flavorText?: string;
  // Legacy support
  grants?: Array<{ stat: string; value: number }>;
  requires?: string[];
}

export interface SkillTreeData {
  nodes: SkillNode[];
  edges: Array<[string, string]>;
  metadata?: {
    version: string;
    totalNodes: number;
    lastUpdated: string;
  };
}

export interface TreeState {
  allocated: Set<string>;
  passivePoints: number;
  spent: number;
  // New fields for advanced mechanics
  weaponSpecializations?: Map<string, string[]>;
  classStartingNodes?: Map<string, string>;
  // Advanced keystone effects
  activeKeystones?: Set<string>;
  keystoneModifiers?: Map<string, any>;
}

export interface DerivedBonuses {
  // Attributes
  str: number;
  dex: number;
  int: number;

  // Resources
  hp_flat: number;
  mp_flat: number;
  energy_shield: number;

  // Offense
  melee_pct: number;
  bow_pct: number;
  spell_pct: number;
  crit_chance: number;
  crit_multiplier: number;
  attack_speed: number;
  cast_speed: number;
  accuracy: number;

  // Defense
  armor: number;
  evasion: number;
  block_chance: number;
  dodge_chance: number;
  stun_threshold: number;
  stun_duration: number;

  // Resistances
  fire_resistance: number;
  cold_resistance: number;
  lightning_resistance: number;
  chaos_resistance: number;

  // Utility
  movement_speed: number;
  mana_cost_reduction: number;
  mana_regen: number;
  minion_damage: number;
  totem_damage: number;
}

/** Global skill tree instance loaded from JSON */
let skillTreeData: SkillTreeData | null = null;
const treeState: TreeState = {
  allocated: new Set(['start']),
  passivePoints: 0,
  spent: 0,
  activeKeystones: new Set(),
  keystoneModifiers: new Map(),
};

/** Character context for requirement checking */
let characterContext: {
  level: number;
  class: 'warrior' | 'archer' | 'mage';
} = {
  level: 1,
  class: 'warrior',
};

/** Keystone effect manager for complex passive effects */
export class KeystoneManager {
  private keystoneEffects: Map<string, KeystoneEffect> = new Map();

  constructor() {
    this.registerKeystoneEffects();
  }

  private registerKeystoneEffects(): void {
    // Unbreakable - Cannot be stunned, +20% armor, +25 str, +60 hp
    this.registerKeystone('unbreakable', {
      name: 'Unbreakable',
      apply: (stats, allocatedNodes) => {
        return {
          ...stats,
          str: stats.str + 25,
          hp_flat: stats.hp_flat + 60,
          armor: stats.armor * 1.20, // 20% more armor
          stun_threshold: 0 // Cannot be stunned
        };
      },
      description: 'You cannot be stunned. 20% more Armor.'
    });

    // Titanic Strength - Immense strength and melee power
    this.registerKeystone('titanic_strength', {
      name: 'Titanic Strength',
      apply: (stats, allocatedNodes) => {
        return {
          ...stats,
          str: stats.str + 30,
          melee_pct: stats.melee_pct * 1.20, // 20% more melee damage
          stun_duration: stats.stun_duration * 0.50 // 50% less stun duration
        };
      },
      description: 'The earth trembles at your might'
    });

    // Wind Dancer - Unparalleled speed and evasion
    this.registerKeystone('wind_dancer', {
      name: 'Wind Dancer',
      apply: (stats, allocatedNodes) => {
        return {
          ...stats,
          dex: stats.dex + 30,
          movement_speed: stats.movement_speed + 15,
          dodge_chance: stats.dodge_chance + 10
        };
      },
      description: 'Dance with the wind, strike like lightning'
    });

    // Arcane Scholar - Master of arcane arts
    this.registerKeystone('arcane_scholar', {
      name: 'Arcane Scholar',
      apply: (stats, allocatedNodes) => {
        return {
          ...stats,
          int: stats.int + 30,
          spell_pct: stats.spell_pct * 1.20, // 20% more spell damage
          mana_regen: stats.mana_regen + 20
        };
      },
      description: 'Knowledge is the greatest power'
    });

    // Ascendant Power - Master of all elements, +20 all attributes, +50 hp/mp
    this.registerKeystone('ascendant_power', {
      name: 'Ascendant Power',
      apply: (stats, allocatedNodes) => {
        return {
          ...stats,
          str: stats.str + 20,
          dex: stats.dex + 20,
          int: stats.int + 20,
          hp_flat: stats.hp_flat + 50,
          mp_flat: stats.mp_flat + 50
        };
      },
      description: 'Master of all elements'
    });
  }

  private registerKeystone(nodeId: string, effect: KeystoneEffect): void {
    this.keystoneEffects.set(nodeId, effect);
  }

  applyKeystoneEffects(stats: DerivedBonuses, allocatedNodes: string[], treeData?: SkillTreeData): DerivedBonuses {
    let modifiedStats = { ...stats };

    for (const nodeId of allocatedNodes) {
      // Check if this node ID corresponds to a registered keystone effect
      const effect = this.keystoneEffects.get(nodeId);
      if (effect) {
        modifiedStats = effect.apply(modifiedStats, allocatedNodes);
      }
      // Alternative: check node type from tree data
      else if (treeData) {
        const node = treeData.nodes.find(n => n.id === nodeId);
        if (node?.type === 'keystone') {
          // Handle unregistered keystones (future extensibility)
          console.warn(`Unregistered keystone effect: ${nodeId}`);
        }
      }
    }

    return modifiedStats;
  }

  getKeystoneEffect(nodeId: string): KeystoneEffect | undefined {
    return this.keystoneEffects.get(nodeId);
  }

  getActiveKeystones(): string[] {
    return Array.from(treeState.activeKeystones || []);
  }
}

export interface KeystoneEffect {
  name: string;
  apply: (stats: DerivedBonuses, allocatedNodes: string[]) => DerivedBonuses;
  description: string;
}

/** Global keystone manager instance */
const keystoneManager = new KeystoneManager();

/** Load skill tree data from JSON */
export async function loadSkillTree(forceReload = false): Promise<SkillTreeData> {
  if (skillTreeData && !forceReload) return skillTreeData;

  try {
    // Try loading from large generated tree first
    let response = await fetch('/data/generated/poe2_skill_tree_large.json?v=' + Date.now());

    if (!response.ok) {
      console.log('Large tree not found, trying smaller POE2 tree');
      response = await fetch('/data/generated/poe2_skill_tree.json?v=' + Date.now());
    }

    if (!response.ok) {
      console.log('POE2 tree not found, falling back to legacy tree');
      response = await fetch('/data/skillTree.json');
    }

    if (!response.ok) {
      throw new Error(`Failed to load skill tree: ${response.statusText}`);
    }

    const rawData = await response.json();
    skillTreeData = rawData as SkillTreeData;

    // Handle metadata if present (new format)
    if (rawData.metadata) {
      console.log(`Loaded POE2 tree v${rawData.metadata.version} with ${rawData.metadata.totalNodes} nodes`);
    }

    // Initialize starting points from start node effects (new format) or grants (legacy)
    const startNode = skillTreeData.nodes.find(n => n.id === 'start');
    if (startNode) {
      // Try new effects format first
      const pointsEffect = startNode.effects?.find(e => e.stat === 'points');
      if (pointsEffect) {
        treeState.passivePoints = pointsEffect.value;
      } else {
        // Fallback to legacy grants format
        const pointsGrant = startNode.grants?.find(g => g.stat === 'points');
      if (pointsGrant) {
        treeState.passivePoints = pointsGrant.value;
        }
      }
    }
    
    console.log(`Skill tree loaded with ${skillTreeData.nodes.length} nodes and ${skillTreeData.edges.length} connections`);
    return skillTreeData;
  } catch (err) {
    console.error('Error loading skill tree:', err);
    throw err;
  }
}

/** Get the current skill tree data */
export function getSkillTree(): SkillTreeData | null {
  return skillTreeData;
}

/** Get current tree state */
export function getTreeState(): TreeState {
  return treeState;
}

/** Get a node by ID */
export function getNode(nodeId: string): SkillNode | undefined {
  return skillTreeData?.nodes.find(n => n.id === nodeId);
}

/** Check if a node can be allocated */
export function canAllocateNode(nodeId: string): boolean {
  const node = getNode(nodeId);
  if (!node) return false;
  if (treeState.allocated.has(nodeId)) return false;
  if (treeState.passivePoints <= 0) return false;
  
  // Check requirements (both legacy and new systems)
  if (!checkRequirements(node)) {
    return false;
  }

  return true;
}

/** Check if all requirements for a node are met */
function checkRequirements(node: SkillNode): boolean {
  // Check legacy requirements
  if (node.requires && node.requires.length > 0) {
    for (const reqId of node.requires) {
      if (!treeState.allocated.has(reqId)) {
        return false;
      }
    }
  }

  // Check new requirement system
  if (node.requirements && node.requirements.length > 0) {
    for (const req of node.requirements) {
      if (!checkRequirement(req)) {
        return false;
      }
    }
  }
  
  return true;
}

/** Check a single requirement */
function checkRequirement(req: NodeRequirement): boolean {
  switch (req.type) {
    case 'node':
      return treeState.allocated.has(String(req.value));

    case 'attribute':
      // Get current allocated stats
      const currentStats = computePassiveBonuses(getSkillTree()!);
      const currentValue = (currentStats as any)[req.attribute!];
      return currentValue >= req.value;

    case 'level':
      // Check character level
      return characterContext.level >= req.value;

    case 'class':
      // Check character class
      return characterContext.class === req.value;

    default:
      console.warn(`Unknown requirement type: ${req.type}`);
      return false;
  }
}

/** Allocate a node. Returns true if successful. */
export function allocateNode(nodeId: string): boolean {
  if (!canAllocateNode(nodeId)) return false;
  
  const node = getNode(nodeId);
  treeState.allocated.add(nodeId);
  treeState.passivePoints -= 1;
  treeState.spent += 1;

  // Handle keystone activation
  if (node?.type === 'keystone') {
    treeState.activeKeystones?.add(nodeId);
  }
  
  return true;
}

/** Check if a node can be refunded */
export function canRefundNode(nodeId: string): boolean {
  if (!treeState.allocated.has(nodeId)) return false;
  if (nodeId === 'start') return false; // Can't refund start
  
  // Check if any allocated nodes depend on this one
  if (!skillTreeData) return false;
  
  for (const node of skillTreeData.nodes) {
    if (treeState.allocated.has(node.id) && node.requires?.includes(nodeId)) {
      return false; // Has dependent allocated nodes
    }
  }
  
  return true;
}

/** Refund (deallocate) a node. Returns true if successful. */
export function refundNode(nodeId: string): boolean {
  if (!canRefundNode(nodeId)) return false;
  
  const node = getNode(nodeId);
  treeState.allocated.delete(nodeId);
  treeState.passivePoints += 1;
  treeState.spent -= 1;

  // Handle keystone deactivation
  if (node?.type === 'keystone') {
    treeState.activeKeystones?.delete(nodeId);
  }
  
  return true;
}

/** Deterministic stat calculator with POE2-style operation order */
export class StatCalculator {
  /**
   * Calculate final stats following deterministic order:
   * 1. Base stats → 2. Add → 3. Mul → 4. More/Less → 5. Convert → 6. Limit → 7. Round
   */
  calculate(
    character: any, // Character data
    equipment: any, // Equipment data
    allocatedNodes: string[],
    treeData?: SkillTreeData // Optional tree data for testing
  ): DerivedBonuses {
    // Use provided tree data or global data
    const data = treeData || skillTreeData;
    if (!data) {
      throw new Error('No skill tree data available');
    }

    // 1. Start with base character stats
    let stats = this.getBaseStats(character);

    // 2. Apply additive bonuses from nodes
    stats = this.applyAdditiveBonuses(stats, allocatedNodes, data);

    // 3. Apply multiplicative scaling
    stats = this.applyMultiplicativeBonuses(stats, allocatedNodes, data);

    // 4. Apply "more/less" multipliers (ARPG style)
    stats = this.applyMoreLessBonuses(stats, allocatedNodes, data);

    // 5. Handle stat conversions
    stats = this.applyConversions(stats, allocatedNodes);

    // 6. Apply keystone effects
    stats = keystoneManager.applyKeystoneEffects(stats, allocatedNodes, data);

    // 7. Apply limits and caps
    stats = this.applyLimits(stats);

    // 8. Round final values
    stats = this.roundValues(stats);

    return stats;
  }

  private getBaseStats(character: any): DerivedBonuses {
    // Get base stats from character class
    const baseStats: DerivedBonuses = {
      str: character.strength || 10,
      dex: character.dexterity || 10,
      int: character.intelligence || 10,
      hp_flat: character.maxHp || 100,
      mp_flat: character.maxMp || 50,
      energy_shield: 0,
      melee_pct: 0,
      bow_pct: 0,
      spell_pct: 0,
      crit_chance: 5, // 5% base crit
      crit_multiplier: 150, // 150% base multiplier
      attack_speed: 100,
      cast_speed: 100,
      accuracy: 100, // Base accuracy
      armor: character.armor || 0,
      evasion: character.evasion || 0,
      block_chance: 0,
      dodge_chance: 0,
      stun_threshold: 100, // 100% base threshold
      stun_duration: 100, // 100% base duration
      fire_resistance: 0,
      cold_resistance: 0,
      lightning_resistance: 0,
      chaos_resistance: 0,
      movement_speed: 100,
      mana_cost_reduction: 0,
      mana_regen: 1, // Base 1 mp/s
      minion_damage: 0,
      totem_damage: 0,
    };
    return baseStats;
  }

  private applyAdditiveBonuses(stats: DerivedBonuses, allocatedNodes: string[], treeData: SkillTreeData): DerivedBonuses {
    const newStats = { ...stats };
    const nodes = treeData.nodes || [];

    for (const nodeId of allocatedNodes) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Handle legacy grants for backward compatibility
      if (node.grants) {
      for (const grant of node.grants) {
          this.applyEffect(newStats, { stat: grant.stat, op: 'add', value: grant.value });
        }
      }

      // Handle new effects
      for (const effect of node.effects || []) {
        if (effect.op === 'add') {
          this.applyEffect(newStats, effect);
        }
      }
    }

    return newStats;
  }

  private applyMultiplicativeBonuses(stats: DerivedBonuses, allocatedNodes: string[], treeData: SkillTreeData): DerivedBonuses {
    const newStats = { ...stats };
    const nodes = treeData.nodes || [];

    for (const nodeId of allocatedNodes) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      for (const effect of node.effects || []) {
        if (effect.op === 'mul') {
          this.applyEffect(newStats, effect);
        }
      }
    }

    return newStats;
  }

  private applyMoreLessBonuses(stats: DerivedBonuses, allocatedNodes: string[], treeData: SkillTreeData): DerivedBonuses {
    const newStats = { ...stats };
    const nodes = treeData.nodes || [];

    for (const nodeId of allocatedNodes) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      for (const effect of node.effects || []) {
        if (effect.op === 'more' || effect.op === 'less') {
          this.applyEffect(newStats, effect);
        }
      }
    }

    return newStats;
  }

  private applyConversions(stats: DerivedBonuses, allocatedNodes: string[]): DerivedBonuses {
    // Convert operations - more complex, implement later
    return stats;
  }

  private applyLimits(stats: DerivedBonuses): DerivedBonuses {
    const newStats = { ...stats };

    // Apply reasonable caps
    newStats.crit_chance = Math.min(newStats.crit_chance, 95); // Max 95% crit
    newStats.block_chance = Math.min(newStats.block_chance, 75); // Max 75% block

    // Resistance caps (POE2 style)
    const resistanceStats = ['fire_resistance', 'cold_resistance', 'lightning_resistance', 'chaos_resistance'];
    for (const stat of resistanceStats) {
      (newStats as any)[stat] = Math.min((newStats as any)[stat], 75);
    }

    return newStats;
  }

  private roundValues(stats: DerivedBonuses): DerivedBonuses {
    const newStats = { ...stats };

    // Round to integers
    for (const key in newStats) {
      if (typeof (newStats as any)[key] === 'number') {
        (newStats as any)[key] = Math.round((newStats as any)[key]);
      }
    }

    return newStats;
  }

  private applyEffect(stats: DerivedBonuses, effect: Effect): void {
    const statKey = effect.stat as keyof DerivedBonuses;

    if (!(statKey in stats)) {
      console.warn(`Unknown stat: ${effect.stat}`);
      return;
    }

    const currentValue = (stats as any)[statKey];

    switch (effect.op) {
      case 'add':
        (stats as any)[statKey] = currentValue + effect.value;
        break;
      case 'mul':
        (stats as any)[statKey] = currentValue * (1 + effect.value / 100);
        break;
      case 'more':
        (stats as any)[statKey] = currentValue * (1 + effect.value / 100);
        break;
      case 'less':
        (stats as any)[statKey] = currentValue * (1 - effect.value / 100);
        break;
      case 'set':
        (stats as any)[statKey] = effect.value;
        break;
      default:
        console.warn(`Unsupported effect operation: ${effect.op}`);
    }
  }
}

/** Legacy function for backward compatibility */
export function computePassiveBonuses(data: SkillTreeData): DerivedBonuses {
  const calculator = new StatCalculator();

  // Create mock character data
  const mockCharacter = {
    strength: 10,
    dexterity: 10,
    intelligence: 10,
    maxHp: 100,
    maxMp: 50,
    armor: 0,
    evasion: 0,
  };

  return calculator.calculate(mockCharacter, {}, Array.from(treeState.allocated), data);
}

/** Get all allocated node IDs for saving */
export function getAllocatedNodeIds(): string[] {
  return Array.from(treeState.allocated);
}

/** Get active keystones */
export function getActiveKeystones(): string[] {
  return keystoneManager.getActiveKeystones();
}

/** Get keystone effect by node ID */
export function getKeystoneEffect(nodeId: string): KeystoneEffect | undefined {
  return keystoneManager.getKeystoneEffect(nodeId);
}

/** Set allocated nodes from a saved list of IDs */
export function setAllocatedNodes(nodeIds: string[]): void {
  treeState.allocated = new Set(nodeIds);
  treeState.spent = nodeIds.filter(id => id !== 'start').length;

  // Reactivate keystones
  treeState.activeKeystones?.clear();
  for (const nodeId of nodeIds) {
    const node = getNode(nodeId);
    if (node?.type === 'keystone') {
      treeState.activeKeystones?.add(nodeId);
    }
  }
}

/** Set available passive points */
export function setPassivePoints(points: number): void {
  treeState.passivePoints = points;
}

/** Set character context for requirement checking */
export function setCharacterContext(level: number, characterClass: 'warrior' | 'archer' | 'mage'): void {
  characterContext.level = level;
  characterContext.class = characterClass;
}

/** Get current character context */
export function getCharacterContext(): { level: number; class: 'warrior' | 'archer' | 'mage' } {
  return { ...characterContext };
}

/** Reset all nodes except start */
export function resetTree(): void {
  const pointsToReturn = treeState.spent;
  treeState.allocated = new Set(['start']);
  treeState.spent = 0;
  treeState.passivePoints += pointsToReturn;
}


