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
  /** Defaults to `'framework.web-components'`; pass `'framework.lit'` for a Lit-specific adapter identity. */
  readonly adapter?: string;
  /** Defaults to `'web-components'`, per the framework identity convention in documentation/05-framework-adapters.md. */
  readonly framework?: string;
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
 */
export function mapCustomElementsManifestToComponentManifests(
  manifest: CustomElementsManifest,
  options: MapCemOptions,
): ComponentManifest[] {
  return customElementDeclarations(manifest).map(({ modulePath, declaration }) =>
    mapDeclaration(modulePath, declaration, options),
  );
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

  return createComponentManifest({
    id: buildComponentId(options.organization, options.library, tagName),
    framework: options.framework ?? 'web-components',
    adapter: options.adapter ?? 'framework.web-components',
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
