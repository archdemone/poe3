// Character Creation TypeScript - handles name input, class selection, and character creation

import { stateManager, GameState } from '../src/state/gameState';
import { createNewSave, saveGame } from '../src/state/save';

let selectedSlot: 0 | 1 | 2 = 0;
let selectedClass: 'warrior' | 'archer' | null = null;

export function init(): void {
  console.log('Character Creation initialized');
  
  // Get the selected slot from state transition data (passed from main menu)
  // For now, we'll use a default or rely on the state manager to pass it
  // This will be set via the state transition
  
  const nameInput = document.getElementById('char-name') as HTMLInputElement;
  const createBtn = document.getElementById('btn-create') as HTMLButtonElement;
  const backBtn = document.getElementById('btn-back') as HTMLButtonElement;
  const classCards = document.querySelectorAll('.class-card');
  
  // Handle class selection
  classCards.forEach((card) => {
    card.addEventListener('click', () => {
      const classType = (card as HTMLElement).dataset.class as 'warrior' | 'archer';
      selectClass(classType);
      updateCreateButton();
    });
  });
  
  // Handle name input
  nameInput?.addEventListener('input', () => {
    updateCreateButton();
  });
  
  // Handle create button
  createBtn?.addEventListener('click', () => {
    const name = nameInput?.value.trim();
    if (!name || !selectedClass) return;
    
    createCharacter(name, selectedClass);
  });
  
  // Handle back button
  backBtn?.addEventListener('click', () => {
    stateManager.transitionTo(GameState.MAIN_MENU);
  });
  
  // Listen for slot data from state transition
  // This is a bit hacky but works for now
  const slotData = (window as any).__charCreateSlot;
  if (slotData !== undefined) {
    selectedSlot = slotData;
    delete (window as any).__charCreateSlot;
  }
}

function selectClass(classType: 'warrior' | 'archer'): void {
  selectedClass = classType;
  
  // Update visual selection
  const classCards = document.querySelectorAll('.class-card');
  classCards.forEach((card) => {
    if ((card as HTMLElement).dataset.class === classType) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
}

function updateCreateButton(): void {
  const nameInput = document.getElementById('char-name') as HTMLInputElement;
  const createBtn = document.getElementById('btn-create') as HTMLButtonElement;
  
  const name = nameInput?.value.trim();
  const isValid = name && name.length > 0 && selectedClass !== null;
  
  if (createBtn) {
    createBtn.disabled = !isValid;
  }
}

function createCharacter(name: string, characterClass: 'warrior' | 'archer'): void {
  console.log(`Creating character: ${name} (${characterClass}) in slot ${selectedSlot}`);
  
  // Create save data with starter configuration
  const saveData = createNewSave(selectedSlot, name, characterClass);
  
  // Save to localStorage
  saveGame(selectedSlot, saveData);
  
  // Transition to hideout with the new save data
  stateManager.transitionTo(GameState.HIDEOUT, { saveData, slot: selectedSlot });
}

export function cleanup(): void {
  console.log('Character Creation cleaned up');
}

