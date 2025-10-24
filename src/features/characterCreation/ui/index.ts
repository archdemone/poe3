import { stateManager, GameState } from '../../../state/gameState';
import { createNewSave, saveGame } from '../../../state/save';
// Vite will type JSON as any; explicit types applied later
import ascendanciesData from '../data/ascendancies.json';
import classesData from '../data/classes.json';
import { CharacterCreationScene } from '../scene/CharacterCreationScene';
import { CreatorStore } from '../state';
import type { ClassDef, AscendancyDef } from '../types';
import { getKeywordDescription } from '../data/keywordUtils';

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

  // Suspend gameplay input while CC is active
  suspendGameplayInput();

  // Add click logging for debugging (dev-only)
  if (new URLSearchParams(window.location.search).has('debug')) {
    document.addEventListener('click', (e) => {
      console.log('CC Click:', e.target, 'composedPath length:', e.composedPath().length);
    }, true);
  }

  function renderClassTiles() {
    classGrid.innerHTML = '';
    for (const c of classes) {
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.setAttribute('role', 'button');
      tile.setAttribute('aria-label', c.displayName);
      tile.setAttribute('tabindex', '0');
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
      tile.setAttribute('tabindex', '0');
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
    by('stat-es').textContent = stats ? String(stats.maxEnergyShield) : '-';
    by('stat-accuracy').textContent = stats ? String(stats.accuracy) : '-';
    by('stat-armor').textContent = stats ? String(stats.armor) : '-';
    by('stat-evasion').textContent = stats ? String(stats.evasion) : '-';
    by('stat-fire-res').textContent = stats ? `${stats.fireResistance}%` : '-';
    by('stat-cold-res').textContent = stats ? `${stats.coldResistance}%` : '-';
    by('stat-lightning-res').textContent = stats ? `${stats.lightningResistance}%` : '-';
    by('stat-chaos-res').textContent = stats ? `${stats.chaosResistance}%` : '-';
  }

  async function initTooltips() {
    const tooltipElements = document.querySelectorAll('.stat-tooltip');
    for (const element of tooltipElements) {
      const keywordId = element.getAttribute('data-keyword');
      if (keywordId) {
        try {
          const description = await getKeywordDescription(keywordId);
          element.setAttribute('data-tooltip', description);
        } catch (error) {
          console.warn(`Failed to load tooltip for ${keywordId}:`, error);
          element.setAttribute('data-tooltip', `No description available for ${keywordId}`);
        }
      }
    }
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
    renderAscTiles();
    // Apply selection state after rendering
    const ascList = store.getFilteredAscendancies();
    document.querySelectorAll('#asc-grid .tile').forEach((el, i) => {
      const a = ascList[i];
      el.classList.toggle('selected', !!asc && a.id === asc.id);
    });
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
  initTooltips();

  // Focus management: focus first interactive element
  setTimeout(() => {
    const firstTile = classGrid.querySelector('.tile') as HTMLElement;
    if (firstTile) {
      firstTile.focus();
      firstTile.setAttribute('data-focus-initial', 'true');
    } else if (nameInput) {
      nameInput.focus();
    }
  }, 100); // Delay to ensure DOM is fully rendered
}

export function cleanup() {
  // Resume gameplay input
  resumeGameplayInput();

  scene?.dispose();
  scene = null;
}

// Suspend Babylon/gameplay input while CC is active
function suspendGameplayInput(): void {
  const engine = (window as any).__gameEngine;
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const scene = (window as any).__gameScene;
  const camera = (window as any).__gameCamera;

  // Disable canvas pointer events
  if (canvas) {
    canvas.classList.add('canvas--disabled');
  }

  // Disable HUD pointer events (if HUD root exists)
  const hud = document.querySelector('.hud');
  if (hud) {
    hud.classList.add('hud--disabled');
  }

  // Detach Babylon controls
  try {
    if (scene) {
      scene.detachControl();
    }
    if (camera) {
      camera.detachControl(true);
    }
    if (engine && engine.getInputElement()) {
      engine.getInputElement().blur?.();
    }
  } catch (error) {
    console.warn('Failed to detach controls:', error);
  }

  console.log('🎮 Gameplay input suspended for character creation');
}

// Resume Babylon/gameplay input after CC exits
function resumeGameplayInput(): void {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const scene = (window as any).__gameScene;
  const camera = (window as any).__gameCamera;

  // Re-enable canvas pointer events
  if (canvas) {
    canvas.classList.remove('canvas--disabled');
  }

  // Re-enable HUD pointer events
  const hud = document.querySelector('.hud');
  if (hud) {
    hud.classList.remove('hud--disabled');
  }

  // Re-attach Babylon controls
  try {
    if (scene) {
      scene.attachControl();
    }
    if (camera) {
      camera.attachControl(true);
    }
  } catch (error) {
    console.warn('Failed to reattach controls:', error);
  }

  console.log('🎮 Gameplay input resumed');
}
