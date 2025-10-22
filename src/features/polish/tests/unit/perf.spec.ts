import { describe, it, expect } from 'vitest';
import { unfreezeWorld } from '../../perf';

describe('perf helpers', () => {
  it('unfreezeWorld does not throw with dummy scene', () => {
    const scene: any = {
      unfreezeActiveMeshes: () => {},
      meshes: [
        { unfreezeWorldMatrix: () => {} },
        { unfreezeWorldMatrix: () => {} },
      ],
    };
    expect(() => unfreezeWorld(scene)).not.toThrow();
  });
});
