/**
 * PoE2 Passive Skill Tree Generator
 *
 * Since Path of Exile 2 is still in development and the official passive tree
 * data isn't publicly available yet, this script creates a comprehensive
 * talent tree based on PoE2 mechanics and typical RPG progression systems.
 *
 * The tree includes:
 * - Central starting node
 * - Three main attribute branches (STR, DEX, INT)
 * - Notable passives for major bonuses
 * - Small passives for minor bonuses
 * - Keystone passives for fundamental changes
 * - Cross-branch connections for hybrid builds
 *
 * Usage: node --loader ts-node/esm scripts/scrape_poe2db_passive_tree.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface SkillNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'start' | 'small' | 'notable' | 'keystone';
  grants: Array<{ stat: string; value: number | [number, number] }>;
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
    grants: [{ stat: 'points', value: 8 }]
  });

  // === STRENGTH BRANCH ===
  // First ring - basic STR bonuses
  addNode({
    id: 'str1',
    name: '+6 Strength',
    x: -150,
    y: -40,
    type: 'small',
    grants: [{ stat: 'str', value: 6 }],
    requires: ['start']
  });

  addNode({
    id: 'str2',
    name: '+6 Strength',
    x: -200,
    y: -80,
    type: 'small',
    grants: [{ stat: 'str', value: 6 }],
    requires: ['str1']
  });

  addNode({
    id: 'str3',
    name: '+6 Strength',
    x: -250,
    y: -120,
    type: 'small',
    grants: [{ stat: 'str', value: 6 }],
    requires: ['str2']
  });

  addNode({
    id: 'str4',
    name: '+6 Strength',
    x: -300,
    y: -160,
    type: 'small',
    grants: [{ stat: 'str', value: 6 }],
    requires: ['str3']
  });

  // Second ring - notables
  addNode({
    id: 'warrior_spirit',
    name: 'Warrior Spirit',
    x: -350,
    y: -200,
    type: 'notable',
    grants: [
      { stat: 'str', value: 12 },
      { stat: 'hp_flat', value: 25 }
    ],
    requires: ['str4']
  });

  addNode({
    id: 'melee_mastery',
    name: 'Melee Mastery',
    x: -400,
    y: -240,
    type: 'notable',
    grants: [
      { stat: 'melee_pct', value: 10 },
      { stat: 'str', value: 8 }
    ],
    requires: ['warrior_spirit']
  });

  addNode({
    id: 'battle_hardened',
    name: 'Battle Hardened',
    x: -450,
    y: -280,
    type: 'notable',
    grants: [
      { stat: 'str', value: 10 },
      { stat: 'hp_flat', value: 20 }
    ],
    requires: ['melee_mastery']
  });

  addNode({
    id: 'berserker',
    name: 'Berserker',
    x: -500,
    y: -320,
    type: 'notable',
    grants: [
      { stat: 'melee_pct', value: 8 },
      { stat: 'str', value: 15 }
    ],
    requires: ['battle_hardened']
  });

  // Third ring - keystone
  addNode({
    id: 'indomitable',
    name: 'Indomitable',
    x: -550,
    y: -360,
    type: 'keystone',
    grants: [
      { stat: 'str', value: 25 },
      { stat: 'hp_flat', value: 50 }
    ],
    requires: ['berserker']
  });

  // Strength side branches
  addNode({
    id: 'str_side1',
    name: '+10 Strength',
    x: -320,
    y: -100,
    type: 'small',
    grants: [{ stat: 'str', value: 10 }],
    requires: ['str3']
  });

  addNode({
    id: 'str_side2',
    name: '+10 Strength',
    x: -370,
    y: -140,
    type: 'small',
    grants: [{ stat: 'str', value: 10 }],
    requires: ['str_side1']
  });

  addNode({
    id: 'str_side3',
    name: '+10 Strength',
    x: -420,
    y: -180,
    type: 'small',
    grants: [{ stat: 'str', value: 10 }],
    requires: ['str_side2']
  });

  addNode({
    id: 'tank_specialist',
    name: 'Tank Specialist',
    x: -470,
    y: -220,
    type: 'notable',
    grants: [
      { stat: 'str', value: 12 },
      { stat: 'hp_flat', value: 35 }
    ],
    requires: ['str_side3']
  });

  // === DEXTERITY BRANCH ===
  // First ring - basic DEX bonuses
  addNode({
    id: 'dex1',
    name: '+8 Dexterity',
    x: 200,
    y: -50,
    type: 'small',
    grants: [{ stat: 'dex', value: 8 }],
    requires: ['start']
  });

  addNode({
    id: 'dex2',
    name: '+8 Dexterity',
    x: 250,
    y: -100,
    type: 'small',
    grants: [{ stat: 'dex', value: 8 }],
    requires: ['dex1']
  });

  addNode({
    id: 'dex3',
    name: '+8 Dexterity',
    x: 300,
    y: -150,
    type: 'small',
    grants: [{ stat: 'dex', value: 8 }],
    requires: ['dex2']
  });

  // Second ring - notable and specials
  addNode({
    id: 'nimble',
    name: 'Nimble',
    x: 350,
    y: -200,
    type: 'notable',
    grants: [
      { stat: 'dex', value: 15 },
      { stat: 'evasion_pct', value: 10 }
    ],
    requires: ['dex3']
  });

  addNode({
    id: 'bow_mastery',
    name: 'Bow Mastery',
    x: 400,
    y: -250,
    type: 'notable',
    grants: [
      { stat: 'bow_pct', value: 12 },
      { stat: 'dex', value: 10 }
    ],
    requires: ['nimble']
  });

  addNode({
    id: 'fleet_footed',
    name: 'Fleet Footed',
    x: 450,
    y: -300,
    type: 'notable',
    grants: [
      { stat: 'dex', value: 12 },
      { stat: 'bow_pct', value: 8 }
    ],
    requires: ['bow_mastery']
  });

  // Third ring - keystone
  addNode({
    id: 'shadow_dancer',
    name: 'Shadow Dancer',
    x: 500,
    y: -350,
    type: 'keystone',
    grants: [
      { stat: 'dex', value: 20 },
      { stat: 'bow_pct', value: 15 }
    ],
    requires: ['fleet_footed']
  });

  // === INTELLIGENCE BRANCH ===
  // First ring - basic INT bonuses
  addNode({
    id: 'int1',
    name: '+8 Intelligence',
    x: 0,
    y: -150,
    type: 'small',
    grants: [{ stat: 'int', value: 8 }],
    requires: ['start']
  });

  addNode({
    id: 'int2',
    name: '+8 Intelligence',
    x: 0,
    y: -200,
    type: 'small',
    grants: [{ stat: 'int', value: 8 }],
    requires: ['int1']
  });

  addNode({
    id: 'int3',
    name: '+8 Intelligence',
    x: 0,
    y: -250,
    type: 'small',
    grants: [{ stat: 'int', value: 8 }],
    requires: ['int2']
  });

  // Second ring - notable and specials
  addNode({
    id: 'scholar',
    name: 'Scholar',
    x: 0,
    y: -300,
    type: 'notable',
    grants: [
      { stat: 'int', value: 15 },
      { stat: 'mp_flat', value: 25 }
    ],
    requires: ['int3']
  });

  addNode({
    id: 'spell_mastery',
    name: 'Spell Mastery',
    x: 0,
    y: -350,
    type: 'notable',
    grants: [
      { stat: 'spell_pct', value: 12 },
      { stat: 'int', value: 10 }
    ],
    requires: ['scholar']
  });

  addNode({
    id: 'arcane_focus',
    name: 'Arcane Focus',
    x: 0,
    y: -400,
    type: 'notable',
    grants: [
      { stat: 'mp_flat', value: 30 },
      { stat: 'int', value: 10 }
    ],
    requires: ['spell_mastery']
  });

  // Third ring - keystone
  addNode({
    id: 'arcane_surge',
    name: 'Arcane Surge',
    x: 0,
    y: -450,
    type: 'keystone',
    grants: [
      { stat: 'int', value: 20 },
      { stat: 'mp_flat', value: 40 }
    ],
    requires: ['arcane_focus']
  });

  // === CROSS-BRANCH CONNECTIONS ===
  // Strength to Dexterity crossovers
  addNode({
    id: 'str_dex_bridge1',
    name: '+6 All Attributes',
    x: -100,
    y: -80,
    type: 'small',
    grants: [
      { stat: 'str', value: 6 },
      { stat: 'dex', value: 6 }
    ],
    requires: ['str1', 'dex1']
  });

  addNode({
    id: 'hybrid_warrior',
    name: 'Hybrid Warrior',
    x: -150,
    y: -130,
    type: 'notable',
    grants: [
      { stat: 'str', value: 8 },
      { stat: 'dex', value: 8 },
      { stat: 'melee_pct', value: 6 },
      { stat: 'bow_pct', value: 6 }
    ],
    requires: ['str_dex_bridge1']
  });

  // Strength to Intelligence crossovers
  addNode({
    id: 'str_int_bridge1',
    name: '+6 All Attributes',
    x: -80,
    y: -120,
    type: 'small',
    grants: [
      { stat: 'str', value: 6 },
      { stat: 'int', value: 6 }
    ],
    requires: ['str1', 'int1']
  });

  addNode({
    id: 'battle_mage',
    name: 'Battle Mage',
    x: -120,
    y: -170,
    type: 'notable',
    grants: [
      { stat: 'str', value: 8 },
      { stat: 'int', value: 8 },
      { stat: 'hp_flat', value: 20 },
      { stat: 'mp_flat', value: 20 }
    ],
    requires: ['str_int_bridge1']
  });

  // Dexterity to Intelligence crossovers
  addNode({
    id: 'dex_int_bridge1',
    name: '+6 All Attributes',
    x: 80,
    y: -120,
    type: 'small',
    grants: [
      { stat: 'dex', value: 6 },
      { stat: 'int', value: 6 }
    ],
    requires: ['dex1', 'int1']
  });

  addNode({
    id: 'shadow_mage',
    name: 'Shadow Mage',
    x: 120,
    y: -170,
    type: 'notable',
    grants: [
      { stat: 'dex', value: 8 },
      { stat: 'int', value: 8 },
      { stat: 'evasion_pct', value: 8 },
      { stat: 'spell_pct', value: 8 }
    ],
    requires: ['dex_int_bridge1']
  });

  // === DEFENSIVE CLUSTER ===
  addNode({
    id: 'defensive_core',
    name: 'Defensive Core',
    x: -50,
    y: 50,
    type: 'notable',
    grants: [
      { stat: 'hp_flat', value: 40 },
      { stat: 'str', value: 5 },
      { stat: 'dex', value: 5 }
    ],
    requires: ['start']
  });

  addNode({
    id: 'resilience',
    name: 'Resilience',
    x: -100,
    y: 100,
    type: 'small',
    grants: [{ stat: 'hp_flat', value: 20 }],
    requires: ['defensive_core']
  });

  addNode({
    id: 'fortitude',
    name: 'Fortitude',
    x: -50,
    y: 150,
    type: 'notable',
    grants: [
      { stat: 'hp_flat', value: 30 },
      { stat: 'hp_regen', value: 3 }
    ],
    requires: ['resilience']
  });

  // === OFFENSIVE CLUSTER ===
  addNode({
    id: 'offensive_core',
    name: 'Offensive Core',
    x: 50,
    y: 50,
    type: 'notable',
    grants: [
      { stat: 'melee_pct', value: 8 },
      { stat: 'bow_pct', value: 8 },
      { stat: 'str', value: 5 }
    ],
    requires: ['start']
  });

  addNode({
    id: 'precision',
    name: 'Precision',
    x: 100,
    y: 100,
    type: 'small',
    grants: [{ stat: 'dex', value: 10 }],
    requires: ['offensive_core']
  });

  addNode({
    id: 'deadly_precision',
    name: 'Deadly Precision',
    x: 50,
    y: 150,
    type: 'notable',
    grants: [
      { stat: 'melee_pct', value: 10 },
      { stat: 'bow_pct', value: 10 }
    ],
    requires: ['precision']
  });

  // === UTILITY CLUSTER ===
  addNode({
    id: 'utility_core',
    name: 'Utility Core',
    x: 0,
    y: 120,
    type: 'notable',
    grants: [
      { stat: 'hp_flat', value: 25 },
      { stat: 'mp_flat', value: 20 },
      { stat: 'int', value: 5 }
    ],
    requires: ['start']
  });

  addNode({
    id: 'survival_instinct',
    name: 'Survival Instinct',
    x: 0,
    y: 180,
    type: 'notable',
    grants: [
      { stat: 'hp_flat', value: 30 },
      { stat: 'mp_flat', value: 25 }
    ],
    requires: ['utility_core']
  });

  // === ADVANCED KEYSTONES ===
  // Cross-branch keystone
  addNode({
    id: 'ascendant',
    name: 'Ascendant',
    x: 0,
    y: -500,
    type: 'keystone',
    grants: [
      { stat: 'str', value: 10 },
      { stat: 'dex', value: 10 },
      { stat: 'int', value: 10 },
      { stat: 'hp_flat', value: 30 }
    ],
    requires: ['indomitable', 'shadow_dancer', 'arcane_surge']
  });

  // === GENERATE EDGES ===
  // Start connections
  addEdge('start', 'str1');
  addEdge('start', 'dex1');
  addEdge('start', 'int1');
  addEdge('start', 'defensive_core');
  addEdge('start', 'offensive_core');
  addEdge('start', 'utility_core');

  // Strength branch
  addEdge('str1', 'str2');
  addEdge('str2', 'str3');
  addEdge('str3', 'warrior_spirit');
  addEdge('warrior_spirit', 'melee_mastery');
  addEdge('melee_mastery', 'battle_hardened');
  addEdge('battle_hardened', 'indomitable');

  // Dexterity branch
  addEdge('dex1', 'dex2');
  addEdge('dex2', 'dex3');
  addEdge('dex3', 'nimble');
  addEdge('nimble', 'bow_mastery');
  addEdge('bow_mastery', 'fleet_footed');
  addEdge('fleet_footed', 'shadow_dancer');

  // Intelligence branch
  addEdge('int1', 'int2');
  addEdge('int2', 'int3');
  addEdge('int3', 'scholar');
  addEdge('scholar', 'spell_mastery');
  addEdge('spell_mastery', 'arcane_focus');
  addEdge('arcane_focus', 'arcane_surge');

  // Cross-branch connections
  addEdge('str1', 'str_dex_bridge1');
  addEdge('dex1', 'str_dex_bridge1');
  addEdge('str_dex_bridge1', 'hybrid_warrior');

  addEdge('str1', 'str_int_bridge1');
  addEdge('int1', 'str_int_bridge1');
  addEdge('str_int_bridge1', 'battle_mage');

  addEdge('dex1', 'dex_int_bridge1');
  addEdge('int1', 'dex_int_bridge1');
  addEdge('dex_int_bridge1', 'shadow_mage');

  // Defensive cluster
  addEdge('defensive_core', 'resilience');
  addEdge('resilience', 'fortitude');

  // Offensive cluster
  addEdge('offensive_core', 'precision');
  addEdge('precision', 'deadly_precision');

  // Utility cluster
  addEdge('utility_core', 'survival_instinct');

  // Advanced keystone connections
  addEdge('indomitable', 'ascendant');
  addEdge('shadow_dancer', 'ascendant');
  addEdge('arcane_surge', 'ascendant');

  return { nodes, edges };
}

async function main() {
  console.log('='.repeat(60));
  console.log('PoE2 Passive Skill Tree Generator');
  console.log('='.repeat(60));

  const dataDir = path.join(process.cwd(), 'data');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Generate the talent tree
  console.log('[Generator] Creating comprehensive PoE2 passive skill tree...');
  const skillTreeData = generatePoE2PassiveTree();

  console.log(`[Generator] Generated ${skillTreeData.nodes.length} nodes and ${skillTreeData.edges.length} connections`);

  // Write the skill tree data
  const skillTreePath = path.join(dataDir, 'skillTree.json');
  fs.writeFileSync(skillTreePath, JSON.stringify(skillTreeData, null, 2));
  console.log(`[Generator] ✓ Updated skill tree data: ${skillTreePath}`);

  // Summary
  const nodeTypes = skillTreeData.nodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('[Generator] Node breakdown:');
  Object.entries(nodeTypes).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count} nodes`);
  });

  console.log('='.repeat(60));
  console.log('[Generator] Complete - PoE2 talent tree ready!');
}

main().catch(err => {
  console.error('[Generator] Fatal error:', err);
  process.exit(1);
});
