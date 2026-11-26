import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GitHubRepo, Zap, ZapRun } from '../models/zap.model';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ZapService {
  private http = inject(HttpClient);

  listZaps(): Observable<Zap[]> {
    return this.http.get<Zap[]>(`${API}/api/zaps`, { withCredentials: true });
  }

  getZap(id: string): Observable<Zap> {
    return this.http.get<Zap>(`${API}/api/zaps/${id}`, { withCredentials: true });
  }

  createZap(zap: Partial<Zap>): Observable<Zap> {
    return this.http.post<Zap>(`${API}/api/zaps`, zap, { withCredentials: true });
  }

  updateZap(id: string, zap: Partial<Zap>): Observable<Zap> {
    return this.http.put<Zap>(`${API}/api/zaps/${id}`, zap, { withCredentials: true });
  }

  toggleZap(id: string, enabled?: boolean): Observable<Zap> {
    return this.http.patch<Zap>(`${API}/api/zaps/${id}/toggle`, { enabled }, { withCredentials: true });
  }

  deleteZap(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${API}/api/zaps/${id}`, { withCredentials: true });
  }

  listGitHubRepos(): Observable<GitHubRepo[]> {
    return this.http.get<GitHubRepo[]>(`${API}/api/github/repos`, { withCredentials: true });
  }

  listZapRuns(zapId: string): Observable<ZapRun[]> {
    return this.http.get<ZapRun[]>(`${API}/api/zaps/${zapId}/runs`, { withCredentials: true });
  }

  getZapRun(zapId: string, runId: string): Observable<ZapRun> {
    return this.http.get<ZapRun>(`${API}/api/zaps/${zapId}/runs/${runId}`, { withCredentials: true });
  }
}
