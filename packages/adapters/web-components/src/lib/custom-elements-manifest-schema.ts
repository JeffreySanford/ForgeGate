/**
 * A deliberately loose schema for the practical CEM subset in
 * custom-elements-manifest.ts. It checks the shape ForgeGate actually
 * reads (schemaVersion, modules, and enough of each declaration to map
 * safely) without constraining the many CEM fields ForgeGate doesn't model
 * yet — an unrecognized field must not make an otherwise-valid, real-world
 * manifest fail to parse.
 */
export const customElementsManifestSchema = {
  $id: 'https://forgegate.dev/schemas/custom-elements-manifest-subset.schema.json',
  type: 'object',
  properties: {
    schemaVersion: { type: 'string', minLength: 1 },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string' },
          path: { type: 'string', minLength: 1 },
          declarations: { type: 'array', items: { type: 'object' } },
        },
        required: ['path'],
      },
    },
  },
  required: ['schemaVersion', 'modules'],
} as const;
