import { createComponentManifest } from '@forgegate/core-manifest';
import {
  buildExternalPolicyDocumentSnapshot,
  findPolicyMappingForManifest,
  isWorkspaceRelativePolicyDocumentPath,
} from './policy-document';

describe('findPolicyMappingForManifest', () => {
  it('selects the mapping that matches both policy id and version', () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      policyId: 'acme.baseline',
      policyVersion: '1.0.0',
    });

    expect(
      findPolicyMappingForManifest(manifest, [
        {
          policyId: 'acme.baseline',
          policyVersion: '0.9.0',
          path: '.forgegate/policies/old.yaml',
        },
        {
          policyId: 'acme.baseline',
          policyVersion: '1.0.0',
          path: '.forgegate/policies/acme-baseline.yaml',
        },
      ]),
    ).toEqual({
      policyId: 'acme.baseline',
      policyVersion: '1.0.0',
      path: '.forgegate/policies/acme-baseline.yaml',
    });
  });

  it('returns null when the manifest has no complete policy reference', () => {
    expect(
      findPolicyMappingForManifest(
        createComponentManifest({
          id: 'acme.lib.button',
          framework: 'web-components',
          adapter: 'framework.web-components',
          packagePath: '.',
          policyId: 'acme.baseline',
        }),
        [
          {
            policyId: 'acme.baseline',
            policyVersion: '1.0.0',
            path: '.forgegate/policies/acme-baseline.yaml',
          },
        ],
      ),
    ).toBeNull();
  });
});

describe('isWorkspaceRelativePolicyDocumentPath', () => {
  it('accepts workspace-relative text policy documents', () => {
    expect(
      isWorkspaceRelativePolicyDocumentPath(
        '.forgegate/policies/acme-baseline.yaml',
      ),
    ).toBe(true);
    expect(isWorkspaceRelativePolicyDocumentPath('policies/release.md')).toBe(
      true,
    );
    expect(isWorkspaceRelativePolicyDocumentPath('policies/release.json')).toBe(
      true,
    );
  });

  it('rejects absolute, traversal, backslash, and binary-looking paths', () => {
    expect(isWorkspaceRelativePolicyDocumentPath('/tmp/policy.yaml')).toBe(
      false,
    );
    expect(isWorkspaceRelativePolicyDocumentPath('D:/tmp/policy.yaml')).toBe(
      false,
    );
    expect(isWorkspaceRelativePolicyDocumentPath('../policy.yaml')).toBe(false);
    expect(isWorkspaceRelativePolicyDocumentPath('policies\\release.yaml')).toBe(
      false,
    );
    expect(isWorkspaceRelativePolicyDocumentPath('policies/release.pdf')).toBe(
      false,
    );
  });
});

describe('buildExternalPolicyDocumentSnapshot', () => {
  it('captures path, format, size, checksum, excerpt, and limitations', async () => {
    const snapshot = await buildExternalPolicyDocumentSnapshot({
      mapping: {
        policyId: 'acme.baseline',
        policyVersion: '1.0.0',
        path: '.forgegate/policies/acme-baseline.yaml',
      },
      content: 'id: acme.baseline\nversion: 1.0.0\nrules:\n  - require-manual-review\n',
      loadedAt: '2026-08-02T12:00:00.000Z',
      commit: 'a'.repeat(40),
    });

    expect(snapshot).toMatchObject({
      id: 'acme.baseline-1.0.0-policy-document',
      policyId: 'acme.baseline',
      policyVersion: '1.0.0',
      source: 'repository-policy-document',
      path: '.forgegate/policies/acme-baseline.yaml',
      format: 'yaml',
      loadedAt: '2026-08-02T12:00:00.000Z',
      commit: 'a'.repeat(40),
      sizeBytes: 66,
      excerpt:
        'id: acme.baseline\nversion: 1.0.0\nrules:\n  - require-manual-review',
    });
    expect(snapshot.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.limitations.join(' ')).toContain(
      'snapshots this repository-owned policy document for provenance',
    );
  });
});
