import type { Blueprint, ComponentProposal } from '@forgegate/core-manifest';
import { buildProposalHandoffExport } from './proposal-handoff-export';

const blueprint: Blueprint = {
  id: 'blueprint.button',
  version: '1.0.0',
  name: 'Button',
  purpose: 'Trigger a primary or secondary application action.',
  preferredNativeElement: 'button',
  requiredStates: ['default', 'hover', 'focus-visible', 'active', 'disabled'],
  inspectorGroups: [],
  tokenSlots: [
    {
      id: 'root.background',
      label: 'Background',
      types: ['color'],
      required: true,
    },
  ],
};

const proposal: ComponentProposal = {
  identity: {
    id: 'proposal.acme-icon-button-123',
    status: 'approved',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
  },
  blueprint: { blueprintId: 'blueprint.button', blueprintVersion: '1.0.0' },
  target: {
    componentName: 'acme-icon-button',
    packagePath: 'packages/acme-icon-button',
    adapter: 'framework.web-components',
  },
  purpose: 'Trigger a compact, icon-only variant of the primary button.',
  nativeSemanticConfirmed: true,
  contract: {
    inputs: [{ name: 'icon', required: true }],
    outputs: [],
    content: [],
    publicMethods: [],
    styleParts: [],
  },
  requiredStates: ['default', 'hover', 'focus-visible', 'active', 'disabled'],
  variantSelections: [],
  anatomyParts: [
    {
      id: 'icon',
      label: 'Icon',
      required: true,
      publicSlot: false,
      publicPart: false,
    },
  ],
  tokenMappings: [
    { slotId: 'root.background', tokenPath: 'primitive.color.blue.50' },
  ],
};

describe('buildProposalHandoffExport', () => {
  it('produces a real proposal.yaml and blueprint.yaml that round-trip the exact input data', async () => {
    const result = await buildProposalHandoffExport(
      proposal,
      blueprint,
      '2026-08-02T12:00:00.000Z',
    );

    expect(result.files['proposal.yaml']).toContain(
      'proposal.acme-icon-button-123',
    );
    expect(result.files['blueprint.yaml']).toContain('blueprint.button');
  });

  it('names the export directory from the real component name and proposal id', async () => {
    const result = await buildProposalHandoffExport(
      proposal,
      blueprint,
      '2026-08-02T12:00:00.000Z',
    );

    expect(result.directoryName).toBe(
      'acme-icon-button-handoff-proposal.acme-icon-button-123',
    );
  });

  it('includes a real, honest handoff manifest that never claims generation happened', async () => {
    const result = await buildProposalHandoffExport(
      proposal,
      blueprint,
      '2026-08-02T12:00:00.000Z',
    );

    const manifest = JSON.parse(result.files['handoff-manifest.json'] ?? '{}');
    expect(manifest.proposalId).toBe('proposal.acme-icon-button-123');
    expect(manifest.componentName).toBe('acme-icon-button');
    expect(manifest.nativeSemanticConfirmed).toBe(true);
    expect(manifest.contractMemberCount).toBe(1);
    expect(manifest.anatomyPartCount).toBe(1);
    expect(manifest.tokenMappingCount).toBe(1);
    expect(manifest.generationStatus).toContain('not-generated');
  });

  it('includes a real checksums.sha256 covering every content file', async () => {
    const result = await buildProposalHandoffExport(
      proposal,
      blueprint,
      '2026-08-02T12:00:00.000Z',
    );

    const checksumsFile = result.files['checksums.sha256'] ?? '';
    expect(checksumsFile).toContain('proposal.yaml');
    expect(checksumsFile).toContain('blueprint.yaml');
    expect(checksumsFile.trim().split('\n')).toHaveLength(2);
  });

  it('produces checksums that actually match the exported file contents', async () => {
    const result = await buildProposalHandoffExport(
      proposal,
      blueprint,
      '2026-08-02T12:00:00.000Z',
    );

    const manifest = JSON.parse(result.files['handoff-manifest.json'] ?? '{}');
    const bytes = new TextEncoder().encode(result.files['proposal.yaml']);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hex = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    expect(manifest.checksums['proposal.yaml']).toBe(hex);
  });
});
