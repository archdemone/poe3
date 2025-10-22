#!/usr/bin/env ts-node

// Smoke test script for item systems
import { generateItem } from '../src/gameplay/loot/itemGen';
import { computeEquipBonuses, zeroEquip, type EquipmentState } from '../src/gameplay/equipBonuses';
import { createDefaultStats, calculateDerivedStats } from '../src/gameplay/stats';
import { addItemToGrid, type InventoryGrid } from '../src/systems/items';

// Test-only logger for capturing warnings
class TestLogger {
  warnings: string[] = [];
  errors: string[] = [];

  warn(message: string) {
    this.warnings.push(message);
    console.warn(`[SMOKE] ${message}`);
  }

  error(message: string) {
    this.errors.push(message);
    console.error(`[SMOKE] ${message}`);
  }

  reset() {
    this.warnings = [];
    this.errors = [];
  }
}

const logger = new TestLogger();

function createTestEquipment(items: any[]): EquipmentState {
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

  const slots: (keyof EquipmentState)[] = ['helmet', 'chest', 'gloves', 'boots', 'amulet', 'ring', 'ring2', 'belt', 'weapon'];

  items.forEach((item, index) => {
    if (index < slots.length && item) {
      (equipment as any)[slots[index]] = item;
    }
  });

  return equipment;
}

async function runSmokeTest() {
  console.log('🚀 Starting item smoke test...\n');

  let testCount = 0;
  let errorCount = 0;

  try {
    // Test 1: Generate random items
    console.log('📦 Test 1: Generating random items...');
    const generatedItems: any[] = [];

    for (let i = 0; i < 100; i++) {
      testCount++;
      try {
        const item = generateItem(10, true); // Allow uniques
        if (item) {
          generatedItems.push(item);

          // Validate item structure
          if (!item.uid || !item.baseId || !item.affixes) {
            throw new Error(`Invalid item structure: ${JSON.stringify(item)}`);
          }

          // Check for NaN/Infinity in affixes
          for (const affix of item.affixes) {
            if (isNaN(affix.value) || !isFinite(affix.value)) {
              throw new Error(`Invalid affix value: ${affix.value} on item ${item.uid}`);
            }
          }
        }
      } catch (error) {
        logger.error(`Failed to generate item ${i}: ${error}`);
        errorCount++;
      }
    }

    console.log(`  ✅ Generated ${generatedItems.length} items successfully`);

    // Test 2: Equipment stat calculations
    console.log('⚔️  Test 2: Testing equipment stat calculations...');

    for (let i = 0; i < 50; i++) {
      testCount++;
      try {
        // Create random equipment
        const equipmentItems = generatedItems.slice(0, Math.floor(Math.random() * 8) + 1);
        const equipment = createTestEquipment(equipmentItems);

        const bonuses = computeEquipBonuses(equipment);

        // Check for invalid values
        Object.values(bonuses).forEach((value, index) => {
          if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
            throw new Error(`Invalid bonus value for stat ${index}: ${value}`);
          }
        });

        // Apply to character stats
        const baseStats = createDefaultStats(Math.random() > 0.5 ? 'warrior' : 'archer');
        const modifiedStats = {
          ...baseStats,
          strength: Math.max(0, baseStats.strength + bonuses.str),
          dexterity: Math.max(0, baseStats.dexterity + bonuses.dex),
          intelligence: Math.max(0, baseStats.intelligence + bonuses.int),
          maxHp: Math.max(1, baseStats.maxHp + bonuses.hp_flat),
          maxMp: Math.max(1, baseStats.maxMp + bonuses.mp_flat),
          armor: Math.max(0, baseStats.armor + bonuses.armor),
          evasion: Math.max(0, baseStats.evasion + bonuses.evasion),
        };

        const derived = calculateDerivedStats(modifiedStats, baseStats.strength > baseStats.dexterity ? 'warrior' : 'archer');

        // Validate derived stats
        if (derived.meleeDamage < 0 || derived.rangedDamage < 0 || derived.spellDamage < 0) {
          throw new Error(`Negative derived stats: ${JSON.stringify(derived)}`);
        }

        if (derived.physicalReduction > 95 || derived.dodgeChance > 95) {
          logger.warn(`High percentages: physical ${derived.physicalReduction}%, dodge ${derived.dodgeChance}%`);
        }

      } catch (error) {
        logger.error(`Equipment test ${i} failed: ${error}`);
        errorCount++;
      }
    }

    console.log('  ✅ Equipment calculations completed');

    // Test 3: Inventory operations
    console.log('🎒 Test 3: Testing inventory operations...');

    for (let i = 0; i < 25; i++) {
      testCount++;
      try {
        const grid: InventoryGrid = { width: 10, height: 6, items: [] };

        // Add random items to inventory
        const inventoryItems = generatedItems.slice(0, Math.min(generatedItems.length, 20));

        for (const item of inventoryItems) {
          // Try to place item at random positions
          let placed = false;
          for (let attempts = 0; attempts < 10 && !placed; attempts++) {
            const x = Math.floor(Math.random() * (grid.width - 1));
            const y = Math.floor(Math.random() * (grid.height - 1));
            placed = addItemToGrid(grid, item, x, y);
          }

          if (!placed) {
            logger.warn(`Could not place item ${item.uid} in inventory`);
          }
        }

        // Validate grid integrity
        if (grid.items.length > grid.width * grid.height) {
          throw new Error(`Too many items in grid: ${grid.items.length}`);
        }

        // Check for overlaps (basic check)
        for (let j = 0; j < grid.items.length; j++) {
          for (let k = j + 1; k < grid.items.length; k++) {
            const item1 = grid.items[j];
            const item2 = grid.items[k];

            // Simple overlap check (assuming 1x1 items for this test)
            if (item1.x === item2.x && item1.y === item2.y) {
              throw new Error(`Overlapping items at (${item1.x}, ${item1.y})`);
            }
          }
        }

      } catch (error) {
        logger.error(`Inventory test ${i} failed: ${error}`);
        errorCount++;
      }
    }

    console.log('  ✅ Inventory operations completed');

    // Test 4: Save/load simulation
    console.log('💾 Test 4: Testing save/load cycles...');

    for (let i = 0; i < 10; i++) {
      testCount++;
      try {
        // Create equipment and inventory
        const equipmentItems = generatedItems.slice(0, 3);
        const equipment = createTestEquipment(equipmentItems);

        // Simulate save (serialize)
        const saveData = {
          equipment,
          inventory: {
            grid: {
              width: 10,
              height: 6,
              items: generatedItems.slice(0, 5).map((item, index) => ({
                item,
                x: index % 10,
                y: Math.floor(index / 10),
              })),
            },
          },
        };

        // Simulate load (deserialize)
        const loadedEquipment = saveData.equipment;
        const loadedInventory = saveData.inventory.grid;

        // Validate loaded data
        if (loadedEquipment.weapon && !loadedEquipment.weapon.uid) {
          throw new Error('Invalid loaded equipment item');
        }

        for (const gridItem of loadedInventory.items) {
          if (!gridItem.item.uid || gridItem.x < 0 || gridItem.y < 0) {
            throw new Error(`Invalid loaded inventory item: ${JSON.stringify(gridItem)}`);
          }
        }

        // Test that stats are still calculable
        const loadedBonuses = computeEquipBonuses(loadedEquipment);
        Object.values(loadedBonuses).forEach(value => {
          if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
            throw new Error(`Invalid bonus after load: ${value}`);
          }
        });

      } catch (error) {
        logger.error(`Save/load test ${i} failed: ${error}`);
        errorCount++;
      }
    }

    console.log('  ✅ Save/load cycles completed');

    // Summary
    console.log('\n📊 Smoke Test Summary:');
    console.log(`   • Total tests: ${testCount}`);
    console.log(`   • Passed: ${testCount - errorCount}`);
    console.log(`   • Failed: ${errorCount}`);
    console.log(`   • Warnings: ${logger.warnings.length}`);

    if (logger.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      logger.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (errorCount > 0) {
      console.log('\n❌ Errors:');
      logger.errors.forEach(error => console.log(`   - ${error}`));
    }

    // Exit with error code if there were failures
    if (errorCount > 0) {
      console.log('\n💥 Smoke test failed!');
      process.exit(1);
    } else {
      console.log('\n✅ All smoke tests passed!');
      process.exit(0);
    }

  } catch (error) {
    console.error('💥 Smoke test crashed:', error);
    process.exit(1);
  }
}

runSmokeTest().catch(console.error);
