import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// Angular's dev server (apps/forgegate-desktop's "serve" target) listens on
// 4200, not Playwright's generated 3000 default.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Generated as a .mts file so Node forces ESM regardless of workspace
 * `type`. Playwright routes `.mts` through its ESM loader (dynamic import,
 * bypassing the pirates CJS-compile path), and Nx's native TS strip loads
 * `.mts` directly. Playwright's configLoader auto-discovers
 * `playwright.config.mts` via its extension list
 * (.ts/.js/.mts/.mjs/.cts/.cjs).
 *
 * `webServer` is the *only* thing that starts the dev server —
 * project.json explicitly overrides the Nx-inferred `e2e` target with
 * `dependsOn: []`. The plugin's default inference pairs `dependsOn:
 * forgegate-desktop:serve` with this same `webServer.command`, which is a
 * real, reproducible recursive Nx task invocation (confirmed both
 * locally and, fatally, on CI: the outer dependency's server took longer
 * to boot than the inner spawn's recursion guard tolerated, and Nx
 * exited the inner spawn with code 1 before the outer one was ready).
 * Clearing `dependsOn` and keeping exactly one starter removes the
 * recursion entirely rather than racing it.
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './e2e' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx nx run forgegate-desktop:serve',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
