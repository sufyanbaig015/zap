export interface ZapTrigger {
  app: string;
  event: string;
  repository: string;
}

export interface ZapActionConfig {
  commentBody?: string;
  label?: string;
  issueTitle?: string;
  issueBody?: string;
}

export interface ZapAction {
  app: string;
  event: string;
  repository: string;
  config: ZapActionConfig;
}

export interface Zap {
  _id?: string;
  userId?: string;
  name: string;
  enabled: boolean;
  trigger: ZapTrigger;
  actions: ZapAction[];
  action?: ZapAction;
  runCount?: number;
  lastRunAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function createEmptyAction(): ZapAction {
  return {
    app: '',
    event: '',
    repository: '',
    config: { commentBody: '' },
  };
}

export function getZapActions(zap: Pick<Zap, 'actions' | 'action'>): ZapAction[] {
  if (Array.isArray(zap.actions) && zap.actions.length > 0) {
    return zap.actions;
  }
  if (zap.action) {
    return [zap.action];
  }
  return [createEmptyAction()];
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  url: string;
  defaultBranch: string;
}

export interface ZapRunStep {
  stepIndex: number;
  type: 'trigger' | 'action';
  app: string;
  event: string;
  status: 'success' | 'failed' | 'skipped';
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface ZapRun {
  _id: string;
  zapId: string;
  userId: string;
  status: 'success' | 'failed' | 'running';
  triggerSummary: {
    event: string;
    repository: string;
  };
  steps: ZapRunStep[];
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface EventDefinition {
  id: string;
  name: string;
  description: string;
  supported: boolean;
}

export const AVAILABLE_APPS: AppDefinition[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repositories, pull requests, issues, and comments',
    enabled: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send channel messages and notifications',
    enabled: false,
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Create and update engineering issues',
    enabled: false,
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Sync tickets and sprint updates',
    enabled: false,
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Post webhook updates to server channels',
    enabled: false,
  },
];

export const GITHUB_TRIGGER_EVENTS: EventDefinition[] = [
  {
    id: 'pull_request.opened',
    name: 'Pull Request Opened',
    description: 'Triggers when a new pull request is opened in a repository',
    supported: true,
  },
  {
    id: 'pull_request.merged',
    name: 'Pull Request Merged',
    description: 'Triggers when a pull request is merged into the base branch',
    supported: true,
  },
  {
    id: 'issues.opened',
    name: 'Issue Opened',
    description: 'Triggers when a new issue is created in a repository',
    supported: true,
  },
  {
    id: 'push',
    name: 'Push to Branch',
    description: 'Triggers when commits are pushed to a branch',
    supported: true,
  },
];

export const GITHUB_ACTION_EVENTS: EventDefinition[] = [
  {
    id: 'pull_request.comment',
    name: 'Create Pull Request Comment',
    description: 'Posts a comment on the pull request that triggered this Zap',
    supported: true,
  },
  {
    id: 'pull_request.label',
    name: 'Add Label to Pull Request',
    description: 'Applies a label to the pull request',
    supported: true,
  },
  {
    id: 'issues.create',
    name: 'Create Issue',
    description: 'Opens a new issue in the selected repository',
    supported: true,
  },
];

export function getAppById(id: string): AppDefinition | undefined {
  return AVAILABLE_APPS.find((a) => a.id === id);
}

export function getTriggerEventById(id: string): EventDefinition | undefined {
  return GITHUB_TRIGGER_EVENTS.find((e) => e.id === id);
}

export function getActionEventById(id: string): EventDefinition | undefined {
  return GITHUB_ACTION_EVENTS.find((e) => e.id === id);
}
