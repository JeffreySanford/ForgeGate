import '@angular/compiler';
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import { webcrypto } from 'node:crypto';

setupTestBed();

// jsdom's `crypto` global has no SubtleCrypto implementation (only
// getRandomValues). Node's own webcrypto is a real, spec-compliant
// SubtleCrypto — the same API surface a real webview provides — so tests
// exercising checksum/hash code (e.g. evidence export) get real digests,
// not a mock standing in for one.
if (!globalThis.crypto.subtle) {
  Object.defineProperty(globalThis.crypto, 'subtle', { value: webcrypto.subtle });
}
