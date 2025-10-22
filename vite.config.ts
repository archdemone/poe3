import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    {
      name: 'normalize-import-specifiers',
      enforce: 'pre',
      transform(code, id) {
        if (!id.includes('src')) return null;
        return code.replace(/from\s+['"]([^'"]+)['"]/g, (m, s) =>
          `from '${s.replace(/\\\\/g, '/')}'`);
      }
    }
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['tests/e2e/**'] // 👈 ignore Playwright tests
  },
  // Babylon.js specific optimizations
  optimizeDeps: {
    include: ['babylonjs']
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Skip browser-tools-mcp-extension completely
        if (id.includes('browser-tools-mcp-extension')) {
          return true;
        }
        return false;
      },
      output: {
        manualChunks: {
          babylonjs: ['babylonjs']
        }
      },
      input: {
        main: './index.html'
      }
    }
  },
  // Disable JSON processing - handle JSON files as assets
  json: {
    stringify: true
  },
  // Exclude browser-tools-mcp-extension from build
  publicDir: false
})