// Main Menu TypeScript - handles button clicks, slot selection, and state transitions

import { stateManager, GameState } from '../state/gameState';
import { loadAllSlotMeta, loadGame, type SaveMeta } from '../state/save';

let currentMode: 'new' | 'load' = 'new';

export function init(): void {
  console.log('Main Menu initialized');
  
  // Get button elements
  const btnNewGame = document.getElementById('btn-new-game');
  const btnLoadGame = document.getElementById('btn-load-game');
  const btnSettings = document.getElementById('btn-settings');
  const btnQuit = document.getElementById('btn-quit');
  
  // Get modal elements
  const slotPickerModal = document.getElementById('slot-picker-modal');
  const settingsModal = document.getElementById('settings-modal');
  const btnCancelSlot = document.getElementById('btn-cancel-slot');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  
  // Button handlers
  btnNewGame?.addEventListener('click', () => {
    currentMode = 'new';
    showSlotPicker();
  });
  
  btnLoadGame?.addEventListener('click', () => {
    currentMode = 'load';
    showSlotPicker();
  });
  
  btnSettings?.addEventListener('click', () => {
    settingsModal?.classList.remove('hidden');
  });
  
  btnQuit?.addEventListener('click', () => {
    // In browser context, just hide the menu to show blank screen
    const mainMenu = document.querySelector('.main-menu');
    if (mainMenu) {
      (mainMenu as HTMLElement).style.display = 'none';
    }
  });
  
  // Modal handlers
  btnCancelSlot?.addEventListener('click', () => {
    slotPickerModal?.classList.add('hidden');
  });
  
  btnCloseSettings?.addEventListener('click', () => {
    settingsModal?.classList.add('hidden');
  });
  
  // Setup slot click handlers
  const slotItems = document.querySelectorAll('.slot-item');
  slotItems.forEach((item) => {
    item.addEventListener('click', () => {
      const slot = parseInt((item as HTMLElement).dataset.slot || '0', 10);
      handleSlotClick(slot as 0 | 1 | 2);
    });
  });
}

function showSlotPicker(): void {
  const modal = document.getElementById('slot-picker-modal');
  const title = document.getElementById('slot-picker-title');
  
  if (!modal || !title) return;
  
  // Update title based on mode
  title.textContent = currentMode === 'new' ? 'Select Save Slot' : 'Load Game';
  
  // Load and display slot metadata
  const slots = loadAllSlotMeta();
  const slotItems = document.querySelectorAll('.slot-item');
  
  slotItems.forEach((item, index) => {
    const slotInfo = item.querySelector('.slot-info');
    if (!slotInfo) return;
    
    const meta = slots[index];
    
    if (currentMode === 'load') {
      // Load mode: disable empty slots, show info for occupied slots
      if (meta) {
        item.classList.remove('disabled');
        slotInfo.innerHTML = `
          <span class="slot-name">${meta.name}</span>
          <span class="slot-details">
            ${meta.class === 'warrior' ? 'Warrior' : 'Archer'} - 
            Level ${meta.level} - 
            ${formatPlaytime(meta.playtime)}
          </span>
        `;
      } else {
        item.classList.add('disabled');
        slotInfo.innerHTML = '<span class="empty">Empty</span>';
      }
    } else {
      // New game mode: all slots available, show if occupied
      item.classList.remove('disabled');
      if (meta) {
        slotInfo.innerHTML = `
          <span class="slot-name">${meta.name}</span>
          <span class="slot-details">Will be overwritten</span>
        `;
      } else {
        slotInfo.innerHTML = '<span class="empty">Empty</span>';
      }
    }
  });
  
  modal.classList.remove('hidden');
}

function handleSlotClick(slot: 0 | 1 | 2): void {
  const slotItem = document.querySelector(`.slot-item[data-slot="${slot}"]`);
  if (slotItem?.classList.contains('disabled')) {
    return; // Don't allow clicking disabled slots
  }
  
  if (currentMode === 'new') {
    // Transition to character creation with selected slot
    stateManager.transitionTo(GameState.CHARACTER_CREATE, { slot });
  } else {
    // Load the game from this slot
    const saveData = loadGame(slot);
    if (saveData) {
      // Transition to appropriate scene (hideout or dungeon)
      const targetState = saveData.world.currentScene === 'dungeon' 
        ? GameState.DUNGEON 
        : GameState.HIDEOUT;
      stateManager.transitionTo(targetState, { saveData });
    }
  }
  
  // Close modal
  const modal = document.getElementById('slot-picker-modal');
  modal?.classList.add('hidden');
}

function formatPlaytime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function cleanup(): void {
  console.log('Main Menu cleaned up');
}

