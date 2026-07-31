import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Contract test: locks that the P1.8 route-transition class stays wired to
// the shared motion tokens rather than a hardcoded duration, so it keeps
// inheriting the prefers-reduced-motion guarantee proven in tokens.spec.ts
// without needing its own reduced-motion test.
const stylesCss = readFileSync(join(__dirname, 'styles.css'), 'utf-8');

describe('fg-route-enter (P1.8 route transition)', () => {
  it('animates using the shared motion duration and easing tokens, not a hardcoded value', () => {
    const ruleMatch = stylesCss.match(/\.fg-route-enter\s*{([\s\S]*?)}/);
    expect(ruleMatch).not.toBeNull();
    const rule = ruleMatch?.[1] ?? '';
    expect(rule).toMatch(
      /animation:\s*fg-route-enter\s+var\(--fg-motion-duration-md\)\s+var\(--fg-motion-ease\)/,
    );
  });

  it('defines the fg-route-enter keyframes it references', () => {
    expect(stylesCss).toMatch(/@keyframes fg-route-enter\s*{/);
  });
});

describe('fg-route-leave (P1.8 route transition leave half)', () => {
  it('animates using the shared motion duration and easing tokens, not a hardcoded value', () => {
    const ruleMatch = stylesCss.match(/\.fg-route-leave\s*{([\s\S]*?)}/);
    expect(ruleMatch).not.toBeNull();
    const rule = ruleMatch?.[1] ?? '';
    expect(rule).toMatch(
      /animation:\s*fg-route-leave\s+var\(--fg-motion-duration-md\)\s+var\(--fg-motion-ease\)/,
    );
  });

  it('defines the fg-route-leave keyframes it references', () => {
    expect(stylesCss).toMatch(/@keyframes fg-route-leave\s*{/);
  });

  it('never intercepts pointer input, as a second guarantee alongside the JS-applied inert attribute', () => {
    const ruleMatch = stylesCss.match(/\.fg-route-leave\s*{([\s\S]*?)}/);
    const rule = ruleMatch?.[1] ?? '';
    expect(rule).toMatch(/pointer-events:\s*none/);
  });
});

describe('fg-rescan-refresh (P1.8 rescan-triggered entrance)', () => {
  it('animates using the shared motion duration and easing tokens, not a hardcoded value', () => {
    const ruleMatch = stylesCss.match(/\.fg-rescan-refresh\s*{([\s\S]*?)}/);
    expect(ruleMatch).not.toBeNull();
    const rule = ruleMatch?.[1] ?? '';
    expect(rule).toMatch(
      /animation:\s*fg-rescan-refresh\s+var\(--fg-motion-duration-md\)\s+var\(--fg-motion-ease\)/,
    );
  });

  it('defines the fg-rescan-refresh keyframes it references', () => {
    expect(stylesCss).toMatch(/@keyframes fg-rescan-refresh\s*{/);
  });
});
