
import { Vector3, Matrix, Vector3 as V3 } from '@babylonjs/core/Maths/math.vector';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import { Scene } from '@babylonjs/core/scene';

import { applyDamage, type DamageContext } from '../gameplay/combat/applyDamage';
import { createDamageContext } from '../gameplay/combat/ownership';
import { spawnMeleeHitbox } from '../gameplay/combat/spawnHitbox';

import type { Transform, Velocity, Health, EnemyTag, PlayerTag, Projectile, Combatant, Hurtbox, Hitbox, EnemyAI, PlayerState } from './components';
import type { World, Entity } from './world';

/** Base interface for systems. A system processes a set of entities each
 * frame. */
export interface System {
  update(world: World, dt: number): void | Promise<void>;
}

/** A simple movement system that integrates velocity into position. If
 * a Transform has an associated mesh it will be synchronised with
 * the component's position. */
export class MovementSystem implements System {
  update(world: World, dt: number): void {
    const entities = world.getEntitiesWith('transform', 'velocity');
    for (const e of entities) {
      const transform = world.getComponent<Transform>(e, 'transform')!;
      const velocity = world.getComponent<Velocity>(e, 'velocity')!;
      
      
      // position += velocity * dt
      const delta = velocity.value.scale(dt);
      transform.position.addInPlace(delta);
      if (transform.mesh) {
        transform.mesh.position.copyFrom(transform.position);
      }
    }
  }
}

/** System to update projectiles. Projectiles move like regular entities
 * via their velocity and expire after their lifeTime elapses. On
 * expiration they are removed from the world. Collision detection is
 * minimal; when a projectile enters a radius threshold of an enemy
 * entity it applies damage and then expires. */
export class ProjectileSystem implements System {
  // radius threshold for hit detection
  private hitRadius = 1.0;
  private onFloatTextCallback?: (pos: Vector3, damage: number, isCrit: boolean) => void;
  private onDeathCallback?: (entity: Entity) => void;
  private onDamageCallback?: (targetId: Entity) => void;

  constructor(
    onHit?: (position: Vector3, damage: number) => void, 
    onDamage?: (targetId: Entity) => void
  ) {
    // Adapt old callback to new signature
    if (onHit) {
      this.onFloatTextCallback = (pos: Vector3, damage: number, isCrit: boolean) => {
        onHit(pos, damage);
      };
    }
    this.onDamageCallback = onDamage;
  }

  update(world: World, dt: number): void {
    const now = performance.now();
    const projectiles = world.getEntitiesWith('transform', 'velocity', 'projectile');
    
    for (const p of projectiles) {
      const proj = world.getComponent<Projectile>(p, 'projectile')!;
      proj.lifeTime -= dt;
      // Move the projectile
      const transform = world.getComponent<Transform>(p, 'transform')!;
      const velocity = world.getComponent<Velocity>(p, 'velocity')!;
      transform.position.addInPlace(velocity.value.scale(dt));
      if (transform.mesh) {
        transform.mesh.position.copyFrom(transform.position);
      }
      // Check collisions with hurtboxes (proper combat system)
      const hurtboxes = world.getEntitiesWith('transform', 'health', 'hurtbox', 'combatant');
      for (const targetId of hurtboxes) {
        // Skip if same team as projectile owner
        const projOwner = world.getComponent<Combatant>(proj.owner, 'combatant');
        const targetCombatant = world.getComponent<Combatant>(targetId, 'combatant');
        if (projOwner && targetCombatant && projOwner.team === targetCombatant.team) {
          continue;
        }
        
        const etrans = world.getComponent<Transform>(targetId, 'transform')!;
        const hurtbox = world.getComponent<Hurtbox>(targetId, 'hurtbox')!;
        const dist = transform.position.subtract(etrans.position).length();
        
        if (dist < this.hitRadius + hurtbox.radius) {
          // Hit! Use unified damage system
          
          // Create damage context from projectile ownership
          const damageContext = createDamageContext(world, p, proj.owner);
          
          applyDamage(targetId, { phys: proj.damage }, damageContext, {
            world,
            nowMs: now,
            onFloatText: this.onFloatTextCallback,
            onDeath: (entityId: Entity, source?: Entity) => {
              // Death handling is now centralized in DeathSystem
              // Just trigger UI callbacks if needed
              const playerTag = world.getComponent<PlayerTag>(entityId, 'player');
              if (playerTag && this.onDeathCallback) {
                this.onDeathCallback(entityId);
              }
            },
          });
          
          // Call damage callback to update UI
          if (this.onDamageCallback) {
            this.onDamageCallback(targetId);
          }
          
          // Mark projectile for removal by setting lifeTime to zero
          proj.lifeTime = 0;
          break;
        }
      }
      // Remove expired projectile
      if (proj.lifeTime <= 0) {
        // Dispose of the mesh if it exists to clean up the scene
        const t = world.getComponent<Transform>(p, 'transform');
        if (t && t.mesh) {
          t.mesh.dispose();
        }
        (world as any)['components'].delete(p);
      }
    }
  }
}

/** Health system removes entities whose health has reached zero. 
 * NOTE: Death handling is now primarily done in CombatSystem for proper cleanup.
 * This system is kept for backward compatibility but won't remove entities with combatant. */
export class HealthSystem implements System {
  update(world: World, _dt: number): void {
    const entities = world.getEntitiesWith('health');
    for (const e of entities) {
      const health = world.getComponent<Health>(e, 'health')!;
      // Skip if entity has combatant (handled by CombatSystem)
      const combatant = world.getComponent<Combatant>(e, 'combatant');
      if (combatant) continue;
      
      if (!health.infinite && health.current <= 0) {
        // remove entity
        (world as any)['components'].delete(e);
      }
    }
  }
}

/** Simple AI system that causes enemies to chase the player. It
 *  computes a direction vector towards the player on the XZ plane and
 *  assigns it as the enemy's velocity. A constant speed is used. */
export class ChaseSystem implements System {
  private speed = 2;
  update(world: World, _dt: number): void {
    const players = world.getEntitiesWith('transform', 'player');
    if (players.length === 0) return;
    const player = players[0];
    const playerTransform = world.getComponent<Transform>(player, 'transform');
    if (!playerTransform) return;
    const enemies = world.getEntitiesWith('transform', 'velocity', 'enemy');
    for (const e of enemies) {
      const etrans = world.getComponent<Transform>(e, 'transform')!;
      const vel = world.getComponent<Velocity>(e, 'velocity')!;
      const toPlayer = playerTransform.position.subtract(etrans.position);
      toPlayer.y = 0;
      if (toPlayer.length() === 0) {
        vel.value.set(0, 0, 0);
        continue;
      }
      toPlayer.normalize();
      vel.value.x = toPlayer.x * this.speed;
      vel.value.y = 0;
      vel.value.z = toPlayer.z * this.speed;
    }
  }
}

/** Enemy AI state machine - handles idle, patrol, chase, windup, attack, recover */
export class EnemyAISystem implements System {
  update(world: World, dt: number): void {
    const enemies = world.getEntitiesWith('transform', 'enemyAI');
    const players = world.getEntitiesWith('transform', 'player');
    
    if (players.length === 0) return;
    
    const playerEntity = players[0];
    const playerTransform = world.getComponent<Transform>(playerEntity, 'transform');
    if (!playerTransform) return;
    
    // Check if player is dead
    const playerHealth = world.getComponent<Health>(playerEntity, 'health');
    const isPlayerDead = playerHealth && playerHealth.current <= 0;
    
    for (const enemyId of enemies) {
      const ai = world.getComponent<EnemyAI>(enemyId, 'enemyAI')!;
      const transform = world.getComponent<Transform>(enemyId, 'transform')!;
      const velocity = world.getComponent<Velocity>(enemyId, 'velocity');
      
      if (!velocity) {
        console.warn(`Enemy ${enemyId} has no velocity component!`);
        continue;
      }
      
      const toPlayer = playerTransform.position.subtract(transform.position);
      toPlayer.y = 0;
      const distToPlayer = toPlayer.length();
      
      const oldState = ai.state;
      
      // If player is dead, enemies should stop targeting and return to idle
      if (isPlayerDead) {
        if (ai.state !== 'idle' && ai.state !== 'patrol') {
          ai.state = 'idle';
          ai.target = null;
          ai.t = 0;
          velocity.value.set(0, 0, 0);
        }
        continue; // Skip rest of AI logic for this enemy
      }
      
      // Visual debug: change enemy color based on state (only when state changes)
      const updateColor = () => {
        if (transform.mesh && transform.mesh.material) {
          const mat = transform.mesh.material as any;
          if (mat.diffuseColor) {
            switch (ai.state) {
              case 'idle':
              case 'patrol':
                mat.diffuseColor.r = 0.5;
                mat.diffuseColor.g = 0.5;
                mat.diffuseColor.b = 0.5;
                break;
              case 'chase':
                mat.diffuseColor.r = 1;
                mat.diffuseColor.g = 1;
                mat.diffuseColor.b = 0;
                break;
              case 'windup':
                mat.diffuseColor.r = 1;
                mat.diffuseColor.g = 0.5;
                mat.diffuseColor.b = 0;
                break;
              case 'attack':
                mat.diffuseColor.r = 1;
                mat.diffuseColor.g = 0;
                mat.diffuseColor.b = 0;
                break;
              case 'recover':
                mat.diffuseColor.r = 0.5;
                mat.diffuseColor.g = 0.5;
                mat.diffuseColor.b = 1;
                break;
            }
          }
        }
      };
      
      switch (ai.state) {
        case 'idle':
        case 'patrol':
          // Check aggro range - use a slightly smaller range to prevent flickering
          if (distToPlayer < ai.aggroRange * 0.9) {
            ai.state = 'chase';
            ai.target = playerEntity;
            ai.t = 0;
          } else {
            // Stay idle - ensure velocity is zero
            velocity.value.set(0, 0, 0);
          }
          break;
          
        case 'chase':
          // Ensure target is always set when in chase state
          if (ai.target === null || ai.target === undefined || ai.target !== playerEntity) {
            ai.target = playerEntity;
          }
          
          // Check if we should lose aggro (only if distance is too far)
          if (distToPlayer > ai.aggroRange * 2.0) {
            // Lost aggro - use a much wider range to prevent flickering
            ai.state = 'idle';
            ai.t = 0;
            velocity.value.set(0, 0, 0);
          } else if (distToPlayer <= ai.attackRange) {
            // Enter windup
            ai.state = 'windup';
            ai.t = 0;
            velocity.value.set(0, 0, 0);
          } else {
            // Chase player - move toward them
            const dir = toPlayer.clone();
            dir.y = 0;
            if (dir.length() > 0) {
              dir.normalize();
              const speed = 2.5; // Slightly faster chase speed
              velocity.value.x = dir.x * speed;
              velocity.value.y = 0;
              velocity.value.z = dir.z * speed;
            }
          }
          break;
          
        case 'windup':
          // Increment timer only in timed states
          ai.t += dt;
          if (ai.t >= ai.windupMs / 1000) {
            // Spawn hitbox and enter attack
            const dir = toPlayer.clone();
            dir.y = 0;
            if (dir.length() > 0) {
              dir.normalize();
            } else {
              dir.set(0, 0, 1); // Default forward
            }
            spawnMeleeHitbox(
              world,
              enemyId,
              { x: dir.x, z: dir.z },
              0.8,  // radius
              1.0,  // range
              0.12, // lifetime
              ai.dpsHint // damage
            );
            ai.state = 'attack';
            ai.t = 0;
          }
          break;
          
        case 'attack':
          // Attack state lasts for hitbox lifetime (~120ms)
          ai.t += dt;
          if (ai.t >= 0.12) {
            ai.state = 'recover';
            ai.t = 0;
          }
          break;
          
        case 'recover':
          ai.t += dt;
          if (ai.t >= ai.recoverMs / 1000) {
            // Check if still in range to attack again, otherwise chase
            if (distToPlayer <= ai.attackRange) {
              ai.state = 'windup';
            } else if (distToPlayer < ai.aggroRange * 2.0) {
              ai.state = 'chase';
            } else {
              ai.state = 'idle';
            }
            ai.t = 0;
          }
          break;
      }
      
      // Update color if state changed
      if (oldState !== ai.state) {
        updateColor();
      }
    }
  }
}

/** Combat system - checks hitboxes vs hurtboxes and applies damage */
export class CombatSystem implements System {
  private onFloatTextCallback?: (pos: Vector3, damage: number, isCrit: boolean) => void;
  private onDeathCallback?: (entity: Entity) => void;
  private onDamageCallback?: (targetId: Entity) => void;
  
  constructor(
    onHitPause?: (ms: number) => void,
    onFloatText?: (pos: Vector3, text: string, kind: 'hit' | 'crit') => void,
    onDeath?: (entity: Entity) => void,
    onDamage?: (targetId: Entity) => void
  ) {
    // Adapt the callback to match the expected signature
    if (onFloatText) {
      this.onFloatTextCallback = (pos: Vector3, damage: number, isCrit: boolean) => {
        onFloatText(pos, Math.ceil(damage).toString(), isCrit ? 'crit' : 'hit');
      };
    }
    this.onDeathCallback = onDeath;
    this.onDamageCallback = onDamage;
  }
  
  update(world: World, dt: number): void {
    const now = performance.now();
    
    // Update hitbox lifetimes and check collisions
    const hitboxes = world.getEntitiesWith('transform', 'hitbox');
    
    for (const hbId of hitboxes) {
      const hitbox = world.getComponent<Hitbox>(hbId, 'hitbox')!;
      hitbox.lifetime -= dt;
      
      if (hitbox.lifetime <= 0) {
        // Remove expired hitbox
        (world as any)['components'].delete(hbId);
        continue;
      }
      
      // Check collisions with hurtboxes
      const hbTransform = world.getComponent<Transform>(hbId, 'transform')!;
      const hurtboxes = world.getEntitiesWith('transform', 'hurtbox', 'combatant', 'health');
      
      for (const targetId of hurtboxes) {
        if (targetId === hitbox.owner) continue; // Can't hit self
        
        const targetCombat = world.getComponent<Combatant>(targetId, 'combatant')!;
        const ownerCombat = world.getComponent<Combatant>(hitbox.owner, 'combatant');
        
        // Check team (can't hit same team)
        if (ownerCombat && targetCombat.team === ownerCombat.team) continue;
        
        const targetTransform = world.getComponent<Transform>(targetId, 'transform')!;
        const hurtbox = world.getComponent<Hurtbox>(targetId, 'hurtbox')!;
        
        const dist = hbTransform.position.subtract(targetTransform.position).length();
        
        if (dist < hitbox.radius + hurtbox.radius) {
          // Hit! Use unified damage system
          
          // Create damage context from hitbox ownership
          const damageContext = createDamageContext(world, hbId, hitbox.owner);
          
          applyDamage(targetId, hitbox.damage, damageContext, {
            world,
            nowMs: now,
            onFloatText: this.onFloatTextCallback,
            onDeath: (entityId: Entity, source?: Entity) => this.handleDeath(world, entityId, source),
          });
          
          // Call damage callback to update UI
          if (this.onDamageCallback) {
            this.onDamageCallback(targetId);
          }
          
          // Mark hitbox as expired to prevent multi-hit
          hitbox.lifetime = 0;
          break;
        }
      }
    }
  }
  
  private handleDeath(world: World, entityId: Entity, source?: Entity): void {
    // Death handling is now centralized in DeathSystem
    // Just trigger UI callbacks if needed
    const playerTag = world.getComponent<PlayerTag>(entityId, 'player');
    if (playerTag && this.onDeathCallback) {
      this.onDeathCallback(entityId);
    }
  }
}