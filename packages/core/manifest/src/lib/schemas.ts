/** JSON Schemas for the core-manifest entities, per documentation/16-data-and-schema-model.md. */

const contractMemberSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    type: { type: 'string' },
    required: { type: 'boolean' },
    description: { type: 'string' },
  },
  required: ['name'],
  additionalProperties: false,
} as const;

export const componentContractSchema = {
  $id: 'https://forgegate.dev/schemas/component-contract.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentVersionId: { type: 'string', minLength: 1 },
    inputs: { type: 'array', items: contractMemberSchema },
    outputs: { type: 'array', items: contractMemberSchema },
    content: { type: 'array', items: contractMemberSchema },
    publicMethods: { type: 'array', items: contractMemberSchema },
    styleParts: { type: 'array', items: contractMemberSchema },
    frameworkExtensions: { type: 'object' },
  },
  required: ['id', 'componentVersionId', 'inputs', 'outputs', 'content', 'publicMethods', 'styleParts'],
  additionalProperties: false,
} as const;

export const componentStateSchema = {
  $id: 'https://forgegate.dev/schemas/component-state.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentVersionId: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    required: { type: 'boolean' },
    storyReferenceId: { type: 'string' },
  },
  required: ['id', 'componentVersionId', 'name', 'required'],
  additionalProperties: false,
} as const;

export const storyReferenceSchema = {
  $id: 'https://forgegate.dev/schemas/story-reference.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentVersionId: { type: 'string', minLength: 1 },
    componentStateId: { type: 'string' },
    storybookStoryId: { type: 'string', minLength: 1 },
    url: { type: 'string' },
  },
  required: ['id', 'componentVersionId', 'storybookStoryId'],
  additionalProperties: false,
} as const;

export const tokenReferenceSchema = {
  $id: 'https://forgegate.dev/schemas/token-reference.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentVersionId: { type: 'string', minLength: 1 },
    tokenPath: { type: 'string', minLength: 1 },
    category: { enum: ['color', 'spacing', 'typography', 'motion', 'elevation', 'border', 'other'] },
    required: { type: 'boolean' },
  },
  required: ['id', 'componentVersionId', 'tokenPath', 'category', 'required'],
  additionalProperties: false,
} as const;

export const testRequirementSchema = {
  $id: 'https://forgegate.dev/schemas/test-requirement.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentVersionId: { type: 'string', minLength: 1 },
    gate: {
      enum: [
        'unit',
        'storybook-interaction',
        'browser',
        'axe',
        'visual',
        'lint',
        'type-check',
        'build',
        'manual-keyboard',
        'manual-screen-reader',
        'manual-forced-colors',
        'manual-zoom',
        'manual-reduced-motion',
        'application-context',
      ],
    },
    scope: { enum: ['component', 'application-context'] },
    required: { type: 'boolean' },
  },
  required: ['id', 'componentVersionId', 'gate', 'scope', 'required'],
  additionalProperties: false,
} as const;

const blueprintInspectorFieldSchema = {
  type: 'object',
  properties: {
    path: { type: 'string', minLength: 1 },
    label: { type: 'string', minLength: 1 },
    control: { enum: ['segmented', 'select', 'text', 'toggle', 'number'] },
    options: { type: 'array', items: { type: 'string' } },
    required: { type: 'boolean' },
    defaultValue: { type: 'string' },
  },
  required: ['path', 'label', 'control'],
  additionalProperties: false,
} as const;

const blueprintInspectorGroupSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    label: { type: 'string', minLength: 1 },
    fields: { type: 'array', items: blueprintInspectorFieldSchema },
  },
  required: ['id', 'label', 'fields'],
  additionalProperties: false,
} as const;

const blueprintTokenSlotSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    label: { type: 'string', minLength: 1 },
    types: { type: 'array', items: { type: 'string' } },
    required: { type: 'boolean' },
    visibleWhen: { type: 'string' },
  },
  required: ['id', 'label', 'types', 'required'],
  additionalProperties: false,
} as const;

const blueprintConstraintSchema = {
  type: 'object',
  properties: {
    when: { type: 'string', minLength: 1 },
    require: { type: 'string', minLength: 1 },
  },
  required: ['when', 'require'],
  additionalProperties: false,
} as const;

export const blueprintSchema = {
  $id: 'https://forgegate.dev/schemas/blueprint.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    version: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    purpose: { type: 'string', minLength: 1 },
    preferredNativeElement: { type: 'string' },
    requiredStates: { type: 'array', items: { type: 'string', minLength: 1 } },
    inspectorGroups: { type: 'array', items: blueprintInspectorGroupSchema },
    tokenSlots: { type: 'array', items: blueprintTokenSlotSchema },
    constraints: { type: 'array', items: blueprintConstraintSchema },
  },
  required: ['id', 'version', 'name', 'purpose', 'requiredStates', 'inspectorGroups', 'tokenSlots'],
  additionalProperties: false,
} as const;
