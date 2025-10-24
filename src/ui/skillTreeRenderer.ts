// High-performance Canvas-based skill tree renderer with spatial indexing and LOD

import type { SkillNode, SkillTreeData, TreeState } from '../gameplay/skillTree';
import { getSkillTree } from '../gameplay/skillTree';

// QuadTree for spatial indexing
class QuadTree {
  private nodes: SkillNode[] = [];
  private children: QuadTree[] = [];
  private bounds: { x: number; y: number; width: number; height: number };
  private capacity = 4;
  private divided = false;

  constructor(bounds: { x: number; y: number; width: number; height: number }) {
    this.bounds = bounds;
  }

  insert(node: SkillNode): boolean {
    if (!this.contains(node)) return false;

    if (this.nodes.length < this.capacity) {
      this.nodes.push(node);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return this.children.some(child => child.insert(node));
  }

  query(range: { x: number; y: number; width: number; height: number }): SkillNode[] {
    let found: SkillNode[] = [];

    if (!this.intersects(range)) return found;

    found.push(...this.nodes.filter(node => this.pointInRange(node, range)));

    if (this.divided) {
      this.children.forEach(child => {
        found.push(...child.query(range));
      });
    }

    return found;
  }

  clear(): void {
    this.nodes = [];
    this.children = [];
    this.divided = false;
  }

  private contains(node: SkillNode): boolean {
    return node.x >= this.bounds.x &&
           node.x <= this.bounds.x + this.bounds.width &&
           node.y >= this.bounds.y &&
           node.y <= this.bounds.y + this.bounds.height;
  }

  private intersects(range: { x: number; y: number; width: number; height: number }): boolean {
    return !(range.x > this.bounds.x + this.bounds.width ||
             range.x + range.width < this.bounds.x ||
             range.y > this.bounds.y + this.bounds.height ||
             range.y + range.height < this.bounds.y);
  }

  private pointInRange(node: SkillNode, range: { x: number; y: number; width: number; height: number }): boolean {
    return node.x >= range.x &&
           node.x <= range.x + range.width &&
           node.y >= range.y &&
           node.y <= range.y + range.height;
  }

  private subdivide(): void {
    const x = this.bounds.x;
    const y = this.bounds.y;
    const w = this.bounds.width / 2;
    const h = this.bounds.height / 2;

    this.children = [
      new QuadTree({ x: x, y: y, width: w, height: h }),         // NW
      new QuadTree({ x: x + w, y: y, width: w, height: h }),     // NE
      new QuadTree({ x: x, y: y + h, width: w, height: h }),     // SW
      new QuadTree({ x: x + w, y: y + h, width: w, height: h })  // SE
    ];

    this.divided = true;
  }
}

// Viewport for culling and LOD
class Viewport {
  x = 0;
  y = 0;
  width = 800;
  height = 600;
  canvasWidth = 800;
  canvasHeight = 600;
  zoom = 1;

  contains(point: { x: number; y: number }): boolean {
    // Check if a world point is visible on screen with current zoom
    const leftEdge = this.x - (this.canvasWidth / 2) / this.zoom;
    const rightEdge = this.x + (this.canvasWidth / 2) / this.zoom;
    const topEdge = this.y - (this.canvasHeight / 2) / this.zoom;
    const bottomEdge = this.y + (this.canvasHeight / 2) / this.zoom;

    return point.x >= leftEdge && point.x <= rightEdge &&
           point.y >= topEdge && point.y <= bottomEdge;
  }

  update(canvas: HTMLCanvasElement): void {
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
    // Width and height represent the visible world area at current zoom
    this.width = canvas.width / this.zoom;
    this.height = canvas.height / this.zoom;
  }
}

// Node sprite atlas for efficient rendering
class NodeAtlas {
  private sprites: Map<string, ImageBitmap> = new Map();
  private loaded = false;

  async loadSprites(): Promise<void> {
    if (this.loaded) return;

    // Create colored circles for different node types
    const types = ['start', 'small', 'major', 'notable', 'keystone', 'mastery'];
    const colors = {
      start: '#FFD700',     // Gold
      small: '#FFFFFF',     // White
      major: '#FF6B35',     // Orange
      notable: '#4ECDC4',   // Teal
      keystone: '#45B7D1',  // Blue
      mastery: '#96CEB4'    // Green
    };

    for (const type of types) {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;

      // Draw node circle
      ctx.fillStyle = colors[type as keyof typeof colors];
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, 2 * Math.PI);
      ctx.fill();

      // Add border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      const bitmap = await createImageBitmap(canvas);
      this.sprites.set(type, bitmap);
    }

    this.loaded = true;
  }

  getSprite(type: string): ImageBitmap | null {
    return this.sprites.get(type) || this.sprites.get('small') || null;
  }
}

// Main renderer class
export class SkillTreeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private spatialIndex: QuadTree;
  private nodeAtlas: NodeAtlas;
  private viewport: Viewport;

  // Animation and interaction state
  private animationFrame: number | null = null;
  private lastFrameTime = 0;
  private targetFPS = 60;
  private frameInterval = 1000 / this.targetFPS;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true // Better performance
    });

    if (!ctx) {
      throw new Error('Failed to get Canvas 2D context');
    }

    this.ctx = ctx;

    // Initialize spatial index with very large bounds to cover the entire POE2 tree
    this.spatialIndex = new QuadTree({ x: -2000, y: -2000, width: 4000, height: 4000 });
    this.nodeAtlas = new NodeAtlas();
    this.viewport = new Viewport();


    // Initialize canvas
    this.resizeCanvas();
    this.setupEventListeners();

    // Load sprites
    this.nodeAtlas.loadSprites();
  }

  async initialize(): Promise<void> {
    await this.nodeAtlas.loadSprites();
  }

  /** Force center the viewport on the tree - useful when opening the skill tree panel */
  public centerOnTree(nodes: SkillNode[]): void {
    if (nodes.length > 0) {
      console.log('[SkillTree] Centering viewport on', nodes.length, 'nodes');
      this.centerViewportOnTree(nodes);
      console.log('[SkillTree] Viewport after centering:', {
        x: this.viewport.x,
        y: this.viewport.y,
        zoom: this.viewport.zoom,
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height
      });
    }
  }

  render(nodes: SkillNode[], edges: Array<[string, string]>, state: TreeState): void {
    const now = performance.now();
    if (now - this.lastFrameTime < this.frameInterval) return;

    this.lastFrameTime = now;

    // Ensure canvas is properly sized (in case panel just became visible)
    if (this.canvas.width === 0 || this.canvas.height === 0) {
      this.resizeCanvas();
    }

    // Update spatial index
    this.updateSpatialIndex(nodes);

    // Auto-center viewport on first render if not manually set
    if (this.viewport.x === 0 && this.viewport.y === 0 && this.viewport.zoom === 1 && nodes.length > 0) {
      this.centerViewportOnTree(nodes);
    }

    // Clear canvas
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Debug: Draw a red border to confirm canvas is rendering
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(1, 1, this.canvas.width - 2, this.canvas.height - 2);

    // Update viewport
    this.viewport.update(this.canvas);

    // Cull nodes outside viewport
    const visibleNodes = this.cullNodes(nodes);

    // Render connections first (behind nodes)
    this.renderConnections(edges, nodes, state);

    // Render visible nodes with LOD
    this.renderNodes(visibleNodes, state);

    // Render UI elements (labels, tooltips)
    this.renderUI(visibleNodes);
  }

  private centerViewportOnTree(nodes: SkillNode[]): void {
    if (nodes.length === 0) return;

    // Calculate bounds of all nodes
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }

    // Center viewport on the tree bounds
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate zoom to fit the tree
    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;
    const canvasWidth = this.canvas.width / window.devicePixelRatio;
    const canvasHeight = this.canvas.height / window.devicePixelRatio;

    const zoomX = canvasWidth / (treeWidth + 200); // Add padding
    const zoomY = canvasHeight / (treeHeight + 200);
    const fitZoom = Math.min(zoomX, zoomY, 1); // Don't zoom in more than 1:1

    this.viewport.x = centerX - (canvasWidth / fitZoom) / 2;
    this.viewport.y = centerY - (canvasHeight / fitZoom) / 2;
    this.viewport.zoom = Math.max(fitZoom, 0.1); // Minimum zoom of 0.1
  }

  private updateSpatialIndex(nodes: SkillNode[]): void {
    this.spatialIndex.clear();
    nodes.forEach(node => {
      this.spatialIndex.insert(node);
    });
  }

  private cullNodes(nodes: SkillNode[]): SkillNode[] {
    const viewportBounds = {
      x: this.viewport.x - 50, // Padding
      y: this.viewport.y - 50,
      width: this.viewport.width + 100,
      height: this.viewport.height + 100
    };

    return this.spatialIndex.query(viewportBounds);
  }

  private renderConnections(edges: Array<[string, string]>, nodes: SkillNode[], state: TreeState): void {
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = 2;

    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    for (const [fromId, toId] of edges) {
      const fromNode = nodeMap.get(fromId);
      const toNode = nodeMap.get(toId);

      if (!fromNode || !toNode) continue;

      // Transform coordinates to screen space with zoom
      const fromScreenX = (fromNode.x - this.viewport.x) * this.viewport.zoom + this.canvas.width / 2;
      const fromScreenY = (fromNode.y - this.viewport.y) * this.viewport.zoom + this.canvas.height / 2;
      const toScreenX = (toNode.x - this.viewport.x) * this.viewport.zoom + this.canvas.width / 2;
      const toScreenY = (toNode.y - this.viewport.y) * this.viewport.zoom + this.canvas.height / 2;

      // Only render if at least one endpoint is on screen
      const padding = 50;
      const fromOnScreen = fromScreenX >= -padding && fromScreenX <= this.canvas.width + padding &&
                          fromScreenY >= -padding && fromScreenY <= this.canvas.height + padding;
      const toOnScreen = toScreenX >= -padding && toScreenX <= this.canvas.width + padding &&
                        toScreenY >= -padding && toScreenY <= this.canvas.height + padding;

      if (!fromOnScreen && !toOnScreen) continue;

      // Check if connection should be active
      const isActive = state.allocated.has(fromId) && state.allocated.has(toId);

      this.ctx.strokeStyle = isActive ? '#FFD700' : '#333333';
      this.ctx.lineWidth = isActive ? 3 : 2;
      this.ctx.beginPath();
      this.ctx.moveTo(fromScreenX, fromScreenY);
      this.ctx.lineTo(toScreenX, toScreenY);
      this.ctx.stroke();
    }
  }

  private renderNodes(nodes: SkillNode[], state: TreeState): void {
    // Sort nodes by type for proper layering (keystones on top)
    const sortedNodes = [...nodes].sort((a, b) => {
      const order = ['small', 'major', 'notable', 'start', 'keystone', 'mastery'];
      return order.indexOf(a.type) - order.indexOf(b.type);
    });

    for (const node of sortedNodes) {
      this.renderNode(node, state);
    }
  }

  private renderNode(node: SkillNode, state: TreeState): void {
    // Transform world coordinates to screen coordinates with zoom
    const screenX = (node.x - this.viewport.x) * this.viewport.zoom + this.canvas.width / 2;
    const screenY = (node.y - this.viewport.y) * this.viewport.zoom + this.canvas.height / 2;

    // Skip if outside screen bounds (with padding)
    const padding = 100;
    if (screenX < -padding || screenX > this.canvas.width + padding ||
        screenY < -padding || screenY > this.canvas.height + padding) return;

    const isAllocated = state.allocated.has(node.id);
    const canAllocate = this.canAllocateNode(node, state);

    // Determine node size based on type (no zoom scaling for proper zoom behavior)
    let radius = this.getNodeRadius(node.type);

    // Always use fallback circle rendering for now (sprites might not load)
    this.ctx.fillStyle = this.getNodeColor(node.type, isAllocated, canAllocate);
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
    this.ctx.fill();

    // Border
    this.ctx.strokeStyle = isAllocated ? '#FFD700' : '#FFFFFF';
    this.ctx.lineWidth = isAllocated ? 2 : 1;
    this.ctx.stroke();

    // Render node label if close enough (LOD)
    if (this.viewport.zoom > 0.8 && radius > 8) {
      this.renderNodeLabel(node, screenX, screenY, radius);
    }
  }

  private renderNodeLabel(node: SkillNode, screenX: number, screenY: number, radius: number): void {
    if (node.type === 'notable' || node.type === 'keystone') {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = `${Math.max(8, radius * 0.4)}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      // Draw text background for readability
      const text = node.name.substring(0, 3);
      const metrics = this.ctx.measureText(text);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(
        screenX - metrics.width/2 - 2,
        screenY - 8 - 2,
        metrics.width + 4,
        16
      );

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText(text, screenX, screenY - 8);
    }
  }

  private renderUI(nodes: SkillNode[]): void {
    // Render any UI overlays (selection highlights, etc.)
    // This will be expanded later
  }

  private getNodeRadius(type: string): number {
    switch (type) {
      case 'start': return 18;
      case 'notable': return 16;
      case 'keystone': return 20;
      case 'major': return 14;
      default: return 12;
    }
  }

  private getNodeColor(type: string, allocated: boolean, canAllocate: boolean): string {
    if (allocated) return '#FFD700'; // Gold for allocated

    const baseColors = {
      start: '#FFD700',
      small: '#FFFFFF',
      major: '#FF6B35',
      notable: '#4ECDC4',
      keystone: '#45B7D1',
      mastery: '#96CEB4'
    };

    const baseColor = baseColors[type as keyof typeof baseColors] || '#FFFFFF';

    if (canAllocate) {
      return this.lightenColor(baseColor, 0.3);
    }

    return baseColor;
  }

  private lightenColor(color: string, percent: number): string {
    // Simple color lightening for highlight effect
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  private canAllocateNode(node: SkillNode, state: TreeState): boolean {
    if (state.allocated.has(node.id)) return false;
    if (state.passivePoints <= 0) return false;

    // Check requirements
    for (const req of node.requirements) {
      if (req.type === 'node' && !state.allocated.has(String(req.value))) {
        return false;
      }
    }

    return true;
  }

  private setupEventListeners(): void {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only handle if skill tree is visible
      const skillTreePanel = document.getElementById('skill-tree');
      if (!skillTreePanel || skillTreePanel.classList.contains('hidden')) return;

      switch(e.key) {
        case ' ': // Space - center on tree
          e.preventDefault();
          const treeData = getSkillTree();
          if (treeData && treeData.nodes) {
            this.centerViewportOnTree(treeData.nodes);
            console.log('[SkillTree] Centered via Space key');
          }
          break;
        case '+':
        case '=': // Zoom in
          e.preventDefault();
          this.viewport.zoom = Math.min(this.viewport.zoom * 1.2, 3);
          break;
        case '-':
        case '_': // Zoom out
          e.preventDefault();
          this.viewport.zoom = Math.max(this.viewport.zoom * 0.8, 0.1);
          break;
        case '0': // Reset zoom
          e.preventDefault();
          this.viewport.zoom = 1;
          break;
      }
    });

    // Pan and zoom controls
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;

        this.viewport.x -= deltaX / this.viewport.zoom;
        this.viewport.y -= deltaY / this.viewport.zoom;

        lastX = e.clientX;
        lastY = e.clientY;
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.viewport.zoom *= zoomFactor;

      // Clamp zoom
      this.viewport.zoom = Math.max(0.1, Math.min(5, this.viewport.zoom));
    });

    // Resize handling
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();

    // If the canvas has no dimensions (panel not visible), use fallback size
    const width = rect.width || 800;
    const height = rect.height || 600;

    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  }

  // Public API methods
  setViewport(x: number, y: number, zoom: number): void {
    this.viewport.x = x;
    this.viewport.y = y;
    this.viewport.zoom = zoom;
  }

  getViewport(): { x: number; y: number; zoom: number } {
    return {
      x: this.viewport.x,
      y: this.viewport.y,
      zoom: this.viewport.zoom
    };
  }

  // Animation loop
  startRenderLoop(callback: () => void): void {
    const loop = () => {
      callback();
      this.animationFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  stopRenderLoop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}
