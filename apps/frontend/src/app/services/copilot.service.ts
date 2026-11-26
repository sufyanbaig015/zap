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

export interface CopilotChatResponse {
  reply: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
  mutatedZapIds: string[];
  createdZapId?: string;
}

@Injectable({ providedIn: 'root' })
export class CopilotService {
  private http = inject(HttpClient);

  chat(
    messages: Array<{ role: 'user' | 'model'; text: string }>,
    currentZapId?: string,
  ): Observable<CopilotChatResponse> {
    return this.http.post<CopilotChatResponse>(
      `${API}/api/copilot/chat`,
      { messages, currentZapId },
      { withCredentials: true },
    );
  }
}
