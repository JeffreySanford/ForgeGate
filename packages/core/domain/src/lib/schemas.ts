/**
 * JSON Schemas for the core-domain entities, per
 * documentation/16-data-and-schema-model.md ("Schema families"). Each
 * schema carries a stable `$id`. A `schemaVersion` field on the records
 * themselves (per that document's "Schema versioning" section) is not yet
 * added to the TypeScript entities — follow-up work once a record is
 * actually serialized to a file.
 */

const LIFECYCLE_ENUM = ['proposal', 'candidate', 'approved', 'deprecated', 'retired'];
const READINESS_ENUM = ['blocked', 'warning', 'clear'];

export const workspaceSchema = {
  $id: 'https://forgegate.dev/schemas/workspace.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    path: { type: 'string', minLength: 1 },
    repositoryId: { type: 'string', minLength: 1 },
    branch: { type: 'string', minLength: 1 },
    commit: { type: 'string', pattern: '^[0-9a-f]{40}$' },
    dirty: { type: 'boolean' },
    packageManager: { type: 'string', minLength: 1 },
    workspaceManager: { type: 'string' },
    configurationVersion: { type: 'string', minLength: 1 },
  },
  required: [
    'id',
    'path',
    'repositoryId',
    'branch',
    'commit',
    'dirty',
    'packageManager',
    'configurationVersion',
  ],
  additionalProperties: false,
} as const;

export const repositorySchema = {
  $id: 'https://forgegate.dev/schemas/repository.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    defaultBranch: { type: 'string', minLength: 1 },
    remoteUrl: { type: 'string' },
  },
  required: ['id', 'defaultBranch'],
  additionalProperties: false,
} as const;

export const projectSchema = {
  $id: 'https://forgegate.dev/schemas/project.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    workspaceId: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    kind: {
      enum: ['application', 'library', 'documentation-site', 'storybook', 'test-project', 'infrastructure'],
    },
    path: { type: 'string', minLength: 1 },
  },
  required: ['id', 'workspaceId', 'name', 'kind', 'path'],
  additionalProperties: false,
} as const;

export const packageSchema = {
  $id: 'https://forgegate.dev/schemas/package.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    projectId: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    version: { type: 'string', minLength: 1 },
    publicExports: { type: 'array', items: { type: 'string' } },
    componentIds: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'projectId', 'name', 'version', 'publicExports', 'componentIds'],
  additionalProperties: false,
} as const;

export const componentLibrarySchema = {
  $id: 'https://forgegate.dev/schemas/component-library.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    organization: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    packageIds: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'organization', 'name', 'packageIds'],
  additionalProperties: false,
} as const;

export const componentSchema = {
  $id: 'https://forgegate.dev/schemas/component.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    organization: { type: 'string', minLength: 1 },
    library: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    packageId: { type: 'string', minLength: 1 },
    owner: { type: 'string' },
    lifecycle: { enum: LIFECYCLE_ENUM },
    readiness: { enum: READINESS_ENUM },
  },
  required: ['id', 'organization', 'library', 'name', 'packageId', 'lifecycle', 'readiness'],
  additionalProperties: false,
} as const;

export const componentVersionSchema = {
  $id: 'https://forgegate.dev/schemas/component-version.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentId: { type: 'string', minLength: 1 },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+(-[\\w.]+)?$' },
    commitSha: { type: 'string', pattern: '^[0-9a-f]{40}$' },
    contractId: { type: 'string', minLength: 1 },
    lifecycle: { enum: LIFECYCLE_ENUM },
  },
  required: ['id', 'componentId', 'version', 'commitSha', 'contractId', 'lifecycle'],
  additionalProperties: false,
} as const;

export const documentationTargetSchema = {
  $id: 'https://forgegate.dev/schemas/documentation-target.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    componentId: { type: 'string', minLength: 1 },
    adapter: { enum: ['starlight', 'storybook', 'zeroheight'] },
    pathOrPageId: { type: 'string', minLength: 1 },
    publishedVersion: { type: 'string' },
    publishedAt: { type: 'string' },
  },
  required: ['id', 'componentId', 'adapter', 'pathOrPageId'],
  additionalProperties: false,
} as const;

export const consumerApplicationSchema = {
  $id: 'https://forgegate.dev/schemas/consumer-application.schema.json',
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    repositoryId: { type: 'string' },
    componentIds: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'name', 'componentIds'],
  additionalProperties: false,
} as const;
