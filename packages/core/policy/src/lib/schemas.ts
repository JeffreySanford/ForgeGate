/** JSON Schema for ReleaseDecision, per documentation/16-data-and-schema-model.md and documentation/21-mvp-acceptance-criteria.md. */
export const releaseDecisionSchema = {
  $id: 'https://forgegate.dev/schemas/release-decision.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentVersionId: { type: 'string', minLength: 1 },
    policyId: { type: 'string', minLength: 1 },
    policyVersion: { type: 'string', minLength: 1 },
    evidenceIds: { type: 'array', items: { type: 'string' } },
    commit: { type: 'string', pattern: '^[0-9a-f]{40}$' },
    outcome: { enum: ['authorized-candidate', 'blocked'] },
    blockingFindingIds: { type: 'array', items: { type: 'string' } },
    approver: { type: 'string' },
    decidedAt: { type: 'string' },
  },
  required: [
    'id',
    'componentVersionId',
    'policyId',
    'policyVersion',
    'evidenceIds',
    'commit',
    'outcome',
    'blockingFindingIds',
    'decidedAt',
  ],
  additionalProperties: false,
  allOf: [
    {
      if: { properties: { outcome: { const: 'authorized-candidate' } } },
      then: {
        properties: { approver: { type: 'string', minLength: 1 } },
        required: ['approver'],
      },
    },
  ],
} as const;
