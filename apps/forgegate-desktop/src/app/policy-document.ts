import type { ComponentManifest } from '@forgegate/core-manifest';
import type { PolicyMapping } from '@forgegate/core-config';

export interface ExternalPolicyDocumentSnapshot {
  readonly id: string;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly source: 'repository-policy-document';
  readonly path: string;
  readonly format: 'yaml' | 'json' | 'markdown' | 'text';
  readonly loadedAt: string;
  readonly commit: string | null;
  readonly checksumSha256: string;
  readonly sizeBytes: number;
  readonly excerpt: string;
  readonly limitations: readonly string[];
}

export function findPolicyMappingForManifest(
  manifest: ComponentManifest,
  mappings: readonly PolicyMapping[],
): PolicyMapping | null {
  if (!manifest.policyId || !manifest.policyVersion) {
    return null;
  }
  return (
    mappings.find(
      (mapping) =>
        mapping.policyId === manifest.policyId &&
        mapping.policyVersion === manifest.policyVersion,
    ) ?? null
  );
}

export function isWorkspaceRelativePolicyDocumentPath(
  value: string | null | undefined,
): value is string {
  if (!value || value.startsWith('/') || value.includes('\\')) {
    return false;
  }
  if (/^[a-zA-Z]:\//.test(value)) {
    return false;
  }
  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '..')) {
    return false;
  }
  return /\.(ya?ml|json|mdx?|txt)$/i.test(value);
}

export async function buildExternalPolicyDocumentSnapshot(input: {
  readonly mapping: PolicyMapping;
  readonly content: string;
  readonly loadedAt: string;
  readonly commit: string | null;
}): Promise<ExternalPolicyDocumentSnapshot> {
  return {
    id: `${input.mapping.policyId}-${input.mapping.policyVersion}-policy-document`,
    policyId: input.mapping.policyId,
    policyVersion: input.mapping.policyVersion,
    source: 'repository-policy-document',
    path: input.mapping.path,
    format: inferPolicyDocumentFormat(input.mapping.path),
    loadedAt: input.loadedAt,
    commit: input.commit,
    checksumSha256: await sha256Hex(input.content),
    sizeBytes: new TextEncoder().encode(input.content).length,
    excerpt: excerptPolicyDocument(input.content),
    limitations: [
      'ForgeGate snapshots this repository-owned policy document for provenance; the current release-decision evaluator still uses the narrow built-in rule set.',
      'The snapshot does not yet parse organization-specific waiver logic, expiry calendars, control catalogs, or reviewer-role matrices.',
    ],
  };
}

function inferPolicyDocumentFormat(
  path: string,
): ExternalPolicyDocumentSnapshot['format'] {
  if (/\.ya?ml$/i.test(path)) {
    return 'yaml';
  }
  if (/\.json$/i.test(path)) {
    return 'json';
  }
  if (/\.mdx?$/i.test(path)) {
    return 'markdown';
  }
  return 'text';
}

function excerptPolicyDocument(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  if (normalized.length <= 600) {
    return normalized;
  }
  return `${normalized.slice(0, 600).trimEnd()}\n[truncated]`;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
