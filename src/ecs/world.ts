import type { System } from './systems';

export type Entity = number;

/**
 * A minimal ECS world. Entities are represented by numeric IDs and are
 * associated with a map of component names to component instances. Systems
 * are executed in the order they are registered when the world is
 * updated. This implementation is intentionally simple and is meant for
 * learning and prototyping rather than production use.
 */
export class World {
  private nextEntityId = 0;
  private components = new Map<Entity, Map<string, any>>();
  private systems: System[] = [];

  /** Create a new entity and return its ID. */
  createEntity(): Entity {
    const id = this.nextEntityId++;
    this.components.set(id, new Map());
    return id;
  }

  /** Add a component instance to an entity under the specified key. */
  addComponent<T>(entity: Entity, key: string, component: T): void {
    const comps = this.components.get(entity);
    if (!comps) {
      throw new Error(`Entity ${entity} does not exist`);
    }
    comps.set(key, component);
  }

  /** Retrieve a component instance for an entity. */
  getComponent<T>(entity: Entity, key: string): T | undefined {
    return this.components.get(entity)?.get(key);
  }

  /** Return all entities that have the specified set of component keys. */
  getEntitiesWith(...keys: string[]): Entity[] {
    const result: Entity[] = [];
    for (const [id, comps] of this.components.entries()) {
      let hasAll = true;
      for (const k of keys) {
        if (!comps.has(k)) {
          hasAll = false;
          break;
        }
      }
      if (hasAll) result.push(id);
    }
    return result;
  }

  /** Register a system that will be ticked each update. */
  addSystem(system: System): void {
    this.systems.push(system);
  }

  /** Advance the world by dt seconds. Each system is updated in order. */
  update(dt: number): void {
    for (const system of this.systems) {
      system.update(this, dt);
    }
  }
}