// Animation Controller for Character State Management
// Handles animation state machine, blending, and transitions

import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { CharacterAnimation } from './characterLoader';
import { ProgressiveAnimationLoader } from './ProgressiveAnimationLoader';

export enum PlayerAnimState {
  IDLE = 'idle',
  RUN = 'run',
  SPRINT = 'sprint',
  DODGE = 'dodge',
  ATTACK = 'attack',
  CAST = 'cast'
}

export interface AnimationTransition {
  from: PlayerAnimState;
  to: PlayerAnimState;
  duration: number; // Blend duration in seconds
}

export class AnimationController {
  private animations: Map<PlayerAnimState, CharacterAnimation> = new Map();
  private currentState: PlayerAnimState = PlayerAnimState.IDLE;
  private currentAnimation: CharacterAnimation | null = null;
  private isTransitioning: boolean = false;
  private transitionStartTime: number = 0;
  private transitionDuration: number = 0.2; // Default blend time
  private skeleton: Skeleton | null = null;
  private progressiveLoader: ProgressiveAnimationLoader | null = null;
  
  // Animation priorities (higher = more important)
  private priorities: Map<PlayerAnimState, number> = new Map([
    [PlayerAnimState.DODGE, 5],
    [PlayerAnimState.ATTACK, 4],
    [PlayerAnimState.CAST, 4],
    [PlayerAnimState.SPRINT, 3],
    [PlayerAnimState.RUN, 2],
    [PlayerAnimState.IDLE, 1]
  ]);
  
  // Combat state tracking
  public combatState: 'idle' | 'attacking' | 'casting' | 'dodging' = 'idle';
  public attackStartTime: number = 0;
  public attackDuration: number = 0;
  
  constructor(skeleton?: Skeleton, progressiveLoader?: ProgressiveAnimationLoader) {
    this.skeleton = skeleton || null;
    this.progressiveLoader = progressiveLoader || null;
  }
  
  /**
   * Add an animation to the controller
   */
  addAnimation(state: PlayerAnimState, animation: CharacterAnimation): void {
    this.animations.set(state, animation);
    console.log(`[AnimationController] Added animation ${state} with duration ${animation.duration}s`);
  }
  
  /**
   * Play an animation with optional looping
   */
  async playAnimation(state: PlayerAnimState, loop: boolean = true, force: boolean = false): Promise<boolean> {
    let animation = this.animations.get(state);

    // If animation not loaded locally, try progressive loading
    if (!animation && this.progressiveLoader) {
      try {
        console.log(`[AnimationController] Loading animation ${state} progressively...`);
        animation = await this.progressiveLoader.loadAnimation(state);

        // Add to local cache
        this.addAnimation(state, animation);

        // Preload predicted animations in background
        this.progressiveLoader.preloadPredictedAnimations(state).catch(error =>
          console.warn(`[AnimationController] Failed to preload predictions for ${state}:`, error)
        );

      } catch (error) {
        console.warn(`[AnimationController] Failed to load animation ${state} progressively:`, error);
        return false;
      }
    }

    if (!animation) {
      console.warn(`[AnimationController] Animation ${state} not found`);
      return false;
    }
    
    // Check if we can interrupt current animation
    if (!force && this.currentAnimation && !this.canInterrupt(this.currentState, state)) {
      console.log(`[AnimationController] Cannot interrupt ${this.currentState} with ${state}`);
      return false;
    }
    
    // Stop current animation
    if (this.currentAnimation) {
      this.currentAnimation.animationGroup.stop();
    }
    
    // Start new animation
    this.currentState = state;
    this.currentAnimation = animation;
    this.isTransitioning = false;
    
    // Update combat state
    this.updateCombatState(state);
    
    // Play the animation
    if (loop) {
      animation.animationGroup.play(true);
    } else {
      animation.animationGroup.play(false);
      
      // Set up completion callback for non-looping animations
      this.setupAnimationCompletion(animation);
    }
    
    console.log(`[AnimationController] Playing ${state} (loop: ${loop})`);
    return true;
  }
  
  /**
   * Update the animation controller
   */
  update(deltaTime: number): void {
    // Handle non-looping animation completion
    if (this.currentAnimation && !this.currentAnimation.animationGroup.isPlaying) {
      if (this.currentState === PlayerAnimState.ATTACK || 
          this.currentState === PlayerAnimState.CAST || 
          this.currentState === PlayerAnimState.DODGE) {
        // Return to idle after combat animations
        this.playAnimation(PlayerAnimState.IDLE, true, true);
      }
    }
    
    // Update combat state timing
    if (this.combatState === 'attacking' || this.combatState === 'casting') {
      const elapsed = Date.now() - this.attackStartTime;
      if (elapsed >= this.attackDuration) {
        this.combatState = 'idle';
      }
    }
  }
  
  /**
   * Get current animation state
   */
  getCurrentState(): PlayerAnimState {
    return this.currentState;
  }
  
  /**
   * Check if currently playing a combat animation
   */
  isPlayingCombatAnimation(): boolean {
    return this.combatState !== 'idle';
  }
  
  /**
   * Check if currently dodging
   */
  isDodging(): boolean {
    return this.currentState === PlayerAnimState.DODGE;
  }
  
  /**
   * Check if currently attacking
   */
  isAttacking(): boolean {
    return this.currentState === PlayerAnimState.ATTACK;
  }
  
  /**
   * Check if currently casting
   */
  isCasting(): boolean {
    return this.currentState === PlayerAnimState.CAST;
  }
  
  /**
   * Stop all animations
   */
  stopAllAnimations(): void {
    if (this.currentAnimation) {
      this.currentAnimation.animationGroup.stop();
    }
    this.currentState = PlayerAnimState.IDLE;
    this.currentAnimation = null;
    this.combatState = 'idle';
  }
  
  /**
   * Dispose of the animation controller
   */
  dispose(): void {
    this.stopAllAnimations();
    this.animations.clear();
  }
  
  /**
   * Check if we can interrupt current animation with new one
   */
  private canInterrupt(current: PlayerAnimState, next: PlayerAnimState): boolean {
    const currentPriority = this.priorities.get(current) || 0;
    const nextPriority = this.priorities.get(next) || 0;
    
    // Higher priority animations can interrupt lower priority ones
    return nextPriority > currentPriority;
  }
  
  /**
   * Update combat state based on animation state
   */
  private updateCombatState(state: PlayerAnimState): void {
    switch (state) {
      case PlayerAnimState.ATTACK:
        this.combatState = 'attacking';
        this.attackStartTime = Date.now();
        this.attackDuration = this.currentAnimation?.duration || 1000;
        break;
      case PlayerAnimState.CAST:
        this.combatState = 'casting';
        this.attackStartTime = Date.now();
        this.attackDuration = this.currentAnimation?.duration || 1000;
        break;
      case PlayerAnimState.DODGE:
        this.combatState = 'dodging';
        break;
      default:
        this.combatState = 'idle';
        break;
    }
  }
  
  /**
   * Set up animation completion callback for non-looping animations
   */
  private setupAnimationCompletion(animation: CharacterAnimation): void {
    // This will be handled in the update loop since AnimationGroup doesn't have direct completion callbacks
    // The update method checks if animation is still playing
  }
}
