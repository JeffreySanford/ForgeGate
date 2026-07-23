/**
 * Gate kinds ForgeGate coordinates, per documentation/08-test-orchestration.md
 * and documentation/07-compliance-testing.md.
 */
export type TestGate =
  | 'unit'
  | 'storybook-interaction'
  | 'browser'
  | 'axe'
  | 'visual'
  | 'lint'
  | 'type-check'
  | 'build'
  | 'manual-keyboard'
  | 'manual-screen-reader'
  | 'manual-forced-colors'
  | 'manual-zoom'
  | 'manual-reduced-motion'
  | 'application-context';

export type TestScope = 'component' | 'application-context';

/** Defines a required gate and its scope, per documentation/16-data-and-schema-model.md ("TestRequirement"). */
export interface TestRequirement {
  readonly id: string;
  readonly componentVersionId: string;
  readonly gate: TestGate;
  readonly scope: TestScope;
  readonly required: boolean;
}

export function createTestRequirement(input: {
  id: string;
  componentVersionId: string;
  gate: TestGate;
  scope: TestScope;
  required?: boolean;
}): TestRequirement {
  return { ...input, required: input.required ?? true };
}
