// Skill tree generator - creates a comprehensive POE2-style talent tree
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Effect {
  stat: string;
  op: 'add' | 'mul' | 'more' | 'less' | 'set';
  value: number;
}

interface Requirement {
  type: 'node' | 'attribute' | 'level';
  value: string | number;
  attribute?: 'str' | 'dex' | 'int';
}

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'start' | 'small' | 'major' | 'notable' | 'keystone';
  effects: Effect[];
  requirements: Requirement[];
  tags: string[];
  description?: string;
  flavorText?: string;
}

interface SkillTreeData {
  metadata: {
    version: string;
    generatedAt: string;
    totalNodes: number;
    totalConnections: number;
    generator: string;
  };
  nodes: Node[];
  edges: [string, string][];
}

// Utility functions
function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  return {
    x: Math.round(radius * Math.cos((angle * Math.PI) / 180)),
    y: Math.round(radius * Math.sin((angle * Math.PI) / 180))
  };
}

function createNode(
  id: string,
  name: string,
  x: number,
  y: number,
  type: Node['type'],
  effects: Effect[],
  requirements: Requirement[],
  tags: string[],
  description?: string
): Node {
  return { id, name, x, y, type, effects, requirements, tags, description };
}

// Main generator
function generateSkillTree(): SkillTreeData {
  const nodes: Node[] = [];
  const edges: [string, string][] = [];

  // START NODE
  nodes.push(createNode(
    'start',
    'Ascendant Root',
    0,
    0,
    'start',
    [{ stat: 'points', op: 'add', value: 100 }],
    [],
    ['start'],
    'The beginning of your path to power'
  ));

  // INNER RING - Core attribute nodes (3 paths radiating out)
  const innerRadius = 80;
  const paths = [
    { name: 'Strength', angle: 180, stat: 'str', tags: ['strength'], color: 'red' },
    { name: 'Dexterity', angle: 0, stat: 'dex', tags: ['dexterity'], color: 'green' },
    { name: 'Intelligence', angle: 270, stat: 'int', tags: ['intelligence'], color: 'blue' }
  ];

  paths.forEach((path, pathIdx) => {
    // First node in each path
    const pos = polarToCartesian(path.angle, innerRadius);
    const firstNodeId = `${path.stat}_start`;

    nodes.push(createNode(
      firstNodeId,
      `+5 ${path.name}`,
      pos.x,
      pos.y,
      'small',
      [{ stat: path.stat, op: 'add', value: 5 }],
      [{ type: 'node', value: 'start' }],
      path.tags
    ));

    edges.push(['start', firstNodeId]);

    // Create branches along this path
    for (let ring = 1; ring <= 9; ring++) {
      const radius = innerRadius + ring * 60;
      const nodeCount = 7 + ring * 2; // More nodes in outer rings
      const angleSpread = 55; // Degrees of spread for this path

      for (let i = 0; i < nodeCount; i++) {
        const angleOffset = ((i / (nodeCount - 1)) - 0.5) * angleSpread;
        const nodeAngle = path.angle + angleOffset;
        const nodePos = polarToCartesian(nodeAngle, radius);

        const prevRing = ring - 1;
        const prevRadius = innerRadius + prevRing * 70;

        // Determine node type and effects based on ring
        let nodeType: Node['type'] = 'small';
        let effects: Effect[] = [];
        let nodeName = '';
        let description: string | undefined;

        if (ring === 9 && (i === 0 || i === nodeCount - 1)) {
          // Keystones at outer edges
          nodeType = 'keystone';
          nodeName = `${path.name} Keystone ${i === 0 ? 'Alpha' : 'Omega'}`;
          effects = [
            { stat: path.stat, op: 'add', value: 35 },
            { stat: 'hp_flat', op: 'add', value: 60 },
            { stat: `${path.stat === 'str' ? 'melee' : path.stat === 'dex' ? 'bow' : 'spell'}_pct`, op: 'more', value: 25 }
          ];
          description = `Ultimate ${path.name.toLowerCase()} power`;
        } else if ((ring === 5 || ring === 7) && i === Math.floor(nodeCount / 2)) {
          // Notable in middle rings
          nodeType = 'notable';
          nodeName = `${path.name} Notable ${ring}`;
          effects = [
            { stat: path.stat, op: 'add', value: 15 },
            { stat: `${path.stat === 'str' ? 'melee' : path.stat === 'dex' ? 'bow' : 'spell'}_pct`, op: 'add', value: 12 }
          ];
          description = `Enhanced ${path.name.toLowerCase()} and damage`;
        } else if (ring >= 2 && i % 2 === 0) {
          // Major nodes
          nodeType = 'major';
          nodeName = `${path.name} +8`;
          effects = [{ stat: path.stat, op: 'add', value: 8 }];
        } else {
          // Small nodes
          nodeType = 'small';
          nodeName = `${path.name} +3`;
          effects = [{ stat: path.stat, op: 'add', value: 3 }];
        }

        const nodeId = `${path.stat}_r${ring}_${i}`;

        nodes.push(createNode(
          nodeId,
          nodeName,
          nodePos.x,
          nodePos.y,
          nodeType,
          effects,
          [], // Requirements added after
          path.tags,
          description
        ));
      }
    }
  });

  // CROSS-PATH CONNECTIONS (hybrid nodes)
  // Create nodes that connect STR<->DEX, DEX<->INT, INT<->STR
  const hybridConnections = [
    { from: 'str', to: 'dex', stats: ['str', 'dex'], name: 'Strength/Dexterity', angle: 90 },
    { from: 'dex', to: 'int', stats: ['dex', 'int'], name: 'Dexterity/Intelligence', angle: 315 },
    { from: 'int', to: 'str', stats: ['int', 'str'], name: 'Intelligence/Strength', angle: 225 }
  ];

  hybridConnections.forEach((hybrid, idx) => {
    for (let ring = 2; ring <= 6; ring++) {
      const radius = innerRadius + ring * 60;
      const pos = polarToCartesian(hybrid.angle, radius);
      const nodeId = `hybrid_${hybrid.from}_${hybrid.to}_r${ring}`;

      nodes.push(createNode(
        nodeId,
        `+${ring + 2} ${hybrid.stats[0].toUpperCase()} / +${ring + 2} ${hybrid.stats[1].toUpperCase()}`,
        pos.x,
        pos.y,
        ring >= 5 ? 'notable' : 'small',
        [
          { stat: hybrid.stats[0], op: 'add', value: ring + 2 },
          { stat: hybrid.stats[1], op: 'add', value: ring + 2 }
        ],
        [],
        ['hybrid', ...hybrid.stats],
        ring >= 5 ? `Balanced ${hybrid.name} node` : undefined
      ));
    }
  });

  // SPECIAL CLUSTERS (Life, Mana, Damage, Defense, etc.)
  const clusters = [
    {
      name: 'Life',
      center: { x: -280, y: -150 },
      stat: 'hp_flat',
      values: [15, 20, 25, 30, 35, 40],
      tags: ['life', 'defense'],
      nodeCount: 8
    },
    {
      name: 'Mana',
      center: { x: 280, y: -150 },
      stat: 'mp_flat',
      values: [10, 15, 20, 25, 30],
      tags: ['mana', 'resource'],
      nodeCount: 7
    },
    {
      name: 'Critical',
      center: { x: 0, y: 350 },
      stat: 'crit_chance',
      values: [5, 8, 10, 12, 15],
      tags: ['critical', 'offense'],
      nodeCount: 8
    },
    {
      name: 'Armor',
      center: { x: -380, y: 220 },
      stat: 'armor',
      values: [20, 30, 40, 50, 60],
      tags: ['armor', 'defense'],
      nodeCount: 7
    },
    {
      name: 'Evasion',
      center: { x: 380, y: 220 },
      stat: 'evasion',
      values: [20, 30, 40, 50, 60],
      tags: ['evasion', 'defense'],
      nodeCount: 7
    },
    {
      name: 'Energy Shield',
      center: { x: 0, y: -380 },
      stat: 'energy_shield',
      values: [15, 20, 25, 30, 35],
      tags: ['energy_shield', 'defense'],
      nodeCount: 6
    },
    {
      name: 'Attack Speed',
      center: { x: 300, y: 300 },
      stat: 'attack_speed',
      values: [3, 5, 7, 10],
      tags: ['attack_speed', 'offense'],
      nodeCount: 6
    },
    {
      name: 'Cast Speed',
      center: { x: -300, y: 300 },
      stat: 'cast_speed',
      values: [3, 5, 7, 10],
      tags: ['cast_speed', 'offense'],
      nodeCount: 6
    },
    {
      name: 'Fire Res',
      center: { x: -180, y: 350 },
      stat: 'fire_resistance',
      values: [8, 10, 12, 15],
      tags: ['resistance', 'defense'],
      nodeCount: 5
    },
    {
      name: 'Cold Res',
      center: { x: 180, y: 350 },
      stat: 'cold_resistance',
      values: [8, 10, 12, 15],
      tags: ['resistance', 'defense'],
      nodeCount: 5
    },
    {
      name: 'Lightning Res',
      center: { x: 0, y: 420 },
      stat: 'lightning_resistance',
      values: [8, 10, 12, 15],
      tags: ['resistance', 'defense'],
      nodeCount: 5
    },
    {
      name: 'Movement',
      center: { x: 200, y: -300 },
      stat: 'movement_speed',
      values: [3, 5, 7, 10],
      tags: ['movement', 'utility'],
      nodeCount: 5
    }
  ];

  clusters.forEach((cluster, clusterIdx) => {
    const clusterRadius = 55;
    const nodeCount = cluster.nodeCount;

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * 360;
      const pos = polarToCartesian(angle, clusterRadius);
      const nodeId = `cluster_${cluster.name.toLowerCase().replace(/ /g, '_')}_${i}`;
      const value = cluster.values[i % cluster.values.length];

      nodes.push(createNode(
        nodeId,
        `+${value} ${cluster.name}`,
        cluster.center.x + pos.x,
        cluster.center.y + pos.y,
        i === 0 ? 'notable' : 'small',
        [{ stat: cluster.stat, op: 'add', value }],
        [],
        cluster.tags,
        i === 0 ? `${cluster.name} specialization` : undefined
      ));
    }
  });

  // GENERATE EDGES (connect nodes intelligently)
  // This is a simplified approach - connect nodes based on proximity
  nodes.forEach((node, idx) => {
    if (node.id === 'start') return;

    // Find nearest nodes to connect to
    const distances = nodes
      .filter(other => other.id !== node.id)
      .map(other => ({
        id: other.id,
        dist: Math.sqrt((node.x - other.x) ** 2 + (node.y - other.y) ** 2)
      }))
      .sort((a, b) => a.dist - b.dist);

    // Connect to 1-3 nearest nodes (that are close enough)
    const maxConnections = node.type === 'keystone' ? 1 : node.type === 'notable' ? 2 : 3;
    const maxDistance = 100;

    let connections = 0;
    for (const { id, dist } of distances) {
      if (connections >= maxConnections) break;
      if (dist > maxDistance) break;

      // Avoid duplicate edges
      const edgeExists = edges.some(
        ([from, to]) =>
          (from === node.id && to === id) || (from === id && to === node.id)
      );

      if (!edgeExists) {
        edges.push([id, node.id]);
        connections++;
      }
    }
  });

  // ADD REQUIREMENTS to nodes based on edges
  edges.forEach(([from, to]) => {
    const toNode = nodes.find(n => n.id === to);
    if (toNode && toNode.id !== 'start') {
      if (!toNode.requirements.some(r => r.type === 'node' && r.value === from)) {
        toNode.requirements.push({ type: 'node', value: from });
      }
    }
  });

  return {
    metadata: {
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
      totalNodes: nodes.length,
      totalConnections: edges.length,
      generator: 'generateSkillTree.ts'
    },
    nodes,
    edges
  };
}

// Generate and save
const treeData = generateSkillTree();
const outputPath = path.join(__dirname, '..', 'data', 'generated', 'poe2_skill_tree_large.json');

fs.writeFileSync(outputPath, JSON.stringify(treeData, null, 2));

console.log(`✅ Generated skill tree with ${treeData.nodes.length} nodes and ${treeData.edges.length} connections`);
console.log(`📁 Saved to: ${outputPath}`);
