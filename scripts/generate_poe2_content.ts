#!/usr/bin/env tsx

// POE2 Content Generator
// Creates 300-500 nodes of POE2-inspired content

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { SkillNode, Effect, NodeRequirement } from '../src/gameplay/skillTree';

interface ContentConfig {
  totalNodes: number;
  attributes: {
    strength: { count: number; clusterCenter: { x: number; y: number } };
    dexterity: { count: number; clusterCenter: { x: number; y: number } };
    intelligence: { count: number; clusterCenter: { x: number; y: number } };
  };
  notablesPerAttribute: number;
  keystones: number;
  hybridNodes: number;
}

class POE2ContentGenerator {
  private outputDir = join(__dirname, '..', 'data', 'generated');
  private nodes: SkillNode[] = [];
  private edges: Array<[string, string]> = [];
  private nodeIdCounter = 0;

  constructor() {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  generateContent(): { nodes: SkillNode[]; edges: Array<[string, string]> } {
    const config: ContentConfig = {
      totalNodes: 350,
      attributes: {
        strength: { count: 120, clusterCenter: { x: -300, y: 0 } },
        dexterity: { count: 120, clusterCenter: { x: 300, y: 0 } },
        intelligence: { count: 120, clusterCenter: { x: 0, y: -400 } }
      },
      notablesPerAttribute: 15,
      keystones: 8,
      hybridNodes: 20
    };

    console.log('Starting content generation with config:', config);

    this.generateStartNode();
    console.log('After start node:', this.nodes.length);

    this.generateAttributeClusters(config);
    console.log('After attribute clusters:', this.nodes.length);

    this.generateNotables(config);
    console.log('After notables:', this.nodes.length);

    this.generateKeystones(config);
    console.log('After keystones:', this.nodes.length);

    this.generateHybridNodes(config);
    console.log('After hybrid nodes:', this.nodes.length);

    this.generateConnections();
    console.log('After connections:', this.edges.length);

    return { nodes: this.nodes, edges: this.edges };
  }

  private generateStartNode(): void {
    const startNode: SkillNode = {
      id: 'start',
      name: 'Ascendant Root',
      x: 0,
      y: 0,
      type: 'start',
      effects: [{ stat: 'points', op: 'add', value: 24 }],
      requirements: [],
      tags: ['start'],
      isClassStart: true,
      description: 'The beginning of your path to power'
    };

    this.nodes.push(startNode);
  }

  private generateAttributeClusters(config: ContentConfig): void {
    // Generate basic attribute nodes for each attribute
    console.log('Generating attribute clusters...');
    Object.entries(config.attributes).forEach(([attr, attrConfig]) => {
      console.log(`Generating ${attrConfig.count} nodes for ${attr}`);
      for (let i = 0; i < attrConfig.count; i++) {
        const angle = (i / attrConfig.count) * Math.PI * 2;
        const distance = 50 + (i * 2); // Increasing distance from center

        const x = attrConfig.clusterCenter.x + Math.cos(angle) * distance;
        const y = attrConfig.clusterCenter.y + Math.sin(angle) * distance;

        const value = i < 10 ? 5 : i < 20 ? 8 : 10; // Progressive values

        const node: SkillNode = {
          id: `${attr}_${i + 1}`,
          name: `+${value} ${attr.charAt(0).toUpperCase() + attr.slice(1)}`,
          x,
          y,
          type: 'small',
          effects: [{ stat: attr as any, op: 'add', value }],
          requirements: i === 0 ? [{ type: 'node', value: 'start' }] : [{ type: 'node', value: `${attr}_${i}` }],
          tags: [attr, 'basic']
        };

        this.nodes.push(node);
      }
      console.log(`Finished ${attr}, total nodes now:`, this.nodes.length);
    });
  }

  private generateNotables(config: ContentConfig): void {
    const notableTemplates = {
      strength: [
        { name: 'Warrior Might', effects: [
          { stat: 'str', op: 'add', value: 15 },
          { stat: 'hp_flat', op: 'add', value: 30 },
          { stat: 'melee_pct', op: 'add', value: 12 }
        ]},
        { name: 'Iron Grip', effects: [
          { stat: 'str', op: 'add', value: 12 },
          { stat: 'attack_speed', op: 'more', value: 10 }
        ]},
        { name: 'Bloodletting', effects: [
          { stat: 'str', op: 'add', value: 10 },
          { stat: 'melee_pct', op: 'add', value: 15 },
          { stat: 'crit_chance', op: 'add', value: 10 }
        ]}
      ],
      dexterity: [
        { name: 'Precision', effects: [
          { stat: 'dex', op: 'add', value: 15 },
          { stat: 'bow_pct', op: 'add', value: 12 },
          { stat: 'crit_chance', op: 'add', value: 8 }
        ]},
        { name: 'Fleet of Foot', effects: [
          { stat: 'dex', op: 'add', value: 12 },
          { stat: 'movement_speed', op: 'more', value: 15 }
        ]},
        { name: 'Deadeye', effects: [
          { stat: 'dex', op: 'add', value: 15 },
          { stat: 'bow_pct', op: 'add', value: 20 }
        ]}
      ],
      intelligence: [
        { name: 'Arcane Mastery', effects: [
          { stat: 'int', op: 'add', value: 15 },
          { stat: 'spell_pct', op: 'add', value: 12 },
          { stat: 'mp_flat', op: 'add', value: 30 }
        ]},
        { name: 'Mental Rapidity', effects: [
          { stat: 'int', op: 'add', value: 12 },
          { stat: 'cast_speed', op: 'more', value: 15 }
        ]},
        { name: 'Elemental Focus', effects: [
          { stat: 'int', op: 'add', value: 10 },
          { stat: 'spell_pct', op: 'add', value: 18 },
          { stat: 'fire_resistance', op: 'add', value: 10 },
          { stat: 'cold_resistance', op: 'add', value: 10 },
          { stat: 'lightning_resistance', op: 'add', value: 10 }
        ]}
      ]
    };

    Object.entries(notableTemplates).forEach(([attr, templates]) => {
      templates.forEach((template, index) => {
        const attrConfig = config.attributes[attr as keyof typeof config.attributes];
        const angle = (index / templates.length) * Math.PI * 1.5 + Math.PI * 0.25;
        const distance = 200;

        const x = attrConfig.clusterCenter.x + Math.cos(angle) * distance;
        const y = attrConfig.clusterCenter.y + Math.sin(angle) * distance;

        const node: SkillNode = {
          id: `${attr}_notable_${index + 1}`,
          name: template.name,
          x,
          y,
          type: 'notable',
          effects: template.effects,
          requirements: [{ type: 'node', value: `${attr}_${Math.floor(config.attributes[attr as keyof typeof config.attributes].count * 0.7)}` }],
          tags: [attr, 'notable'],
          description: `${template.name} - A significant passive skill`
        };

        this.nodes.push(node);
      });
    });
  }

  private generateKeystones(config: ContentConfig): void {
    const keystoneTemplates = [
      {
        name: 'Unbreakable',
        effects: [
          { stat: 'str', op: 'add', value: 25 },
          { stat: 'hp_flat', op: 'add', value: 60 },
          { stat: 'armor', op: 'more', value: 20 }
        ],
        description: 'You have 20% more Armor and cannot be stunned',
        tags: ['strength', 'defense', 'keystone']
      },
      {
        name: 'Phantom Strike',
        effects: [
          { stat: 'dex', op: 'add', value: 25 },
          { stat: 'bow_pct', op: 'add', value: 25 },
          { stat: 'movement_speed', op: 'more', value: 15 }
        ],
        description: 'You move 15% faster and your attacks have a chance to pass through enemies',
        tags: ['dexterity', 'mobility', 'keystone']
      },
      {
        name: 'Arcane Dominion',
        effects: [
          { stat: 'int', op: 'add', value: 25 },
          { stat: 'spell_pct', op: 'add', value: 20 },
          { stat: 'mp_flat', op: 'add', value: 50 }
        ],
        description: 'Your spells have 20% increased effect and you regenerate mana 50% faster',
        tags: ['intelligence', 'mana', 'keystone']
      },
      {
        name: 'Ascendant Power',
        effects: [
          { stat: 'str', op: 'add', value: 20 },
          { stat: 'dex', op: 'add', value: 20 },
          { stat: 'int', op: 'add', value: 20 },
          { stat: 'hp_flat', op: 'add', value: 50 },
          { stat: 'mp_flat', op: 'add', value: 50 }
        ],
        description: 'Master of all elements, you wield power beyond mortal comprehension',
        tags: ['hybrid', 'ascendant', 'keystone']
      }
    ];

    keystoneTemplates.forEach((template, index) => {
      const angle = (index / keystoneTemplates.length) * Math.PI * 2;
      const distance = 400;

      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      const requirements: NodeRequirement[] = [];
      if (template.tags.includes('ascendant')) {
        requirements.push(
          { type: 'node', value: 'strength_notable_1' },
          { type: 'node', value: 'dexterity_notable_1' },
          { type: 'node', value: 'intelligence_notable_1' }
        );
      } else if (template.tags.includes('strength')) {
        requirements.push({ type: 'node', value: 'strength_notable_2' });
      } else if (template.tags.includes('dexterity')) {
        requirements.push({ type: 'node', value: 'dexterity_notable_2' });
      } else if (template.tags.includes('intelligence')) {
        requirements.push({ type: 'node', value: 'intelligence_notable_2' });
      }

      const node: SkillNode = {
        id: `keystone_${index + 1}`,
        name: template.name,
        x,
        y,
        type: 'keystone',
        effects: template.effects,
        requirements,
        tags: template.tags,
        description: template.description
      };

      this.nodes.push(node);
    });
  }

  private generateHybridNodes(config: ContentConfig): void {
    const hybridTemplates = [
      { name: '+6 All Attributes', effects: [
        { stat: 'str', op: 'add', value: 6 },
        { stat: 'dex', op: 'add', value: 6 },
        { stat: 'int', op: 'add', value: 6 }
      ]},
      { name: 'Balanced Training', effects: [
        { stat: 'str', op: 'add', value: 4 },
        { stat: 'dex', op: 'add', value: 4 },
        { stat: 'int', op: 'add', value: 4 },
        { stat: 'hp_flat', op: 'add', value: 15 },
        { stat: 'mp_flat', op: 'add', value: 15 }
      ]},
      { name: 'Harmony', effects: [
        { stat: 'str', op: 'add', value: 6 },
        { stat: 'dex', op: 'add', value: 6 },
        { stat: 'int', op: 'add', value: 6 },
        { stat: 'hp_flat', op: 'add', value: 20 },
        { stat: 'mp_flat', op: 'add', value: 20 }
      ]}
    ];

    hybridTemplates.forEach((template, index) => {
      const angle = (index / hybridTemplates.length) * Math.PI * 2;
      const distance = 150;

      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      const node: SkillNode = {
        id: `hybrid_${index + 1}`,
        name: template.name,
        x,
        y,
        type: index === 0 ? 'small' : 'notable',
        effects: template.effects,
        requirements: [{ type: 'node', value: 'start' }],
        tags: ['hybrid', index === 0 ? 'basic' : 'notable']
      };

      this.nodes.push(node);
    });
  }

  private generateConnections(): void {
    // Connect start to hybrid nodes
    const hybridNodes = this.nodes.filter(n => n.tags.includes('hybrid'));
    hybridNodes.forEach(node => {
      this.edges.push(['start', node.id]);
    });

    // Connect attribute clusters
    ['strength', 'dexterity', 'intelligence'].forEach(attr => {
      const attrNodes = this.nodes.filter(n => n.tags.includes(attr) && n.type === 'small');
      for (let i = 0; i < attrNodes.length - 1; i++) {
        this.edges.push([attrNodes[i].id, attrNodes[i + 1].id]);
      }

      // Connect first attribute node to start
      if (attrNodes.length > 0) {
        this.edges.push(['start', attrNodes[0].id]);
      }
    });

    // Connect notables to their attribute chains
    ['strength', 'dexterity', 'intelligence'].forEach(attr => {
      const notables = this.nodes.filter(n => n.tags.includes(attr) && n.type === 'notable');
      const attrNodes = this.nodes.filter(n => n.tags.includes(attr) && n.type === 'small');

      notables.forEach(notable => {
        // Connect to a mid-tier attribute node
        const midNode = attrNodes[Math.floor(attrNodes.length * 0.6)];
        if (midNode) {
          this.edges.push([midNode.id, notable.id]);
        }
      });
    });

    // Connect keystones to notables
    const keystones = this.nodes.filter(n => n.type === 'keystone');
    keystones.forEach(keystone => {
      // Requirements are already defined in the node data
      // Add edges based on requirements
      keystone.requirements.forEach(req => {
        if (req.type === 'node') {
          this.edges.push([req.value, keystone.id]);
        }
      });
    });
  }

  saveContent(content: { nodes: SkillNode[]; edges: Array<[string, string]> }): void {
    const outputFile = join(this.outputDir, 'poe2_skill_tree.json');

    const data = {
      metadata: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        totalNodes: content.nodes.length,
        totalConnections: content.edges.length,
        generator: 'POE2ContentGenerator'
      },
      nodes: content.nodes,
      edges: content.edges
    };

    writeFileSync(outputFile, JSON.stringify(data, null, 2));
    console.log(`Generated ${content.nodes.length} nodes and ${content.edges.length} connections`);
    console.log(`Saved to ${outputFile}`);
  }
}

// CLI runner
async function main() {
  const generator = new POE2ContentGenerator();

  try {
    console.log('Generating POE2-inspired skill tree content...');
    const content = generator.generateContent();
    generator.saveContent(content);
    console.log('Content generation completed successfully!');
  } catch (error) {
    console.error('Content generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { POE2ContentGenerator };
