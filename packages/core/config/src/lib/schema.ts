/** JSON Schema for RepositoryConfig (`.forgegate/config.yaml`), per documentation/16-data-and-schema-model.md ("Schema families"). */

const projectMappingSchema = {
  type: 'object',
  properties: {
    projectId: { type: 'string', minLength: 1 },
    path: { type: 'string', minLength: 1 },
    kind: {
      enum: ['application', 'library', 'documentation-site', 'storybook', 'test-project', 'infrastructure'],
    },
  },
  required: ['projectId', 'path', 'kind'],
  additionalProperties: false,
} as const;

const packageMappingSchema = {
  type: 'object',
  properties: {
    packageId: { type: 'string', minLength: 1 },
    path: { type: 'string', minLength: 1 },
  },
  required: ['packageId', 'path'],
  additionalProperties: false,
} as const;

const policyMappingSchema = {
  type: 'object',
  properties: {
    policyId: { type: 'string', minLength: 1 },
    policyVersion: { type: 'string', minLength: 1 },
    path: { type: 'string', minLength: 1 },
  },
  required: ['policyId', 'policyVersion', 'path'],
  additionalProperties: false,
} as const;

export const repositoryConfigSchema = {
  $id: 'https://forgegate.dev/schemas/repository-config.schema.json',
  type: 'object',
  properties: {
    configVersion: { type: 'string', minLength: 1 },
    projectMappings: { type: 'array', items: projectMappingSchema },
    packageMappings: { type: 'array', items: packageMappingSchema },
    commandMappings: { type: 'object', additionalProperties: { type: 'string' } },
    policyMappings: { type: 'array', items: policyMappingSchema },
    documentationMappings: {
      type: 'object',
      properties: {
        starlight: {
          type: 'object',
          properties: { contentRoot: { type: 'string', minLength: 1 } },
          required: ['contentRoot'],
          additionalProperties: false,
        },
        zeroheight: {
          type: 'object',
          properties: { workspaceId: { type: 'string', minLength: 1 } },
          required: ['workspaceId'],
          additionalProperties: false,
        },
        storybook: {
          type: 'object',
          properties: { configDir: { type: 'string', minLength: 1 } },
          required: ['configDir'],
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    adapterConfiguration: { type: 'object' },
    ignorePatterns: { type: 'array', items: { type: 'string' } },
    safeWriteLocations: { type: 'array', items: { type: 'string' }, minItems: 1 },
  },
  required: [
    'configVersion',
    'projectMappings',
    'packageMappings',
    'commandMappings',
    'policyMappings',
    'documentationMappings',
    'adapterConfiguration',
    'ignorePatterns',
    'safeWriteLocations',
  ],
  additionalProperties: false,
} as const;
