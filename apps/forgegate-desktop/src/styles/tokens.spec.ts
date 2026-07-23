import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Contract test, not a rendering test: locks the semantic token names this
// file promises (documentation/25-designer-ready-vertical-slice.md,
// "ForgeGate UI tokens") so a future edit can't silently rename or drop one
// out from under every screen that will come to depend on it.
const tokensCss = readFileSync(join(__dirname, 'tokens.css'), 'utf-8');

function matchBlock(pattern: RegExp): string {
  const match = tokensCss.match(pattern);
  if (!match) {
    throw new Error(`Expected tokens.css to contain a block matching ${pattern}`);
  }
  return match[1];
}

const requiredTokens = [
  '--fg-color-canvas',
  '--fg-color-surface',
  '--fg-color-surface-subtle',
  '--fg-color-surface-selected',
  '--fg-color-text',
  '--fg-color-text-muted',
  '--fg-color-text-inverse',
  '--fg-color-border',
  '--fg-color-border-strong',
  '--fg-color-action',
  '--fg-color-action-hover',
  '--fg-color-focus',
  '--fg-color-status-passed',
  '--fg-color-status-warning',
  '--fg-color-status-failed',
  '--fg-color-status-blocked',
  '--fg-color-status-stale',
  '--fg-color-status-unknown',
  '--fg-space-1',
  '--fg-space-2',
  '--fg-space-3',
  '--fg-space-4',
  '--fg-space-5',
  '--fg-space-6',
  '--fg-space-7',
  '--fg-radius-sm',
  '--fg-radius-md',
  '--fg-radius-lg',
  '--fg-shadow-sm',
  '--fg-shadow-md',
  '--fg-type-family',
  '--fg-type-family-mono',
  '--fg-type-size-sm',
  '--fg-type-size-md',
  '--fg-type-size-lg',
  '--fg-type-size-xl',
  '--fg-type-line-height',
  '--fg-motion-duration-sm',
  '--fg-motion-duration-md',
  '--fg-motion-ease',
] as const;

describe('ForgeGate semantic UI tokens', () => {
  it.each(requiredTokens)('defines %s in the default (light) :root block', (token) => {
    expect(tokensCss).toMatch(new RegExp(`${token}\\s*:`));
  });

  it('defines a dark theme override for every color token defined in :root', () => {
    const rootBlock = matchBlock(/:root\s*{([\s\S]*?)}/);
    const colorTokensInRoot = Array.from(rootBlock.matchAll(/(--fg-color-[a-z-]+)\s*:/g)).map((m) => m[1]);
    expect(colorTokensInRoot.length).toBeGreaterThan(0);

    const darkBlock = matchBlock(/:root\[data-theme=['"]dark['"]\]\s*{([\s\S]*?)}/);

    for (const token of colorTokensInRoot) {
      expect(darkBlock, `${token} has no explicit dark-theme override`).toMatch(new RegExp(`${token}\\s*:`));
    }
  });

  it('maps focus and status meaning onto forced-colors system colors rather than removing them', () => {
    const forcedColorsBlock = matchBlock(/@media \(forced-colors: active\)\s*{\s*:root\s*{([\s\S]*?)}\s*}/);

    expect(forcedColorsBlock).toMatch(/--fg-color-focus\s*:\s*Highlight/);
    for (const status of ['passed', 'warning', 'failed', 'blocked', 'stale', 'unknown']) {
      expect(forcedColorsBlock).toMatch(new RegExp(`--fg-color-status-${status}\\s*:`));
    }
  });

  it('zeroes motion durations under prefers-reduced-motion', () => {
    const reducedMotionBlock = matchBlock(/@media \(prefers-reduced-motion: reduce\)\s*{\s*:root\s*{([\s\S]*?)}\s*}/);
    expect(reducedMotionBlock).toMatch(/--fg-motion-duration-sm\s*:\s*0ms/);
    expect(reducedMotionBlock).toMatch(/--fg-motion-duration-md\s*:\s*0ms/);
  });
});
