// Skill Tree UI - Renders and handles passive node allocation

import type { SkillNode, SkillTreeData } from '../src/gameplay/skillTree';
import {
  loadSkillTree,
  getSkillTree,
  getTreeState,
  canAllocateNode,
  allocateNode,
  canRefundNode,
  refundNode,
  resetTree,
} from '../src/gameplay/skillTree';

let onTreeChange: (() => void) | null = null;

/** Initialize the skill tree UI */
export async function initSkillTree(onChange: () => void): Promise<void> {
  onTreeChange = onChange;
  
  // Load tree data if not already loaded
  try {
    await loadSkillTree();
  } catch (err) {
    console.error('Failed to load skill tree:', err);
    return;
  }
  
  renderTree();
  updatePointsDisplay();
  
  // Setup reset button
  const resetBtn = document.getElementById('reset-tree-btn');
  resetBtn?.addEventListener('click', () => {
    resetTree();
    renderTree();
    updatePointsDisplay();
    if (onTreeChange) onTreeChange();
  });
}

/** Render the entire skill tree (nodes and connections) */
function renderTree(): void {
  const treeData = getSkillTree();
  if (!treeData) return;
  
  const connectionsGroup = document.getElementById('tree-connections');
  const nodesGroup = document.getElementById('tree-nodes');
  const svg = document.getElementById('tree-svg') as SVGSVGElement;
  
  if (!connectionsGroup || !nodesGroup || !svg) return;
  
  // Clear existing elements
  connectionsGroup.innerHTML = '';
  nodesGroup.innerHTML = '';
  
  // Set viewBox to center the tree (assuming nodes are centered around 0,0)
  svg.setAttribute('viewBox', '-400 -400 800 800');
  
  // Draw connections from edges array
  for (const [fromId, toId] of treeData.edges) {
    const fromNode = treeData.nodes.find(n => n.id === fromId);
    const toNode = treeData.nodes.find(n => n.id === toId);
    if (fromNode && toNode) {
      drawConnection(connectionsGroup, fromNode, toNode);
    }
  }
  
  // Draw nodes
  for (const node of treeData.nodes) {
    drawNode(nodesGroup, node);
  }
}

/** Draw a connection line between two nodes */
function drawConnection(
  parent: SVGElement,
  fromNode: SkillNode,
  toNode: SkillNode
): void {
  const state = getTreeState();
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', fromNode.x.toString());
  line.setAttribute('y1', fromNode.y.toString());
  line.setAttribute('x2', toNode.x.toString());
  line.setAttribute('y2', toNode.y.toString());
  line.setAttribute('class', 'tree-connection');
  
  // Highlight connection if both nodes are allocated
  if (state.allocated.has(fromNode.id) && state.allocated.has(toNode.id)) {
    line.classList.add('active');
  }
  
  parent.appendChild(line);
}

/** Draw a skill node */
function drawNode(parent: SVGElement, node: SkillNode): void {
  const state = getTreeState();
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'tree-node');
  group.classList.add(node.type);
  
  // Set allocation state classes
  if (state.allocated.has(node.id)) {
    group.classList.add('allocated');
  } else {
    group.classList.add('unallocated');
    if (canAllocateNode(node.id)) {
      group.classList.add('can-allocate');
    }
  }
  
  // Determine node size based on type
  let radius = 12;
  if (node.type === 'start') radius = 18;
  else if (node.type === 'notable') radius = 16;
  
  // Draw circle
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', node.x.toString());
  circle.setAttribute('cy', node.y.toString());
  circle.setAttribute('r', radius.toString());
  
  group.appendChild(circle);
  
  // Add node name abbreviation for notable
  if (node.type === 'notable') {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', node.x.toString());
    text.setAttribute('y', (node.y + 4).toString());
    text.textContent = node.name.substring(0, 1);
    group.appendChild(text);
  }
  
  // Add event handlers
  group.addEventListener('click', (e) => {
    e.preventDefault();
    handleNodeLeftClick(node);
  });
  group.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    handleNodeRightClick(node);
  });
  group.addEventListener('mouseenter', (e) => showTooltip(e, node));
  group.addEventListener('mouseleave', hideTooltip);
  
  parent.appendChild(group);
}

/** Handle left click - allocate */
function handleNodeLeftClick(node: SkillNode): void {
  if (node.type === 'start') return;
  
  if (allocateNode(node.id)) {
    renderTree();
    updatePointsDisplay();
    if (onTreeChange) onTreeChange();
  }
}

/** Handle right click - refund */
function handleNodeRightClick(node: SkillNode): void {
  if (node.type === 'start') return;
  
  if (refundNode(node.id)) {
    renderTree();
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
  
  // Format grants
  const statLabels: Record<string, string> = {
    str: 'Strength',
    dex: 'Dexterity',
    int: 'Intelligence',
    hp_flat: 'Maximum Life',
    mp_flat: 'Maximum Mana',
    melee_pct: 'Melee Damage',
    bow_pct: 'Bow Damage',
  };
  
  const statLines: string[] = [];
  for (const grant of node.grants) {
    if (grant.stat === 'points') continue; // Don't show points grant
    
    const label = statLabels[grant.stat] || grant.stat;
    const isPercent = grant.stat.endsWith('_pct');
    const formatted = isPercent ? `+${grant.value}%` : `+${grant.value}`;
    statLines.push(`${formatted} ${label}`);
  }
  
  tooltipStats.innerHTML = statLines
    .map(line => `<div class="tooltip-stat-positive">${line}</div>`)
    .join('');
  
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
  
  // Position tooltip near mouse
  const rect = (event.target as SVGElement).getBoundingClientRect();
  tooltip.style.left = `${rect.right + 10}px`;
  tooltip.style.top = `${rect.top}px`;
  
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
  renderTree();
  updatePointsDisplay();
}


