/**
 * A practical subset of the Custom Elements Manifest (CEM) schema
 * (https://github.com/webcomponents/custom-elements-manifest), the format
 * `@custom-elements-manifest/analyzer` generates and many Web Component
 * libraries already publish as `custom-elements.json`. Only the fields
 * ForgeGate actually maps are typed here — this is not the full spec
 * (no mixins, multi-level superclass chains, deprecation flags, etc. yet).
 * `superclass` is typed (immediate superclass name only, not the full
 * chain) specifically because `map-custom-elements-manifest.ts` uses it to
 * distinguish a Lit component from a plain vanilla one.
 */

export interface CemType {
  readonly text?: string;
}

export interface CemAttribute {
  readonly name: string;
  readonly fieldName?: string;
  readonly type?: CemType;
  readonly description?: string;
}

export interface CemField {
  readonly kind: 'field';
  readonly name: string;
  readonly type?: CemType;
  readonly attribute?: string;
  readonly description?: string;
  readonly privacy?: 'public' | 'private' | 'protected';
}

export interface CemMethod {
  readonly kind: 'method';
  readonly name: string;
  readonly description?: string;
  readonly privacy?: 'public' | 'private' | 'protected';
}

export type CemMember = CemField | CemMethod;

export interface CemEvent {
  readonly name: string;
  readonly type?: CemType;
  readonly description?: string;
}

export interface CemSlot {
  readonly name: string;
  readonly description?: string;
}

export interface CemCssProperty {
  readonly name: string;
  readonly description?: string;
}

export interface CemCssPart {
  readonly name: string;
  readonly description?: string;
}

export interface CemSuperclass {
  readonly name?: string;
}

export interface CemCustomElementDeclaration {
  readonly kind: 'class';
  readonly name: string;
  readonly customElement?: true;
  readonly tagName?: string;
  readonly superclass?: CemSuperclass;
  readonly members?: readonly CemMember[];
  readonly events?: readonly CemEvent[];
  readonly slots?: readonly CemSlot[];
  readonly cssProperties?: readonly CemCssProperty[];
  readonly cssParts?: readonly CemCssPart[];
  readonly attributes?: readonly CemAttribute[];
}

export interface CemModule {
  readonly kind: 'javascript-module';
  readonly path: string;
  readonly declarations?: readonly CemCustomElementDeclaration[];
}

export interface CustomElementsManifest {
  readonly schemaVersion: string;
  readonly modules: readonly CemModule[];
}

/** Every custom-element declaration in the manifest, alongside the module path that defines it. */
export function customElementDeclarations(
  manifest: CustomElementsManifest,
): readonly { readonly modulePath: string; readonly declaration: CemCustomElementDeclaration }[] {
  return manifest.modules.flatMap((module) =>
    (module.declarations ?? [])
      .filter((declaration) => declaration.customElement && declaration.tagName)
      .map((declaration) => ({ modulePath: module.path, declaration })),
  );
}
