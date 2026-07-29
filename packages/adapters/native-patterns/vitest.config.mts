import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/packages/adapters/native-patterns',
  resolve: { tsconfigPaths: true },
  test: {
    name: 'adapter-native-patterns',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
}));
