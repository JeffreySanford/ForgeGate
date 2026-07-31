export interface ForgeGateContractMemberReport {
  readonly name: string;
  readonly type?: string;
  readonly required?: boolean;
  readonly description?: string;
}

export interface ForgeGateStateReport {
  readonly name: string;
  readonly required: boolean;
  readonly description?: string;
  readonly storybookStoryId?: string;
}

export interface ForgeGateTokenReport {
  readonly tokenPath: string;
  readonly category: string;
  readonly required: boolean;
}

export interface ForgeGateManualProcedureReport {
  readonly id: string;
  readonly expected: readonly string[];
}

export interface ForgeGateAutomatedEvidenceReport {
  readonly id: string;
  readonly gate: string;
  readonly tool: string;
  readonly status: string;
  readonly commitOrFingerprint: string;
  readonly rawArtifactRef?: string;
}

export interface ForgeGateManualReviewEvidenceReport {
  readonly id: string;
  readonly procedureId: string;
  readonly status: string;
  readonly reviewerRole?: string;
  readonly date: string;
  readonly commitOrFingerprint: string;
}

export interface ForgeGateFindingReport {
  readonly id: string;
  readonly description: string;
  readonly severity: string;
  readonly status: string;
}

export interface ForgeGateManifestProvenanceReport {
  readonly schemaVersion: string;
  readonly path: string;
  readonly framework: string;
  readonly adapter: string;
  readonly sourceFiles: readonly string[];
  readonly documentationTargets: readonly {
    readonly adapter: string;
    readonly pathOrPageId?: string;
    readonly publishedVersion?: string;
  }[];
  readonly policyId?: string;
  readonly policyVersion?: string;
}

export interface ForgeGateComponentReport {
  readonly componentId: string;
  readonly version: string;
  readonly lifecycle: string;
  readonly evidenceCommit: string;
  readonly packagePath: string;
  readonly tier: string;
  readonly manifest?: ForgeGateManifestProvenanceReport;
  readonly states: readonly ForgeGateStateReport[];
  readonly tokens: readonly ForgeGateTokenReport[];
  readonly contract: {
    readonly inputs: readonly ForgeGateContractMemberReport[];
    readonly outputs: readonly ForgeGateContractMemberReport[];
    readonly content: readonly ForgeGateContractMemberReport[];
    readonly publicMethods: readonly ForgeGateContractMemberReport[];
    readonly styleParts: readonly ForgeGateContractMemberReport[];
  };
  readonly manualProcedures: readonly ForgeGateManualProcedureReport[];
  readonly evidence: {
    readonly automated: readonly ForgeGateAutomatedEvidenceReport[];
    readonly manualReviews: readonly ForgeGateManualReviewEvidenceReport[];
    readonly findings: readonly ForgeGateFindingReport[];
  };
}

export interface ForgeGateRegistryComponentReport {
  readonly componentId: string;
  readonly version: string;
  readonly lifecycle: string;
  readonly manifestPath?: string;
  readonly manifestSchemaVersion?: string;
}

export interface ForgeGateRegistryReport {
  readonly evidenceCommit: string;
  readonly componentCount: number;
  readonly components: readonly ForgeGateRegistryComponentReport[];
}

export function contractMemberCount(
  report: ForgeGateComponentReport | undefined,
): number {
  if (!report) {
    return 0;
  }
  return (
    report.contract.inputs.length +
    report.contract.outputs.length +
    report.contract.content.length +
    report.contract.publicMethods.length +
    report.contract.styleParts.length
  );
}

export function openFindingCount(
  report: ForgeGateComponentReport | undefined,
): number {
  return (
    report?.evidence.findings.filter((finding) => finding.status === 'open')
      .length ?? 0
  );
}
