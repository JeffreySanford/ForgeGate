import { createComponent, createComponentVersion, createWorkspace } from './entities';
import {
  componentSchema,
  componentVersionSchema,
  consumerApplicationSchema,
  documentationTargetSchema,
  workspaceSchema,
} from './schemas';
import { createValidator } from './validation';

describe('workspaceSchema', () => {
  const validate = createValidator(workspaceSchema);

  it('accepts a workspace built through createWorkspace', () => {
    const workspace = createWorkspace({
      id: 'ws-1',
      path: 'D:/repos/example',
      repositoryId: 'repo-1',
      branch: 'master',
      commit: 'a'.repeat(40),
      dirty: false,
      packageManager: 'pnpm',
      configurationVersion: '0.1.0',
    });
    expect(validate(workspace)).toBe(true);
  });

  it('rejects a short commit SHA', () => {
    const invalid = {
      id: 'ws-1',
      path: 'D:/repos/example',
      repositoryId: 'repo-1',
      branch: 'master',
      commit: 'deadbeef',
      dirty: false,
      packageManager: 'pnpm',
      configurationVersion: '0.1.0',
    };
    expect(validate(invalid)).toBe(false);
  });

  it('rejects an unknown extra property', () => {
    const withExtra = {
      id: 'ws-1',
      path: 'D:/repos/example',
      repositoryId: 'repo-1',
      branch: 'master',
      commit: 'a'.repeat(40),
      dirty: false,
      packageManager: 'pnpm',
      configurationVersion: '0.1.0',
      somethingUnexpected: true,
    };
    expect(validate(withExtra)).toBe(false);
  });
});

describe('componentSchema', () => {
  const validate = createValidator(componentSchema);

  it('accepts a component built through createComponent', () => {
    const component = createComponent({
      id: 'up.design-system.button',
      organization: 'up',
      library: 'design-system',
      name: 'button',
      packageId: 'pkg-1',
    });
    expect(validate(component)).toBe(true);
  });

  it('rejects an invalid lifecycle value', () => {
    expect(
      validate({
        id: 'c-1',
        organization: 'up',
        library: 'design-system',
        name: 'button',
        packageId: 'pkg-1',
        lifecycle: 'shipped',
        readiness: 'clear',
      }),
    ).toBe(false);
  });
});

describe('componentVersionSchema', () => {
  const validate = createValidator(componentVersionSchema);

  it('accepts a version built through createComponentVersion', () => {
    const version = createComponentVersion({
      id: 'cv-1',
      componentId: 'up.design-system.button',
      version: '1.2.0',
      commitSha: 'b'.repeat(40),
      contractId: 'contract-1',
    });
    expect(validate(version)).toBe(true);
  });

  it('rejects a non-semver version string', () => {
    expect(
      validate({
        id: 'cv-1',
        componentId: 'up.design-system.button',
        version: 'v1',
        commitSha: 'b'.repeat(40),
        contractId: 'contract-1',
        lifecycle: 'proposal',
      }),
    ).toBe(false);
  });
});

describe('documentationTargetSchema and consumerApplicationSchema', () => {
  it('accepts a minimal valid documentation target', () => {
    const validate = createValidator(documentationTargetSchema);
    expect(
      validate({
        id: 'dt-1',
        componentId: 'up.design-system.button',
        adapter: 'starlight',
        pathOrPageId: 'src/content/docs/components/button.mdx',
      }),
    ).toBe(true);
  });

  it('accepts a minimal valid consumer application', () => {
    const validate = createValidator(consumerApplicationSchema);
    expect(
      validate({
        id: 'app-1',
        name: 'Benefits Portal',
        componentIds: ['up.design-system.button'],
      }),
    ).toBe(true);
  });
});
