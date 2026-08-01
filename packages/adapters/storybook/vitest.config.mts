import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/packages/adapters/storybook',
  resolve: { tsconfigPaths: true },
  test: {
    name: 'adapter-storybook',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
}));
