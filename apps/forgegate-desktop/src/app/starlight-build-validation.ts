export interface StarlightBuildCommandPlan {
  readonly command: string;
  readonly args: readonly string[];
  readonly commandText: string;
}

export type StarlightBuildValidationScenario =
  | 'workspace-root-starlight'
  | 'nested-starlight'
  | 'nx-command'
  | 'npm-command'
  | 'pnpm-command'
  | 'non-nx-command'
  | 'multiple-starlight-projects'
  | 'no-detected-starlight-project';

export interface StarlightBuildValidationPlan {
  readonly command: string;
  readonly args: readonly string[];
  readonly commandText: string;
  readonly relativeCwd: string;
  readonly timeoutSeconds: number;
  readonly detectedStarlightProjects: readonly string[];
  readonly validationMatrix: readonly StarlightBuildValidationScenario[];
}

export function createStarlightBuildValidationPlan(
  commandPlan: StarlightBuildCommandPlan,
  detectedStarlightProjects: readonly string[],
  timeoutSeconds: number,
): StarlightBuildValidationPlan {
  return {
    command: commandPlan.command,
    args: [...commandPlan.args],
    commandText: commandPlan.commandText,
    relativeCwd: '',
    timeoutSeconds,
    detectedStarlightProjects: [...detectedStarlightProjects],
    validationMatrix: starlightBuildValidationMatrix(
      commandPlan,
      detectedStarlightProjects,
    ),
  };
}

export function starlightBuildValidationMatrix(
  commandPlan: StarlightBuildCommandPlan,
  detectedStarlightProjects: readonly string[],
): readonly StarlightBuildValidationScenario[] {
  const scenarios = new Set<StarlightBuildValidationScenario>();
  if (detectedStarlightProjects.length === 0) {
    scenarios.add('no-detected-starlight-project');
  }
  if (detectedStarlightProjects.some((project) => project === '')) {
    scenarios.add('workspace-root-starlight');
  }
  if (detectedStarlightProjects.some((project) => project !== '')) {
    scenarios.add('nested-starlight');
  }
  if (detectedStarlightProjects.length > 1) {
    scenarios.add('multiple-starlight-projects');
  }
  if (commandPlan.command === 'pnpm') {
    scenarios.add('pnpm-command');
  }
  if (commandPlan.command === 'npm' || commandPlan.command === 'npx') {
    scenarios.add('npm-command');
  }
  if (
    commandPlan.args.includes('nx') ||
    commandPlan.command === 'nx' ||
    commandPlan.commandText.includes(' nx ')
  ) {
    scenarios.add('nx-command');
  } else {
    scenarios.add('non-nx-command');
  }
  return [...scenarios];
}

export function starlightBuildValidationSkippedReason(
  mappingName: string,
): string {
  return `No ${mappingName} command is configured in .forgegate/config.yaml.`;
}
