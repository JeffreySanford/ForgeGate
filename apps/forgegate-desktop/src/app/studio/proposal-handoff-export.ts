import type { Blueprint, ComponentProposal } from '@forgegate/core-manifest';
import {
  serializeBlueprint,
  serializeComponentProposal,
} from '@forgegate/core-manifest';
import { sanitizeForFilename, sha256Hex } from '../evidence-export';

/**
 * P2 first-slice item 10, "Hand off to engineering..." — the one real
 * slice of that item buildable before Workstream 10's generation pipeline
 * exists: an approved `ComponentProposal` exported as a real,
 * self-contained, checksum-verifiable package an engineer can pick up.
 * "...and open the resulting component assurance record" remains
 * genuinely blocked — there is no generated component yet for a record to
 * describe, and this export does not pretend otherwise
 * (`handoff-manifest.json`'s `generationStatus` says so explicitly).
 *
 * Mirrors `buildEvidenceExport`'s real shape (`manifest.json` +
 * checksummed content files + `checksums.sha256`), scoped down to what a
 * proposal handoff actually needs — not a copy of evidence-package
 * semantics this isn't.
 */
export interface ProposalHandoffExportResult {
  readonly directoryName: string;
  readonly files: Readonly<Record<string, string>>;
}

export async function buildProposalHandoffExport(
  proposal: ComponentProposal,
  blueprint: Blueprint,
  exportedAt: string,
): Promise<ProposalHandoffExportResult> {
  const contentFiles: Record<string, string> = {
    'proposal.yaml': serializeComponentProposal(proposal),
    'blueprint.yaml': serializeBlueprint(blueprint),
  };

  const checksums: Record<string, string> = {};
  for (const [name, content] of Object.entries(contentFiles)) {
    checksums[name] = await sha256Hex(content);
  }

  const handoffManifest = {
    proposalId: proposal.identity.id,
    proposalStatus: proposal.identity.status,
    blueprintId: proposal.blueprint.blueprintId,
    blueprintVersion: proposal.blueprint.blueprintVersion,
    componentName: proposal.target.componentName,
    packagePath: proposal.target.packagePath,
    adapter: proposal.target.adapter,
    purpose: proposal.purpose,
    nativeSemanticConfirmed: proposal.nativeSemanticConfirmed,
    requiredStateCount: proposal.requiredStates.length,
    contractMemberCount:
      proposal.contract.inputs.length +
      proposal.contract.outputs.length +
      proposal.contract.content.length +
      proposal.contract.publicMethods.length +
      proposal.contract.styleParts.length,
    anatomyPartCount: proposal.anatomyParts.length,
    tokenMappingCount: proposal.tokenMappings.length,
    exportedAt,
    checksums,
    contents: Object.keys(contentFiles),
    /** Honest, not aspirational: no framework files exist yet. This
     * package hands off the proposal decision record, not a component. */
    generationStatus:
      'not-generated: this package contains the proposal decision record only — no repository component, story, test, or manifest exists yet',
  };

  const checksumsFile = `${Object.entries(checksums)
    .map(([name, hash]) => `${hash}  ${name}`)
    .join('\n')}\n`;

  return {
    directoryName: `${sanitizeForFilename(proposal.target.componentName)}-handoff-${sanitizeForFilename(proposal.identity.id)}`,
    files: {
      'handoff-manifest.json': JSON.stringify(handoffManifest, null, 2),
      ...contentFiles,
      'checksums.sha256': checksumsFile,
    },
  };
}
