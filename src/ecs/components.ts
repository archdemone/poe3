import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';

import type { Entity } from './world';


/** Position and rendering data for an entity. The optional mesh field
 * allows a Babylon.js mesh to be associated with this component. When
 * present, the mesh's position will be synchronised with the component
 * during movement updates. */
export interface Transform {
  position: Vector3;
  mesh?: AbstractMesh;
}

/** Linear velocity of an entity in units per second. */
export interface Velocity {
  value: Vector3;
}

/** Hit points for an entity. An entity with `infinite` set to true
 * should never be killed by the HealthSystem. */
export interface Health {
  current: number;
  max: number;
  infinite?: boolean;
}

/** Marker interface to tag an entity as an enemy. */
export interface EnemyTag {}

/** Marker interface to tag an entity as a player. */
export interface PlayerTag {}

/** Parameters for a projectile. Projectiles move according to their
 * velocity and may apply damage to enemies on impact. */
export interface Projectile {
  damage: number;
  lifeTime: number;
  owner: Entity;
}

/** Combat stats and state for entities that can fight */
export interface Combatant {
  team: 'player' | 'enemy';
  armour: number;
  evasion: number;
  critChance: number;
  critMult: number;
  iFrameMs: number;
  lastHitAt: number;
}

/** Hurtbox for entities that can be damaged */
export interface Hurtbox {
  radius: number;
}

/** Hitbox for attacks (temporary entities that deal damage) */
export interface Hitbox {
  radius: number;
  owner: Entity;
  lifetime: number;
  damage: {
    phys: number;
    elem?: {
      fire?: number;
      cold?: number;
      light?: number;
    };
  };
  knockback?: number;
}

/** Enemy AI state machine */
export interface EnemyAI {
  state: 'idle' | 'patrol' | 'chase' | 'windup' | 'attack' | 'recover';
  target?: Entity;
  t: number; // Timer for current state
  attackRange: number;
  aggroRange: number;
  windupMs: number;
  recoverMs: number;
  dpsHint: number;
}

/** Player death state */
export interface PlayerState {
  isDead: boolean;
  deathTime?: number;
}

/** Who ultimately owns this entity (projectile, hitbox, minion, aura) */
export interface COwner {
  // entity that created this (e.g., player or minion)
  instigator: number;         // the entity that directly caused the damage (projectile/hitbox/minion)
  owner: number;              // root owner for credit (usually a player; for minions, their summoner)
  skillId?: string;           // optional skill that created it
  tags?: string[];            // ["projectile","melee","dot","minion","trap",...]
}

/** Track last damaging player chain so we can credit kills */
export interface CDamageCredit {
  lastOwner?: number;         // root owner (player) to credit
  lastInstigator?: number;    // immediate source (projectile/minion/etc.)
  lastSkillId?: string;
  lastHitTimeMs: number;
}