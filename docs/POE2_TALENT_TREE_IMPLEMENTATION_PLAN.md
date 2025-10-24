# Path of Exile 2 Talent Tree Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to transform the existing basic skill tree system into a complete Path of Exile 2 replica. The plan combines original requirements with industry best practices for building complex, performant, and maintainable game systems.

## Current State Analysis

### What We Have ✅
- **Basic Skill Tree System**: Working node allocation with state management
- **Node Types**: Basic implementation of 'start', 'small', 'notable', and 'keystone' nodes
- **Attribute System**: Strength, Dexterity, Intelligence with proper calculations
- **UI Components**: SVG-based skill tree with tooltips and interactions
- **Save System**: Character stats and skill tree state persistence
- **Character Classes**: Warrior and Archer with different starting attributes

### What's Incomplete ⚠️
- **Limited Scale**: Only ~50 nodes vs POE2's 1,500+ nodes
- **Missing Node Types**: No proper 'major' nodes, limited keystone variety
- **Simple Layout**: Basic linear progression vs POE2's complex web structure
- **Limited Effects**: Missing POE2-specific stat bonuses and effects
- **No Weapon Specialization**: Missing POE2's weapon-based passive system

### What's Missing ❌
- **Exact POE2 Layout**: Need to replicate POE2's exact node positioning
- **Complete Node Effects**: Missing POE2's specific bonuses (resistance, crit, etc.)
- **Class Starting Positions**: Need proper class-specific starting areas
- **Visual Design**: Need POE2's exact color scheme and node appearance
- **Advanced Mechanics**: Attribute requirements, complex keystone effects

## Implementation Strategy

### Core Principles
1. **Performance First**: Build for 60fps with 1k+ nodes on mid-range hardware
2. **Robustness**: Zero NaN/Inf outputs across 10k random builds
3. **Maintainability**: Comprehensive testing and validation systems
4. **Scalability**: Start manageable, grow systematically
5. **POE2 Fidelity**: Exact visual and functional replication

## Phase 0: Foundation & Architecture (2-3 weeks)

### 0.1 Schema Definition & Validation

**Enhanced Node Interface**
```typescript
export interface SkillNode {
  id: string;
  name: string;
  type: 'start' | 'small' | 'major' | 'notable' | 'keystone' | 'mastery';
  coords: { x: number; y: number };
  tags: string[]; // For categorization and filtering
  requirements: NodeRequirement[];
  effects: Effect[];
  iconRef: string;
  clusterId?: string;
  ringId?: number;
  classStart?: 'warrior' | 'archer' | 'mage';
  isClassStart?: boolean;
  description?: string;
  flavorText?: string;
}

export interface NodeRequirement {
  type: 'attribute' | 'level' | 'node' | 'class';
  value: number;
  attribute?: 'str' | 'dex' | 'int';
  nodeId?: string;
}

export interface Effect {
  stat: string;
  op: 'add' | 'mul' | 'more' | 'less' | 'set' | 'convert';
  value: number;
  scope?: 'global' | 'weapon' | 'spell' | 'minion';
  condition?: EffectCondition;
}

export interface EffectCondition {
  type: 'weaponTag' | 'allocated' | 'attribute' | 'enemyState';
  value: any;
}
```

**Comprehensive Stat System**
```typescript
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
  
  // Defense
  armor: number;
  evasion: number;
  block_chance: number;
  
  // Resistances
  fire_resistance: number;
  cold_resistance: number;
  lightning_resistance: number;
  chaos_resistance: number;
  
  // Utility
  movement_speed: number;
  mana_cost_reduction: number;
  minion_damage: number;
  totem_damage: number;
}
```

### 0.2 Rules Engine & Stat Calculation

**Deterministic Calculation Order**
```typescript
export class StatCalculator {
  // Locked order: Base → Add → Mul → More/Less → Convert → Limit → Round
  calculate(
    character: Character, 
    equipment: Equipment, 
    allocatedNodes: string[]
  ): AggregatedStats {
    // 1. Start with base character stats
    let stats = this.getBaseStats(character);
    
    // 2. Apply additive bonuses from nodes
    stats = this.applyAdditiveBonuses(stats, allocatedNodes);
    
    // 3. Apply multiplicative scaling
    stats = this.applyMultiplicativeBonuses(stats, allocatedNodes);
    
    // 4. Apply "more/less" multipliers (ARPG style)
    stats = this.applyMoreLessBonuses(stats, allocatedNodes);
    
    // 5. Handle stat conversions
    stats = this.applyConversions(stats, allocatedNodes);
    
    // 6. Apply limits and caps
    stats = this.applyLimits(stats);
    
    // 7. Round final values
    stats = this.roundValues(stats);
    
    return stats;
  }
}
```

### 0.3 Content Pipeline & Validation

**JSON Schema Validation**
```typescript
// tree-schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "nodes": {
      "type": "array",
      "items": { "$ref": "#/definitions/SkillNode" }
    },
    "edges": {
      "type": "array",
      "items": { "$ref": "#/definitions/Edge" }
    }
  },
  "required": ["nodes", "edges"]
}
```

**Graph Validation CLI**
```bash
# tree-validate input.json
# Validates:
# - All nodes reachable from class starts
# - No orphaned edges
# - No cycles in requirements
# - All effects have valid stats
# - Attribute requirements are solvable
```

## Phase 1: Performance & Rendering (2-3 weeks)

### 1.1 Canvas/WebGL Renderer

**High-Performance Rendering System**
```typescript
export class SkillTreeRenderer {
  private canvas: HTMLCanvasElement;
  private spatialIndex: QuadTree;
  private nodeSprites: SpriteAtlas;
  private viewport: Viewport;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.spatialIndex = new QuadTree();
    this.nodeSprites = new SpriteAtlas();
    this.viewport = new Viewport();
  }
  
  render(nodes: SkillNode[], connections: Edge[], state: TreeState): void {
    // 1. Update spatial index
    this.updateSpatialIndex(nodes);
    
    // 2. Cull nodes outside viewport
    const visibleNodes = this.cullNodes(nodes);
    
    // 3. Batch render connections
    this.renderConnections(connections);
    
    // 4. Batch render nodes with LOD
    this.renderNodes(visibleNodes);
    
    // 5. Render labels for close nodes only
    this.renderLabels(visibleNodes);
  }
  
  private updateSpatialIndex(nodes: SkillNode[]): void {
    this.spatialIndex.clear();
    nodes.forEach(node => {
      this.spatialIndex.insert(node.coords, node);
    });
  }
  
  private cullNodes(nodes: SkillNode[]): SkillNode[] {
    return nodes.filter(node => 
      this.viewport.contains(node.coords)
    );
  }
}
```

### 1.2 Performance Optimizations

**Spatial Indexing & LOD**
- QuadTree for efficient hit testing
- Level-of-detail rendering (hide labels at far zoom)
- Texture atlas for node sprites
- Batched rendering operations
- RequestAnimationFrame throttling

**Memory Management**
- Reuse arrays and objects
- Avoid per-frame allocations
- Efficient sprite batching
- Garbage collection optimization

## Phase 2: Core Content & Tools (2-3 weeks)

### 2.1 Manageable Scale Approach

**Start Smart, Scale Up**
- Begin with 300-500 nodes (not 1,500+)
- Focus on balanced coverage across all attributes
- Create 10+ canonical builds for testing
- Use procedural layout helpers for node placement

**Content Creation Tools**
```typescript
export class TreeEditor {
  private nodes: SkillNode[] = [];
  private connections: Edge[] = [];
  private validator: GraphValidator;
  
  createNode(type: NodeType, position: Point): SkillNode {
    const node = this.generateNode(type, position);
    this.validateNode(node);
    this.nodes.push(node);
    return node;
  }
  
  autoRouteEdges(): void {
    // Auto-route connections using pathfinding
    this.connections = this.findOptimalPaths(this.nodes);
  }
  
  exportTree(): SkillTreeData {
    this.validateGraph();
    return { nodes: this.nodes, edges: this.connections };
  }
}
```

### 2.2 POE2 Data Import Strategy

**Research & Implementation**
1. Use POE2 skill tree planners to extract exact node data
2. Document all node effects and connections
3. Create comprehensive JSON with proper validation
4. Implement POE2's exact coordinate system

**Procedural Layout Helpers**
```typescript
export class LayoutGenerator {
  generateRadialRings(center: Point, rings: number): Point[] {
    // Generate POE2-style radial node placement
  }
  
  generateSpokes(center: Point, spokes: number): Point[] {
    // Generate spoke-style connections
  }
  
  generateClusters(center: Point, clusterCount: number): Point[][] {
    // Generate attribute-based clusters
  }
}
```

## Phase 3: Advanced Mechanics (2-3 weeks)

### 3.1 Equipment API Integration

**Equipment System Interface**
```typescript
export interface EquipmentAPI {
  getActiveWeaponTags(): Set<WeaponTag>;
  getEquipmentStats(): EquipmentStats;
  getWeaponSpecialization(): WeaponSpecialization;
  getActiveWeaponType(): WeaponType;
}

export interface CharacterAPI {
  getBaseStats(): BaseStats;
  getAvailablePoints(): number;
  getClassStartingNode(): string;
  getLevel(): number;
  getAttributeRequirements(): AttributeRequirements;
}
```

**Weapon Specialization System**
```typescript
export class WeaponSpecialization {
  private weaponSets: Map<WeaponType, WeaponSet> = new Map();
  
  assignPassiveToWeapon(nodeId: string, weaponType: WeaponType): void {
    const weaponSet = this.weaponSets.get(weaponType);
    if (weaponSet) {
      weaponSet.assignedPassives.push(nodeId);
    }
  }
  
  getActivePassives(activeWeapon: WeaponType): string[] {
    return this.weaponSets.get(activeWeapon)?.assignedPassives || [];
  }
}
```

### 3.2 Attribute Requirements & Validation

**Requirement System**
```typescript
export class RequirementValidator {
  validateAllocation(nodeId: string, character: Character): ValidationResult {
    const node = this.getNode(nodeId);
    const requirements = node.requirements;
    
    for (const req of requirements) {
      if (!this.checkRequirement(req, character)) {
        return {
          valid: false,
          reason: `Requires ${req.attribute} ${req.value}`,
          suggestions: this.getPathSuggestions(nodeId, character)
        };
      }
    }
    
    return { valid: true };
  }
  
  private getPathSuggestions(nodeId: string, character: Character): string[] {
    // Return shortest path to meet requirements
  }
}
```

### 3.3 Advanced Keystone Effects

**Keystone Framework**
```typescript
export class KeystoneManager {
  private keystoneEffects: Map<string, KeystoneEffect> = new Map();
  
  registerKeystone(nodeId: string, effect: KeystoneEffect): void {
    this.keystoneEffects.set(nodeId, effect);
  }
  
  applyKeystoneEffects(stats: AggregatedStats, allocatedKeystones: string[]): AggregatedStats {
    let modifiedStats = stats;
    
    for (const keystoneId of allocatedKeystones) {
      const effect = this.keystoneEffects.get(keystoneId);
      if (effect) {
        modifiedStats = effect.apply(modifiedStats);
      }
    }
    
    return modifiedStats;
  }
}
```

## Phase 4: Integration & Testing (1-2 weeks)

### 4.1 Comprehensive Testing Strategy

**Golden Build Snapshots**
```typescript
export class BuildTester {
  private goldenBuilds: GoldenBuild[] = [
    {
      name: "Pure Strength Warrior",
      allocatedNodes: ["str1", "str2", "warrior_might", "unbreakable"],
      expectedStats: { str: 85, hp_flat: 120, melee_pct: 25 }
    },
    {
      name: "Hybrid Battle Mage",
      allocatedNodes: ["str1", "int1", "battle_mage", "arcane_knowledge"],
      expectedStats: { str: 40, int: 40, hp_flat: 60, mp_flat: 60 }
    }
    // ... 8+ more canonical builds
  ];
  
  validateGoldenBuilds(): TestResult[] {
    return this.goldenBuilds.map(build => {
      const actualStats = this.calculateStats(build.allocatedNodes);
      return this.compareStats(actualStats, build.expectedStats);
    });
  }
}
```

**Property-Based Testing**
```typescript
export class PropertyTester {
  generateRandomBuild(nodeCount: number): string[] {
    // Generate random valid node allocations
  }
  
  testRandomBuilds(count: number): TestResult {
    const results: TestResult[] = [];
    
    for (let i = 0; i < count; i++) {
      const build = this.generateRandomBuild(50);
      const stats = this.calculateStats(build);
      
      // Assert no NaN/Inf values
      results.push(this.validateStats(stats));
    }
    
    return this.aggregateResults(results);
  }
}
```

### 4.2 Performance Validation

**Benchmarking System**
```typescript
export class PerformanceTester {
  benchmarkRendering(nodeCount: number): PerformanceResult {
    const nodes = this.generateTestNodes(nodeCount);
    const startTime = performance.now();
    
    // Render 1000 frames
    for (let i = 0; i < 1000; i++) {
      this.renderer.render(nodes, [], this.treeState);
    }
    
    const endTime = performance.now();
    const avgFrameTime = (endTime - startTime) / 1000;
    
    return {
      nodeCount,
      avgFrameTime,
      fps: 1000 / avgFrameTime,
      meetsTarget: avgFrameTime < 16.67 // 60fps target
    };
  }
}
```

## Phase 5: Scale & Polish (1-2 weeks)

### 5.1 Content Expansion

**Scale to Full POE2 Complexity**
- Expand to 1k+ nodes only after tooling is proven
- Add more complex keystone effects
- Implement build sharing/import codes
- Add advanced search and filtering

### 5.2 UX Polish & Accessibility

**Enhanced User Experience**
```typescript
export class SkillTreeUX {
  // Search and filtering
  searchNodes(query: string): SkillNode[] {
    return this.nodes.filter(node => 
      node.name.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  // Path preview highlighting
  highlightPath(targetNode: string): string[] {
    return this.findShortestPath(this.getCurrentPosition(), targetNode);
  }
  
  // Undo/redo functionality
  undo(): void {
    this.historyManager.undo();
  }
  
  redo(): void {
    this.historyManager.redo();
  }
  
  // Keyboard navigation
  handleKeyboardNavigation(event: KeyboardEvent): void {
    // Arrow keys for navigation
    // Enter/Space for allocation
    // Escape for cancel
  }
}
```

## Technical Specifications

### Must-Have Deliverables

**Specifications**
- JSON Schema files for all data structures
- Rules engine specification with operation order documentation
- API contracts for equipment/character integration
- Performance benchmarks and targets

**Libraries**
- Effect evaluator with 100% unit test coverage
- Graph validator CLI (`tree-validate input.json`)
- Canvas renderer with LOD and spatial indexing
- Property-based testing framework

**Tools**
- Tree editor for content creation and validation
- Performance profiler for rendering optimization
- Build tester for validation and golden builds
- Migration system for save file compatibility

**Tests**
- Golden builds (10+ canonical builds with snapshot tests)
- Property tests for random allocations (10k builds)
- Performance tests (60fps with 1k nodes benchmark)
- Integration tests for equipment/character APIs

### Success Criteria

**Performance Targets**
- Smooth 60fps pan/zoom on mid-range hardware with 1k nodes
- Cold start <150ms to first draw (after assets cached)
- Memory usage <100MB for full tree with all nodes allocated

**Robustness Targets**
- Zero NaN/Inf in stat outputs across 10k random builds
- Save v1 → v2 migration passes on 100 sample saves
- All golden builds produce expected results within 0.1% tolerance

**Accessibility Targets**
- Fully navigable via keyboard
- All interactive elements have proper ARIA labels
- Screen reader compatible with semantic markup

**POE2 Fidelity Targets**
- Exact visual match to POE2's skill tree appearance
- All POE2 node effects implemented and functional
- Proper class starting positions and attribute requirements
- Weapon specialization system matching POE2 mechanics

## Implementation Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 0 | 2-3 weeks | Schema, Rules Engine, Validation Pipeline |
| Phase 1 | 2-3 weeks | Canvas Renderer, Performance Optimization |
| Phase 2 | 2-3 weeks | Tree Editor, 300-500 Node Content |
| Phase 3 | 2-3 weeks | Equipment API, Advanced Mechanics |
| Phase 4 | 1-2 weeks | Testing, Integration, Performance Validation |
| Phase 5 | 1-2 weeks | Scale to 1k+ Nodes, UX Polish |

**Total Estimated Duration: 10-16 weeks**

## Risk Mitigation

### Technical Risks
- **Performance Issues**: Mitigated by early Canvas/WebGL implementation and benchmarking
- **Complexity Overload**: Mitigated by starting with manageable scale and proven tooling
- **Integration Failures**: Mitigated by comprehensive API design and testing

### Content Risks
- **Data Accuracy**: Mitigated by systematic research and validation tools
- **Scale Challenges**: Mitigated by procedural layout helpers and editor tools
- **Maintenance Burden**: Mitigated by comprehensive testing and documentation

## Conclusion

This plan provides a systematic approach to building a complete POE2 talent tree replica while maintaining high performance, robustness, and maintainability. By following this phased approach with proper tooling and testing, we can deliver a system that matches POE2's complexity and visual fidelity while ensuring it's actually shippable and maintainable.

The key to success is starting with solid foundations (schema, validation, performance) and scaling up content systematically rather than trying to implement everything at once. This approach ensures we can validate each component thoroughly before moving to the next phase.
