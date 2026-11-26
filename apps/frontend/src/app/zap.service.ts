import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = 'http://localhost:4000';

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}

export interface Zap {
  _id: string;
  name: string;
  enabled: boolean;
  repoFullName: string;
  repoId: number;
  event: string;
  action: string;
  actionConfig: {
    commentBody?: string;
  };
  webhookId?: number;
  webhookStatus?: 'active' | 'local_only' | 'error';
  webhookError?: string;
  lastTriggeredAt?: string;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateZapPayload {
  name: string;
  repoFullName: string;
  repoId: number;
  event: string;
  action: string;
  actionConfig: {
    commentBody?: string;
  };
  enabled: boolean;
}

export const ZAP_EVENTS = [
  { value: 'pull_request.opened', label: 'Pull Request Opened', description: 'Triggers when a new PR is opened' },
  { value: 'pull_request.synchronize', label: 'Pull Request Updated', description: 'Triggers when new commits are pushed to a PR' },
  { value: 'issues.opened', label: 'Issue Opened', description: 'Triggers when a new issue is created' },
];

export const ZAP_ACTIONS: Record<string, Array<{ value: string; label: string; description: string }>> = {
  'pull_request.opened': [
    { value: 'comment_on_pr', label: 'Place a comment', description: 'Post a comment on the pull request' },
  ],
  'pull_request.synchronize': [
    { value: 'comment_on_pr', label: 'Place a comment', description: 'Post a comment on the pull request' },
  ],
  'issues.opened': [
    { value: 'comment_on_pr', label: 'Place a comment', description: 'Post a comment on the issue' },
  ],
};

@Injectable({ providedIn: 'root' })
export class ZapService {
  constructor(private http: HttpClient) {}

  getZaps(): Observable<Zap[]> {
    return this.http.get<Zap[]>(`${API}/api/zaps`, { withCredentials: true });
  }

  getRepos(): Observable<GitHubRepo[]> {
    return this.http.get<GitHubRepo[]>(`${API}/api/zaps/repos`, { withCredentials: true });
  }

  createZap(payload: CreateZapPayload): Observable<Zap> {
    return this.http.post<Zap>(`${API}/api/zaps`, payload, { withCredentials: true });
  }

  updateZap(id: string, patch: Partial<Zap>): Observable<Zap> {
    return this.http.patch<Zap>(`${API}/api/zaps/${id}`, patch, { withCredentials: true });
  }

  deleteZap(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API}/api/zaps/${id}`, { withCredentials: true });
  }
}
