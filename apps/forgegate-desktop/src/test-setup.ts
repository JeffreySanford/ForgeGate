import '@angular/compiler';
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import { vi } from 'vitest';

// Every desktop test imports services that share the Tauri boundary. Mock it
// once in the setup file so parallel test-file execution cannot cache the real
// browser implementation before WorkspaceService's focused tests install
// their per-file mock.
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

setupTestBed();
