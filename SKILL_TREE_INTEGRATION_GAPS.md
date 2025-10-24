# Skill Tree Integration Gaps & Missing Connections

**Date:** 2025-10-24
**Purpose:** Document all stats/effects that are implemented in the skill tree but not yet connected to in-game systems

---

## 🔴 CRITICAL: Stats Not Yet Applied In-Game

The following stats are calculated by the skill tree system but **NOT yet applied to the player character** during gameplay:

### Offensive Stats (Not Applied)
| Stat | Current Status | Where It Should Be Applied | Impact |
|------|----------------|---------------------------|---------|
| `melee_pct` | ✅ Calculated | ❌ Not applied to melee damage | Melee damage bonuses from tree don't work |
| `bow_pct` | ✅ Calculated | ❌ Not applied to ranged damage | Bow damage bonuses from tree don't work |
| `spell_pct` | ✅ Calculated | ❌ Not applied to spell damage | Spell damage bonuses from tree don't work |
| `crit_chance` | ✅ Calculated | ❌ Not applied to combat | Critical strikes don't use tree bonuses |
| `crit_multiplier` | ✅ Calculated | ❌ Not applied to combat | Crit damage multiplier not enhanced |
| `attack_speed` | ✅ Calculated | ❌ Not applied to attack timing | Attack speed bonuses don't work |
| `cast_speed` | ✅ Calculated | ❌ Not applied to spell casting | Cast speed bonuses don't work |
| `accuracy` | ✅ Calculated | ❌ Not applied to hit chance | Accuracy bonuses don't affect hits |

### Defensive Stats (Not Applied)
| Stat | Current Status | Where It Should Be Applied | Impact |
|------|----------------|---------------------------|---------|
| `armor` | ✅ Calculated | ⚠️ **Partially applied** via CharacterStats | Tree bonuses may not add to base |
| `evasion` | ✅ Calculated | ⚠️ **Partially applied** via CharacterStats | Tree bonuses may not add to base |
| `energy_shield` | ✅ Calculated | ❌ Not implemented in game | Energy shield mechanic missing |
| `block_chance` | ✅ Calculated | ❌ Not applied to combat | Block chance doesn't work |
| `dodge_chance` | ✅ Calculated | ❌ Not applied to combat | Dodge chance doesn't work |
| `stun_threshold` | ✅ Calculated | ❌ Not applied to combat | Stun resistance doesn't work |
| `stun_duration` | ✅ Calculated | ❌ Not applied to combat | Stun duration modification doesn't work |

### Resistance Stats (Not Applied)
| Stat | Current Status | Where It Should Be Applied | Impact |
|------|----------------|---------------------------|---------|
| `fire_resistance` | ✅ Calculated | ⚠️ **Partially in CharacterStats** | Tree bonuses may not add correctly |
| `cold_resistance` | ✅ Calculated | ⚠️ **Partially in CharacterStats** | Tree bonuses may not add correctly |
| `lightning_resistance` | ✅ Calculated | ⚠️ **Partially in CharacterStats** | Tree bonuses may not add correctly |
| `chaos_resistance` | ✅ Calculated | ❌ Not implemented in game | Chaos damage/resistance not in game |

### Utility Stats (Not Applied)
| Stat | Current Status | Where It Should Be Applied | Impact |
|------|----------------|---------------------------|---------|
| `movement_speed` | ✅ Calculated | ❌ Not applied to player movement | Movement speed bonuses don't work |
| `mana_cost_reduction` | ✅ Calculated | ❌ Not applied to skill costs | Mana cost reduction doesn't work |
| `mana_regen` | ✅ Calculated | ❌ Not applied to mana regeneration | Mana regen bonuses don't work |
| `minion_damage` | ✅ Calculated | ❌ No minion system in game | Minion stats have no effect |
| `totem_damage` | ✅ Calculated | ❌ No totem system in game | Totem stats have no effect |

### Core Attributes (✅ Partially Applied)
| Stat | Current Status | Where It Should Be Applied | Impact |
|------|----------------|---------------------------|---------|
| `str` | ✅ Calculated | ⚠️ **Stored in CharacterStats** but not synced | Strength adds to base but tree bonuses need integration |
| `dex` | ✅ Calculated | ⚠️ **Stored in CharacterStats** but not synced | Dexterity adds to base but tree bonuses need integration |
| `int` | ✅ Calculated | ⚠️ **Stored in CharacterStats** but not synced | Intelligence adds to base but tree bonuses need integration |
| `hp_flat` | ✅ Calculated | ⚠️ **Stored in CharacterStats** as maxHp | Needs to add to base maxHp from gear/level |
| `mp_flat` | ✅ Calculated | ⚠️ **Stored in CharacterStats** as maxMp | Needs to add to base maxMp from gear/level |

---

## 🟡 MEDIUM PRIORITY: System Integration Gaps

### 1. Character Level System ❌ NOT INTEGRATED
**Current Status:**
- `SaveData.meta.level` exists
- Skill tree has level requirements but they're **stubbed out** (always returns true)
- Character level is not tracked during gameplay
- No experience/leveling system

**Impact:**
- Level requirements on nodes don't work
- No character progression system
- Passive points not gained on level up

**Required Implementation:**
```typescript
// Add to CharacterStats
export interface CharacterStats {
  // ... existing fields
  level: number;        // ❌ MISSING
  experience: number;   // ❌ MISSING
  experienceToNext: number; // ❌ MISSING
}

// Add to skill tree
function checkRequirement(req: NodeRequirement): boolean {
  switch (req.type) {
    case 'level':
      // ❌ Currently: return true;
      // ✅ Should: return characterLevel >= req.value;
  }
}
```

### 2. Class Requirement System ❌ NOT INTEGRATED
**Current Status:**
- `SaveData.character.class` exists ('warrior' | 'archer')
- Class requirements in skill tree are **stubbed out** (always returns true)
- No class-specific starting positions

**Impact:**
- Can't create class-exclusive nodes
- All nodes accessible to all classes
- No class identity in tree

**Required Implementation:**
```typescript
// Add class-specific nodes
{
  id: 'warrior_exclusive_node',
  requirements: [
    { type: 'class', value: 'warrior' }  // ❌ This doesn't work yet
  ]
}

// Fix validation
function checkRequirement(req: NodeRequirement): boolean {
  switch (req.type) {
    case 'class':
      // ❌ Currently: return true;
      // ✅ Should: return characterClass === req.value;
  }
}
```

### 3. Equipment Stats Integration ⚠️ PARTIAL
**Current Status:**
- Equipment provides base stats
- Equipment stats are in `CharacterStats`
- Skill tree bonuses **calculated separately**
- **No mechanism to merge equipment + tree bonuses**

**Impact:**
- Equipment and tree bonuses don't stack properly
- Percentage modifiers from tree don't affect equipment stats
- Final stats shown may not match actual stats

**Required Implementation:**
```typescript
// Need a unified stat calculation function
export function calculateFinalStats(
  baseStats: CharacterStats,    // From character + equipment
  treeStats: DerivedBonuses      // From skill tree
): CharacterStats {
  // Merge base + tree bonuses
  // Apply percentage modifiers to equipment base values
  // Return final stats
}
```

---

## 🟢 LOW PRIORITY: Feature Gaps

### 4. Keystone Special Effects ⚠️ PARTIAL
**Current Status:**
- 5 keystones implemented with stat modifications
- Keystones modify stats correctly
- **No special gameplay effects beyond stats**

**Examples of Missing Effects:**
```typescript
// Unbreakable: "Cannot be stunned"
// ✅ Stats: +25 str, +60 hp, +20% armor
// ❌ Gameplay: Stun immunity not implemented in combat

// Wind Dancer: Dodge-based playstyle
// ✅ Stats: +30 dex, +15% movement, +10% dodge
// ❌ Gameplay: Dodge mechanic not in combat system
```

### 5. Passive Point Gain ❌ NOT IMPLEMENTED
**Current Status:**
- Start with 100 passive points (hardcoded in tree generation)
- No way to gain more points
- No level-up integration

**Required:**
- Award passive points on level up (1 per level typical)
- Award passive points for quest completion
- Store passive point count in SaveData

### 6. Tree Respec System ❌ NOT IMPLEMENTED
**Current Status:**
- Can refund individual nodes (if no dependencies)
- Can reset entire tree
- **No cost system for respec**
- **No respec currency/items**

**Should Have:**
- Respec currency (Orb of Regret in POE)
- Cost to refund nodes
- Full respec option (expensive)

---

## 📋 Integration Checklist

### Immediate Actions Required

#### 1. Create Stat Merge Function ⚡ HIGH PRIORITY
```typescript
// File: src/gameplay/stats.ts

/**
 * Merge character base stats with skill tree bonuses
 */
export function mergeStatsWithTreeBonuses(
  baseStats: CharacterStats,
  treeBonuses: DerivedBonuses
): CharacterStats {
  return {
    // Attributes: base + tree flat bonuses
    strength: baseStats.strength + treeBonuses.str,
    dexterity: baseStats.dexterity + treeBonuses.dex,
    intelligence: baseStats.intelligence + treeBonuses.int,

    // HP/MP: base + tree flat bonuses
    maxHp: baseStats.maxHp + treeBonuses.hp_flat,
    maxMp: baseStats.maxMp + treeBonuses.mp_flat,
    hp: Math.min(baseStats.hp, baseStats.maxHp + treeBonuses.hp_flat),
    mp: Math.min(baseStats.mp, baseStats.maxMp + treeBonuses.mp_flat),

    // Defense: base + tree flat, then apply % modifiers
    armor: baseStats.armor + treeBonuses.armor,
    evasion: baseStats.evasion + treeBonuses.evasion,
    energyShield: treeBonuses.energy_shield,
    maxEnergyShield: treeBonuses.energy_shield,

    // Resistances: base + tree
    fireResistance: baseStats.fireResistance + treeBonuses.fire_resistance,
    coldResistance: baseStats.coldResistance + treeBonuses.cold_resistance,
    lightningResistance: baseStats.lightningResistance + treeBonuses.lightning_resistance,
    chaosResistance: baseStats.chaosResistance + treeBonuses.chaos_resistance,

    // Accuracy: base + tree
    accuracy: baseStats.accuracy + treeBonuses.accuracy,
  };
}
```

#### 2. Add Level to CharacterStats ⚡ HIGH PRIORITY
```typescript
// File: src/gameplay/stats.ts

export interface CharacterStats {
  // Add these fields:
  level: number;           // ❌ MISSING - Add this
  experience: number;      // ❌ MISSING - Add this
  experienceToNext: number; // ❌ MISSING - Add this

  // ... existing fields
}
```

#### 3. Integrate Tree with Main Game Loop ⚡ HIGH PRIORITY
```typescript
// File: src/main.ts

// After skill tree changes, recalculate character stats
function onSkillTreeChange(): void {
  // 1. Get tree bonuses
  const treeBonuses = computePassiveBonuses(getSkillTree());

  // 2. Get base stats (from character + equipment)
  const baseStats = currentStats;

  // 3. Merge them
  const finalStats = mergeStatsWithTreeBonuses(baseStats, treeBonuses);

  // 4. Update current stats
  currentStats = finalStats;

  // 5. Update UI
  updateCharacterSheet(finalStats, playerClass);

  // 6. Update save data
  currentSaveData.character.stats = finalStats;
}
```

#### 4. Implement Level Requirements ⚠️ MEDIUM PRIORITY
```typescript
// File: src/gameplay/skillTree.ts

// Add character level parameter
export function canAllocateNode(nodeId: string, characterLevel: number): boolean {
  const node = getNode(nodeId);
  if (!node) return false;

  // Check level requirements
  for (const req of node.requirements) {
    if (req.type === 'level' && characterLevel < req.value) {
      return false; // Not high enough level
    }
  }

  // ... rest of checks
}
```

#### 5. Implement Class Requirements ⚠️ MEDIUM PRIORITY
```typescript
// File: src/gameplay/skillTree.ts

// Add character class parameter
export function canAllocateNode(
  nodeId: string,
  characterLevel: number,
  characterClass: 'warrior' | 'archer'
): boolean {
  const node = getNode(nodeId);
  if (!node) return false;

  // Check class requirements
  for (const req of node.requirements) {
    if (req.type === 'class' && characterClass !== req.value) {
      return false; // Wrong class
    }
  }

  // ... rest of checks
}
```

---

## 🎮 Gameplay Impact Summary

### What Works Now ✅
1. **Tree UI**: Full navigation, allocation, refund, tooltips
2. **Stat Calculation**: All 25 stats calculated correctly
3. **Keystone Effects**: Stat modifications work
4. **Save/Load**: Tree state persists correctly
5. **Performance**: Smooth 60fps with 553 nodes

### What Doesn't Work ❌
1. **Stats Not Applied**: Most tree bonuses don't affect gameplay
2. **No Level Requirements**: Can allocate any node regardless of level
3. **No Class Requirements**: All nodes accessible to all classes
4. **Damage Not Enhanced**: melee_pct, bow_pct, spell_pct don't increase damage
5. **No Movement Speed**: Tree bonuses don't affect player speed
6. **No Defensive Bonuses**: Armor/evasion from tree might not apply
7. **No Offensive Bonuses**: Attack/cast speed don't affect timing
8. **No Crit System**: Crit chance/multi don't affect combat

### Critical Path to Make Tree Functional
1. ✅ **Create mergeStatsWithTreeBonuses()** - combines base + tree stats
2. ✅ **Add level to CharacterStats** - enables level requirements
3. ✅ **Hook tree changes to main loop** - applies bonuses to player
4. ⚠️ **Apply offensive modifiers** - make damage bonuses work
5. ⚠️ **Apply defensive modifiers** - make armor/evasion work
6. ⚠️ **Implement level requirements** - gate nodes by level

---

## 📝 File Modification Checklist

### Must Modify
- [ ] `src/gameplay/stats.ts` - Add mergeStatsWithTreeBonuses(), add level/exp fields
- [ ] `src/gameplay/skillTree.ts` - Update canAllocateNode() to check level/class
- [ ] `src/ui/skillTree.ts` - Pass character level/class to allocation functions
- [ ] `src/main.ts` - Hook onSkillTreeChange to recalculate stats
- [ ] `src/state/save.ts` - Already has level in SaveMeta ✅

### Should Modify (Combat Integration)
- [ ] `src/systems/combat.ts` - Apply melee_pct, bow_pct, spell_pct to damage
- [ ] `src/systems/movement.ts` - Apply movement_speed to player
- [ ] `src/systems/skills.ts` - Apply attack_speed, cast_speed to timing

### Optional Modifications
- [ ] Add experience system
- [ ] Add passive point gain on level up
- [ ] Add respec cost system
- [ ] Add class-exclusive nodes

---

## 🚨 WARNING: Stats That Will Do Nothing Until Implemented

These stats are calculated but have **ZERO effect** on gameplay:

### Completely Non-Functional
- `minion_damage` - No minion system exists
- `totem_damage` - No totem system exists
- `energy_shield` - No energy shield mechanic exists
- `dodge_chance` - No dodge mechanic in combat
- `block_chance` - No block mechanic in combat
- `stun_threshold` - No stun resistance in combat
- `stun_duration` - No stun duration modification
- `chaos_resistance` - No chaos damage type in game

### Partially Functional (Need Integration)
- `melee_pct` - Calculated but not applied to damage
- `bow_pct` - Calculated but not applied to damage
- `spell_pct` - Calculated but not applied to damage
- `crit_chance` - Calculated but no crit system
- `crit_multiplier` - Calculated but no crit system
- `attack_speed` - Calculated but not applied to timing
- `cast_speed` - Calculated but not applied to timing
- `movement_speed` - Calculated but not applied to player
- `mana_cost_reduction` - Calculated but not applied to skills
- `mana_regen` - Calculated but not applied to mana system

---

## ✅ Recommended Implementation Order

### Phase 1: Make Tree Stats Actually Work (2-4 hours)
1. Add `mergeStatsWithTreeBonuses()` function
2. Add `level` field to `CharacterStats`
3. Hook tree changes to main game loop
4. Test that stats merge correctly

### Phase 2: Enable Requirements (1-2 hours)
5. Implement level requirement validation
6. Implement class requirement validation
7. Pass character data to skill tree functions
8. Test requirements work

### Phase 3: Apply Bonuses to Combat (2-3 hours)
9. Apply `melee_pct`, `bow_pct`, `spell_pct` to damage calculations
10. Apply `armor`, `evasion` bonuses to defense
11. Apply resistance bonuses
12. Test combat with tree bonuses

### Phase 4: Apply Utility Bonuses (1-2 hours)
13. Apply `movement_speed` to player movement
14. Apply `mana_cost_reduction` to skill costs
15. Apply `attack_speed`, `cast_speed` to timing
16. Test utility bonuses work

---

**Total Estimated Time to Full Integration: 6-11 hours**

**Current State: Tree is 85% complete, but only ~20% functional in gameplay**

---

## 📚 Related Files

### Core Systems
- `src/gameplay/skillTree.ts` - Skill tree logic
- `src/gameplay/stats.ts` - Character stats
- `src/ui/skillTree.ts` - Tree UI
- `src/state/save.ts` - Save system
- `src/main.ts` - Main game loop

### Combat Systems
- `src/systems/combat.ts` - Combat calculations
- `src/systems/movement.ts` - Player movement
- `src/systems/skills.ts` - Skill system

### Data
- `data/generated/poe2_skill_tree_large.json` - Tree data (553 nodes)
- `data/skillTree.json` - Legacy tree data

---

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Author:** Claude Code
