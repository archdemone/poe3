// Property-based tests for randomized item scenarios
import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';

import { computeEquipBonuses, zeroEquip, type EquipBonuses } from '../../../gameplay/equipBonuses';
import { generateItem } from '../../../gameplay/loot/itemGen';
import { createDefaultStats, calculateDerivedStats, type CharacterStats } from '../../../gameplay/stats';
import type { EquipmentState, ItemInstance } from '../../../systems/items';

// Mock item generator for testing
function createMockItemWithStats(affixes: Array<{ stat: string; value: number }>): ItemInstance {
  return {
    uid: `test-${Date.now()}-${Math.random()}`,
    baseId: 'test-item',
    rarity: 'rare',
    affixes: affixes.map((affix, index) => ({
      group: `test_group_${index}`,
      stat: affix.stat,
      tier: 1,
      value: affix.value,
    })),
    level: 1,
  };
}

// Create equipment state with specific items
function createEquipmentWithItems(items: ItemInstance[]): EquipmentState {
  const equipment: EquipmentState = {
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
  };

  const slots: (keyof EquipmentState)[] = ['helmet', 'chest', 'gloves', 'boots', 'amulet', 'ring', 'ring2', 'belt', 'weapon', 'offhand'];

  items.forEach((item, index) => {
    if (index < slots.length) {
      (equipment as any)[slots[index]] = item;
    }
  });

  return equipment;
}

// Property-based test arbitraries
const statKeyArb = fc.oneof(
  fc.constant('str'),
  fc.constant('dex'),
  fc.constant('int'),
  fc.constant('hp_flat'),
  fc.constant('mp_flat'),
  fc.constant('armor'),
  fc.constant('melee_pct'),
  fc.constant('bow_pct'),
  fc.constant('fire_res'),
  fc.constant('cold_res'),
  fc.constant('lightning_res')
);

const affixArb = fc.record({
  stat: statKeyArb,
  value: fc.integer({ min: -100, max: 500 }), // Allow negative values for some stats
});

const itemArb = fc.array(affixArb, { minLength: 0, maxLength: 6 }).map(affixes =>
  createMockItemWithStats(affixes)
);

const equipmentArb = fc.array(itemArb, { minLength: 0, maxLength: 10 }).map(items =>
  createEquipmentWithItems(items)
);

describe('Property-Based Item Testing', () => {
  describe('Stat Engine Invariants Under Random Conditions', () => {
    it('should never produce NaN or Infinity with random equipment', () => {
      fc.assert(
        fc.property(equipmentArb, (equipment) => {
          const bonuses = computeEquipBonuses(equipment);

          // Check all numeric properties
          Object.values(bonuses).forEach(value => {
            expect(typeof value).toBe('number');
            expect(isNaN(value)).toBe(false);
            expect(isFinite(value)).toBe(true);
          });

          // Bonuses should be reasonable (not extreme)
          expect(bonuses.str).toBeGreaterThanOrEqual(-1000);
          expect(bonuses.str).toBeLessThanOrEqual(10000);
          expect(bonuses.hp_flat).toBeGreaterThanOrEqual(-5000);
          expect(bonuses.hp_flat).toBeLessThanOrEqual(50000);
        }),
        { numRuns: 1000 }
      );
    });

    it('should maintain stat consistency through multiple equip operations', () => {
      fc.assert(
        fc.property(
          fc.array(itemArb, { minLength: 1, maxLength: 5 }),
          fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 5, maxLength: 20 }),
          (items, operations) => {
            const equipment: EquipmentState = {
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
            };

            const slots: (keyof EquipmentState)[] = ['helmet', 'chest', 'gloves', 'boots', 'amulet'];

            // Perform random equip/unequip operations
            for (const op of operations) {
              const slotIndex = op % slots.length;
              const slot = slots[slotIndex];
              const itemIndex = op % items.length;

              if (op % 2 === 0) {
                // Equip
                (equipment as any)[slot] = items[itemIndex];
              } else {
                // Unequip
                (equipment as any)[slot] = undefined;
              }

              // After each operation, stats should still be valid
              const bonuses = computeEquipBonuses(equipment);
              Object.values(bonuses).forEach(value => {
                expect(typeof value).toBe('number');
                expect(isNaN(value)).toBe(false);
                expect(isFinite(value)).toBe(true);
              });
            }
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should handle stat stacking correctly', () => {
      fc.assert(
        fc.property(
          fc.array(affixArb, { minLength: 1, maxLength: 10 }),
          (affixes) => {
            // Create an item with multiple affixes of the same stat
            const item = createMockItemWithStats(affixes);

            const equipment = createEquipmentWithItems([item]);
            const bonuses = computeEquipBonuses(equipment);

            // Check that bonuses are summed correctly for each stat
            const expectedBonuses: Partial<EquipBonuses> = { ...zeroEquip };

            for (const affix of affixes) {
              (expectedBonuses as any)[affix.stat] = ((expectedBonuses as any)[affix.stat] || 0) + affix.value;
            }

            // Verify the computed bonuses match expectations
            for (const stat of ['str', 'dex', 'int', 'hp_flat', 'mp_flat', 'armor']) {
              expect(bonuses[stat as keyof EquipBonuses]).toBe(expectedBonuses[stat as keyof EquipBonuses]);
            }
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Character Stat Integration', () => {
    it('should maintain derived stat relationships with random bonuses', () => {
      fc.assert(
        fc.property(equipmentArb, (equipment) => {
          const baseStats = createDefaultStats('warrior');
          const bonuses = computeEquipBonuses(equipment);

          // Apply bonuses
          const modifiedStats: CharacterStats = {
            ...baseStats,
            strength: Math.max(0, baseStats.strength + bonuses.str),
            dexterity: Math.max(0, baseStats.dexterity + bonuses.dex),
            intelligence: Math.max(0, baseStats.intelligence + bonuses.int),
            hp: baseStats.hp,
            maxHp: Math.max(1, baseStats.maxHp + bonuses.hp_flat),
            mp: baseStats.mp,
            maxMp: Math.max(1, baseStats.maxMp + bonuses.mp_flat),
            armor: Math.max(0, baseStats.armor + bonuses.armor),
            evasion: Math.max(0, baseStats.evasion + bonuses.evasion),
          };

          const derived = calculateDerivedStats(modifiedStats, 'warrior');

          // Derived stats should be reasonable and consistent
          expect(derived.meleeDamage).toBeGreaterThanOrEqual(0);
          expect(derived.rangedDamage).toBeGreaterThanOrEqual(0);
          expect(derived.spellDamage).toBeGreaterThanOrEqual(0);
          expect(derived.physicalReduction).toBeGreaterThanOrEqual(0);
          expect(derived.dodgeChance).toBeGreaterThanOrEqual(0);
          expect(derived.dodgeChance).toBeLessThanOrEqual(95); // Max ~95% dodge

          // Higher attributes should generally lead to higher derived stats
          const baseDerived = calculateDerivedStats(baseStats, 'warrior');
          if (modifiedStats.strength > baseStats.strength) {
            expect(derived.meleeDamage).toBeGreaterThanOrEqual(baseDerived.meleeDamage);
          }
        }),
        { numRuns: 300 }
      );
    });
  });

  describe('Item Generation Consistency', () => {
    it('should generate valid items with consistent properties', () => {
      // Note: generateItem() uses Math.random(), so we can't easily property test it
      // But we can test that multiple generations produce valid results
      for (let i = 0; i < 100; i++) {
        const item = generateItem(10, true); // Area level 10, allow uniques

        if (item) {
          // Item should have required properties
          expect(item.uid).toBeDefined();
          expect(item.baseId).toBeDefined();
          expect(['normal', 'magic', 'rare', 'unique']).toContain(item.rarity);
          expect(Array.isArray(item.affixes)).toBe(true);
          expect(typeof item.level).toBe('number');
          expect(item.level).toBeGreaterThan(0);

          // Affixes should be valid
          for (const affix of item.affixes) {
            expect(affix.group).toBeDefined();
            expect(affix.stat).toBeDefined();
            expect(typeof affix.tier).toBe('number');
            expect(typeof affix.value).toBe('number');
            expect(isNaN(affix.value)).toBe(false);
            expect(isFinite(affix.value)).toBe(true);
          }
        }
      }
    });

    it('should handle equip/unequip cycles without data corruption', () => {
      fc.assert(
        fc.property(
          fc.array(itemArb, { minLength: 1, maxLength: 3 }),
          (items) => {
            const equipment = createEquipmentWithItems([]);

            // Simulate multiple equip/unequip cycles
            for (let cycle = 0; cycle < 5; cycle++) {
              // Equip all items
              const equipped = createEquipmentWithItems(items);
              const bonusesEquipped = computeEquipBonuses(equipped);

              // Unequip all items
              const unequipped = createEquipmentWithItems([]);
              const bonusesUnequipped = computeEquipBonuses(unequipped);

              // Unequipped should have zero bonuses
              expect(bonusesUnequipped).toEqual(zeroEquip);

              // Re-equip should give same bonuses
              const reEquipped = createEquipmentWithItems(items);
              const bonusesReEquipped = computeEquipBonuses(reEquipped);

              expect(bonusesReEquipped).toEqual(bonusesEquipped);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extreme stat values gracefully', () => {
      const extremeAffixes = [
        { stat: 'str', value: 999999 },
        { stat: 'hp_flat', value: -999999 },
        { stat: 'armor', value: 999999 },
      ];

      const item = createMockItemWithStats(extremeAffixes);
      const equipment = createEquipmentWithItems([item]);
      const bonuses = computeEquipBonuses(equipment);

      // Should not crash or produce invalid values
      expect(typeof bonuses.str).toBe('number');
      expect(typeof bonuses.hp_flat).toBe('number');
      expect(typeof bonuses.armor).toBe('number');

      // Should handle large numbers (though in practice they'd be clamped)
      expect(bonuses.str).toBe(999999);
      expect(bonuses.hp_flat).toBe(-999999);
      expect(bonuses.armor).toBe(999999);
    });

    it('should handle empty and minimal item configurations', () => {
      // Empty equipment
      const emptyEquipment = createEquipmentWithItems([]);
      const emptyBonuses = computeEquipBonuses(emptyEquipment);
      expect(emptyBonuses).toEqual(zeroEquip);

      // Equipment with single affix
      const singleAffixItem = createMockItemWithStats([{ stat: 'str', value: 10 }]);
      const singleEquipment = createEquipmentWithItems([singleAffixItem]);
      const singleBonuses = computeEquipBonuses(singleEquipment);

      expect(singleBonuses.str).toBe(10);
      expect(singleBonuses.dex).toBe(0);
    });
  });
});
