import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/packages/adapters/native-patterns',
  plugins: [nxViteTsPaths()],
  test: {
    name: 'adapter-native-patterns',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
}));
