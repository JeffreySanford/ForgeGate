/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/forgegate-desktop',
  plugins: [angular()],
  resolve: { tsconfigPaths: true },
  // Uncomment this if you are using workers.
  // worker: {
  //   resolve: { tsconfigPaths: true },
  // },
  test: {
    name: 'forgegate-desktop',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/forgegate-desktop',
      provider: 'v8' as const,
    },
  },
}));
