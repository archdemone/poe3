// Hitbox spawning utilities for melee attacks

import type { World, Entity } from '@/ecs/world';
import type { Transform, Hitbox } from '@/ecs/components';
import { Vector3 } from 'babylonjs';
import { setOwner } from './ownership';

/**
 * Spawn a melee hitbox entity in front of the attacker.
 * The hitbox will exist temporarily and deal damage on collision with hurtboxes.
 * 
 * @param world - The ECS World instance
 * @param ownerId - Entity ID of the attacker
 * @param forward - Normalized forward direction {x, z}
 * @param radius - Hitbox collision radius
 * @param range - Distance in front of owner to place hitbox
 * @param lifetime - How long the hitbox exists (seconds)
 * @param damage - Physical damage to deal
 * @returns The created hitbox entity ID
 */
export function spawnMeleeHitbox(
  world: World,
  ownerId: Entity,
  forward: { x: number; z: number },
  radius = 0.8,
  range = 1.1,
  lifetime = 0.12,
  damage = 8
): Entity {
  const ownerTransform = world.getComponent<Transform>(ownerId, 'transform');
  if (!ownerTransform) {
    throw new Error(`Cannot spawn hitbox: owner ${ownerId} has no transform`);
  }
  
  // Create hitbox entity
  const hitboxEntity = world.createEntity();
  
  // Position hitbox in front of owner
  const hitboxPos = ownerTransform.position.clone();
  hitboxPos.x += forward.x * range;
  hitboxPos.z += forward.z * range;
  
  // Create transform component for hitbox
  const hitboxTransform: Transform = {
    position: hitboxPos,
  };
  
  // Create hitbox component
  const hitbox: Hitbox = {
    radius,
    owner: ownerId,
    lifetime,
    damage: { phys: damage },
  };
  
  // Add components to entity
  world.addComponent(hitboxEntity, 'transform', hitboxTransform);
  world.addComponent(hitboxEntity, 'hitbox', hitbox);
  
  // Set ownership for damage attribution
  setOwner(world, hitboxEntity, ownerId, hitboxEntity, 'auto_attack', ['melee']);
  
  console.log(
    `[HB] spawned hitbox=${hitboxEntity} owner=${ownerId} pos=(${hitboxPos.x.toFixed(1)},${hitboxPos.z.toFixed(1)}) dmg=${damage}`
  );
  
  return hitboxEntity;
}

