/**
 * A Blueprint is a catalog definition of what a complete component of a
 * given pattern requires (e.g. "Button"), plus the authoring metadata
 * Blueprint Studio needs to render a visual editor for it. Proposals are
 * later instantiated *from* a blueprint; the blueprint itself is not a
 * proposal, per documentation/27-blueprint-studio.md ("Portable authoring
 * model" and "Blueprint authoring metadata"). Narrower than that
 * document's full illustrative shape by design: this is the first real
 * slice (id, version, required states, and the authoring metadata needed
 * to render inspector controls and token slots), not the entire eventual
 * contract/anatomy/fixture/coverage model.
 */

export type BlueprintInspectorControl =
  | 'segmented'
  | 'select'
  | 'text'
  | 'toggle'
  | 'number';

/** One field the visual inspector renders for a blueprint's contract. */
export interface BlueprintInspectorField {
  readonly path: string;
  readonly label: string;
  readonly control: BlueprintInspectorControl;
  readonly options?: readonly string[];
  readonly required?: boolean;
  readonly defaultValue?: string;
}

/** One collapsible group of inspector fields, e.g. "Appearance". */
export interface BlueprintInspectorGroup {
  readonly id: string;
  readonly label: string;
  readonly fields: readonly BlueprintInspectorField[];
}

/** One token slot a generated component's anatomy exposes for theming. */
export interface BlueprintTokenSlot {
  readonly id: string;
  readonly label: string;
  readonly types: readonly string[];
  readonly required: boolean;
  readonly visibleWhen?: string;
}

/** One cross-field authoring constraint, e.g. requiring a label when icon-only. */
export interface BlueprintConstraint {
  readonly when: string;
  readonly require: string;
}

/**
 * A Blueprint, per documentation/27-blueprint-studio.md. `id` and
 * `version` are the blueprint's own identity (e.g. `blueprint.button`,
 * `1.1.0`), independent of any proposal or component version that later
 * references it — this is what "the blueprint schema and authoring
 * metadata are versioned" (P2 entry gate 3) refers to.
 */
export interface Blueprint {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly purpose: string;
  readonly preferredNativeElement?: string;
  readonly requiredStates: readonly string[];
  readonly inspectorGroups: readonly BlueprintInspectorGroup[];
  readonly tokenSlots: readonly BlueprintTokenSlot[];
  readonly constraints?: readonly BlueprintConstraint[];
}
