/** JSON Schemas for the core-evidence entities, per documentation/16-data-and-schema-model.md and documentation/07-compliance-testing.md. */

const RESULT_STATUS_ENUM = [
  'passed',
  'failed',
  'warning',
  'blocked',
  'skipped',
  'incomplete',
  'not-applicable',
  'unknown',
];

const SEVERITY_ENUM = ['critical', 'serious', 'moderate', 'minor', 'informational'];

export const testExecutionSchema = {
  $id: 'https://forgegate.dev/schemas/test-execution.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentVersionId: { type: 'string', minLength: 1 },
    gate: { type: 'string', minLength: 1 },
    tool: { type: 'string', minLength: 1 },
    toolVersion: { type: 'string', minLength: 1 },
    adapterVersion: { type: 'string', minLength: 1 },
    status: { enum: RESULT_STATUS_ENUM },
    startedAt: { type: 'string' },
    durationMs: { type: 'number', minimum: 0 },
    commitOrFingerprint: { type: 'string', minLength: 1 },
    rawArtifactRef: { type: 'string' },
  },
  required: [
    'id',
    'componentVersionId',
    'gate',
    'tool',
    'toolVersion',
    'adapterVersion',
    'status',
    'startedAt',
    'commitOrFingerprint',
  ],
  additionalProperties: false,
} as const;

export const findingSchema = {
  $id: 'https://forgegate.dev/schemas/finding.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentId: { type: 'string', minLength: 1 },
    scenario: { type: 'string' },
    description: { type: 'string', minLength: 1 },
    severity: { enum: SEVERITY_ENUM },
    sourceEvidenceId: { type: 'string' },
    standardOrPolicyRef: { type: 'string' },
    owner: { type: 'string' },
    status: { enum: ['open', 'resolved', 'confirmed-issue', 'false-positive', 'not-applicable', 'deferred'] },
    dueDate: { type: 'string' },
    resolution: { type: 'string' },
    exceptionId: { type: 'string' },
  },
  required: ['id', 'componentId', 'description', 'severity', 'status'],
  additionalProperties: false,
} as const;

export const manualReviewSchema = {
  $id: 'https://forgegate.dev/schemas/manual-review.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentVersionId: { type: 'string', minLength: 1 },
    procedureId: { type: 'string', minLength: 1 },
    procedureVersion: { type: 'string', minLength: 1 },
    reviewerIdentity: { type: 'string', minLength: 1 },
    reviewerRole: { type: 'string' },
    date: { type: 'string' },
    operatingSystem: { type: 'string', minLength: 1 },
    browser: { type: 'string' },
    assistiveTechnology: { type: 'string' },
    storyOrScenario: { type: 'string' },
    status: { enum: RESULT_STATUS_ENUM },
    notes: { type: 'string' },
    commitOrFingerprint: { type: 'string', minLength: 1 },
  },
  required: [
    'id',
    'componentVersionId',
    'procedureId',
    'procedureVersion',
    'reviewerIdentity',
    'date',
    'operatingSystem',
    'status',
    'commitOrFingerprint',
  ],
  additionalProperties: false,
} as const;

export const approvalSchema = {
  $id: 'https://forgegate.dev/schemas/approval.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentVersionId: { type: 'string', minLength: 1 },
    evidenceIds: { type: 'array', items: { type: 'string' } },
    policyId: { type: 'string', minLength: 1 },
    policyVersion: { type: 'string', minLength: 1 },
    approvedBy: { type: 'string', minLength: 1 },
    approvedAt: { type: 'string' },
    commitOrFingerprint: { type: 'string', minLength: 1 },
    stale: { type: 'boolean' },
  },
  required: [
    'id',
    'componentVersionId',
    'evidenceIds',
    'policyId',
    'policyVersion',
    'approvedBy',
    'approvedAt',
    'commitOrFingerprint',
    'stale',
  ],
  additionalProperties: false,
} as const;

export const exceptionSchema = {
  $id: 'https://forgegate.dev/schemas/exception.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    findingId: { type: 'string', minLength: 1 },
    approvedBy: { type: 'string', minLength: 1 },
    approvedAt: { type: 'string' },
    rationale: { type: 'string', minLength: 1 },
    expiresAt: { type: 'string' },
  },
  required: ['id', 'findingId', 'approvedBy', 'approvedAt', 'rationale'],
  additionalProperties: false,
} as const;

export const evidencePackageSchema = {
  $id: 'https://forgegate.dev/schemas/evidence-package.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentVersionId: { type: 'string', minLength: 1 },
    exportedAt: { type: 'string' },
    checksums: { type: 'object' },
    contents: { type: 'array', items: { type: 'string' }, minItems: 1 },
    includesCredentials: { const: false },
  },
  required: ['id', 'componentVersionId', 'exportedAt', 'checksums', 'contents', 'includesCredentials'],
  additionalProperties: false,
} as const;
