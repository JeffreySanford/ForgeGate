import { createValidator, describeErrors } from '@forgegate/core-domain';
import type { TestExecution } from './evidence';
import { testExecutionSchema } from './schemas';

const validate = createValidator<TestExecution>(testExecutionSchema);

/**
 * Parses a repository-owned `.forgegate/evidence/*.json` execution record.
 * Invalid evidence is rejected rather than allowed to influence readiness.
 */
export function parseTestExecution(jsonText: string): TestExecution {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Test execution is not valid JSON: ${String(error)}`);
  }

  if (!validate(parsed)) {
    throw new Error(
      `Test execution does not match the schema: ${describeErrors(validate)}`,
    );
  }

  return parsed;
}
