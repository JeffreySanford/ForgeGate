import axe from 'axe-core';

/**
 * Automated accessibility check for P0.7 ("Add automated accessibility
 * checks for primary routes"). Runs against the real rendered DOM inside
 * vitest's jsdom environment, which has no real layout engine — so
 * layout-dependent checks that would be meaningless without real
 * rendering (color contrast, target size) are disabled here rather than
 * left to produce misleading pass/fail results. Everything structural
 * (labels, roles, heading order, duplicate ids, table structure, ARIA
 * usage) still runs for real.
 */
export async function expectNoAccessibilityViolations(element: HTMLElement): Promise<void> {
  const results = await axe.run(element, {
    rules: {
      'color-contrast': { enabled: false },
      'target-size': { enabled: false },
    },
  });

  if (results.violations.length > 0) {
    const details = results.violations
      .map((violation) => {
        const targets = violation.nodes.map((node) => node.target.join(' ')).join(', ');
        return `${violation.id} (${violation.impact}): ${violation.help} — ${targets}`;
      })
      .join('\n');
    throw new Error(`Accessibility violations found:\n${details}`);
  }
}
