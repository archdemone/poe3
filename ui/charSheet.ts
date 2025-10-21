// Character Sheet UI - Displays stats and derived values
// This is embedded in index.html, not dynamically loaded

import type { CharacterStats } from '../src/gameplay/stats';
import { calculateDerivedStats } from '../src/gameplay/stats';

let currentStats: CharacterStats | null = null;
let currentClass: 'warrior' | 'archer' = 'warrior';

/** Update the character sheet display with current stats */
export function updateCharacterSheet(stats: CharacterStats, characterClass: 'warrior' | 'archer'): void {
  currentStats = stats;
  currentClass = characterClass;
  
  const derived = calculateDerivedStats(stats, characterClass);
  
  // Core attributes
  setElementText('stat-str', stats.strength.toString());
  setElementText('stat-dex', stats.dexterity.toString());
  setElementText('stat-int', stats.intelligence.toString());
  
  // Resources
  setElementText('stat-hp', Math.floor(stats.hp).toString());
  setElementText('stat-max-hp', stats.maxHp.toString());
  setElementText('stat-mp', Math.floor(stats.mp).toString());
  setElementText('stat-max-mp', stats.maxMp.toString());
  
  // Offense
  setElementText('stat-melee-dmg', derived.meleeDamage.toString());
  setElementText('stat-ranged-dmg', derived.rangedDamage.toString());
  setElementText('stat-spell-dmg', derived.spellDamage.toString());
  
  // Defense
  setElementText('stat-armor', stats.armor.toString());
  setElementText('stat-phys-reduction', `${derived.physicalReduction.toFixed(1)}%`);
  setElementText('stat-evasion', stats.evasion.toString());
  setElementText('stat-dodge-chance', `${derived.dodgeChance.toFixed(1)}%`);
  
  // Update debug sliders to match current stats
  updateDebugSliders(stats);
}

/** Initialize debug sliders */
export function initDebugSliders(onStatsChange: (stats: CharacterStats) => void): void {
  const strSlider = document.getElementById('debug-str-slider') as HTMLInputElement;
  const dexSlider = document.getElementById('debug-dex-slider') as HTMLInputElement;
  const intSlider = document.getElementById('debug-int-slider') as HTMLInputElement;
  
  const strDisplay = document.getElementById('debug-str-display');
  const dexDisplay = document.getElementById('debug-dex-display');
  const intDisplay = document.getElementById('debug-int-display');
  
  if (!strSlider || !dexSlider || !intSlider) return;
  
  strSlider.addEventListener('input', () => {
    if (!currentStats) return;
    currentStats.strength = parseInt(strSlider.value, 10);
    if (strDisplay) strDisplay.textContent = strSlider.value;
    onStatsChange(currentStats);
  });
  
  dexSlider.addEventListener('input', () => {
    if (!currentStats) return;
    currentStats.dexterity = parseInt(dexSlider.value, 10);
    if (dexDisplay) dexDisplay.textContent = dexSlider.value;
    onStatsChange(currentStats);
  });
  
  intSlider.addEventListener('input', () => {
    if (!currentStats) return;
    currentStats.intelligence = parseInt(intSlider.value, 10);
    if (intDisplay) intDisplay.textContent = intSlider.value;
    onStatsChange(currentStats);
  });
}

function updateDebugSliders(stats: CharacterStats): void {
  const strSlider = document.getElementById('debug-str-slider') as HTMLInputElement;
  const dexSlider = document.getElementById('debug-dex-slider') as HTMLInputElement;
  const intSlider = document.getElementById('debug-int-slider') as HTMLInputElement;
  
  const strDisplay = document.getElementById('debug-str-display');
  const dexDisplay = document.getElementById('debug-dex-display');
  const intDisplay = document.getElementById('debug-int-display');
  
  if (strSlider) {
    strSlider.value = stats.strength.toString();
    if (strDisplay) strDisplay.textContent = stats.strength.toString();
  }
  
  if (dexSlider) {
    dexSlider.value = stats.dexterity.toString();
    if (dexDisplay) dexDisplay.textContent = stats.dexterity.toString();
  }
  
  if (intSlider) {
    intSlider.value = stats.intelligence.toString();
    if (intDisplay) intDisplay.textContent = stats.intelligence.toString();
  }
}

function setElementText(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}

