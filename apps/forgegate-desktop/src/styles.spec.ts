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
    expect(rule).toMatch(/animation:\s*fg-route-enter\s+var\(--fg-motion-duration-md\)\s+var\(--fg-motion-ease\)/);
  });

  it('defines the fg-route-enter keyframes it references', () => {
    expect(stylesCss).toMatch(/@keyframes fg-route-enter\s*{/);
  });
});
