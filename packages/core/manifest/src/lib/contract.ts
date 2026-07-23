/**
 * One member of a component's public contract (an input, output, content
 * slot, method, or styling part), per the portable-concept table in
 * documentation/05-framework-adapters.md.
 */
export interface ContractMember {
  readonly name: string;
  readonly type?: string;
  readonly required?: boolean;
  readonly description?: string;
}

/**
 * Inputs, outputs, content projection, public methods, styling API, and
 * framework extensions for one component version, per
 * documentation/16-data-and-schema-model.md ("ComponentContract").
 */
export interface ComponentContract {
  readonly id: string;
  readonly componentVersionId: string;
  readonly inputs: readonly ContractMember[];
  readonly outputs: readonly ContractMember[];
  readonly content: readonly ContractMember[];
  readonly publicMethods: readonly ContractMember[];
  readonly styleParts: readonly ContractMember[];
  readonly frameworkExtensions?: Readonly<Record<string, unknown>>;
}

export function createComponentContract(input: {
  id: string;
  componentVersionId: string;
  inputs?: readonly ContractMember[];
  outputs?: readonly ContractMember[];
  content?: readonly ContractMember[];
  publicMethods?: readonly ContractMember[];
  styleParts?: readonly ContractMember[];
  frameworkExtensions?: Readonly<Record<string, unknown>>;
}): ComponentContract {
  if (!input.componentVersionId.trim()) {
    throw new Error('ComponentContract requires a componentVersionId');
  }
  return {
    id: input.id,
    componentVersionId: input.componentVersionId,
    inputs: input.inputs ?? [],
    outputs: input.outputs ?? [],
    content: input.content ?? [],
    publicMethods: input.publicMethods ?? [],
    styleParts: input.styleParts ?? [],
    frameworkExtensions: input.frameworkExtensions,
  };
}
