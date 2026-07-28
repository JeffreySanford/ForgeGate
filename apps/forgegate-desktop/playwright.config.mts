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
 * `webServer` is required here even though the Nx-inferred `e2e` target
 * already declares `dependsOn: forgegate-desktop:serve` (a `continuous`
 * task) — that dependency starts the dev server but does not block until
 * it's actually accepting connections, which raced and failed
 * (`ERR_CONNECTION_REFUSED`) when relied on alone. `webServer` provides
 * the missing readiness poll against `url`. With `reuseExistingServer`,
 * if Nx's own dependency has already bound the port by the time this
 * checks, `command` is never actually invoked — the "recursive task
 * invocation" warning some runs print is Nx noticing the *attempt*, not a
 * failure; it does not stop the port from already being reachable.
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
