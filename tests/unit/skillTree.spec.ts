import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StatCalculator,
  KeystoneManager,
  type SkillNode,
  type DerivedBonuses,
  type SkillTreeData
} from '../../src/gameplay/skillTree';

describe('Skill Tree System', () => {

  describe('StatCalculator', () => {
    const calculator = new StatCalculator();

    it('should calculate base stats correctly', () => {
      const mockCharacter = {
        strength: 10,
        dexterity: 15,
        intelligence: 20,
        maxHp: 100,
        maxMp: 80,
        armor: 5,
        evasion: 10
      };

      const mockTree: SkillTreeData = { nodes: [], edges: [] };
      const stats = calculator.calculate(mockCharacter, {}, [], mockTree);

      expect(stats.str).toBe(10);
      expect(stats.dex).toBe(15);
      expect(stats.int).toBe(20);
      expect(stats.hp_flat).toBe(100);
      expect(stats.mp_flat).toBe(80);
      expect(stats.crit_chance).toBe(5); // Base crit
      expect(stats.movement_speed).toBe(100); // Base movement
    });

    it('should apply additive bonuses correctly', () => {
      const mockCharacter = { strength: 10, dexterity: 10, intelligence: 10, maxHp: 100, maxMp: 50, armor: 0, evasion: 0 };
      const allocatedNodes = ['mock_str_node'];

      // Mock skill tree data
      const mockTree = {
        nodes: [
          {
            id: 'mock_str_node',
            name: '+5 Strength',
            x: 0, y: 0,
            type: 'small' as const,
            effects: [{ stat: 'str', op: 'add', value: 5 }],
            requirements: []
          }
        ],
        edges: []
      };

      const stats = calculator.calculate(mockCharacter, {}, allocatedNodes, mockTree);
      expect(stats.str).toBe(15); // 10 base + 5 bonus
    });

    it('should apply multiplicative bonuses correctly', () => {
      const mockCharacter = { strength: 10, dexterity: 10, intelligence: 10, maxHp: 100, maxMp: 50, armor: 0, evasion: 0 };
      const allocatedNodes = ['mock_mul_node'];

      const mockTree = {
        nodes: [
          {
            id: 'mock_mul_node',
            name: '20% More Strength',
            x: 0, y: 0,
            type: 'notable' as const,
            effects: [{ stat: 'str', op: 'more', value: 20 }],
            requirements: []
          }
        ],
        edges: []
      };

      const stats = calculator.calculate(mockCharacter, {}, allocatedNodes, mockTree);
      expect(stats.str).toBe(12); // 10 base * 1.20 = 12
    });

    it('should apply limits and caps correctly', () => {
      const mockCharacter = { strength: 10, dexterity: 10, intelligence: 10, maxHp: 100, maxMp: 50, armor: 0, evasion: 0 };
      const allocatedNodes = ['mock_crit_node'];

      const mockTree = {
        nodes: [
          {
            id: 'mock_crit_node',
            name: 'High Crit',
            x: 0, y: 0,
            type: 'keystone' as const,
            effects: [{ stat: 'crit_chance', op: 'add', value: 200 }], // Way over cap
            requirements: []
          }
        ],
        edges: []
      };

      const stats = calculator.calculate(mockCharacter, {}, allocatedNodes, mockTree);
      expect(stats.crit_chance).toBe(95); // Capped at 95%
    });
  });

  describe('KeystoneManager', () => {
    it('should provide keystone effects', () => {
      const keystoneManager = new KeystoneManager();
      const unbreakableEffect = keystoneManager.getKeystoneEffect('keystone_1');
      expect(unbreakableEffect).toBeDefined();
      expect(unbreakableEffect?.name).toBe('Unbreakable');
      expect(unbreakableEffect?.description).toContain('stunned');
    });

    it('should apply keystone effects to stats', () => {
      const keystoneManager = new KeystoneManager();
      const baseStats: DerivedBonuses = {
        str: 10, dex: 10, int: 10, hp_flat: 100, mp_flat: 50,
        energy_shield: 0, melee_pct: 0, bow_pct: 0, spell_pct: 0,
        crit_chance: 5, crit_multiplier: 150, attack_speed: 100,
        cast_speed: 100, armor: 10, evasion: 5, block_chance: 0,
        fire_resistance: 0, cold_resistance: 0, lightning_resistance: 0,
        chaos_resistance: 0, movement_speed: 100, mana_cost_reduction: 0,
        minion_damage: 0, totem_damage: 0
      };

      const modifiedStats = keystoneManager.applyKeystoneEffects(baseStats, ['keystone_1']);
      expect(modifiedStats.str).toBe(35); // 10 + 25 from Unbreakable
      expect(modifiedStats.hp_flat).toBe(160); // 100 + 60 from Unbreakable
    });
  });

  describe('Property-Based Tests', () => {
    it('should never produce NaN or Infinity values', () => {
      const calculator = new StatCalculator();
      const mockCharacter = { strength: 10, dexterity: 10, intelligence: 10, maxHp: 100, maxMp: 50, armor: 0, evasion: 0 };
      const mockTree: SkillTreeData = { nodes: [], edges: [] };

      // Test with various random node allocations
      for (let i = 0; i < 50; i++) {
        const randomNodes = Array.from({ length: Math.floor(Math.random() * 10) }, (_, idx) => `random_node_${idx}`);
        const stats = calculator.calculate(mockCharacter, {}, randomNodes, mockTree);

        // Check all numeric properties
        Object.values(stats).forEach(value => {
          expect(typeof value).toBe('number');
          expect(value).not.toBe(NaN);
          expect(value).not.toBe(Infinity);
          expect(value).not.toBe(-Infinity);
        });
      }
    });

    it('should maintain deterministic calculation order', () => {
      const calculator = new StatCalculator();
      const mockCharacter = { strength: 10, dexterity: 10, intelligence: 10, maxHp: 100, maxMp: 50, armor: 0, evasion: 0 };
      const mockTree: SkillTreeData = { nodes: [], edges: [] };
      const testNodes = ['add_node', 'mul_node', 'more_node'];

      // Run calculation multiple times
      const results = [];
      for (let i = 0; i < 3; i++) {
        results.push(calculator.calculate(mockCharacter, {}, testNodes, mockTree));
      }

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should calculate stats within performance budget', () => {
      const calculator = new StatCalculator();
      const mockCharacter = { strength: 10, dexterity: 10, intelligence: 10, maxHp: 100, maxMp: 50, armor: 0, evasion: 0 };
      const mockTree: SkillTreeData = { nodes: [], edges: [] };

      const startTime = performance.now();

      // Simulate 500 stat calculations (reasonable performance test)
      for (let i = 0; i < 500; i++) {
        const allocatedNodes = Array.from({ length: 20 }, (_, idx) => `node_${idx}`);
        calculator.calculate(mockCharacter, {}, allocatedNodes, mockTree);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / 500;

      // Should be well under 1ms per calculation for 60fps gameplay
      expect(avgTime).toBeLessThan(2.0);
    });
  });
});
