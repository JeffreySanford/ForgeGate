import { InjectionToken } from '@angular/core';
import { listen } from '@tauri-apps/api/event';

/**
 * Injectable boundary for Tauri's event system, mirroring TAURI_INVOKE.
 * Production resolves to Tauri's real `listen`; tests provide a
 * deterministic spy without relying on module-loader mocking.
 */
export const TAURI_LISTEN = new InjectionToken<typeof listen>('TAURI_LISTEN', {
  providedIn: 'root',
  factory: () => listen,
});
