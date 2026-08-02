import {
  createStarlightBuildValidationPlan,
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
    });
  });
});

describe('starlightBuildValidationSkippedReason', () => {
  it('names the exact repository config key required for post-approval validation', () => {
    expect(starlightBuildValidationSkippedReason('starlightBuild')).toBe(
      'No starlightBuild command is configured in .forgegate/config.yaml.',
    );
  });
});
