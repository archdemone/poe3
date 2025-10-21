// Unified damage application system for World-based ECS

import type { World, Entity } from '@/ecs/world';
import type { Health, Combatant, Transform, CDamageCredit } from '@/ecs/components';
import { Vector3 } from 'babylonjs';

/** Damage payload with physical and optional elemental components */
export interface DamagePayload {
  phys: number;
  elem?: {
    fire?: number;
    cold?: number;
    light?: number;
  };
}

/** Context for damage attribution */
export interface DamageContext {
  owner: number;            // root credit (player)
  instigator: number;       // projectile/minion/etc.
  skillId?: string;
  tags?: string[];
}

/** Callbacks and dependencies for damage application */
export interface ApplyDamageDeps {
  world: World;
  onFloatText?: (pos: Vector3, damage: number, isCrit: boolean) => void;
  onHitPause?: (ms: number) => void;
  onDeath?: (entity: Entity, source?: Entity) => void;
  nowMs: number;
}

/**
 * Apply damage to a target entity with armor mitigation, i-frames, and crit rolls.
 * This is the single source of truth for all damage in the game.
 */
export function applyDamage(
  targetId: Entity,
  payload: DamagePayload,
  ctx: DamageContext,
  deps: ApplyDamageDeps
): void {
  const { world, onFloatText, onHitPause, onDeath, nowMs } = deps;
  
  // Get required components
  const health = world.getComponent<Health>(targetId, 'health');
  const combatant = world.getComponent<Combatant>(targetId, 'combatant');
  const transform = world.getComponent<Transform>(targetId, 'transform');
  
  if (!health || !combatant || !transform) return;
  
  // Don't apply damage if already dead (health is 0)
  if (health.current <= 0 && !health.infinite) {
    return;
  }
  
  // Check i-frames (invulnerability period after last hit)
  const timeSinceLastHit = nowMs - combatant.lastHitAt;
  if (timeSinceLastHit < combatant.iFrameMs) {
    return;
  }
  
  // Calculate physical damage with armor mitigation
  // Formula: mitigated = damage * (100 / (100 + armor))
  const physDamage = payload.phys || 0;
  const mitigatedPhys = physDamage * (100 / (100 + combatant.armour));
  
  // Calculate elemental damage (no mitigation for now)
  const elem = payload.elem || {};
  const elemTotal = (elem.fire ?? 0) + (elem.cold ?? 0) + (elem.light ?? 0);
  
  // Total pre-crit damage
  let totalDamage = mitigatedPhys + elemTotal;
  
  // Crit roll
  const isCrit = Math.random() < combatant.critChance;
  if (isCrit) {
    totalDamage *= combatant.critMult;
  }
  
  // Apply damage to health (unless infinite)
  if (!health.infinite) {
    health.current -= totalDamage;
    // Clamp health to minimum of 0 (prevent negative health)
    if (health.current < 0) {
      health.current = 0;
    }
  }
  
  // Update last hit timestamp
  combatant.lastHitAt = nowMs;
  
  // 🔑 record credit for this target
  const credit = world.getComponent<CDamageCredit>(targetId, 'damageCredit') ?? { lastHitTimeMs: 0 };
  credit.lastOwner = ctx.owner;
  credit.lastInstigator = ctx.instigator;
  credit.lastSkillId = ctx.skillId;
  credit.lastHitTimeMs = nowMs;
  world.addComponent(targetId, 'damageCredit', credit);
  
  // Trigger callbacks
  if (onFloatText) {
    onFloatText(transform.position, Math.ceil(totalDamage), isCrit);
  }
  
  if (onHitPause) {
    onHitPause(80);
  }
  
  // Check for death
  if (health.current <= 0 && !health.infinite) {
    if (onDeath) {
      onDeath(targetId, ctx.owner);
    }
  }
  
  console.log(
    `[DMG] target=${targetId} damage=${Math.ceil(totalDamage)}${isCrit ? ' CRIT' : ''} hp=${Math.ceil(health.current)}/${health.max}`
  );
}

