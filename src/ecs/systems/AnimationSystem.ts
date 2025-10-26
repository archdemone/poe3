// Animation System for ECS
// Drives character animations based on movement and game state

import { System } from '../systems';
import { World, Entity } from '../world';
import { Transform, Velocity, AnimatedCharacter } from '../components';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PlayerAnimState } from '../../systems/AnimationController';

export class AnimationSystem implements System {
  private isSprinting: boolean = false;
  private dodgeCooldown: number = 0;
  private readonly dodgeCooldownDuration: number = 2000; // 2 seconds in ms
  
  async update(world: World, dt: number): Promise<void> {
    const entities = world.getEntitiesWith('transform', 'velocity', 'animatedCharacter');

    for (const entity of entities) {
      const transform = world.getComponent<Transform>(entity, 'transform')!;
      const velocity = world.getComponent<Velocity>(entity, 'velocity')!;
      const animatedChar = world.getComponent<AnimatedCharacter>(entity, 'animatedCharacter')!;

      // Update dodge cooldown
      if (this.dodgeCooldown > 0) {
        this.dodgeCooldown -= dt * 1000; // Convert to ms
      }

      // Update animation controller
      if (animatedChar.controller) {
        animatedChar.controller.update(dt);
      }

      // Determine animation state based on movement and input
      await this.updateAnimationState(transform, velocity, animatedChar, entity);

      // Update character facing direction
      this.updateFacingDirection(transform, velocity, animatedChar);
    }
  }
  
  /**
   * Update animation state based on movement and game state
   */
  private async updateAnimationState(
    transform: Transform,
    velocity: Velocity,
    animatedChar: AnimatedCharacter,
    entity: Entity
  ): Promise<void> {
    // Skip if no animation controller (fallback procedural model)
    if (!animatedChar.controller) {
      return;
    }

    const speed = velocity.value.length();
    const isMoving = speed > 0.01; // Small threshold to avoid jitter

    // Check for dodge input (Space key)
    if (this.shouldDodge() && !animatedChar.controller.isDodging()) {
      this.triggerDodge(animatedChar, velocity);
      return;
    }

    // Check for sprint input (Shift key)
    this.isSprinting = this.isSprintPressed();

    // Determine animation state
    let targetState: PlayerAnimState;

    // Skip combat animation check for procedural models without controllers
    if (animatedChar.controller && animatedChar.controller.isPlayingCombatAnimation()) {
      // Don't change animation during combat animations
      return;
    }
    
    if (isMoving) {
      if (this.isSprinting) {
        targetState = PlayerAnimState.SPRINT;
      } else {
        targetState = PlayerAnimState.RUN;
      }
    } else {
      targetState = PlayerAnimState.IDLE;
    }
    
    // Play animation if state changed
    if (animatedChar.currentState !== targetState) {
      const success = await animatedChar.controller.playAnimation(targetState, true);
      if (success) {
        animatedChar.currentState = targetState;
      }
    }
  }
  
  /**
   * Update character facing direction
   */
  private updateFacingDirection(
    transform: Transform, 
    velocity: Velocity, 
    animatedChar: AnimatedCharacter
  ): void {
    const speed = velocity.value.length();
    
    if (speed > 0.01) {
      // Face movement direction
      const direction = velocity.value.normalize();
      animatedChar.facing = direction;
      
      // Rotate character mesh to face direction
      if (transform.mesh) {
        const angle = Math.atan2(direction.x, direction.z);
        transform.mesh.rotation.y = angle;
      }
    } else {
      // Face mouse direction when not moving
      const mouseDirection = this.getMouseDirection();
      if (mouseDirection) {
        animatedChar.facing = mouseDirection;
        
        if (transform.mesh) {
          const angle = Math.atan2(mouseDirection.x, mouseDirection.z);
          transform.mesh.rotation.y = angle;
        }
      }
    }
  }
  
  /**
   * Check if dodge should be triggered
   */
  private shouldDodge(): boolean {
    // Check for Space key press
    return (window as any).input && (window as any).input[' '] && this.dodgeCooldown <= 0;
  }
  
  /**
   * Check if sprint is being pressed
   */
  private isSprintPressed(): boolean {
    return (window as any).input && (window as any).input['shift'];
  }
  
  /**
   * Update sprint state
   */
  updateSprintState(): boolean {
    return this.isSprintPressed();
  }
  
  /**
   * Trigger dodge animation and effects
   */
  private async triggerDodge(animatedChar: AnimatedCharacter, velocity: Velocity): Promise<void> {
    console.log('[AnimationSystem] Triggering dodge');

    // Skip if no animation controller
    if (!animatedChar.controller) {
      return;
    }

    // Play dodge animation
    const success = await animatedChar.controller.playAnimation(PlayerAnimState.DODGE, false, true);
    if (success) {
      animatedChar.currentState = PlayerAnimState.DODGE;
    }
    
    // Add dodge velocity boost
    const dodgeDirection = animatedChar.facing.normalize();
    const dodgeSpeed = 8.0; // Fast dodge speed
    velocity.value = dodgeDirection.scale(dodgeSpeed);
    
    // Set cooldown
    this.dodgeCooldown = this.dodgeCooldownDuration;
    
    // Enable iframe (this would be handled by the combat system)
    // The existing Combatant component has iFrameMs for this
  }
  
  /**
   * Get mouse direction for character facing
   */
  private getMouseDirection(): Vector3 | null {
    // This would integrate with the existing mouse picking system
    // For now, return null to use movement direction
    return null;
  }
  
  /**
   * Trigger attack animation
   */
  async triggerAttack(animatedChar: AnimatedCharacter): Promise<void> {
    if (!animatedChar.controller || animatedChar.controller.isPlayingCombatAnimation()) {
      return;
    }
    const success = await animatedChar.controller.playAnimation(PlayerAnimState.ATTACK, false, true);
    if (success) {
      animatedChar.currentState = PlayerAnimState.ATTACK;
    }
  }

  /**
   * Trigger spell cast animation
   */
  async triggerSpellCast(animatedChar: AnimatedCharacter): Promise<void> {
    if (!animatedChar.controller || animatedChar.controller.isPlayingCombatAnimation()) {
      return;
    }
    const success = await animatedChar.controller.playAnimation(PlayerAnimState.CAST, false, true);
    if (success) {
      animatedChar.currentState = PlayerAnimState.CAST;
    }
  }
}
