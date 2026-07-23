/**
 * One required or observed state/variant of a component version (default,
 * disabled, loading, error, ...), per documentation/16-data-and-schema-model.md
 * ("ComponentState") and the blueprint state-coverage model in
 * documentation/14-component-blueprints.md.
 */
export interface ComponentState {
  readonly id: string;
  readonly componentVersionId: string;
  readonly name: string;
  readonly required: boolean;
  readonly storyReferenceId?: string;
}

/**
 * Links a component state or example to a Storybook story, per
 * documentation/16-data-and-schema-model.md ("StoryReference").
 */
export interface StoryReference {
  readonly id: string;
  readonly componentVersionId: string;
  readonly componentStateId?: string;
  readonly storybookStoryId: string;
  readonly url?: string;
}

export function createComponentState(input: {
  id: string;
  componentVersionId: string;
  name: string;
  required: boolean;
  storyReferenceId?: string;
}): ComponentState {
  if (!input.name.trim()) {
    throw new Error('ComponentState requires a non-empty name');
  }
  return { ...input };
}
