import { LifecycleStatus, ReadinessFlag } from './lifecycle';

/**
 * One opened repository or monorepo context, per
 * documentation/16-data-and-schema-model.md ("Workspace").
 */
export interface Workspace {
  readonly id: string;
  readonly path: string;
  readonly repositoryId: string;
  readonly branch: string;
  readonly commit: string;
  readonly dirty: boolean;
  readonly packageManager: string;
  readonly workspaceManager?: string;
  readonly configurationVersion: string;
}

export function createWorkspace(input: {
  id: string;
  path: string;
  repositoryId: string;
  branch: string;
  commit: string;
  dirty: boolean;
  packageManager: string;
  workspaceManager?: string;
  configurationVersion: string;
}): Workspace {
  if (!input.path.trim()) {
    throw new Error('Workspace path must not be empty');
  }
  return { ...input };
}

/** Durable Git repository identity behind a workspace. */
export interface Repository {
  readonly id: string;
  readonly defaultBranch: string;
  readonly remoteUrl?: string;
}

export type ProjectKind =
  | 'application'
  | 'library'
  | 'documentation-site'
  | 'storybook'
  | 'test-project'
  | 'infrastructure';

/** An application, library, documentation site, Storybook, test project, or infra project within a workspace. */
export interface Project {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly kind: ProjectKind;
  readonly path: string;
}

/** A distributable or internal package with name, version, exports, and component membership. */
export interface Package {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly version: string;
  readonly publicExports: readonly string[];
  readonly componentIds: readonly string[];
}

/** Groups components under one organization and design system. */
export interface ComponentLibrary {
  readonly id: string;
  readonly organization: string;
  readonly name: string;
  readonly packageIds: readonly string[];
}

/** Stable component identity, independent of any one test run or release. */
export interface Component {
  readonly id: string;
  readonly organization: string;
  readonly library: string;
  readonly name: string;
  readonly packageId: string;
  readonly owner?: string;
  readonly lifecycle: LifecycleStatus;
  readonly readiness: ReadinessFlag;
}

export function createComponent(input: {
  id: string;
  organization: string;
  library: string;
  name: string;
  packageId: string;
  owner?: string;
}): Component {
  return {
    ...input,
    lifecycle: 'proposal',
    readiness: 'clear',
  };
}

/** A versioned implementation and contract of a component at a commit or package version. */
export interface ComponentVersion {
  readonly id: string;
  readonly componentId: string;
  readonly version: string;
  readonly commitSha: string;
  readonly contractId: string;
  readonly lifecycle: LifecycleStatus;
}

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

export function createComponentVersion(input: {
  id: string;
  componentId: string;
  version: string;
  commitSha: string;
  contractId: string;
  lifecycle?: LifecycleStatus;
}): ComponentVersion {
  if (!SEMVER_PATTERN.test(input.version)) {
    throw new Error(`Component version "${input.version}" is not valid semver`);
  }
  if (!/^[0-9a-f]{40}$/i.test(input.commitSha)) {
    throw new Error(`Commit SHA "${input.commitSha}" is not a full 40-character SHA`);
  }
  return { ...input, lifecycle: input.lifecycle ?? 'proposal' };
}

export type DocumentationAdapter = 'starlight' | 'storybook' | 'zeroheight';

/** Where a component's documentation is published, and its current status there. */
export interface DocumentationTarget {
  readonly id: string;
  readonly componentId: string;
  readonly adapter: DocumentationAdapter;
  readonly pathOrPageId: string;
  readonly publishedVersion?: string;
  readonly publishedAt?: string;
}

/** An application that consumes a component, used for application-context validation. */
export interface ConsumerApplication {
  readonly id: string;
  readonly name: string;
  readonly repositoryId?: string;
  readonly componentIds: readonly string[];
}
