import { buildComponentId } from '@forgegate/core-domain';
import { createComponentManifest, type ComponentManifest, type ManifestContract } from '@forgegate/core-manifest';
import {
  customElementDeclarations,
  type CemCustomElementDeclaration,
  type CemField,
  type CemMethod,
  type CustomElementsManifest,
} from './custom-elements-manifest';

export interface MapCemOptions {
  readonly organization: string;
  readonly library: string;
  readonly packagePath: string;
  /**
   * Overrides auto-detection for every declaration in the manifest. Leave
   * unset to let each declaration's own `superclass` decide — a real
   * package can mix vanilla and Lit components, so a single manifest-wide
   * value would misreport whichever component the caller didn't intend.
   */
  readonly adapter?: string;
  /** See `adapter` — same override/auto-detect relationship. */
  readonly framework?: string;
}

export interface MapCemFailure {
  readonly declarationName: string;
  readonly modulePath: string;
  readonly message: string;
}

export interface MapCemResult {
  readonly manifests: readonly ComponentManifest[];
  readonly failures: readonly MapCemFailure[];
}

interface FrameworkIdentity {
  readonly framework: string;
  readonly adapter: string;
}

/**
 * Framework identity per document 05's convention: `web-components`/
 * `framework.web-components` is the honest default for anything not
 * recognized (including no superclass at all — the analyzer omits
 * `superclass` for a plain `class extends HTMLElement {}` in some
 * configurations). Only superclasses ForgeGate can positively identify get
 * a more specific identity; an unrecognized superclass name (a private
 * base class, a typo, a framework ForgeGate doesn't know about yet) stays
 * `web-components` rather than guessing.
 */
const KNOWN_SUPERCLASS_FRAMEWORKS: Readonly<Record<string, FrameworkIdentity>> = {
  LitElement: { framework: 'lit', adapter: 'framework.lit' },
};

const DEFAULT_FRAMEWORK_IDENTITY: FrameworkIdentity = { framework: 'web-components', adapter: 'framework.web-components' };

function detectFrameworkIdentity(declaration: CemCustomElementDeclaration): FrameworkIdentity {
  const superclassName = declaration.superclass?.name;
  const known = superclassName ? KNOWN_SUPERCLASS_FRAMEWORKS[superclassName] : undefined;
  return known ?? DEFAULT_FRAMEWORK_IDENTITY;
}

/**
 * Converts every custom-element declaration in a Custom Elements Manifest
 * into a `ComponentManifest`, per documentation/05-framework-adapters.md
 * ("Lit and Web Components adapter — prefer Custom Elements Manifest when
 * available").
 *
 * Known, deliberate simplifications carried over from the manifest's own
 * `ManifestContract` shape:
 * - `inputs` comes from public fields (CEM "properties"), not the separate
 *   `attributes` list — the two are usually near-duplicates (an attribute
 *   is a field's markup-visible name), and fields are the more complete
 *   source.
 * - `cssParts` and `cssProperties` both fold into `styleParts`, since
 *   `ManifestContract` has one styling bucket, not two.
 * - States, themes, densities, viewports, and required test/review
 *   coverage are **not** derivable from a CEM at all — a manifest built
 *   this way only has a contract, nothing else. Populating the rest is
 *   either manual authoring or, eventually, blueprint-driven completion
 *   checking (documentation/14-component-blueprints.md).
 *
 * Returns both `manifests` (everything that mapped successfully) and
 * `failures` (everything that didn't, with why) rather than throwing on
 * the first bad declaration. A CEM can describe many components; one
 * malformed declaration — an unusual tag name, a missing tagName despite
 * `customElement: true` — must not silently discard every sibling
 * component in the same file just because they happened to share a `.map()`.
 */
export function mapCustomElementsManifestToComponentManifests(
  manifest: CustomElementsManifest,
  options: MapCemOptions,
): MapCemResult {
  const manifests: ComponentManifest[] = [];
  const failures: MapCemFailure[] = [];

  for (const { modulePath, declaration } of customElementDeclarations(manifest)) {
    try {
      manifests.push(mapDeclaration(modulePath, declaration, options));
    } catch (error) {
      failures.push({
        declarationName: declaration.name,
        modulePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { manifests, failures };
}

function mapDeclaration(
  modulePath: string,
  declaration: CemCustomElementDeclaration,
  options: MapCemOptions,
): ComponentManifest {
  const tagName = declaration.tagName;
  if (!tagName) {
    throw new Error(`Declaration "${declaration.name}" has customElement: true but no tagName`);
  }

  const detected = detectFrameworkIdentity(declaration);
  return createComponentManifest({
    id: buildComponentId(options.organization, options.library, tagName),
    framework: options.framework ?? detected.framework,
    adapter: options.adapter ?? detected.adapter,
    packagePath: options.packagePath,
    sourceFiles: [modulePath],
    contract: buildContract(declaration),
  });
}

function buildContract(declaration: CemCustomElementDeclaration): Partial<ManifestContract> {
  const members = declaration.members ?? [];

  const inputs = members
    .filter((member): member is CemField => member.kind === 'field')
    .filter((field) => field.privacy !== 'private' && field.privacy !== 'protected')
    .map((field) => ({
      name: field.name,
      type: field.type?.text,
      description: field.description,
    }));

  const publicMethods = members
    .filter((member): member is CemMethod => member.kind === 'method')
    .filter((method) => method.privacy !== 'private' && method.privacy !== 'protected')
    .map((method) => ({ name: method.name, description: method.description }));

  const outputs = (declaration.events ?? []).map((event) => ({
    name: event.name,
    type: event.type?.text ?? 'CustomEvent',
    description: event.description,
  }));

  const content = (declaration.slots ?? []).map((slot) => ({
    name: slot.name === '' ? 'default' : slot.name,
    description: slot.description,
  }));

  const styleParts = [
    ...(declaration.cssParts ?? []).map((part) => ({ name: part.name, description: part.description })),
    ...(declaration.cssProperties ?? []).map((prop) => ({ name: prop.name, description: prop.description })),
  ];

  return { inputs, outputs, content, publicMethods, styleParts };
}
