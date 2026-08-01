/**
 * What this Storybook adapter can and can't actually do today, per
 * documentation/06-storybook-integration.md's own principle: "ForgeGate
 * must handle version differences through capability detection rather
 * than assuming one endpoint shape forever." A fixed, honest declaration
 * of this implementation's real capabilities — not a runtime probe of a
 * specific repository's Storybook (that's `fetchLiveStorybookIndex`'s
 * job), and not the Blueprint Studio generation-capability contract
 * (`@forgegate/adapter-sdk`), which is a different concept (authoring
 * generation, not evidence discovery).
 */
export interface StorybookAdapterCapabilities {
  /** Parsing a `storybook-static/index.json` file already on disk. */
  readonly staticIndexParsing: boolean;
  /** Querying a running local Storybook server's own `/index.json`. */
  readonly liveServerQuery: boolean;
  /** Associating story entries with component source files by import path. */
  readonly storyToComponentMapping: boolean;
  /** Running the project's own Storybook interaction-test workflow. ForgeGate
   * only ingests an already-produced `storybook-interactions-json` evidence
   * envelope; it never invokes the test runner itself. */
  readonly interactionTestExecution: boolean;
  /** Running or collecting accessibility checks against Storybook stories
   * itself, beyond ingesting an already-produced `axe-json` envelope. */
  readonly accessibilityCheckExecution: boolean;
  /** Connecting to a visual-review provider (Chromatic, Percy, Applitools, Loki). */
  readonly visualReviewIntegration: boolean;
  /** Starting a local Storybook process. */
  readonly runningStorybook: boolean;
}

export function describeStorybookAdapterCapabilities(): StorybookAdapterCapabilities {
  return {
    staticIndexParsing: true,
    liveServerQuery: true,
    storyToComponentMapping: true,
    interactionTestExecution: false,
    accessibilityCheckExecution: false,
    visualReviewIntegration: false,
    runningStorybook: false,
  };
}
