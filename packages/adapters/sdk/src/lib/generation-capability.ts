/**
 * The framework adapter capability contract, per
 * documentation/27-blueprint-studio.md ("Adapter capability contract").
 * Every framework adapter must advertise authoring/generation support
 * honestly rather than implying it can do more than it actually can;
 * Blueprint Studio hides or disables actions an adapter reports as
 * unsupported.
 */

export type AdapterCapabilitySupportLevel =
  | 'unsupported'
  | 'experimental'
  | 'partial'
  | 'supported';

export type AdapterGenerationCapabilityName =
  | 'canPreviewBlueprint'
  | 'canGenerateComponent'
  | 'canGenerateStyles'
  | 'canGenerateStories'
  | 'canGenerateUnitTests'
  | 'canGenerateBrowserTests'
  | 'canGenerateManifest'
  | 'canGenerateDocumentation'
  | 'canUpdatePackageExports'
  | 'canRoundTripContract'
  | 'canPreserveProtectedRegions';

export const ADAPTER_GENERATION_CAPABILITY_NAMES: readonly AdapterGenerationCapabilityName[] = [
  'canPreviewBlueprint',
  'canGenerateComponent',
  'canGenerateStyles',
  'canGenerateStories',
  'canGenerateUnitTests',
  'canGenerateBrowserTests',
  'canGenerateManifest',
  'canGenerateDocumentation',
  'canUpdatePackageExports',
  'canRoundTripContract',
  'canPreserveProtectedRegions',
];

export interface AdapterGenerationCapability {
  readonly name: AdapterGenerationCapabilityName;
  readonly supportLevel: AdapterCapabilitySupportLevel;
  readonly knownLimitations?: readonly string[];
}

export interface AdapterGenerationCapabilityDeclaration {
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly capabilities: readonly AdapterGenerationCapability[];
}

/**
 * Declares every generation capability as `unsupported` for an adapter
 * that has no generation support at all. Used by adapters that only
 * detect and parse *existing* components today, so that Blueprint Studio
 * (and anything else reading these declarations) sees an honest, complete
 * "not yet" rather than a partially-filled or absent declaration.
 */
export function createUnsupportedGenerationCapabilityDeclaration(
  adapterId: string,
  adapterVersion: string,
  knownLimitations?: readonly string[],
): AdapterGenerationCapabilityDeclaration {
  return {
    adapterId,
    adapterVersion,
    capabilities: ADAPTER_GENERATION_CAPABILITY_NAMES.map((name) => ({
      name,
      supportLevel: 'unsupported',
      knownLimitations,
    })),
  };
}
