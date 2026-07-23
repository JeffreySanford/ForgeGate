/**
 * The shape of `.forgegate/config.yaml`, per documentation/02-system-architecture.md
 * ("Repository-controlled data") and TODO.md Phase 3 ("Repository configuration").
 */

export interface ProjectMapping {
  readonly projectId: string;
  readonly path: string;
  readonly kind: 'application' | 'library' | 'documentation-site' | 'storybook' | 'test-project' | 'infrastructure';
}

export interface PackageMapping {
  readonly packageId: string;
  readonly path: string;
}

/** Maps a gate name (documentation/16-data-and-schema-model.md's TestRequirement gates) to the exact command ForgeGate should run and show the user before execution. */
export type CommandMappings = Readonly<Record<string, string>>;

export interface DocumentationMappings {
  readonly starlight?: { readonly contentRoot: string };
  readonly zeroheight?: { readonly workspaceId: string };
  readonly storybook?: { readonly configDir: string };
}

/** Opaque per-adapter configuration blobs; each adapter owns and validates its own shape. */
export type AdapterConfiguration = Readonly<Record<string, unknown>>;

export interface RepositoryConfig {
  readonly configVersion: string;
  readonly projectMappings: readonly ProjectMapping[];
  readonly packageMappings: readonly PackageMapping[];
  readonly commandMappings: CommandMappings;
  readonly documentationMappings: DocumentationMappings;
  readonly adapterConfiguration: AdapterConfiguration;
  readonly ignorePatterns: readonly string[];
  /**
   * Glob patterns describing the only paths ForgeGate may write generated
   * files into, per the repository-write flow in
   * documentation/02-system-architecture.md — writes outside these
   * locations must always be rejected before any diff is even proposed.
   */
  readonly safeWriteLocations: readonly string[];
}

export function createRepositoryConfig(input: {
  configVersion?: string;
  projectMappings?: readonly ProjectMapping[];
  packageMappings?: readonly PackageMapping[];
  commandMappings?: CommandMappings;
  documentationMappings?: DocumentationMappings;
  adapterConfiguration?: AdapterConfiguration;
  ignorePatterns?: readonly string[];
  safeWriteLocations: readonly string[];
}): RepositoryConfig {
  if (input.safeWriteLocations.length === 0) {
    throw new Error(
      'RepositoryConfig requires at least one safe write location; an empty list would make every generated-file write ambiguous rather than simply disabled',
    );
  }
  return {
    configVersion: input.configVersion ?? '0.1.0',
    projectMappings: input.projectMappings ?? [],
    packageMappings: input.packageMappings ?? [],
    commandMappings: input.commandMappings ?? {},
    documentationMappings: input.documentationMappings ?? {},
    adapterConfiguration: input.adapterConfiguration ?? {},
    ignorePatterns: input.ignorePatterns ?? [],
    safeWriteLocations: input.safeWriteLocations,
  };
}

/**
 * True only when `candidatePath` (workspace-relative, forward-slash) falls
 * under at least one configured safe write location. This is a simple
 * prefix/glob-star check, not a full glob engine — sufficient for the
 * common "src/generated/**" style pattern; a real glob library can replace
 * this once safe-write enforcement moves into the actual write flow.
 */
export function isWithinSafeWriteLocation(
  candidatePath: string,
  safeWriteLocations: readonly string[],
): boolean {
  const normalized = candidatePath.replace(/\\/g, '/');
  return safeWriteLocations.some((pattern) => {
    const prefix = pattern.replace(/\\/g, '/').replace(/\*+$/, '');
    return normalized.startsWith(prefix);
  });
}
