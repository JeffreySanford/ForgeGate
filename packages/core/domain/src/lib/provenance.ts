/**
 * Attached to fields that were discovered or transformed rather than
 * hand-authored, per documentation/16-data-and-schema-model.md ("Provenance").
 */
export interface Provenance {
  readonly sourceAdapter: string;
  readonly adapterVersion: string;
  readonly sourceFileOrEndpoint?: string;
  readonly extractedAt: string;
  readonly confidence?: 'low' | 'medium' | 'high';
  readonly userConfirmed: boolean;
}
