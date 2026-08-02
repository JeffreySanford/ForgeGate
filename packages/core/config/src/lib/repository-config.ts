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

export interface PolicyMapping {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly path: string;
}

/** Opaque per-adapter configuration blobs; each adapter owns and validates its own shape. */
export type AdapterConfiguration = Readonly<Record<string, unknown>>;

export interface RepositoryConfig {
  readonly configVersion: string;
  readonly projectMappings: readonly ProjectMapping[];
  readonly packageMappings: readonly PackageMapping[];
  readonly commandMappings: CommandMappings;
  readonly documentationMappings: DocumentationMappings;
  readonly policyMappings: readonly PolicyMapping[];
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
  policyMappings?: readonly PolicyMapping[];
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
    policyMappings: input.policyMappings ?? [],
    adapterConfiguration: input.adapterConfiguration ?? {},
    ignorePatterns: input.ignorePatterns ?? [],
    safeWriteLocations: input.safeWriteLocations,
  };
}

/**
 * True only when `candidatePath` (workspace-relative, forward-slash) falls
 * under at least one configured safe write location. This is a simple
 * check, not a full glob engine — it understands exactly two pattern
 * shapes: a trailing `/**` (recursive "everything under this directory")
 * and an exact path with no wildcard at all. A real glob library can
 * replace this once safe-write enforcement moves into the actual write
 * flow, but it must stay at least this strict: an earlier version did a
 * naive `startsWith` after stripping trailing `*`s, which let a pattern
 * like `"src/generated/**"` also match a sibling directory such as
 * `"src/generated-other/evil.ts"` — the prefix matched textually without
 * the directory boundary actually being respected.
 */
export function isWithinSafeWriteLocation(
  candidatePath: string,
  safeWriteLocations: readonly string[],
): boolean {
  const normalized = candidatePath.replace(/\\/g, '/');
  return safeWriteLocations.some((rawPattern) => {
    const pattern = rawPattern.replace(/\\/g, '/');
    if (pattern.endsWith('/**')) {
      const directory = pattern.slice(0, -3);
      return normalized === directory || normalized.startsWith(`${directory}/`);
    }
    return normalized === pattern;
  });
}
