import { expect, test } from '@playwright/test';

/**
 * P0.7 visual regression baselines. Screenshots the empty-state shell (the
 * only state reachable without a real Tauri IPC bridge — this suite runs
 * against a plain `nx serve`, not the packaged desktop app) across the
 * conditions document 25/26 call out: light/dark theme, forced-colors,
 * reduced-motion, and narrow-window layouts.
 *
 * `forcedColors` and `reducedMotion` are real Playwright/Chromium media
 * emulation (`prefers-reduced-motion`, `forced-colors`) — not an
 * approximation. There is no equivalent API for OS-level display zoom;
 * the narrow-viewport tests approximate the *reflow* effect of high zoom
 * (content reflowing into less available space) without literally
 * magnifying pixels — a real, useful check, but not a substitute for
 * testing actual OS zoom or a real screen reader, which still need a
 * human pass.
 */

test.describe('Shell — light/dark theme', () => {
  test('light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('.app-nav__brand')).toBeVisible();
    await expect(page).toHaveScreenshot('shell-light.png');
  });

  test('dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('.app-nav__brand')).toBeVisible();
    await expect(page).toHaveScreenshot('shell-dark.png');
  });
});

test.describe('Shell — forced-colors mode', () => {
  test('renders with system colors, focus and status still visible', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    await expect(page.locator('.app-nav__brand')).toBeVisible();
    await expect(page).toHaveScreenshot('shell-forced-colors.png');
  });
});

test.describe('Shell — reduced motion', () => {
  test('zeroes ForgeGate motion durations, not just relies on default easing', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const durations = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return {
        sm: styles.getPropertyValue('--fg-motion-duration-sm').trim(),
        md: styles.getPropertyValue('--fg-motion-duration-md').trim(),
      };
    });

    expect(durations.sm).toBe('0ms');
    expect(durations.md).toBe('0ms');
  });
});

test.describe('Shell — narrow window', () => {
  test('375px width (mobile-ish narrow window)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('.app-nav__brand')).toBeVisible();
    await expect(page).toHaveScreenshot('shell-narrow-375.png');
  });

  test('320px width (approximates ~400% zoom reflow on a 1280px design)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/');
    await expect(page.locator('.app-nav__brand')).toBeVisible();
    await expect(page).toHaveScreenshot('shell-narrow-320.png');
  });
});

test.describe('Primary routes — light theme', () => {
  test('/workspace empty state', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/workspace');
    await expect(page.getByText('No workspace open yet')).toBeVisible();
    await expect(page).toHaveScreenshot('workspace-empty.png');
  });

  test('/components empty state', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/components');
    await expect(page.getByText('No workspace open yet')).toBeVisible();
    await expect(page).toHaveScreenshot('components-empty.png');
  });
});
