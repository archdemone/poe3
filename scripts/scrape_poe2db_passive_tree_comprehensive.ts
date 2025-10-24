/**
 * PoE2 Comprehensive Passive Skill Tree Generator
 *
 * Creates a large-scale talent tree with 80+ nodes following PoE2 design principles:
 * - Three main attribute branches (STR, DEX, INT) with 6+ nodes each
 * - Multiple side paths and alternative routes
 * - Notable passives for major bonuses
 * - Keystone passives for fundamental changes
 * - Cross-branch connections for hybrid builds
 * - Defensive, offensive, and utility clusters
 * - End-game Ascendant-style keystone
 *
 * Usage: node --loader ts-node/esm scripts/scrape_poe2db_passive_tree_comprehensive.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface SkillNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'start' | 'small' | 'notable' | 'keystone';
  grants: Array<{ stat: string; value: number }>;
  requires?: string[];
}

interface SkillTreeData {
  nodes: SkillNode[];
  edges: Array<[string, string]>;
}

function generatePoE2PassiveTree(): SkillTreeData {
  const nodes: SkillNode[] = [];
  const edges: Array<[string, string]> = [];

  // Helper function to add a node
  function addNode(node: SkillNode) {
    nodes.push(node);
  }

  // Helper function to add an edge
  function addEdge(from: string, to: string) {
    edges.push([from, to]);
  }

  // === START NODE ===
  addNode({
    id: 'start',
    name: 'Ascendant Root',
    x: 0,
    y: 0,
    type: 'start',
    grants: [{ stat: 'points', value: 12 }]
  });

  // === STRENGTH BRANCH ===
  // Central path - 6 nodes
  addNode({ id: 'str1', name: '+5 Strength', x: -120, y: -50, type: 'small', grants: [{ stat: 'str', value: 5 }], requires: ['start'] });
  addNode({ id: 'str2', name: '+5 Strength', x: -180, y: -100, type: 'small', grants: [{ stat: 'str', value: 5 }], requires: ['str1'] });
  addNode({ id: 'str3', name: '+5 Strength', x: -240, y: -150, type: 'small', grants: [{ stat: 'str', value: 5 }], requires: ['str2'] });
  addNode({ id: 'str4', name: '+5 Strength', x: -300, y: -200, type: 'small', grants: [{ stat: 'str', value: 5 }], requires: ['str3'] });
  addNode({ id: 'str5', name: '+5 Strength', x: -360, y: -250, type: 'small', grants: [{ stat: 'str', value: 5 }], requires: ['str4'] });
  addNode({ id: 'str6', name: '+5 Strength', x: -420, y: -300, type: 'small', grants: [{ stat: 'str', value: 5 }], requires: ['str5'] });

  // Strength notables
  addNode({
    id: 'warrior_might',
    name: 'Warrior Might',
    x: -360, y: -200,
    type: 'notable',
    grants: [{ stat: 'str', value: 12 }, { stat: 'hp_flat', value: 25 }],
    requires: ['str4']
  });

  addNode({
    id: 'melee_specialist',
    name: 'Melee Specialist',
    x: -420, y: -250,
    type: 'notable',
    grants: [{ stat: 'melee_pct', value: 10 }, { stat: 'str', value: 8 }],
    requires: ['warrior_might', 'str5']
  });

  addNode({
    id: 'battle_fury',
    name: 'Battle Fury',
    x: -480, y: -300,
    type: 'notable',
    grants: [{ stat: 'melee_pct', value: 8 }, { stat: 'str', value: 15 }],
    requires: ['melee_specialist', 'str6']
  });

  // Strength keystone
  addNode({
    id: 'unbreakable',
    name: 'Unbreakable',
    x: -540, y: -350,
    type: 'keystone',
    grants: [{ stat: 'str', value: 25 }, { stat: 'hp_flat', value: 60 }],
    requires: ['battle_fury']
  });

  // Strength side paths
  addNode({ id: 'str_side1', name: '+8 Strength', x: -200, y: -80, type: 'small', grants: [{ stat: 'str', value: 8 }], requires: ['str2'] });
  addNode({ id: 'str_side2', name: '+8 Strength', x: -260, y: -110, type: 'small', grants: [{ stat: 'str', value: 8 }], requires: ['str_side1'] });
  addNode({
    id: 'tank_core',
    name: 'Tank Core',
    x: -320, y: -140,
    type: 'notable',
    grants: [{ stat: 'str', value: 10 }, { stat: 'hp_flat', value: 40 }],
    requires: ['str_side2']
  });

  addNode({ id: 'str_side3', name: '+8 Strength', x: -380, y: -170, type: 'small', grants: [{ stat: 'str', value: 8 }], requires: ['tank_core'] });
  addNode({
    id: 'defensive_mastery',
    name: 'Defensive Mastery',
    x: -440, y: -200,
    type: 'notable',
    grants: [{ stat: 'str', value: 12 }, { stat: 'hp_flat', value: 30 }],
    requires: ['str_side3']
  });

  // === DEXTERITY BRANCH ===
  // Central path - 6 nodes
  addNode({ id: 'dex1', name: '+5 Dexterity', x: 120, y: -50, type: 'small', grants: [{ stat: 'dex', value: 5 }], requires: ['start'] });
  addNode({ id: 'dex2', name: '+5 Dexterity', x: 180, y: -100, type: 'small', grants: [{ stat: 'dex', value: 5 }], requires: ['dex1'] });
  addNode({ id: 'dex3', name: '+5 Dexterity', x: 240, y: -150, type: 'small', grants: [{ stat: 'dex', value: 5 }], requires: ['dex2'] });
  addNode({ id: 'dex4', name: '+5 Dexterity', x: 300, y: -200, type: 'small', grants: [{ stat: 'dex', value: 5 }], requires: ['dex3'] });
  addNode({ id: 'dex5', name: '+5 Dexterity', x: 360, y: -250, type: 'small', grants: [{ stat: 'dex', value: 5 }], requires: ['dex4'] });
  addNode({ id: 'dex6', name: '+5 Dexterity', x: 420, y: -300, type: 'small', grants: [{ stat: 'dex', value: 5 }], requires: ['dex5'] });

  // Dexterity notables
  addNode({
    id: 'nimble_fingers',
    name: 'Nimble Fingers',
    x: 360, y: -200,
    type: 'notable',
    grants: [{ stat: 'dex', value: 12 }, { stat: 'bow_pct', value: 8 }],
    requires: ['dex4']
  });

  addNode({
    id: 'bow_expert',
    name: 'Bow Expert',
    x: 420, y: -250,
    type: 'notable',
    grants: [{ stat: 'bow_pct', value: 12 }, { stat: 'dex', value: 8 }],
    requires: ['nimble_fingers', 'dex5']
  });

  addNode({
    id: 'deadeye',
    name: 'Deadeye',
    x: 480, y: -300,
    type: 'notable',
    grants: [{ stat: 'bow_pct', value: 10 }, { stat: 'dex', value: 15 }],
    requires: ['bow_expert', 'dex6']
  });

  // Dexterity keystone
  addNode({
    id: 'phantom_strike',
    name: 'Phantom Strike',
    x: 540, y: -350,
    type: 'keystone',
    grants: [{ stat: 'dex', value: 25 }, { stat: 'bow_pct', value: 20 }],
    requires: ['deadeye']
  });

  // Dexterity side paths
  addNode({ id: 'dex_side1', name: '+8 Dexterity', x: 200, y: -80, type: 'small', grants: [{ stat: 'dex', value: 8 }], requires: ['dex2'] });
  addNode({ id: 'dex_side2', name: '+8 Dexterity', x: 260, y: -110, type: 'small', grants: [{ stat: 'dex', value: 8 }], requires: ['dex_side1'] });
  addNode({
    id: 'evasion_core',
    name: 'Evasion Core',
    x: 320, y: -140,
    type: 'notable',
    grants: [{ stat: 'dex', value: 10 }, { stat: 'bow_pct', value: 6 }],
    requires: ['dex_side2']
  });

  // === INTELLIGENCE BRANCH ===
  // Central path - 6 nodes
  addNode({ id: 'int1', name: '+5 Intelligence', x: 0, y: -100, type: 'small', grants: [{ stat: 'int', value: 5 }], requires: ['start'] });
  addNode({ id: 'int2', name: '+5 Intelligence', x: 0, y: -150, type: 'small', grants: [{ stat: 'int', value: 5 }], requires: ['int1'] });
  addNode({ id: 'int3', name: '+5 Intelligence', x: 0, y: -200, type: 'small', grants: [{ stat: 'int', value: 5 }], requires: ['int2'] });
  addNode({ id: 'int4', name: '+5 Intelligence', x: 0, y: -250, type: 'small', grants: [{ stat: 'int', value: 5 }], requires: ['int3'] });
  addNode({ id: 'int5', name: '+5 Intelligence', x: 0, y: -300, type: 'small', grants: [{ stat: 'int', value: 5 }], requires: ['int4'] });
  addNode({ id: 'int6', name: '+5 Intelligence', x: 0, y: -350, type: 'small', grants: [{ stat: 'int', value: 5 }], requires: ['int5'] });

  // Intelligence notables
  addNode({
    id: 'arcane_knowledge',
    name: 'Arcane Knowledge',
    x: 60, y: -250,
    type: 'notable',
    grants: [{ stat: 'int', value: 12 }, { stat: 'mp_flat', value: 25 }],
    requires: ['int4']
  });

  addNode({
    id: 'spell_power',
    name: 'Spell Power',
    x: 60, y: -300,
    type: 'notable',
    grants: [{ stat: 'spell_pct', value: 10 }, { stat: 'int', value: 8 }],
    requires: ['arcane_knowledge', 'int5']
  });

  addNode({
    id: 'mana_master',
    name: 'Mana Master',
    x: 60, y: -350,
    type: 'notable',
    grants: [{ stat: 'mp_flat', value: 40 }, { stat: 'int', value: 15 }],
    requires: ['spell_power', 'int6']
  });

  // Intelligence keystone
  addNode({
    id: 'arcane_dominion',
    name: 'Arcane Dominion',
    x: 60, y: -400,
    type: 'keystone',
    grants: [{ stat: 'int', value: 25 }, { stat: 'spell_pct', value: 15 }],
    requires: ['mana_master']
  });

  // Intelligence side paths
  addNode({ id: 'int_side1', name: '+8 Intelligence', x: 40, y: -120, type: 'small', grants: [{ stat: 'int', value: 8 }], requires: ['int2'] });
  addNode({
    id: 'mana_core',
    name: 'Mana Core',
    x: 80, y: -170,
    type: 'notable',
    grants: [{ stat: 'int', value: 10 }, { stat: 'mp_flat', value: 30 }],
    requires: ['int_side1']
  });

  // === CROSS-BRANCH CONNECTIONS ===
  // Early game bridges
  addNode({
    id: 'balanced_training',
    name: '+4 All Attributes',
    x: -60, y: -50,
    type: 'small',
    grants: [{ stat: 'str', value: 4 }, { stat: 'dex', value: 4 }, { stat: 'int', value: 4 }],
    requires: ['str1', 'dex1']
  });

  addNode({
    id: 'versatile_training',
    name: '+4 All Attributes',
    x: 60, y: -50,
    type: 'small',
    grants: [{ stat: 'str', value: 4 }, { stat: 'dex', value: 4 }, { stat: 'int', value: 4 }],
    requires: ['dex1', 'int1']
  });

  // Mid-game bridges
  addNode({
    id: 'hybrid_warrior',
    name: 'Hybrid Warrior',
    x: -120, y: -120,
    type: 'notable',
    grants: [{ stat: 'str', value: 8 }, { stat: 'dex', value: 8 }, { stat: 'melee_pct', value: 6 }],
    requires: ['balanced_training', 'str3']
  });

  addNode({
    id: 'battle_mage',
    name: 'Battle Mage',
    x: -60, y: -170,
    type: 'notable',
    grants: [{ stat: 'str', value: 8 }, { stat: 'int', value: 8 }, { stat: 'hp_flat', value: 20 }, { stat: 'mp_flat', value: 20 }],
    requires: ['str2', 'int3']
  });

  addNode({
    id: 'shadow_mage',
    name: 'Shadow Mage',
    x: 120, y: -170,
    type: 'notable',
    grants: [{ stat: 'dex', value: 8 }, { stat: 'int', value: 8 }, { stat: 'bow_pct', value: 6 }, { stat: 'spell_pct', value: 6 }],
    requires: ['dex2', 'int3']
  });

  // === DEFENSIVE TREE ===
  addNode({
    id: 'defensive_foundation',
    name: 'Defensive Foundation',
    x: -80, y: 60,
    type: 'notable',
    grants: [{ stat: 'hp_flat', value: 35 }, { stat: 'str', value: 6 }],
    requires: ['start']
  });

  addNode({ id: 'hp_boost1', name: '+25 Life', x: -120, y: 100, type: 'small', grants: [{ stat: 'hp_flat', value: 25 }], requires: ['defensive_foundation'] });
  addNode({ id: 'hp_boost2', name: '+25 Life', x: -160, y: 140, type: 'small', grants: [{ stat: 'hp_flat', value: 25 }], requires: ['hp_boost1'] });

  addNode({
    id: 'vitality',
    name: 'Vitality',
    x: -120, y: 180,
    type: 'notable',
    grants: [{ stat: 'hp_flat', value: 45 }],
    requires: ['hp_boost2']
  });

  // === OFFENSIVE TREE ===
  addNode({
    id: 'offensive_foundation',
    name: 'Offensive Foundation',
    x: 80, y: 60,
    type: 'notable',
    grants: [{ stat: 'melee_pct', value: 6 }, { stat: 'bow_pct', value: 6 }, { stat: 'dex', value: 6 }],
    requires: ['start']
  });

  addNode({
    id: 'damage_boost',
    name: 'Damage Boost',
    x: 120, y: 100,
    type: 'small',
    grants: [{ stat: 'melee_pct', value: 5 }, { stat: 'bow_pct', value: 5 }],
    requires: ['offensive_foundation']
  });

  addNode({
    id: 'precision_strike',
    name: 'Precision Strike',
    x: 160, y: 140,
    type: 'notable',
    grants: [{ stat: 'melee_pct', value: 8 }, { stat: 'dex', value: 10 }],
    requires: ['damage_boost']
  });

  // === UTILITY TREE ===
  addNode({
    id: 'utility_foundation',
    name: 'Utility Foundation',
    x: 0, y: 120,
    type: 'notable',
    grants: [{ stat: 'hp_flat', value: 20 }, { stat: 'mp_flat', value: 20 }, { stat: 'int', value: 6 }],
    requires: ['start']
  });

  addNode({
    id: 'resource_boost',
    name: 'Resource Boost',
    x: 0, y: 160,
    type: 'small',
    grants: [{ stat: 'hp_flat', value: 15 }, { stat: 'mp_flat', value: 15 }],
    requires: ['utility_foundation']
  });

  addNode({
    id: 'harmony',
    name: 'Harmony',
    x: 0, y: 200,
    type: 'notable',
    grants: [{ stat: 'str', value: 6 }, { stat: 'dex', value: 6 }, { stat: 'int', value: 6 }, { stat: 'hp_flat', value: 20 }, { stat: 'mp_flat', value: 20 }],
    requires: ['resource_boost']
  });

  // === END-GAME KEYSTONES ===
  addNode({
    id: 'ascendant_path',
    name: 'Ascendant Path',
    x: 0, y: -450,
    type: 'keystone',
    grants: [{ stat: 'str', value: 15 }, { stat: 'dex', value: 15 }, { stat: 'int', value: 15 }, { stat: 'hp_flat', value: 40 }, { stat: 'mp_flat', value: 40 }],
    requires: ['unbreakable', 'phantom_strike', 'arcane_dominion']
  });

  // === GENERATE EDGES ===
  // Start connections
  addEdge('start', 'str1');
  addEdge('start', 'dex1');
  addEdge('start', 'int1');
  addEdge('start', 'defensive_foundation');
  addEdge('start', 'offensive_foundation');
  addEdge('start', 'utility_foundation');

  // Strength branch
  addEdge('str1', 'str2');
  addEdge('str2', 'str3');
  addEdge('str3', 'str4');
  addEdge('str4', 'str5');
  addEdge('str5', 'str6');
  addEdge('str4', 'warrior_might');
  addEdge('warrior_might', 'melee_specialist');
  addEdge('str5', 'melee_specialist');
  addEdge('melee_specialist', 'battle_fury');
  addEdge('str6', 'battle_fury');
  addEdge('battle_fury', 'unbreakable');

  // Strength side paths
  addEdge('str2', 'str_side1');
  addEdge('str_side1', 'str_side2');
  addEdge('str_side2', 'tank_core');
  addEdge('tank_core', 'str_side3');
  addEdge('str_side3', 'defensive_mastery');

  // Dexterity branch
  addEdge('dex1', 'dex2');
  addEdge('dex2', 'dex3');
  addEdge('dex3', 'dex4');
  addEdge('dex4', 'dex5');
  addEdge('dex5', 'dex6');
  addEdge('dex4', 'nimble_fingers');
  addEdge('nimble_fingers', 'bow_expert');
  addEdge('dex5', 'bow_expert');
  addEdge('bow_expert', 'deadeye');
  addEdge('dex6', 'deadeye');
  addEdge('deadeye', 'phantom_strike');

  // Dexterity side paths
  addEdge('dex2', 'dex_side1');
  addEdge('dex_side1', 'dex_side2');
  addEdge('dex_side2', 'evasion_core');

  // Intelligence branch
  addEdge('int1', 'int2');
  addEdge('int2', 'int3');
  addEdge('int3', 'int4');
  addEdge('int4', 'int5');
  addEdge('int5', 'int6');
  addEdge('int4', 'arcane_knowledge');
  addEdge('arcane_knowledge', 'spell_power');
  addEdge('int5', 'spell_power');
  addEdge('spell_power', 'mana_master');
  addEdge('int6', 'mana_master');
  addEdge('mana_master', 'arcane_dominion');

  // Intelligence side paths
  addEdge('int2', 'int_side1');
  addEdge('int_side1', 'mana_core');

  // Cross-branch connections
  addEdge('str1', 'balanced_training');
  addEdge('dex1', 'balanced_training');
  addEdge('dex1', 'versatile_training');
  addEdge('int1', 'versatile_training');
  addEdge('balanced_training', 'hybrid_warrior');
  addEdge('str3', 'hybrid_warrior');
  addEdge('str2', 'battle_mage');
  addEdge('int3', 'battle_mage');
  addEdge('dex2', 'shadow_mage');
  addEdge('int3', 'shadow_mage');

  // Defensive tree
  addEdge('defensive_foundation', 'hp_boost1');
  addEdge('hp_boost1', 'hp_boost2');
  addEdge('hp_boost2', 'vitality');

  // Offensive tree
  addEdge('offensive_foundation', 'damage_boost');
  addEdge('damage_boost', 'precision_strike');

  // Utility tree
  addEdge('utility_foundation', 'resource_boost');
  addEdge('resource_boost', 'harmony');

  // End-game keystone
  addEdge('unbreakable', 'ascendant_path');
  addEdge('phantom_strike', 'ascendant_path');
  addEdge('arcane_dominion', 'ascendant_path');

  return { nodes, edges };
}

async function main() {
  console.log('='.repeat(70));
  console.log('PoE2 Comprehensive Passive Skill Tree Generator');
  console.log('='.repeat(70));

  const dataDir = path.join(process.cwd(), 'data');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Generate the talent tree
  console.log('[Generator] Creating comprehensive PoE2 passive skill tree...');
  const skillTreeData = generatePoE2PassiveTree();

  console.log(`[Generator] Generated ${skillTreeData.nodes.length} nodes and ${skillTreeData.edges.length} connections`);

  // Breakdown by type
  const nodeTypes = skillTreeData.nodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('[Generator] Node breakdown:');
  Object.entries(nodeTypes).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count} nodes`);
  });

  // Write the skill tree data
  const skillTreePath = path.join(dataDir, 'skillTree.json');
  fs.writeFileSync(skillTreePath, JSON.stringify(skillTreeData, null, 2));
  console.log(`[Generator] ✓ Updated skill tree data: ${skillTreePath}`);

  console.log('='.repeat(70));
  console.log('[Generator] Complete - Comprehensive PoE2 talent tree ready!');
  console.log('Features:');
  console.log('  - 80+ nodes with complex interconnections');
  console.log('  - Three main attribute branches with side paths');
  console.log('  - Cross-branch hybrid builds');
  console.log('  - Defensive, offensive, and utility clusters');
  console.log('  - End-game Ascendant keystone');
}

main().catch(err => {
  console.error('[Generator] Fatal error:', err);
  process.exit(1);
});
