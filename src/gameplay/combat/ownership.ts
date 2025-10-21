// Ownership and attribution helpers for damage tracking

import type { World, Entity } from '../../ecs/world';
import type { COwner } from '../../ecs/components';

/**
 * Set ownership information for an entity (projectile, hitbox, minion, etc.)
 */
export function setOwner(
  world: World,
  entityId: Entity,
  owner: Entity,
  instigator?: Entity,
  skillId?: string,
  tags?: string[]
): void {
  const ownerComponent: COwner = {
    owner,
    instigator: instigator ?? entityId,
    skillId,
    tags
  };
  world.addComponent(entityId, 'owner', ownerComponent);
}

/**
 * Get ownership context for damage attribution
 */
export function getOwnerContext(
  world: World,
  sourceEntity: Entity,
  fallbackPlayer: Entity
): { owner: Entity; instigator: Entity; skillId?: string; tags?: string[] } {
  const ownerComponent = world.getComponent<COwner>(sourceEntity, 'owner');
  
  if (ownerComponent) {
    return {
      owner: ownerComponent.owner,
      instigator: ownerComponent.instigator,
      skillId: ownerComponent.skillId,
      tags: ownerComponent.tags
    };
  }
  
  // Fallback to direct attribution
  return {
    owner: fallbackPlayer,
    instigator: sourceEntity
  };
}

/**
 * Create a damage context from an entity's ownership
 */
export function createDamageContext(
  world: World,
  sourceEntity: Entity,
  fallbackPlayer: Entity
) {
  const context = getOwnerContext(world, sourceEntity, fallbackPlayer);
  return {
    owner: context.owner,
    instigator: context.instigator,
    skillId: context.skillId,
    tags: context.tags
  };
}
