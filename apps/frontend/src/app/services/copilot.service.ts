import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

export interface CopilotMessage {
  role: 'user' | 'model';
  text: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
}

export interface CopilotThreadSummary {
  _id: string;
  title: string;
  zapId?: string;
  updatedAt: string;
}

export interface CopilotThread extends CopilotThreadSummary {
  messages: CopilotMessage[];
}

export interface CopilotStreamCallbacks {
  onChunk: (text: string) => void;
  onToolCall: (toolCall: { name: string; args: Record<string, unknown> }) => void;
  onDone: (result: { threadId?: string; mutatedZapIds: string[]; createdZapId?: string }) => void;
  onError: (error: string) => void;
}

@Injectable({ providedIn: 'root' })
export class CopilotService {
  private http = inject(HttpClient);

  listThreads(): Observable<{ threads: CopilotThreadSummary[] }> {
    return this.http.get<{ threads: CopilotThreadSummary[] }>(`${API}/api/copilot/threads`, {
      withCredentials: true,
    });
  }

  getThread(id: string): Observable<{ thread: CopilotThread }> {
    return this.http.get<{ thread: CopilotThread }>(`${API}/api/copilot/threads/${id}`, {
      withCredentials: true,
    });
  }

  deleteThread(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${API}/api/copilot/threads/${id}`, {
      withCredentials: true,
    });
  }

  async chatStream(
    messages: Array<{ role: 'user' | 'model'; text: string }>,
    currentZapId: string | undefined,
    threadId: string | undefined,
    callbacks: CopilotStreamCallbacks,
  ): Promise<void> {
    try {
      const resp = await fetch(`${API}/api/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages, currentZapId, threadId }),
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({}));
        callbacks.onError(errBody?.error || `Request failed (${resp.status})`);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const rawEvent of events) {
          const lines = rawEvent.split('\n');
          let eventName = 'message';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataStr += line.slice(6);
          }
          if (!dataStr) continue;

          const data = JSON.parse(dataStr);
          if (eventName === 'chunk' && data.text) {
            callbacks.onChunk(data.text);
          } else if (eventName === 'tool_call') {
            callbacks.onToolCall(data);
          } else if (eventName === 'done') {
            callbacks.onDone(data);
          } else if (eventName === 'error') {
            callbacks.onError(data.error || 'Copilot stream error');
          }
        }
      }
    } catch (err: any) {
      callbacks.onError(err?.message || 'Failed to reach Copilot');
    }
  }
}
