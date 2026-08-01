/**
 * Fixed, hand-authored content for a guided self-review of ForgeGate's own
 * shell — the one manual accessibility gate (TODO.md P0.7) that genuinely
 * cannot be completed by an agent. This is not discovered or scanned data;
 * it names ForgeGate's own real, shipped surfaces and the concrete keyboard
 * and screen-reader checks each one needs, so a reviewer (designer or
 * accessibility specialist) can walk through them with NVDA/JAWS/VoiceOver
 * running rather than inventing a checklist from scratch.
 */

export interface SelfReviewStep {
  readonly action: string;
  readonly expected: string;
}

export interface SelfReviewArea {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly steps: readonly SelfReviewStep[];
}

/**
 * A synthetic, disclosed identifier — this reviews ForgeGate's own shell,
 * not a component discovered in any workspace's inventory. Recorded as the
 * `ManualReview.componentVersionId` so the record is honest about what it
 * actually covers rather than borrowing a real component's identity.
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
    id: 'component-record',
    title: 'A component assurance record',
    summary: "One real component's full record — for example, the Button.",
    steps: [
      {
        action:
          "Open a real component's assurance record (for example, the Button) and tab through its readiness rail, states, anatomy, and contract sections.",
        expected:
          'Every section and disclosure control announces its expanded/collapsed state, and all real content is reachable without a mouse.',
      },
      {
        action: 'Tab into and then back out of the embedded Storybook preview.',
        expected:
          'Focus does not get trapped inside the preview; there is a clear, discoverable way to tab past it.',
      },
      {
        action:
          'Fill out and save a manual review using only the keyboard and screen reader.',
        expected:
          'Every field announces its label, required state is clear, and the Save/Approve buttons announce whether they are enabled or disabled.',
      },
    ],
  },
];

/**
 * Every step across every area, in fixed order, each prefixed with its
 * area's title so the resulting flat `ManualReview.stepResults` stays
 * self-describing even when read outside the app (plain JSON has no
 * separate "area" field, so the grouping lives in the action text itself).
 */
export function flattenSelfReviewSteps(
  areas: readonly SelfReviewArea[],
): readonly SelfReviewStep[] {
  return areas.flatMap((area) =>
    area.steps.map((step) => ({
      action: `[${area.title}] ${step.action}`,
      expected: step.expected,
    })),
  );
}
