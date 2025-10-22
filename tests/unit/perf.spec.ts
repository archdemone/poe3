import { describe, it, expect } from 'vitest';
import { unfreezeWorld } from '../../src/features/polish/perf';

describe('polish perf', () => {
  it('unfreezeWorld is idempotent and safe', () => {
    const scene: any = {
      unfreezeActiveMeshes: () => {},
      meshes: [
        { unfreezeWorldMatrix: () => {} },
        { unfreezeWorldMatrix: () => {} },
      ],
    };
    expect(() => unfreezeWorld(scene)).not.toThrow();
    expect(() => unfreezeWorld(scene)).not.toThrow();
  });
});
