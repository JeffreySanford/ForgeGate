export interface OrganizationAndLibrary {
  readonly organization: string;
  readonly library: string;
}

/**
 * `organization`/`library` feed directly into `buildComponentId` in
 * `@forgegate/core-domain`, which rejects any segment containing "." or
 * whitespace. Real npm package names commonly contain dots even when
 * unscoped (`lodash.debounce`, `socket.io`), so a package name segment is
 * sanitized before use — otherwise `buildComponentId` would throw for
 * every single component in that package, and since
 * `mapCustomElementsManifestToComponentManifests` maps over all
 * declarations with no per-item try/catch, one bad identity would
 * silently discard every other valid component alongside it.
 */
function sanitizeIdentitySegment(value: string): string {
  return value.replace(/[.\s]+/g, '-');
}

/**
 * Component identity (`organization.library.component`, per
 * `buildComponentId` in `@forgegate/core-domain`) needs an organization and
 * library, but a scanned workspace only ever gives us a package name.
 * This is a naming *convention*, not a guarantee: a scoped package name
 * (`@up/design-system`) maps cleanly to `{ organization: 'up', library:
 * 'design-system' }`; an unscoped name (`design-system`) has no
 * organization to read, so it falls back to `'unscoped'`; no package name
 * at all falls back to `'unconfigured'` for both. Real, deliberate
 * component-identity configuration (via `.forgegate/config.yaml`) should
 * override this once it exists — this is a reasonable default, not the
 * final word.
 */
export function deriveOrganizationAndLibrary(packageName: string | null): OrganizationAndLibrary {
  if (!packageName) {
    return { organization: 'unconfigured', library: 'unconfigured' };
  }

  const scopedMatch = /^@([^/]+)\/(.+)$/.exec(packageName);
  if (scopedMatch) {
    const [, organization, library] = scopedMatch;
    return {
      organization: sanitizeIdentitySegment(organization ?? 'unscoped'),
      library: sanitizeIdentitySegment(library ?? packageName),
    };
  }

  return { organization: 'unscoped', library: sanitizeIdentitySegment(packageName) };
}
