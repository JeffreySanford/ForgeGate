export interface StarlightBuildCommandPlan {
  readonly command: string;
  readonly args: readonly string[];
  readonly commandText: string;
}

export interface StarlightBuildValidationPlan {
  readonly command: string;
  readonly args: readonly string[];
  readonly commandText: string;
  readonly relativeCwd: string;
  readonly timeoutSeconds: number;
  readonly detectedStarlightProjects: readonly string[];
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
  };
}

export function starlightBuildValidationSkippedReason(
  mappingName: string,
): string {
  return `No ${mappingName} command is configured in .forgegate/config.yaml.`;
}
