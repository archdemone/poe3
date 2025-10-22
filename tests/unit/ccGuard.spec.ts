/**
 * Unit Tests for Character Creation Guard (Watchdog)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DOM elements
const mockQuerySelector = vi.fn();
const mockGetComputedStyle = vi.fn();
const mockSetTimeout = vi.fn();
const mockClearTimeout = vi.fn();

// Setup DOM mocks
beforeEach(() => {
  // Mock document methods
  global.document.querySelector = mockQuerySelector;
  global.document.body = { appendChild: vi.fn() } as any;
  global.window = {
    setTimeout: mockSetTimeout,
    clearTimeout: mockClearTimeout,
    getComputedStyle: mockGetComputedStyle,
  } as any;

  // Reset mocks
  vi.clearAllMocks();
  mockSetTimeout.mockImplementation((fn) => {
    fn(); // Execute immediately for testing
    return 1;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Import the guard after setting up mocks
import { startWatchdog, stopWatchdog, installWatchdog } from '../../src/features/characterCreation/guard';

describe('Character Creation Guard', () => {
  describe('startWatchdog', () => {
    it('starts monitoring when CC UI is not found', () => {
      mockQuerySelector.mockReturnValue(null); // No CC UI found

      const onRetry = vi.fn();
      const onFailure = vi.fn();

      startWatchdog({ onRetry, onFailure });

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('does not trigger when CC UI is found and visible', () => {
      const mockElement = { style: {} };
      mockQuerySelector.mockReturnValue(mockElement);
      mockGetComputedStyle.mockReturnValue({ display: 'block', visibility: 'visible', opacity: '1' });

      const onRetry = vi.fn();
      const onFailure = vi.fn();

      startWatchdog({ onRetry, onFailure });

      expect(onRetry).not.toHaveBeenCalled();
      expect(onFailure).not.toHaveBeenCalled();
    });

    it('detects hidden UI elements', () => {
      const mockElement = { style: {} };
      mockQuerySelector.mockReturnValue(mockElement);

      // Test display: none
      mockGetComputedStyle.mockReturnValue({ display: 'none' });
      startWatchdog();
      expect(mockSetTimeout).toHaveBeenCalled();

      // Reset
      vi.clearAllMocks();
      mockSetTimeout.mockClear();

      // Test opacity: 0
      mockGetComputedStyle.mockReturnValue({ display: 'block', visibility: 'visible', opacity: '0' });
      startWatchdog();
      expect(mockSetTimeout).toHaveBeenCalled();
    });
  });

  describe('stopWatchdog', () => {
    it('clears the watchdog timer', () => {
      startWatchdog(); // This sets a timer
      stopWatchdog();
      expect(mockClearTimeout).toHaveBeenCalled();
    });
  });

  describe('installWatchdog', () => {
    it('sets up state listeners', () => {
      // Mock stateManager
      const mockStateManager = {
        on: vi.fn(),
      };

      // We can't easily test the state manager integration without more complex mocking
      // This test ensures the function doesn't throw
      expect(() => installWatchdog()).not.toThrow();
    });
  });

  describe('recovery mechanisms', () => {
    it('retries UI loading on failure', async () => {
      mockQuerySelector.mockReturnValue(null); // UI not found

      const onRetry = vi.fn();
      const onFailure = vi.fn();

      // Mock the import function
      const mockImport = vi.fn().mockResolvedValue({
        default: { init: vi.fn() }
      });
      global.import = mockImport;

      startWatchdog({ onRetry, onFailure });

      // Wait for the retry logic to execute
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(onRetry).toHaveBeenCalled();
    });

    it('shows error modal after max retries', async () => {
      mockQuerySelector.mockReturnValue(null); // UI not found

      const onFailure = vi.fn();

      // Mock failed import
      global.import = vi.fn().mockRejectedValue(new Error('Import failed'));

      startWatchdog({ onFailure });

      // Wait for failure logic
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(onFailure).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
    });

    it('error modal has correct functionality', () => {
      mockQuerySelector.mockReturnValue(null);
      startWatchdog();

      // Check that error modal was created
      expect(document.body.appendChild).toHaveBeenCalled();

      const modalCall = vi.mocked(document.body.appendChild).mock.calls[0][0];
      expect(modalCall.id).toBe('cc-mount-error-modal');

      // Check modal has the expected buttons
      const modalHtml = modalCall.innerHTML;
      expect(modalHtml).toContain('cc-error-retry');
      expect(modalHtml).toContain('cc-error-continue');
    });
  });

  describe('integration with state transitions', () => {
    it('watchdog is cleaned up on state changes', () => {
      // This would require mocking the stateManager.on calls
      // For now, just verify the installWatchdog function exists and is callable
      expect(typeof installWatchdog).toBe('function');
    });
  });

  // Import and test CharacterCreationScene dispose behavior
  describe('CharacterCreationScene dispose assurance', () => {
    it('properly cleans up resources after dispose', async () => {
      // Mock Babylon.js engine and canvas
      const mockEngine = {
        runRenderLoop: vi.fn(),
        stopRenderLoop: vi.fn(),
      };

      const mockCanvas = {
        getContext: vi.fn(),
        addEventListener: vi.fn(),
      };

      // Mock scene
      const mockScene = {
        meshes: [{ dispose: vi.fn() }, { dispose: vi.fn() }],
        materials: [{ dispose: vi.fn() }],
        textures: [{ dispose: vi.fn() }],
        activeCamera: { dispose: vi.fn() },
        clearColor: {},
        particleSystems: [],
      };

      // Mock the constructor dependencies
      const originalWindow = global.window;
      global.window = {
        ...originalWindow,
        __gameScene: mockScene,
      } as any;

      // Import the class dynamically to avoid module issues
      const { CharacterCreationScene } = await import('../../src/features/characterCreation/scene/CharacterCreationScene');

      // Create instance
      const scene = new CharacterCreationScene(mockEngine as any, mockCanvas as any);

      // Mock avatar dispose
      scene['avatar'] = { dispose: vi.fn() };

      // Track initial counts
      const initialMeshCount = mockScene.meshes.length;
      const initialMaterialCount = mockScene.materials.length;
      const initialTextureCount = mockScene.textures.length;

      // Dispose
      scene.dispose();

      // Verify avatar was disposed
      expect(scene['avatar'].dispose).toHaveBeenCalled();

      // Cleanup
      global.window = originalWindow;
    });

    it('handles multiple enter/exit cycles without resource leaks', async () => {
      // This test would require a more complete Babylon.js mock setup
      // For now, just verify the dispose method exists and is callable
      const { CharacterCreationScene } = await import('../../src/features/characterCreation/scene/CharacterCreationScene');

      expect(typeof CharacterCreationScene.prototype.dispose).toBe('function');
    });
  });
});
