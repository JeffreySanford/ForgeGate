/**
 * Content for a guided self-review of ForgeGate's own shell — the one
 * manual accessibility gate (TODO.md P0.7) that genuinely cannot be
 * completed by an agent.
 *
 * Four areas below (`SELF_REVIEW_AREAS`) are fixed, hand-authored content:
 * they name ForgeGate's own real, shipped shell surfaces (nav, workspace
 * command center, inventory, Blueprint Studio), which are identical
 * regardless of which repository is open, so a static checklist is honest
 * here. The fifth area — "Component assurance records" — is deliberately
 * NOT fixed content: which components exist, and how many, is entirely
 * repo-specific, so `buildComponentRecordSteps` generates real
 * per-component checks from whatever the currently open workspace
 * actually discovered, rather than naming one example component as a
 * stand-in for all of them.
 */

export interface SelfReviewStep {
  readonly action: string;
  readonly expected: string;
  /** Set only for a component-record step — which real component it checks. */
  readonly componentId?: string;
}

export interface SelfReviewArea {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly steps: readonly SelfReviewStep[];
}

/**
 * Repository-owned dogfood component identity for ForgeGate's own shell.
 * The matching manifest lives at
 * `.forgegate/components/forgegate.desktop.shell.yaml`, so self-review
 * evidence can now attach to a real shell record rather than borrowing a
 * target repository component's identity.
 */
export const FORGEGATE_SHELL_COMPONENT_ID = 'forgegate.desktop.shell';
export const FORGEGATE_SHELL_PROCEDURE_ID =
  'forgegate-shell-accessibility-review';
export const FORGEGATE_SHELL_PROCEDURE_VERSION = '1.0.0';

export const SELF_REVIEW_AREAS: readonly SelfReviewArea[] = [
  {
    id: 'shell',
    title: 'Shell & navigation',
    summary: 'The persistent nav and the workspace context bar.',
    steps: [
      {
        action:
          'Tab from the very start of the page through the primary navigation and the workspace context bar.',
        expected:
          'Every nav link and the "Open workspace…" button receives a clear, visible focus indicator in a logical order — nothing is skipped, and nothing is unreachable by keyboard alone.',
      },
      {
        action:
          'Listen to how the screen reader announces each navigation link, including the "Coming soon" items.',
        expected:
          'Each link announces a distinct, meaningful name — not a generic "link" — and the "Coming soon" badge is announced as part of the link, not left silent.',
      },
      {
        action:
          'Navigate from one primary route to another using only the keyboard (e.g. Workspace to Components).',
        expected:
          'Focus visibly and audibly moves to the main content landmark after the route changes, and the screen reader announces the destination page.',
      },
    ],
  },
  {
    id: 'workspace',
    title: 'Workspace command center',
    summary:
      'The system map, evidence timeline, and other panels on the Workspace page.',
    steps: [
      {
        action:
          'Open a real workspace, then tab through the system map, evidence timeline, adapter constellation, and change-impact table on the Workspace page.',
        expected:
          'Every real interactive element (links, buttons, disclosures) is reachable by keyboard, announces its role and label, and nothing traps focus.',
      },
      {
        action:
          'On the evidence timeline, activate "Show changed files" for a stale entry.',
        expected:
          'Keyboard focus moves into the revealed region, and the screen reader announces its content — the files list, or the explicit "no differences"/error message.',
      },
      {
        action:
          "Locate the system map's semantic table alternative instead of relying on the diagram.",
        expected:
          'The same component/adapter relationships shown in the diagram are available as real accessible table text.',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Component inventory',
    summary: 'The readiness distribution and component table/cards.',
    steps: [
      {
        action:
          'Tab through the readiness-distribution lifecycle bars and the component table/cards on the Components page.',
        expected:
          'Each lifecycle bar announces as a toggle button with its pressed state, and pressing Space or Enter filters the inventory below it.',
      },
      {
        action:
          "Use your screen reader's table-navigation shortcut (e.g. NVDA's Ctrl+Alt+Arrow keys) to move through the inventory table.",
        expected:
          'Each cell is announced together with its column header, not as anonymous text.',
      },
    ],
  },
  {
    id: 'studio',
    title: 'Blueprint Studio',
    summary: 'The blueprint catalog and the component proposal form.',
    steps: [
      {
        action:
          'Tab through the blueprint catalog on the Studio page, then select a blueprint using only the keyboard.',
        expected:
          'Each catalog entry announces its name and purpose, its pressed state, and selecting one moves focus sensibly into the proposal form that appears.',
      },
      {
        action:
          'Fill out the proposal form — component name, package path, adapter, purpose, and the native-semantic-confirmation checkbox — using only the keyboard and screen reader.',
        expected:
          "Every field announces its label and required state, and the checkbox announces the blueprint's preferred native element it refers to.",
      },
      {
        action:
          'Add a contract member, toggle a required state, add a custom state, set a variant selection, add an anatomy part, and map a token slot — all without a mouse.',
        expected:
          'Every add/remove button and input in each of these sections is reachable, announces a clear purpose, and no focus is lost or trapped when a row is added or removed.',
      },
      {
        action:
          'Create a proposal, review the staged diff, then Approve it using only the keyboard and screen reader.',
        expected:
          'The staged diff region is announced when it appears, and the Approve/Discard buttons announce their purpose and any resulting error or success message.',
      },
    ],
  },
];

/**
 * Every step across every area, in fixed order, each prefixed with its
 * area's title so the resulting flat `ManualReview.stepResults` stays
 * self-describing even when read outside the app (plain JSON has no
 * separate "area" field, so the grouping lives in the action text itself).
 * Generic over the step type so extra fields (e.g. a component-record
 * step's `componentId`) survive the flatten rather than being dropped.
 */
export function flattenSelfReviewSteps<T extends SelfReviewStep>(
  areas: readonly (Omit<SelfReviewArea, 'steps'> & { steps: readonly T[] })[],
): readonly T[] {
  return areas.flatMap((area) =>
    area.steps.map((step) => ({
      ...step,
      action: `[${area.title}] ${step.action}`,
    })),
  );
}

export const COMPONENT_RECORD_AREA_ID = 'component-record';
export const COMPONENT_RECORD_AREA_TITLE = 'Component assurance records';
export const COMPONENT_RECORD_AREA_SUMMARY =
  'Every real component this workspace discovered — not one example standing in for the rest.';

export interface ComponentRecordCheckTemplate {
  /** Contains the literal placeholder `{component}`, substituted with each real component's own display name. */
  readonly action: string;
  readonly expected: string;
}

export const COMPONENT_RECORD_CHECK_TEMPLATES: readonly ComponentRecordCheckTemplate[] =
  [
    {
      action:
        "Open {component}'s assurance record and tab through its readiness rail, states, anatomy, and contract sections.",
      expected:
        'Every section and disclosure control announces its expanded/collapsed state, and all real content is reachable without a mouse.',
    },
    {
      action:
        "Tab into and then back out of the embedded Storybook preview on {component}'s record.",
      expected:
        'Focus does not get trapped inside the preview; there is a clear, discoverable way to tab past it.',
    },
    {
      action:
        'Fill out and save a manual review for {component} using only the keyboard and screen reader.',
      expected:
        'Every field announces its label, required state is clear, and the Save/Approve buttons announce whether they are enabled or disabled.',
    },
  ];

export interface DiscoveredComponentRef {
  readonly id: string;
  readonly name: string;
}

export interface ComponentRecordStep extends SelfReviewStep {
  readonly componentId: string;
  readonly componentName: string;
}

/**
 * Generates real, repo-specific review steps: `COMPONENT_RECORD_CHECK_TEMPLATES`
 * repeated once per real discovered component, each with `{component}`
 * substituted for that component's own name. Order is component-major
 * (every check for component 1, then every check for component 2, ...),
 * which `AccessibilityReviewPage` relies on to group the rendered list and
 * compute per-component review coverage.
 */
export function buildComponentRecordSteps(
  components: readonly DiscoveredComponentRef[],
): readonly ComponentRecordStep[] {
  return components.flatMap((component) =>
    COMPONENT_RECORD_CHECK_TEMPLATES.map((template) => ({
      componentId: component.id,
      componentName: component.name,
      action: template.action.replace('{component}', component.name),
      expected: template.expected,
    })),
  );
}
