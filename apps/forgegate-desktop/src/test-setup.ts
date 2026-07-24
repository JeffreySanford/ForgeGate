import '@angular/compiler';
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import { vi } from 'vitest';

declare global {
  var __forgegateTauriInvokeMock: ReturnType<typeof vi.fn>;
}

const { tauriInvokeMock } = vi.hoisted(() => ({
  tauriInvokeMock: vi.fn(),
}));

globalThis.__forgegateTauriInvokeMock = tauriInvokeMock;
vi.mock('@tauri-apps/api/core', () => ({
  invoke: tauriInvokeMock,
}));

setupTestBed();
