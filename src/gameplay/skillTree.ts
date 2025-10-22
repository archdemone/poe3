// Skill tree system - passive node allocation with stat bonuses

export interface SkillNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'start' | 'small' | 'notable';
  grants: Array<{ stat: string; value: number }>;
  requires?: string[];
}

export interface SkillTreeData {
  nodes: SkillNode[];
  edges: Array<[string, string]>;
}

export interface TreeState {
  allocated: Set<string>;
  passivePoints: number; // available to spend
  spent: number;         // total spent
}

export interface DerivedBonuses {
  str: number;
  dex: number;
  int: number;
  hp_flat: number;
  mp_flat: number;
  melee_pct: number;
  bow_pct: number;
}

/** Global skill tree instance loaded from JSON */
let skillTreeData: SkillTreeData | null = null;
const treeState: TreeState = {
  allocated: new Set(['start']),
  passivePoints: 0,
  spent: 0,
};

/** Load skill tree data from JSON */
export async function loadSkillTree(): Promise<SkillTreeData> {
  if (skillTreeData) return skillTreeData;
  
  try {
    const response = await fetch('/data/skillTree.json');
    if (!response.ok) {
      throw new Error(`Failed to load skill tree: ${response.statusText}`);
    }
    skillTreeData = await response.json() as SkillTreeData;
    
    // Initialize starting points from start node grants
    const startNode = skillTreeData.nodes.find(n => n.id === 'start');
    if (startNode) {
      const pointsGrant = startNode.grants.find(g => g.stat === 'points');
      if (pointsGrant) {
        treeState.passivePoints = pointsGrant.value;
      }
    }
    
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
  
  // Check if all required nodes are allocated
  if (node.requires && node.requires.length > 0) {
    for (const reqId of node.requires) {
      if (!treeState.allocated.has(reqId)) {
        return false;
      }
    }
  }
  
  return true;
}

/** Allocate a node. Returns true if successful. */
export function allocateNode(nodeId: string): boolean {
  if (!canAllocateNode(nodeId)) return false;
  
  treeState.allocated.add(nodeId);
  treeState.passivePoints -= 1;
  treeState.spent += 1;
  
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
  
  treeState.allocated.delete(nodeId);
  treeState.passivePoints += 1;
  treeState.spent -= 1;
  
  return true;
}

/** Compute all passive bonuses from allocated nodes */
export function computePassiveBonuses(data: SkillTreeData): DerivedBonuses {
  const bonuses: DerivedBonuses = {
    str: 0,
    dex: 0,
    int: 0,
    hp_flat: 0,
    mp_flat: 0,
    melee_pct: 0,
    bow_pct: 0,
  };
  
  for (const node of data.nodes) {
    if (treeState.allocated.has(node.id)) {
      for (const grant of node.grants) {
        switch (grant.stat) {
          case 'str':
            bonuses.str += grant.value;
            break;
          case 'dex':
            bonuses.dex += grant.value;
            break;
          case 'int':
            bonuses.int += grant.value;
            break;
          case 'hp_flat':
            bonuses.hp_flat += grant.value;
            break;
          case 'mp_flat':
            bonuses.mp_flat += grant.value;
            break;
          case 'melee_pct':
            bonuses.melee_pct += grant.value;
            break;
          case 'bow_pct':
            bonuses.bow_pct += grant.value;
            break;
        }
      }
    }
  }
  
  return bonuses;
}

/** Get all allocated node IDs for saving */
export function getAllocatedNodeIds(): string[] {
  return Array.from(treeState.allocated);
}

/** Set allocated nodes from a saved list of IDs */
export function setAllocatedNodes(nodeIds: string[]): void {
  treeState.allocated = new Set(nodeIds);
  treeState.spent = nodeIds.filter(id => id !== 'start').length;
}

/** Set available passive points */
export function setPassivePoints(points: number): void {
  treeState.passivePoints = points;
}

/** Reset all nodes except start */
export function resetTree(): void {
  const pointsToReturn = treeState.spent;
  treeState.allocated = new Set(['start']);
  treeState.spent = 0;
  treeState.passivePoints += pointsToReturn;
}


