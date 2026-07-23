/**
 * Deterministic identifier strategy, per documentation/16-data-and-schema-model.md
 * ("Identifier strategy"). Display names may change without changing identity;
 * these builders produce the stable identity string.
 */

export function buildComponentId(organization: string, library: string, component: string): string {
  assertSegment('organization', organization);
  assertSegment('library', library);
  assertSegment('component', component);
  return `${organization}.${library}.${component}`;
}

export function buildProcedureId(
  blueprint: string,
  component: string,
  review: string,
  environment: string,
): string {
  assertSegment('blueprint', blueprint);
  assertSegment('component', component);
  assertSegment('review', review);
  assertSegment('environment', environment);
  return `${blueprint}.${component}.${review}.${environment}`;
}

/** UUID identity for records with no natural deterministic key (findings, executions, release decisions). */
export function generateRecordId(): string {
  return crypto.randomUUID();
}

function assertSegment(name: string, value: string): void {
  if (!value || /[.\s]/.test(value)) {
    throw new Error(`Identifier segment "${name}" must be non-empty and contain no "." or whitespace`);
  }
}
