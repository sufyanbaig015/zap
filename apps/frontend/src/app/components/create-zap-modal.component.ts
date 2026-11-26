import { Component, EventEmitter, Input, OnInit, Output, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomSelectComponent, SelectOption } from './custom-select.component';
import { ToggleSwitchComponent } from './toggle-switch.component';
import { GitHubRepo, ZAP_ACTIONS, ZAP_EVENTS, Zap, ZapService } from '../zap.service';

@Component({
  selector: 'app-create-zap-modal',
  standalone: true,
  imports: [FormsModule, CustomSelectComponent, ToggleSwitchComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-[2px] p-4" (click)="close.emit()">
      <div
        class="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
        (click)="$event.stopPropagation()"
      >
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-gray-900">{{ zap ? 'Edit Zap' : 'Create a Zap' }}</h2>
            <p class="text-xs text-gray-500 mt-0.5">Automate actions when GitHub events happen</p>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 grid place-items-center transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form (ngSubmit)="onSubmit()" class="p-6 space-y-4">
          @if (error()) {
            <div class="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {{ error() }}
            </div>
          }

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">Zap Name</label>
            <input
              type="text"
              [(ngModel)]="name"
              name="name"
              placeholder="e.g. Welcome PR Comment"
              required
              class="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">GitHub Repository</label>
            <app-custom-select
              [options]="repoOptions()"
              [value]="selectedRepo()"
              (valueChange)="selectedRepo.set($event)"
              [searchable]="true"
              [disabled]="loadingRepos()"
              [placeholder]="loadingRepos() ? 'Loading repositories...' : 'Select a repository'"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">When this happens</label>
              <app-custom-select
                [options]="eventOptions"
                [value]="selectedEvent()"
                (valueChange)="onEventChange($event)"
                placeholder="Select event"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Do this</label>
              <app-custom-select
                [options]="actionOptions()"
                [value]="selectedAction()"
                (valueChange)="selectedAction.set($event)"
                placeholder="Select action"
              />
            </div>
          </div>

          @if (selectedAction() === 'comment_on_pr') {
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Comment Message</label>
              <textarea
                [(ngModel)]="commentBody"
                name="commentBody"
                rows="3"
                placeholder="Write the comment to post..."
                class="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors resize-none"
              ></textarea>
            </div>
          }

          <div class="flex items-center justify-between pt-1">
            <div>
              <div class="text-xs font-semibold text-gray-700">Enable Zap immediately</div>
              <div class="text-[11px] text-gray-400">Turn on to start listening for events</div>
            </div>
            <app-toggle-switch [checked]="enabled()" (checkedChange)="enabled.set($event)" />
          </div>

          <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              (click)="close.emit()"
              class="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="submitting() || !canSubmit()"
              class="px-4 py-2.5 bg-gray-900 border border-gray-900 rounded-xl text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {{ submitting() ? (zap ? 'Saving...' : 'Creating...') : (zap ? 'Save Changes' : 'Create Zap') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class CreateZapModalComponent implements OnInit {
  private zapService = inject(ZapService);

  @Input() zap: Zap | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<Zap>();
  @Output() updated = new EventEmitter<Zap>();

  name = '';
  commentBody = 'Thanks for opening this pull request! We will review it shortly.';

  repos = signal<GitHubRepo[]>([]);
  loadingRepos = signal(true);
  selectedRepo = signal('');
  selectedEvent = signal('pull_request.opened');
  selectedAction = signal('comment_on_pr');
  enabled = signal(true);
  submitting = signal(false);
  error = signal('');

  eventOptions: SelectOption[] = ZAP_EVENTS.map((e) => ({
    value: e.value,
    label: e.label,
    description: e.description,
  }));

  repoOptions = computed<SelectOption[]>(() =>
    this.repos().map((r) => ({
      value: r.fullName,
      label: r.fullName,
      badge: r.private ? 'Private' : 'Public',
    })),
  );

  actionOptions = computed<SelectOption[]>(() => {
    const actions = ZAP_ACTIONS[this.selectedEvent()] || [];
    return actions.map((a) => ({
      value: a.value,
      label: a.label,
      description: a.description,
    }));
  });

  ngOnInit(): void {
    if (this.zap) {
      this.name = this.zap.name;
      this.selectedRepo.set(this.zap.repoFullName);
      this.selectedEvent.set(this.zap.event);
      this.selectedAction.set(this.zap.action);
      this.commentBody = this.zap.actionConfig?.commentBody || '';
      this.enabled.set(this.zap.enabled);
    }

    this.zapService.getRepos().subscribe({
      next: (repos) => {
        this.repos.set(repos);
        this.loadingRepos.set(false);
      },
      error: (err) => {
        this.loadingRepos.set(false);
        this.error.set(err?.error?.error || 'Could not load GitHub repositories.');
      },
    });
  }

  onEventChange(eventValue: string): void {
    this.selectedEvent.set(eventValue);
    const actions = ZAP_ACTIONS[eventValue] || [];
    this.selectedAction.set(actions[0]?.value || '');
  }

  canSubmit(): boolean {
    return Boolean(this.name.trim() && this.selectedRepo() && this.selectedEvent() && this.selectedAction());
  }

  onSubmit(): void {
    if (!this.canSubmit() || this.submitting()) return;

    this.submitting.set(true);
    this.error.set('');

    if (this.zap) {
      this.zapService
        .updateZap(this.zap._id, {
          name: this.name.trim(),
          event: this.selectedEvent(),
          action: this.selectedAction(),
          actionConfig: {
            commentBody: this.commentBody.trim(),
          },
          enabled: this.enabled(),
        })
        .subscribe({
          next: (zap) => {
            this.submitting.set(false);
            this.updated.emit(zap);
          },
          error: (err) => {
            this.submitting.set(false);
            this.error.set(err?.error?.error || 'Failed to update Zap.');
          },
        });
      return;
    }

    const repo = this.repos().find((r) => r.fullName === this.selectedRepo());
    if (!repo) return;

    this.zapService
      .createZap({
        name: this.name.trim(),
        repoFullName: repo.fullName,
        repoId: repo.id,
        event: this.selectedEvent(),
        action: this.selectedAction(),
        actionConfig: {
          commentBody: this.commentBody.trim(),
        },
        enabled: this.enabled(),
      })
      .subscribe({
        next: (zap) => {
          this.submitting.set(false);
          this.created.emit(zap);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.error || 'Failed to create Zap.');
        },
      });
  }
}
