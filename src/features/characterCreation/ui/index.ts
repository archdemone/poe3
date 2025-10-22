import { stateManager, GameState } from '../../../state/gameState';
import { createNewSave, saveGame } from '../../../state/save';
// Vite will type JSON as any; explicit types applied later
import ascendanciesData from '../data/ascendancies.json';
import classesData from '../data/classes.json';
import { CharacterCreationScene } from '../scene/CharacterCreationScene';
import { CreatorStore } from '../state';
import type { ClassDef, AscendancyDef } from '../types';

let scene: CharacterCreationScene | null = null;
let store: CreatorStore;

export async function init() {
  const classes = (classesData as unknown as ClassDef[]);
  const ascendancies = (ascendanciesData as unknown as AscendancyDef[]);
  store = new CreatorStore(classes, ascendancies);

  const classGrid = document.getElementById('class-grid') as HTMLDivElement;
  const ascGrid = document.getElementById('asc-grid') as HTMLDivElement;
  const nameInput = document.getElementById('creator-name') as HTMLInputElement;
  const backBtn = document.getElementById('creator-back') as HTMLButtonElement;
  const nextBtn = document.getElementById('creator-next') as HTMLButtonElement;
  const confirmBtn = document.getElementById('creator-confirm') as HTMLButtonElement;
  const validation = document.getElementById('validation') as HTMLDivElement;
  const confirmModal = document.getElementById('creator-confirm-modal') as HTMLDivElement;
  const confirmYes = document.getElementById('confirm-yes') as HTMLButtonElement;
  const confirmNo = document.getElementById('confirm-no') as HTMLButtonElement;

  const engine = (window as any).__gameEngine;
  const canvas = document.getElementById('renderCanvas') as unknown as HTMLCanvasElement;
  if (engine && canvas) {
    scene = new CharacterCreationScene(engine, canvas);
  }

  function renderClassTiles() {
    classGrid.innerHTML = '';
    for (const c of classes) {
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.setAttribute('role', 'button');
      tile.setAttribute('aria-label', c.displayName);
      tile.innerHTML = `<div class="name">${c.displayName}</div>`;
      tile.addEventListener('click', () => {
        store.setClass(c.id);
        scene?.setClass(c.id);
      });
      classGrid.appendChild(tile);
    }
  }

  function renderAscTiles() {
    ascGrid.innerHTML = '';
    const list = store.getFilteredAscendancies();
    for (const a of list) {
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.innerHTML = `<div class=\"name\">${a.displayName}</div><div class=\"desc\">${a.shortDescription}</div>`;
      tile.addEventListener('click', () => {
        store.setAscendancy(a.id);
        scene?.setAscendancy(a.id);
      });
      ascGrid.appendChild(tile);
    }
  }

  function renderStats() {
    const stats = store.getDerivedStats();
    const by = (id: string) => document.getElementById(id)!;
    by('stat-str').textContent = stats ? String(stats.strength) : '-';
    by('stat-dex').textContent = stats ? String(stats.dexterity) : '-';
    by('stat-int').textContent = stats ? String(stats.intelligence) : '-';
    by('stat-hp').textContent = stats ? String(stats.maxHp) : '-';
    by('stat-mp').textContent = stats ? String(stats.maxMp) : '-';
    by('stat-armor').textContent = stats ? String(stats.armor) : '-';
    by('stat-evasion').textContent = stats ? String(stats.evasion) : '-';
  }

  function renderValidation() {
    const v = store.isValid();
    validation.textContent = v.valid ? '' : v.reason || '';
    confirmBtn.disabled = !v.valid;
  }

  store.subscribe(() => {
    const cls = store.getSelectedClass();
    const asc = store.getSelectedAscendancy();
    document.querySelectorAll('#class-grid .tile').forEach((el, i) => {
      const c = classes[i];
      el.classList.toggle('selected', !!cls && c.id === cls.id);
    });
    const ascList = store.getFilteredAscendancies();
    document.querySelectorAll('#asc-grid .tile').forEach((el, i) => {
      const a = ascList[i];
      el.classList.toggle('selected', !!asc && a.id === asc?.id);
    });
    renderAscTiles();
    renderStats();
    renderValidation();
  });

  nameInput.addEventListener('input', () => {
    store.setName(nameInput.value);
  });

  backBtn.addEventListener('click', () => {
    stateManager.transitionTo(GameState.MAIN_MENU);
  });

  nextBtn.addEventListener('click', () => {
    const firstAsc = ascGrid.querySelector('.tile') as HTMLElement | null;
    firstAsc?.focus();
  });

  confirmBtn.addEventListener('click', () => {
    const v = store.isValid();
    if (!v.valid) return;
    confirmModal.classList.remove('hidden');
    confirmNo.focus();
  });

  function finalizeCreate() {
    const slot: 0 | 1 | 2 = (window as any).__charCreateSlot ?? 0;
    const selectedClass = store.getSelectedClass()!;
    const name = nameInput.value.trim() || 'Adventurer';
    const saveData = createNewSave(slot, name, selectedClass.saveClass);
    const stats = store.getDerivedStats();
    if (stats) saveData.character.stats = stats as any;
    saveGame(slot, saveData);
    stateManager.transitionTo(GameState.HIDEOUT, { saveData, slot });
  }

  confirmYes.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    finalizeCreate();
  });
  confirmNo.addEventListener('click', () => confirmModal.classList.add('hidden'));

  document.getElementById('pose-a')?.addEventListener('click', () => scene?.setAppearance({ pose: 'a' }));
  document.getElementById('pose-b')?.addEventListener('click', () => scene?.setAppearance({ pose: 'b' }));
  document.getElementById('tint-a')?.addEventListener('click', () => scene?.setAppearance({ tint: 'a' }));
  document.getElementById('tint-b')?.addEventListener('click', () => scene?.setAppearance({ tint: 'b' }));

  renderClassTiles();
  renderAscTiles();
  renderStats();
  renderValidation();
}

export function cleanup() {
  scene?.dispose();
  scene = null;
}
