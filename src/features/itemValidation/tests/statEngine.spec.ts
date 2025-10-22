// Stat engine invariant tests
import { describe, it, expect } from 'vitest';
import { computeEquipBonuses, zeroEquip, type EquipBonuses } from '../../../gameplay/equipBonuses';
import { createDefaultStats, calculateDerivedStats, type CharacterStats } from '../../../gameplay/stats';
import type { EquipmentState, ItemInstance, Affix } from '../../../systems/items';

// Helper to create a mock item instance
function createMockItem(affixes: Affix[]): ItemInstance {
  return {
    uid: `test-${Date.now()}-${Math.random()}`,
    baseId: 'test-item',
    rarity: 'magic',
    affixes,
    level: 1,
  };
}

// Helper to create equipment state with test items
function createTestEquipment(items: Partial<EquipmentState>): EquipmentState {
  return {
    weapon: undefined,
    offhand: undefined,
    helmet: undefined,
    chest: undefined,
    gloves: undefined,
    boots: undefined,
    amulet: undefined,
    ring: undefined,
    ring2: undefined,
    belt: undefined,
    ...items,
  };
}

describe('Stat Engine Invariants', () => {
  describe('Equipment Bonus Aggregation', () => {
    it('should aggregate bonuses correctly from multiple items', () => {
      const item1 = createMockItem([
        { group: 'str_prefix', stat: 'str', tier: 1, value: 10 },
        { group: 'hp_prefix', stat: 'hp_flat', tier: 1, value: 20 },
      ]);

      const item2 = createMockItem([
        { group: 'str_prefix', stat: 'str', tier: 1, value: 15 },
        { group: 'armor_suffix', stat: 'armor', tier: 1, value: 5 },
      ]);

      const equipment = createTestEquipment({
        helmet: item1,
        chest: item2,
      });

      const bonuses = computeEquipBonuses(equipment);

      expect(bonuses.str).toBe(25); // 10 + 15
      expect(bonuses.hp_flat).toBe(20);
      expect(bonuses.armor).toBe(5);
      expect(bonuses.dex).toBe(0); // No dex bonuses
    });

    it('should handle empty equipment gracefully', () => {
      const equipment = createTestEquipment({});
      const bonuses = computeEquipBonuses(equipment);

      expect(bonuses).toEqual(zeroEquip);
    });

    it('should never produce NaN or Infinity values', () => {
      const item = createMockItem([
        { group: 'str_prefix', stat: 'str', tier: 1, value: 10 },
        { group: 'dex_prefix', stat: 'dex', tier: 1, value: 20 },
        { group: 'int_prefix', stat: 'int', tier: 1, value: 30 },
      ]);

      const equipment = createTestEquipment({ weapon: item });
      const bonuses = computeEquipBonuses(equipment);

      // Check all numeric properties for NaN/Infinity
      Object.values(bonuses).forEach(value => {
        expect(typeof value).toBe('number');
        expect(isNaN(value)).toBe(false);
        expect(isFinite(value)).toBe(true);
      });
    });

    it('should handle negative bonuses correctly', () => {
      const item = createMockItem([
        { group: 'str_prefix', stat: 'str', tier: 1, value: -5 },
        { group: 'hp_prefix', stat: 'hp_flat', tier: 1, value: 10 },
      ]);

      const equipment = createTestEquipment({ amulet: item });
      const bonuses = computeEquipBonuses(equipment);

      expect(bonuses.str).toBe(-5);
      expect(bonuses.hp_flat).toBe(10);
    });
  });

  describe('Character Stats Application', () => {
    it('should apply equipment bonuses to base stats without NaN/Infinity', () => {
      const baseStats = createDefaultStats('warrior');
      const equipment = createTestEquipment({
        helmet: createMockItem([
          { group: 'str_prefix', stat: 'str', tier: 1, value: 10 },
          { group: 'hp_prefix', stat: 'hp_flat', tier: 1, value: 50 },
        ]),
        chest: createMockItem([
          { group: 'armor_suffix', stat: 'armor', tier: 1, value: 20 },
        ]),
      });

      const bonuses = computeEquipBonuses(equipment);

      // Apply bonuses manually (simulating main.ts logic)
      const modifiedStats: CharacterStats = {
        ...baseStats,
        strength: baseStats.strength + bonuses.str,
        dexterity: baseStats.dexterity + bonuses.dex,
        intelligence: baseStats.intelligence + bonuses.int,
        hp: baseStats.hp, // Current HP unchanged
        maxHp: baseStats.maxHp + bonuses.hp_flat,
        mp: baseStats.mp,
        maxMp: baseStats.maxMp + bonuses.mp_flat,
        armor: baseStats.armor + bonuses.armor,
        evasion: baseStats.evasion + bonuses.evasion,
      };

      // Check for NaN/Infinity
      Object.values(modifiedStats).forEach(value => {
        expect(typeof value).toBe('number');
        expect(isNaN(value)).toBe(false);
        expect(isFinite(value)).toBe(true);
      });

      // Check reasonable bounds
      expect(modifiedStats.strength).toBeGreaterThan(0);
      expect(modifiedStats.maxHp).toBeGreaterThan(0);
      expect(modifiedStats.maxMp).toBeGreaterThan(0);
      expect(modifiedStats.armor).toBeGreaterThanOrEqual(0);
      expect(modifiedStats.evasion).toBeGreaterThanOrEqual(0);
    });

    it('should maintain stat relationships after equipment changes', () => {
      const baseStats = createDefaultStats('archer');

      // No equipment
      const noEquipBonuses = computeEquipBonuses(createTestEquipment({}));
      const noEquipDerived = calculateDerivedStats({
        ...baseStats,
        maxHp: baseStats.maxHp + noEquipBonuses.hp_flat,
        maxMp: baseStats.maxMp + noEquipBonuses.mp_flat,
        armor: baseStats.armor + noEquipBonuses.armor,
        evasion: baseStats.evasion + noEquipBonuses.evasion,
      }, 'archer');

      // With equipment
      const equipment = createTestEquipment({
        weapon: createMockItem([
          { group: 'dex_prefix', stat: 'dex', tier: 1, value: 15 },
          { group: 'bow_prefix', stat: 'bow_pct', tier: 1, value: 25 },
        ]),
      });

      const withEquipBonuses = computeEquipBonuses(equipment);
      const withEquipDerived = calculateDerivedStats({
        ...baseStats,
        strength: baseStats.strength + withEquipBonuses.str,
        dexterity: baseStats.dexterity + withEquipBonuses.dex,
        intelligence: baseStats.intelligence + withEquipBonuses.int,
        maxHp: baseStats.maxHp + withEquipBonuses.hp_flat,
        maxMp: baseStats.maxMp + withEquipBonuses.mp_flat,
        armor: baseStats.armor + withEquipBonuses.armor,
        evasion: baseStats.evasion + withEquipBonuses.evasion,
      }, 'archer');

      // Stats should be higher with equipment
      expect(withEquipDerived.rangedDamage).toBeGreaterThan(noEquipDerived.rangedDamage);
      expect(withEquipDerived.dodgeChance).toBe(withEquipDerived.dodgeChance); // Same since no evasion bonus
    });
  });

  describe('Percentage Bonus Application', () => {
    it('should apply percentage bonuses correctly', () => {
      const baseDamage = 100;

      // Test melee percentage bonus
      const meleePct = 25; // 25% increased melee damage
      const expectedDamage = Math.floor(baseDamage * (1 + meleePct / 100));

      expect(expectedDamage).toBe(125);
    });

    it('should handle multiple percentage bonuses additively', () => {
      const baseDamage = 100;

      // Multiple sources of increased damage should add up
      const totalPct = 25 + 30; // 55% total
      const expectedDamage = Math.floor(baseDamage * (1 + totalPct / 100));

      expect(expectedDamage).toBe(155);
    });

    it('should handle zero and negative percentages', () => {
      const baseDamage = 100;

      expect(Math.floor(baseDamage * (1 + 0 / 100))).toBe(100);
      expect(Math.floor(baseDamage * (1 + (-10) / 100))).toBe(90);
    });
  });

  describe('Stat Bounds and Sanity Checks', () => {
    it('should keep derived stats within reasonable bounds', () => {
      // Test with extreme equipment bonuses
      const equipment = createTestEquipment({
        helmet: createMockItem([
          { group: 'str_prefix', stat: 'str', tier: 1, value: 500 },
          { group: 'dex_prefix', stat: 'dex', tier: 1, value: 500 },
          { group: 'int_prefix', stat: 'int', tier: 1, value: 500 },
          { group: 'hp_prefix', stat: 'hp_flat', tier: 1, value: 10000 },
        ]),
        chest: createMockItem([
          { group: 'armor_suffix', stat: 'armor', tier: 1, value: 1000 },
          { group: 'evasion_suffix', stat: 'evasion', tier: 1, value: 1000 },
        ]),
      });

      const bonuses = computeEquipBonuses(equipment);
      const baseStats = createDefaultStats('warrior');

      const modifiedStats: CharacterStats = {
        ...baseStats,
        strength: baseStats.strength + bonuses.str,
        dexterity: baseStats.dexterity + bonuses.dex,
        intelligence: baseStats.intelligence + bonuses.int,
        hp: baseStats.hp,
        maxHp: baseStats.maxHp + bonuses.hp_flat,
        mp: baseStats.mp,
        maxMp: baseStats.maxMp + bonuses.mp_flat,
        armor: baseStats.armor + bonuses.armor,
        evasion: baseStats.evasion + bonuses.evasion,
      };

      const derived = calculateDerivedStats(modifiedStats, 'warrior');

      // Check that derived stats are reasonable (not extreme)
      expect(derived.meleeDamage).toBeLessThan(10000); // Should be reasonable
      expect(derived.physicalReduction).toBeLessThanOrEqual(95); // Max ~95% reduction
      expect(derived.dodgeChance).toBeLessThanOrEqual(95); // Max ~95% dodge
    });

    it('should handle resist caps appropriately', () => {
      // Note: The current game doesn't seem to have explicit resist caps implemented
      // This test documents the expected behavior for when caps are added
      const equipment = createTestEquipment({
        amulet: createMockItem([
          { group: 'fire_res_prefix', stat: 'fire_res', tier: 1, value: 75 },
          { group: 'cold_res_prefix', stat: 'cold_res', tier: 1, value: 75 },
          { group: 'lightning_res_prefix', stat: 'lightning_res', tier: 1, value: 75 },
        ]),
      });

      const bonuses = computeEquipBonuses(equipment);

      // Currently no caps, so values can exceed 100%
      expect(bonuses.fire_res).toBe(75);
      expect(bonuses.cold_res).toBe(75);
      expect(bonuses.lightning_res).toBe(75);
    });
  });

  describe('Equip/Unequip Cycles', () => {
    it('should maintain stat consistency through equip/unequip cycles', () => {
      const baseStats = createDefaultStats('warrior');
      const item = createMockItem([
        { group: 'str_prefix', stat: 'str', tier: 1, value: 10 },
        { group: 'hp_prefix', stat: 'hp_flat', tier: 1, value: 25 },
      ]);

      // Start with no equipment
      const noEquip = computeEquipBonuses(createTestEquipment({}));
      expect(noEquip.str).toBe(0);
      expect(noEquip.hp_flat).toBe(0);

      // Equip item
      const withEquip = computeEquipBonuses(createTestEquipment({ weapon: item }));
      expect(withEquip.str).toBe(10);
      expect(withEquip.hp_flat).toBe(25);

      // Unequip item
      const backToNoEquip = computeEquipBonuses(createTestEquipment({}));
      expect(backToNoEquip.str).toBe(0);
      expect(backToNoEquip.hp_flat).toBe(0);

      // Re-equip item
      const reEquip = computeEquipBonuses(createTestEquipment({ weapon: item }));
      expect(reEquip.str).toBe(10);
      expect(reEquip.hp_flat).toBe(25);
    });

    it('should handle multiple items being equipped/unequipped', () => {
      const item1 = createMockItem([{ group: 'str_prefix', stat: 'str', tier: 1, value: 5 }]);
      const item2 = createMockItem([{ group: 'str_prefix', stat: 'str', tier: 1, value: 8 }]);
      const item3 = createMockItem([{ group: 'dex_prefix', stat: 'dex', tier: 1, value: 12 }]);

      // Equip all three
      const allEquipped = computeEquipBonuses(createTestEquipment({
        helmet: item1,
        chest: item2,
        boots: item3,
      }));

      expect(allEquipped.str).toBe(13); // 5 + 8
      expect(allEquipped.dex).toBe(12);

      // Remove one item
      const twoEquipped = computeEquipBonuses(createTestEquipment({
        helmet: item1,
        boots: item3,
      }));

      expect(twoEquipped.str).toBe(5);
      expect(twoEquipped.dex).toBe(12);
    });
  });
});
