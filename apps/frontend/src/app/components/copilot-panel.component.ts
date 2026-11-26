import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CopilotMessage, CopilotService, CopilotThreadSummary } from '../services/copilot.service';

const ACTIVE_THREAD_KEY = 'zap_copilot_active_thread';

@Component({
  selector: 'app-copilot-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <aside class="z-30 flex h-full w-[360px] sm:w-[400px] shrink-0 flex-col border-r border-gray-200 bg-white shadow-lg">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
            </svg>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-gray-900">Zap Copilot</h2>
            <p class="text-[11px] text-gray-500">Agentic AI powered by Gemini</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            (click)="startNewThread()"
            title="New chat"
            class="rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
          >
            + New
          </button>
          <button
            type="button"
            (click)="toggleHistory()"
            title="Chat history"
            class="rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            [class.bg-gray-100]="historyOpen()"
            [class.text-gray-900]="historyOpen()"
          >
            History
          </button>
          <button
            type="button"
            (click)="close.emit()"
            aria-label="Close Copilot"
            class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- History Drawer -->
      @if (historyOpen()) {
        <div class="max-h-60 overflow-y-auto border-b border-gray-200 bg-gray-50 p-2 space-y-1">
          @if (threads().length === 0) {
            <p class="px-2 py-3 text-center text-xs text-gray-400">No saved chat threads yet.</p>
          }
          @for (t of threads(); track t._id) {
            <div
              class="group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer"
              [class.bg-indigo-50]="t._id === activeThreadId()"
              [class.text-indigo-900]="t._id === activeThreadId()"
              [class.hover:bg-gray-100]="t._id !== activeThreadId()"
              (click)="selectThread(t._id)"
            >
              <span class="truncate font-medium">{{ t.title }}</span>
              <button
                type="button"
                (click)="deleteThread(t._id, $event)"
                class="opacity-0 group-hover:opacity-100 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                title="Delete thread"
              >
                ✕
              </button>
            </div>
          }
        </div>
      }

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        @if (messages().length === 0) {
          <div class="rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-xs text-gray-600 space-y-3">
            <p class="font-medium text-gray-900">What can I help you build or manage?</p>
            <div class="space-y-1.5">
              @for (prompt of quickPrompts; track prompt) {
                <button
                  type="button"
                  (click)="sendQuickPrompt(prompt)"
                  class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer"
                >
                  {{ prompt }}
                </button>
              }
            </div>
          </div>
        }

        @for (msg of messages(); track $index) {
          <div class="flex flex-col" [class.items-end]="msg.role === 'user'" [class.items-start]="msg.role === 'model'">
            <div
              class="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap"
              [class.bg-gray-900]="msg.role === 'user'"
              [class.text-white]="msg.role === 'user'"
              [class.bg-gray-100]="msg.role === 'model'"
              [class.text-gray-800]="msg.role === 'model'"
            >
              {{ msg.text }}
            </div>
            @if (msg.toolCalls && msg.toolCalls.length > 0) {
              <div class="mt-1.5 flex flex-wrap gap-1">
                @for (tc of msg.toolCalls; track $index) {
                  <span class="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-100">
                    ⚡ {{ tc.name }}
                  </span>
                }
              </div>
            }
          </div>
        }

        @if (loading()) {
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></span>
            <span>Copilot is thinking &amp; executing...</span>
          </div>
        }

        @if (error()) {
          <div class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {{ error() }}
          </div>
        }
      </div>

      <!-- Input -->
      <form (submit)="onSubmit($event)" class="border-t border-gray-200 p-3">
        <div class="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 focus-within:border-indigo-400 focus-within:bg-white">
          <textarea
            [(ngModel)]="inputText"
            name="copilotInput"
            rows="2"
            (keydown.enter)="onEnter($event)"
            placeholder="Ask Copilot to create, edit, or inspect Zaps & runs..."
            class="flex-1 resize-none bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none"
          ></textarea>
          <button
            type="submit"
            [disabled]="loading() || !inputText.trim()"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white transition-colors hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
            aria-label="Send message"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </form>
    </aside>
  `,
})
export class CopilotPanelComponent implements OnInit {
  private copilotService = inject(CopilotService);

  @Input() currentZapId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() zapMutated = new EventEmitter<{ mutatedZapIds: string[]; createdZapId?: string }>();

  messages = signal<CopilotMessage[]>([]);
  threads = signal<CopilotThreadSummary[]>([]);
  activeThreadId = signal<string | undefined>(undefined);
  historyOpen = signal(false);
  loading = signal(false);
  error = signal('');
  inputText = '';

  quickPrompts = [
    'Create a Zap that comments "Thanks!" when a GitHub issue is opened',
    'Show me my recent Zap runs and any failures',
    'Enable this Zap and rename it',
  ];

  ngOnInit(): void {
    const savedId = localStorage.getItem(ACTIVE_THREAD_KEY);
    if (savedId) {
      this.selectThread(savedId);
    }
    this.refreshThreads();
  }

  refreshThreads(): void {
    this.copilotService.listThreads().subscribe({
      next: (res) => this.threads.set(res.threads || []),
      error: () => {},
    });
  }

  toggleHistory(): void {
    const next = !this.historyOpen();
    this.historyOpen.set(next);
    if (next) this.refreshThreads();
  }

  startNewThread(): void {
    this.activeThreadId.set(undefined);
    this.messages.set([]);
    this.error.set('');
    this.historyOpen.set(false);
    localStorage.removeItem(ACTIVE_THREAD_KEY);
  }

  selectThread(threadId: string): void {
    this.copilotService.getThread(threadId).subscribe({
      next: (res) => {
        this.activeThreadId.set(res.thread._id);
        this.messages.set(res.thread.messages || []);
        this.historyOpen.set(false);
        this.error.set('');
        localStorage.setItem(ACTIVE_THREAD_KEY, res.thread._id);
      },
      error: () => {
        localStorage.removeItem(ACTIVE_THREAD_KEY);
      },
    });
  }

  deleteThread(threadId: string, event: Event): void {
    event.stopPropagation();
    this.copilotService.deleteThread(threadId).subscribe({
      next: () => {
        this.threads.update((list) => list.filter((t) => t._id !== threadId));
        if (this.activeThreadId() === threadId) {
          this.startNewThread();
        }
      },
    });
  }

  sendQuickPrompt(prompt: string): void {
    this.inputText = prompt;
    this.send();
  }

  onEnter(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    if (!kbEvent.shiftKey) {
      kbEvent.preventDefault();
      this.send();
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.send();
  }

  send(): void {
    const text = this.inputText.trim();
    if (!text || this.loading()) return;

    this.inputText = '';
    this.error.set('');
    const updated: CopilotMessage[] = [...this.messages(), { role: 'user', text }];
    this.messages.set(updated);
    this.loading.set(true);

    const payload = updated.map((m) => ({ role: m.role, text: m.text }));
    this.messages.update((msgs) => [...msgs, { role: 'model', text: '', toolCalls: [] }]);

    this.copilotService.chatStream(payload, this.currentZapId, this.activeThreadId(), {
      onChunk: (chunkText) => {
        this.messages.update((msgs) => {
          const next = [...msgs];
          const last = next[next.length - 1];
          if (last && last.role === 'model') {
            next[next.length - 1] = { ...last, text: last.text + chunkText };
          }
          return next;
        });
      },
      onToolCall: (tc) => {
        this.messages.update((msgs) => {
          const next = [...msgs];
          const last = next[next.length - 1];
          if (last && last.role === 'model') {
            next[next.length - 1] = {
              ...last,
              toolCalls: [...(last.toolCalls || []), tc],
            };
          }
          return next;
        });
        if (['create_zap', 'update_zap', 'toggle_zap'].includes(tc.name) && this.currentZapId) {
          setTimeout(() => {
            this.zapMutated.emit({ mutatedZapIds: [this.currentZapId!] });
          }, 300);
        }
      },
      onDone: (res) => {
        this.loading.set(false);
        if (res.threadId) {
          this.activeThreadId.set(res.threadId);
          localStorage.setItem(ACTIVE_THREAD_KEY, res.threadId);
          this.refreshThreads();
        }
        if (res.mutatedZapIds?.length || res.createdZapId) {
          this.zapMutated.emit({
            mutatedZapIds: res.mutatedZapIds || [],
            createdZapId: res.createdZapId,
          });
        }
      },
      onError: (errMsg) => {
        this.loading.set(false);
        this.error.set(errMsg);
      },
    });
  }
}
