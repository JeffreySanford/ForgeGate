import { InjectionToken } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

/**
 * Injectable boundary for privileged Tauri commands. Production resolves to
 * Tauri's invoke function; tests provide a deterministic spy without relying
 * on module-loader mocking.
 */
export const TAURI_INVOKE = new InjectionToken<typeof invoke>('TAURI_INVOKE', {
  providedIn: 'root',
  factory: () => invoke,
});
