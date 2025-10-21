// Centralized death system for XP and loot attribution

import type { World, Entity } from '../world';
import type { System } from '../systems';
import type { Health, Combatant, CDamageCredit, Transform } from '../components';

const CREDIT_TIMEOUT_MS = 5000; // credit kills to last hitter within 5s

export interface DeathSystemCallbacks {
  onEnemyKilled: (enemyId: Entity, killerPlayerId: Entity) => void;
  onPlayerKilled?: (playerId: Entity) => void;
}

export class DeathSystem implements System {
  private callbacks: DeathSystemCallbacks;

  constructor(callbacks: DeathSystemCallbacks) {
    this.callbacks = callbacks;
  }

  update(world: World, dt: number): void {
    const now = performance.now();
    const entities = world.getEntitiesWith('health');

    for (const id of entities) {
      const health = world.getComponent<Health>(id, 'health');
      if (!health || health.current > 0 || health.infinite) continue;

      const combat = world.getComponent<Combatant>(id, 'combatant');
      const credit = world.getComponent<CDamageCredit>(id, 'damageCredit');
      
      // Determine killer based on credit timeout
      const killer = (credit && (now - credit.lastHitTimeMs) <= CREDIT_TIMEOUT_MS) 
        ? credit.lastOwner 
        : undefined;

      // Remove the entity to prevent double-processing
      world.addComponent(id, 'health', { ...health, current: -1 });

      if (combat?.team === 'enemy') {
        if (killer !== undefined) {
          this.callbacks.onEnemyKilled(id, killer);
        }
        // Cleanup enemy components/meshes
        this.cleanupEnemy(world, id);
      } else if (combat?.team === 'player') {
        this.callbacks.onPlayerKilled?.(id);
      }
    }
  }

  private cleanupEnemy(world: World, entityId: Entity): void {
    const transform = world.getComponent<Transform>(entityId, 'transform');
    if (transform && transform.mesh) {
      transform.mesh.dispose();
    }
    
    // Remove all components for this entity
    const components = (world as any).components.get(entityId);
    if (components) {
      components.clear();
    }
  }
}
