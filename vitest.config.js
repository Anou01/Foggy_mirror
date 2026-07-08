// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // MediaPipe CDN imports are not testable in Node — exclude them
    // by aliasing to empty stubs so imports resolve without network calls.
    alias: {
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14': 
        new URL('./tests/__mocks__/mediapipe.js', import.meta.url).pathname,
    },
  },
});
