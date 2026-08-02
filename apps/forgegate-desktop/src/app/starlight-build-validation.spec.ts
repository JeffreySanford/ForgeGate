import {
  createStarlightBuildValidationPlan,
  starlightBuildValidationMatrix,
  starlightBuildValidationSkippedReason,
} from './starlight-build-validation';

describe('createStarlightBuildValidationPlan', () => {
  it('keeps arbitrary target-repo Starlight validation rooted at the workspace command', () => {
    expect(
      createStarlightBuildValidationPlan(
        {
          command: 'pnpm',
          args: ['nx', 'run', 'docs:build'],
          commandText: 'pnpm nx run docs:build',
        },
        ['apps/docs'],
        180,
      ),
    ).toEqual({
      command: 'pnpm',
      args: ['nx', 'run', 'docs:build'],
      commandText: 'pnpm nx run docs:build',
      relativeCwd: '',
      timeoutSeconds: 180,
      detectedStarlightProjects: ['apps/docs'],
      validationMatrix: ['nested-starlight', 'pnpm-command', 'nx-command'],
    });
  });

  it('records root, nested, and multi-project coverage in the validation matrix', () => {
    expect(
      starlightBuildValidationMatrix(
        {
          command: 'npm',
          args: ['run', 'build:docs'],
          commandText: 'npm run build:docs',
        },
        ['', 'apps/docs'],
      ),
    ).toEqual([
      'workspace-root-starlight',
      'nested-starlight',
      'multiple-starlight-projects',
      'npm-command',
      'non-nx-command',
    ]);
  });

  it('records no-project validation separately from the skipped no-command state', () => {
    expect(
      starlightBuildValidationMatrix(
        {
          command: 'pnpm',
          args: ['astro', 'build'],
          commandText: 'pnpm astro build',
        },
        [],
      ),
    ).toEqual([
      'no-detected-starlight-project',
      'pnpm-command',
      'non-nx-command',
    ]);
  });
});

describe('starlightBuildValidationSkippedReason', () => {
  it('names the exact repository config key required for post-approval validation', () => {
    expect(starlightBuildValidationSkippedReason('starlightBuild')).toBe(
      'No starlightBuild command is configured in .forgegate/config.yaml.',
    );
  });
});
