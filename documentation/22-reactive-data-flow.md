# ForgeGate Reactive Data Flow

## Objective

ForgeGate coordinates many independently changing sources of truth at once: file-system state, Git state, running commands, adapter results, manual review progress, policy evaluation, and documentation generation. These sources must stay synchronized without polling, without the UI and core drifting out of step, and without one slow or failing part blocking the rest of the application.

RxJS observables and subjects are the proposed synchronization mechanism across the core domain layer, the adapter runtime, and the Angular desktop UI. This document defines where streams originate, how they are shared, how they compose, and where synchronous state is preferred instead.

## Why streams instead of request/response

Most ForgeGate operations are not one-shot requests:

- A command produces output over time and can be cancelled.
- A file-watcher emits an unbounded sequence of change events.
- Evidence freshness depends on multiple upstream sources changing independently.
- Several UI panels must reflect the same underlying state without redundant fetches or drifting copies.
- Readiness must recompute automatically whenever any contributing input changes, not only when a user clicks refresh.

A promise-based or callback-based core would require ad hoc event emitters, manual cache invalidation, and duplicated "recompute and redraw" logic in every screen. Observables give ForgeGate one consistent vocabulary for cancellation, multicasting, backpressure, retry, and composition, and Angular already depends on RxJS, so the desktop UI does not absorb a second reactive paradigm.

## Stream taxonomy

### Source streams

Source streams originate at the Tauri boundary or the adapter runtime and represent raw, low-level change:

- File-system change events
- Git status and HEAD change events
- Running command stdout, stderr, and exit events
- Workspace scan progress events
- External service polling results, where push is unavailable

Source streams are cold at the boundary and made hot (shared) as soon as they enter the core.

### Domain streams

Domain streams are derived, normalized, and meaningful in ForgeGate's own vocabulary:

- Component manifest changes
- Evidence updates per component and gate
- Freshness state per evidence item
- Finding and exception changes
- Readiness recalculation per component version
- Documentation drift changes

Domain streams are produced by combining and transforming source streams inside the framework-neutral core, never directly in the UI layer.

### UI streams

UI streams are local to the Angular desktop shell:

- Current workspace selection
- Current component selection
- Active panel and route state
- Transient view state such as expanded rows or open dialogs

UI streams may subscribe to domain streams but must not leak view-only concerns back into the core.

## Subject usage

| Purpose | Subject type | Reason |
|---|---|---|
| Current workspace, current readiness, current selection | `BehaviorSubject` | Late subscribers need the current value immediately, not just future changes. |
| Command output buffering for a running or recently finished command | `ReplaySubject` (bounded) | A panel opened mid-command must see recent output without re-running the command. |
| Discrete domain events such as "finding created" or "evidence marked stale" | `Subject` | These are notifications, not persistent state; no replay is needed. |
| One-shot completion signals such as "workspace scan finished" | `Subject` completing after emission, not `AsyncSubject` | Keeps completion semantics explicit rather than relying on `AsyncSubject` edge cases. |

Global, application-wide subjects should be limited to state that genuinely has one authoritative current value across the whole application: workspace, readiness, evidence freshness, and command lifecycle. Component-local UI state should stay component-local and must not be promoted to a global subject by default.

## Central evidence bus

The core domain layer exposes one composition point, informally the **evidence bus**, that merges domain streams into the inputs the readiness evaluator and documentation drift detector need:

```text
fileChange$ ─┐
gitStatus$ ──┼─▶ affectedComponents$ ─▶ freshnessEngine$ ─▶ readiness$ ─▶ ui
testResult$ ─┤                                     │
manualReview$┘                                     └─▶ documentationDrift$
```

- `affectedComponents$` maps a raw change to the component identities it touches, using manifest and file-association data.
- `freshnessEngine$` recomputes staleness per evidence item whenever its associated files, tests, or reviews change.
- `readiness$` recomputes per component version whenever freshness, findings, exceptions, or policy change.
- `documentationDrift$` recomputes whenever manifest, evidence, or published-page metadata change.

Every downstream consumer (inventory list, component record screen, release panel, documentation panel, CI CLI) subscribes to these shared, multicast streams rather than independently recomputing the same derivation.

## Adapter contracts as streams

Adapter capability methods that involve execution, not simple lookup, should return observables rather than promises:

```text
interface CommandAdapter {
  run(command: ResolvedCommand): Observable<CommandEvent>;
}

type CommandEvent =
  | { type: 'started'; pid: number }
  | { type: 'stdout'; chunk: string }
  | { type: 'stderr'; chunk: string }
  | { type: 'exit'; code: number; durationMs: number }
  | { type: 'cancelled' };
```

This gives ForgeGate, for free:

- Cancellation through unsubscription, mapped to Tauri process termination.
- Live output streaming to the UI without a separate polling channel.
- Consistent timeout handling through `timeout` and `race` operators rather than bespoke per-adapter logic.
- Composable retry policies where a policy explicitly allows retry, using `retry` or `retryWhen` rather than adapter-specific loops.

Lookup-style adapter methods that return a single value once, such as reading a manifest file, may remain promise-based or be converted with `from()` at the boundary; not every method needs to be a stream.

## Bridging Tauri events into observables

Tauri emits events across the privileged boundary using its own event system. ForgeGate should wrap this once, at the edge, with a small bridge such as `fromTauriEvent(channel)` that produces a standard observable. Application and core code must never call the raw Tauri event API directly; every crossing goes through the bridge so that error handling, teardown, and typing stay consistent.

## Error handling in streams

- Domain streams must isolate adapter failures with `catchError` so that one failing adapter cannot terminate the shared evidence bus for every other component.
- A failed source is represented as a domain-level failure value flowing downstream, consistent with the failure model in [`02-system-architecture.md`](02-system-architecture.md), not as a silently completed or dead stream.
- Retries must be explicit, bounded, and policy-driven. Silent infinite retry against a local process or external service is not acceptable.
- Long-lived shared streams should use `shareReplay({ bufferSize: 1, refCount: true })` or an equivalent pattern deliberately, so that late subscribers get current state without keeping the source alive after every subscriber has gone away.

## Testing implications

- Core domain stream logic should be tested with marble diagrams (`TestScheduler`) so that timing, cancellation, and ordering are verified deterministically rather than through real timers.
- Adapter observables should have fake implementations that emit representative `CommandEvent` sequences, including cancellation and failure paths, so higher-level composition can be tested without spawning real processes.
- Golden-path integration tests should still exercise at least one real end-to-end stream, consistent with the vertical-slice philosophy in [`21-mvp-acceptance-criteria.md`](21-mvp-acceptance-criteria.md).

## Non-goals

- Not every piece of state becomes an observable. Simple, synchronous, component-local values should stay plain values or signals; forcing trivial state through RxJS adds ceremony without benefit.
- The reactive layer does not replace the repository-controlled data model described in [`03-center-of-truth-model.md`](03-center-of-truth-model.md). Streams synchronize in-memory and displayed state; durable truth is still written to the repository and evidence store.
- The evidence bus is not a general-purpose message queue for arbitrary plugin communication. Plugin and adapter boundaries are defined in [`17-plugin-and-adapter-sdk.md`](17-plugin-and-adapter-sdk.md).

## Relationship to other documents

- [`02-system-architecture.md`](02-system-architecture.md) describes the layers this reactive model runs inside.
- [`03-center-of-truth-model.md`](03-center-of-truth-model.md) defines the durable state that streams derive from and eventually write back to.
- [`08-test-orchestration.md`](08-test-orchestration.md) defines the command execution and evidence normalization that source streams carry.
- [`10-documentation-publishing.md`](10-documentation-publishing.md) and [`12-starlight-integration.md`](12-starlight-integration.md) depend on `documentationDrift$` to know when generated pages fall out of sync with the component record.
