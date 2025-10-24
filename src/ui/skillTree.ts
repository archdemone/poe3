// Skill Tree UI - Canvas-based renderer with passive node allocation

import type { SkillNode, SkillTreeData } from '../gameplay/skillTree';
import { SkillTreeRenderer } from './skillTreeRenderer';
import {
  loadSkillTree,
  getSkillTree,
  getTreeState,
  canAllocateNode,
  allocateNode,
  canRefundNode,
  refundNode,
  resetTree,
  getKeystoneEffect,
  computePassiveBonuses,
  StatCalculator,
} from '../gameplay/skillTree';

let onTreeChange: (() => void) | null = null;
let renderer: SkillTreeRenderer | null = null;

/** Initialize the skill tree UI */
export async function initSkillTree(onChange: () => void): Promise<void> {
  onTreeChange = onChange;

  // Load tree data if not already loaded (force reload for skill tree panel)
  try {
    await loadSkillTree(true); // Force reload to ensure we get POE2 data
  } catch (err) {
    console.error('Failed to load skill tree:', err);
    return;
  }

  // Initialize Canvas renderer
  const canvasElement = document.getElementById('tree-canvas');
  const canvas = canvasElement as unknown as HTMLCanvasElement;
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    console.error('Canvas element not found or not a canvas element');
    return;
  }

  renderer = new SkillTreeRenderer(canvas);
  await renderer.initialize();

  // Start render loop
  renderer.startRenderLoop(() => {
    const treeData = getSkillTree();
    const state = getTreeState();
    if (treeData && renderer) {
      renderer.render(treeData.nodes, treeData.edges, state);
    }
  });

  updatePointsDisplay();
  setupEventListeners();
}

/** Setup event listeners for UI controls */
function setupEventListeners(): void {
  // Setup reset button
  const resetBtn = document.getElementById('reset-tree-btn');
  resetBtn?.addEventListener('click', () => {
    resetTree();
    updatePointsDisplay();
    if (onTreeChange) onTreeChange();
  });

  // Canvas click handling for node interaction
  const canvasElement = document.getElementById('tree-canvas');
  const canvas = canvasElement as unknown as HTMLCanvasElement;
  if (canvas && canvas instanceof HTMLCanvasElement) {
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('contextmenu', handleCanvasRightClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
  }
}

/** Handle canvas clicks for node allocation */
function handleCanvasClick(event: MouseEvent): void {
  const node = getNodeAtPosition(event.clientX, event.clientY);
  if (node) {
    handleNodeLeftClick(node);
  }
}

/** Handle canvas right clicks for node refund */
function handleCanvasRightClick(event: MouseEvent): void {
  event.preventDefault();
  const node = getNodeAtPosition(event.clientX, event.clientY);
  if (node) {
    handleNodeRightClick(node);
  }
}

/** Handle mouse movement for tooltips */
function handleCanvasMouseMove(event: MouseEvent): void {
  const node = getNodeAtPosition(event.clientX, event.clientY);
  if (node) {
    showTooltip(event, node);
  } else {
    hideTooltip();
  }
}

/** Get node at screen position */
function getNodeAtPosition(clientX: number, clientY: number): SkillNode | null {
  if (!renderer) return null;

  const canvasElement = document.getElementById('tree-canvas');
  const canvas = canvasElement as unknown as HTMLCanvasElement;
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) return null;
  const rect = canvas.getBoundingClientRect();

  // Convert screen coordinates to canvas coordinates
  const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
  const canvasY = (clientY - rect.top) * (canvas.height / rect.height);

  // Convert to world coordinates (inverse of the render transformation)
  const viewport = renderer.getViewport();
  const worldX = (canvasX / window.devicePixelRatio - canvas.width / 2) / viewport.zoom + viewport.x;
  const worldY = (canvasY / window.devicePixelRatio - canvas.height / 2) / viewport.zoom + viewport.y;

  // Find closest node
  const treeData = getSkillTree();
  if (!treeData) return null;

  let closestNode: SkillNode | null = null;
  let closestDistance = Infinity;

  for (const node of treeData.nodes) {
    const distance = Math.sqrt((node.x - worldX) ** 2 + (node.y - worldY) ** 2);
    if (distance < 20 && distance < closestDistance) { // 20 pixel hit radius
      closestNode = node;
      closestDistance = distance;
    }
  }

  return closestNode;
}

/** Handle left click - allocate */
function handleNodeLeftClick(node: SkillNode): void {
  if (node.type === 'start') return;
  
  if (allocateNode(node.id)) {
    updatePointsDisplay();
    if (onTreeChange) onTreeChange();
  }
}

/** Handle right click - refund */
function handleNodeRightClick(node: SkillNode): void {
  if (node.type === 'start') return;
  
  if (refundNode(node.id)) {
    updatePointsDisplay();
    if (onTreeChange) onTreeChange();
  }
}

/** Show tooltip for a node */
function showTooltip(event: MouseEvent, node: SkillNode): void {
  const state = getTreeState();
  const tooltip = document.getElementById('node-tooltip');
  if (!tooltip) return;

  const tooltipName = tooltip.querySelector('.tooltip-name');
  const tooltipStats = tooltip.querySelector('.tooltip-stats');
  const tooltipCost = tooltip.querySelector('.tooltip-cost');
  const tooltipStatus = tooltip.querySelector('.tooltip-status');

  if (!tooltipName || !tooltipStats || !tooltipCost || !tooltipStatus) return;

  // Set content
  tooltipName.textContent = node.name;

  // Format effects (new system) or grants (legacy)
  const statLabels: Record<string, string> = {
    str: 'Strength',
    dex: 'Dexterity',
    int: 'Intelligence',
    hp_flat: 'Maximum Life',
    mp_flat: 'Maximum Mana',
    energy_shield: 'Energy Shield',
    melee_pct: 'Melee Damage',
    bow_pct: 'Bow Damage',
    spell_pct: 'Spell Damage',
    crit_chance: 'Critical Strike Chance',
    crit_multiplier: 'Critical Strike Multiplier',
    attack_speed: 'Attack Speed',
    cast_speed: 'Cast Speed',
    accuracy: 'Accuracy Rating',
    armor: 'Armor',
    evasion: 'Evasion',
    block_chance: 'Block Chance',
    dodge_chance: 'Dodge Chance',
    stun_threshold: 'Stun Threshold',
    stun_duration: 'Stun Duration',
    fire_resistance: 'Fire Resistance',
    cold_resistance: 'Cold Resistance',
    lightning_resistance: 'Lightning Resistance',
    chaos_resistance: 'Chaos Resistance',
    movement_speed: 'Movement Speed',
    mana_cost_reduction: 'Mana Cost Reduction',
    mana_regen: 'Mana Regeneration',
    minion_damage: 'Minion Damage',
    totem_damage: 'Totem Damage'
  };

  const statLines: string[] = [];

  // Handle new effect system
  if (node.effects && node.effects.length > 0) {
    for (const effect of node.effects) {
      if (effect.stat === 'points') continue; // Don't show points

      const label = statLabels[effect.stat] || effect.stat;
      const isPercent = effect.stat.endsWith('_pct') || effect.op === 'mul' || effect.op === 'more' || effect.op === 'less';
      let formatted = '';

      switch (effect.op) {
        case 'add':
          formatted = isPercent ? `+${effect.value}%` : `+${effect.value}`;
          break;
        case 'mul':
        case 'more':
          formatted = `+${effect.value}% ${effect.op === 'more' ? 'more' : 'increased'}`;
          break;
        case 'less':
          formatted = `-${effect.value}% reduced`;
          break;
        default:
          formatted = `+${effect.value}`;
      }

      statLines.push(`${formatted} ${label}`);
    }

    // Add keystone description
    if (node.type === 'keystone') {
      const keystoneEffect = getKeystoneEffect(node.id);
      if (keystoneEffect) {
        statLines.push(`<em>${keystoneEffect.description}</em>`);
      }
    }
  }
  // Handle legacy grants
  else if (node.grants && node.grants.length > 0) {
    for (const grant of node.grants) {
      if (grant.stat === 'points') continue;

      const label = statLabels[grant.stat] || grant.stat;
      const isPercent = grant.stat.endsWith('_pct');
      const formatted = isPercent ? `+${grant.value}%` : `+${grant.value}`;
      statLines.push(`${formatted} ${label}`);
    }
  }

  tooltipStats.innerHTML = statLines
    .map(line => `<div class="tooltip-stat-positive">${line}</div>`)
    .join('');

  // Add stat preview if node is not allocated
  if (!state.allocated.has(node.id) && node.type !== 'start') {
    const treeData = getSkillTree();
    if (treeData) {
      try {
        // Calculate current stats
        const currentStats = computePassiveBonuses(treeData);

        // Calculate stats with this node hypothetically allocated
        const hypotheticalNodes = [...Array.from(state.allocated), node.id];
        const calculator = new StatCalculator();
        const mockCharacter = {
          strength: 10,
          dexterity: 10,
          intelligence: 10,
          maxHp: 100,
          maxMp: 50,
          armor: 0,
          evasion: 0,
        };
        const newStats = calculator.calculate(mockCharacter, {}, hypotheticalNodes, treeData);

        // Show preview for key stats that changed
        const previewLines: string[] = [];
        const keyStats = ['str', 'dex', 'int', 'hp_flat', 'mp_flat', 'melee_pct', 'bow_pct', 'spell_pct', 'crit_chance', 'armor', 'evasion'];

        for (const stat of keyStats) {
          const current = (currentStats as any)[stat];
          const newValue = (newStats as any)[stat];
          if (current !== newValue && newValue !== undefined && current !== undefined) {
            const label = statLabels[stat] || stat;
            const diff = newValue - current;
            const sign = diff > 0 ? '+' : '';
            previewLines.push(`<div class="tooltip-stat-preview">${label}: ${current} → ${newValue} (${sign}${diff})</div>`);
          }
        }

        if (previewLines.length > 0) {
          tooltipStats.innerHTML += '<div class="tooltip-divider"></div>' + previewLines.join('');
        }
      } catch (err) {
        // Silently fail if stat calculation fails
        console.warn('Failed to calculate stat preview:', err);
      }
    }
  }

  tooltipCost.textContent = 'Cost: 1 point';

  // Set status
  tooltipStatus.classList.remove('can-allocate', 'cannot-allocate', 'allocated');
  if (state.allocated.has(node.id)) {
    tooltipStatus.textContent = 'Right-click to refund';
    tooltipStatus.classList.add('allocated');
  } else {
    if (canAllocateNode(node.id)) {
      tooltipStatus.textContent = 'Click to allocate';
      tooltipStatus.classList.add('can-allocate');
    } else {
      const needPoints = state.passivePoints <= 0;
      tooltipStatus.textContent = needPoints ? 'No points available' : 'Requirements not met';
      tooltipStatus.classList.add('cannot-allocate');
    }
  }

  // Position tooltip relative to the tree-panel
  const skillTreePanel = document.querySelector('.tree-panel') as HTMLElement;

  if (skillTreePanel) {
    const panelRect = skillTreePanel.getBoundingClientRect();

    // Position relative to the tree panel
    const relativeX = event.clientX - panelRect.left;
    const relativeY = event.clientY - panelRect.top;

    console.log('Tooltip positioning:', {
      mouse: { x: event.clientX, y: event.clientY },
      panel: { left: panelRect.left, top: panelRect.top, width: panelRect.width, height: panelRect.height },
      relative: { x: relativeX, y: relativeY }
    });

    // Position tooltip within the panel
    tooltip.style.position = 'absolute';
    tooltip.style.left = `${relativeX + 15}px`;
    tooltip.style.top = `${relativeY - 10}px`;

    console.log('Tooltip positioned at:', tooltip.style.left, tooltip.style.top);
  } else {
    console.log('No skill tree panel found for tooltip positioning');
    // Fallback to viewport positioning
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY - 10}px`;
  }

  tooltip.classList.remove('hidden');
}

/** Hide tooltip */
function hideTooltip(): void {
  const tooltip = document.getElementById('node-tooltip');
  if (tooltip) {
    tooltip.classList.add('hidden');
  }
}

/** Update the points display */
function updatePointsDisplay(): void {
  const state = getTreeState();

  const availableEl = document.getElementById('available-points');
  const totalEl = document.getElementById('total-points');

  if (availableEl) availableEl.textContent = state.passivePoints.toString();
  if (totalEl) totalEl.textContent = (state.passivePoints + state.spent).toString();
}

/** Refresh the tree display (call after external state changes) */
export function refreshTree(): void {
  updatePointsDisplay();
  // Canvas renderer handles its own updates via render loop
}

/** Cleanup function to stop render loop when skill tree is closed */
export function cleanupSkillTree(): void {
  if (renderer) {
    renderer.stopRenderLoop();
    renderer = null;
  }
}


