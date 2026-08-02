# Security Dependency Exceptions

This file records dependency advisories ForgeGate has intentionally not patched
because the current dependency resolver cannot move to a fixed version without
changing a larger platform stack.

Exceptions are not vulnerability dismissals. Each entry needs scope, resolver
evidence, user impact, and a recheck trigger.

## 2026-08-02: `glib 0.18.5` through Tauri Linux GTK

- **Status:** accepted temporary platform exception.
- **Affected package:** `glib 0.18.5` in
  `apps/forgegate-desktop/src-tauri/Cargo.lock`.
- **Dependency path:** `tauri 2.11.5` depends on the current Linux GTK3 stack,
  including `gtk 0.18.2`, `webkit2gtk 2.0.2`, `wry 0.55.1`, and
  `tao 0.35.3`; those crates resolve `glib ^0.18`.
- **Current supported MVP platform:** Windows 11, documented in
  `documentation/21-mvp-acceptance-criteria.md`.
- **Linux status:** Linux bundles are build-validation artifacts in
  `.github/workflows/build-desktop.yml`, not the MVP deployment platform.
- **Resolver evidence checked:** `cargo tree --target all -i glib@0.18.5`
  shows the GTK path above; `cargo update -p tauri --dry-run`,
  `cargo update -p wry --dry-run`, and `cargo update -p gtk --dry-run` lock
  zero packages; `cargo update -p glib --precise 0.18.6 --dry-run` reports no
  matching `glib` package.
- **Decision:** Do not force an incompatible `glib` major version and do not
  remove Linux build coverage to hide the alert. Keep the lockfile honest,
  keep CI exercising Linux compilation, and revisit when Tauri/wry/gtk-rs
  publish a compatible GTK stack update.
- **Recheck trigger:** before any Linux distribution claim, before enabling
  automatic updates, when Tauri/wry/tao/gtk-rs releases a compatible GTK stack,
  or at least once per dependency-maintenance pass.
