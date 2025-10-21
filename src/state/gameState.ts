// Game state machine managing transitions between menu screens and gameplay.
// Valid flow: BOOT → MAIN_MENU → CHARACTER_CREATE → HIDEOUT ⇄ DUNGEON

export enum GameState {
  BOOT = 'BOOT',
  MAIN_MENU = 'MAIN_MENU',
  CHARACTER_CREATE = 'CHARACTER_CREATE',
  HIDEOUT = 'HIDEOUT',
  DUNGEON = 'DUNGEON',
}

type StateChangeHandler = (data?: any) => void;

/** Manages game state transitions and notifies listeners. */
export class StateManager {
  private currentState: GameState = GameState.BOOT;
  private listeners: Map<GameState, StateChangeHandler[]> = new Map();

  constructor() {
    // Initialize listener arrays for each state
    Object.values(GameState).forEach(state => {
      this.listeners.set(state as GameState, []);
    });
  }

  /** Get the current state. */
  getState(): GameState {
    return this.currentState;
  }

  /** Register a handler for when a specific state is entered. */
  on(state: GameState, handler: StateChangeHandler): void {
    const handlers = this.listeners.get(state);
    if (handlers) {
      handlers.push(handler);
    }
  }

  /** Remove a handler for a specific state. */
  off(state: GameState, handler: StateChangeHandler): void {
    const handlers = this.listeners.get(state);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /** Transition to a new state. Validates the transition and notifies listeners.
   * Data parameter is passed to all registered handlers. */
  transitionTo(newState: GameState, data?: any): void {
    if (!this.isValidTransition(this.currentState, newState)) {
      console.warn(`Invalid state transition from ${this.currentState} to ${newState}`);
      return;
    }

    console.log(`State transition: ${this.currentState} → ${newState}`);
    this.currentState = newState;

    // Notify all listeners for this state
    const handlers = this.listeners.get(newState);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in state handler for ${newState}:`, err);
        }
      });
    }
  }

  /** Validate if a state transition is allowed. */
  private isValidTransition(from: GameState, to: GameState): boolean {
    // Define allowed transitions
    const validTransitions: Record<GameState, GameState[]> = {
      [GameState.BOOT]: [GameState.MAIN_MENU],
      [GameState.MAIN_MENU]: [GameState.CHARACTER_CREATE, GameState.HIDEOUT],
      [GameState.CHARACTER_CREATE]: [GameState.HIDEOUT, GameState.MAIN_MENU],
      [GameState.HIDEOUT]: [GameState.DUNGEON, GameState.MAIN_MENU],
      [GameState.DUNGEON]: [GameState.HIDEOUT, GameState.MAIN_MENU],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }
}

// Singleton instance
export const stateManager = new StateManager();

