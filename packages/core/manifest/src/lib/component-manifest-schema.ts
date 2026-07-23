/** JSON Schema for ComponentManifest (`.forgegate/components/<component-id>.yaml`), per documentation/16-data-and-schema-model.md. */

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

const LIFECYCLE_ENUM = ['proposal', 'candidate', 'approved', 'deprecated', 'retired'];
const TEST_GATE_ENUM = [
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
];

export const componentManifestSchema = {
  $id: 'https://forgegate.dev/schemas/component-manifest.schema.json',
  type: 'object',
  properties: {
    schemaVersion: { type: 'string', minLength: 1 },
    id: { type: 'string', pattern: '^[^.\\s]+\\.[^.\\s]+\\.[^.\\s]+$' },
    framework: { type: 'string', minLength: 1 },
    adapter: { type: 'string', minLength: 1 },
    packagePath: { type: 'string', minLength: 1 },
    sourceFiles: { type: 'array', items: { type: 'string' } },
    lifecycle: { enum: LIFECYCLE_ENUM },
    owner: { type: 'string' },
    reviewers: { type: 'array', items: { type: 'string' } },
    contract: {
      type: 'object',
      properties: {
        inputs: { type: 'array', items: contractMemberSchema },
        outputs: { type: 'array', items: contractMemberSchema },
        content: { type: 'array', items: contractMemberSchema },
        publicMethods: { type: 'array', items: contractMemberSchema },
        styleParts: { type: 'array', items: contractMemberSchema },
      },
      required: ['inputs', 'outputs', 'content', 'publicMethods', 'styleParts'],
      additionalProperties: false,
    },
    states: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          required: { type: 'boolean' },
          description: { type: 'string' },
        },
        required: ['name', 'required'],
        additionalProperties: false,
      },
    },
    themes: { type: 'array', items: { type: 'string' } },
    densities: { type: 'array', items: { type: 'string' } },
    viewports: { type: 'array', items: { type: 'string' } },
    environments: { type: 'array', items: { type: 'string' } },
    tokenMappings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tokenPath: { type: 'string', minLength: 1 },
          category: { enum: ['color', 'spacing', 'typography', 'motion', 'elevation', 'border', 'other'] },
          required: { type: 'boolean' },
        },
        required: ['tokenPath', 'category', 'required'],
        additionalProperties: false,
      },
    },
    storyMappings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          storybookStoryId: { type: 'string', minLength: 1 },
          stateName: { type: 'string' },
        },
        required: ['storybookStoryId'],
        additionalProperties: false,
      },
    },
    testRequirements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          gate: { enum: TEST_GATE_ENUM },
          scope: { enum: ['component', 'application-context'] },
          required: { type: 'boolean' },
        },
        required: ['gate', 'scope', 'required'],
        additionalProperties: false,
      },
    },
    manualReviewProcedureIds: { type: 'array', items: { type: 'string' } },
    documentationTargets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          adapter: { enum: ['starlight', 'storybook', 'zeroheight'] },
          pathOrPageId: { type: 'string' },
        },
        required: ['adapter'],
        additionalProperties: false,
      },
    },
    consumerApplicationIds: { type: 'array', items: { type: 'string' } },
    policyId: { type: 'string' },
    deprecatedInFavorOf: { type: 'string' },
    deprecationNotice: { type: 'string' },
  },
  required: [
    'schemaVersion',
    'id',
    'framework',
    'adapter',
    'packagePath',
    'sourceFiles',
    'lifecycle',
    'reviewers',
    'contract',
    'states',
    'themes',
    'densities',
    'viewports',
    'environments',
    'tokenMappings',
    'storyMappings',
    'testRequirements',
    'manualReviewProcedureIds',
    'documentationTargets',
    'consumerApplicationIds',
  ],
  additionalProperties: false,
} as const;
