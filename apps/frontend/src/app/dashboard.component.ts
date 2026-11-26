import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from './auth.service';
import { ZapService } from './services/zap.service';
import {
  Zap,
  getActionEventById,
  getAppById,
  getTriggerEventById,
  getZapActions,
} from './models/zap.model';
import { AvatarMenuComponent } from './components/avatar-menu.component';
import { ToggleSwitchComponent } from './components/toggle-switch.component';
import { AppIconComponent } from './components/app-icon.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AvatarMenuComponent, ToggleSwitchComponent, AppIconComponent],
  template: `
    <div class="min-h-screen w-full bg-[#fafaf9] text-gray-900">
      <app-avatar-menu [user]="user()" />

      <div class="mx-auto max-w-4xl px-6 pt-8 pb-16">
        <!-- Minimal Top Brand -->
        <div class="mb-10 flex items-center gap-2.5">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-gray-900 text-sm font-black text-white">Z</div>
          <span class="text-base font-bold tracking-tight text-gray-900">Zap</span>
        </div>

        <!-- Header Row -->
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="text-xl font-bold tracking-tight text-gray-900">Zaps</h1>
            <p class="mt-0.5 text-xs text-gray-500">Automate workflows between your connected apps.</p>
          </div>

          <button
            type="button"
            (click)="onCreateZap()"
            class="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all duration-150 hover:bg-gray-800 active:bg-gray-700 cursor-pointer"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Zap
          </button>
        </div>

        <!-- Error Banner -->
        @if (error()) {
          <div class="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <span>{{ error() }}</span>
            <button type="button" (click)="loadZaps()" class="font-semibold underline cursor-pointer">Retry</button>
          </div>
        }

        <!-- Loading State -->
        @if (loading()) {
          <div class="space-y-3">
            @for (i of [1, 2, 3]; track i) {
              <div class="h-20 animate-pulse rounded-2xl border border-gray-200 bg-white p-5"></div>
            }
          </div>
        } @else if (zaps().length === 0) {
          <!-- Empty State -->
          <div class="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <div class="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h2 class="text-sm font-semibold text-gray-900">No Zaps yet</h2>
            <p class="mx-auto mt-1 max-w-xs text-xs text-gray-500">
              Create your first workflow to automatically comment on GitHub pull requests when they are opened.
            </p>
            <button
              type="button"
              (click)="onCreateZap()"
              class="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all duration-150 hover:bg-gray-800 cursor-pointer"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create your first Zap
            </button>
          </div>
        } @else {
          <!-- Zaps List -->
          <div class="space-y-2.5">
            @for (zap of zaps(); track zap._id) {
              <div
                (click)="onOpenZap(zap)"
                class="group flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-2xs transition-all duration-150 hover:border-gray-300 hover:shadow-sm cursor-pointer"
              >
                <div class="flex min-w-0 flex-1 items-center gap-4">
                  <!-- App Icons Pair -->
                  <div class="flex shrink-0 items-center">
                    <div class="grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-gray-800">
                      <app-icon [appId]="zap.trigger.app || 'default'" iconClass="h-4 w-4" />
                    </div>
                    <div class="-ml-2 grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-white text-gray-800 shadow-2xs">
                      <app-icon [appId]="getFirstActionApp(zap)" iconClass="h-4 w-4" />
                    </div>
                    @if (getActionCount(zap) > 1) {
                      <span class="ml-1.5 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                        +{{ getActionCount(zap) - 1 }}
                      </span>
                    }
                  </div>

                  <!-- Name & Flow Summary -->
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2.5">
                      <h3 class="truncate text-sm font-semibold text-gray-900 group-hover:text-black">
                        {{ zap.name }}
                      </h3>
                      <span
                        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border"
                        [class.bg-emerald-50]="zap.enabled"
                        [class.text-emerald-700]="zap.enabled"
                        [class.border-emerald-200]="zap.enabled"
                        [class.bg-gray-50]="!zap.enabled"
                        [class.text-gray-500]="!zap.enabled"
                        [class.border-gray-200]="!zap.enabled"
                      >
                        <span
                          class="h-1.5 w-1.5 rounded-full"
                          [class.bg-emerald-500]="zap.enabled"
                          [class.bg-gray-400]="!zap.enabled"
                        ></span>
                        {{ zap.enabled ? 'On' : 'Off' }}
                      </span>
                    </div>

                    <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                      <span class="truncate">{{ formatTriggerSummary(zap) }}</span>
                      <span class="text-gray-300">→</span>
                      <span class="truncate">{{ formatActionSummary(zap) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Right Controls -->
                <div class="flex shrink-0 items-center gap-3">
                  @if (zap.trigger.repository) {
                    <span class="hidden sm:inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                      {{ zap.trigger.repository }}
                    </span>
                  }

                  <app-toggle-switch
                    [checked]="zap.enabled"
                    [stopPropagation]="true"
                    [label]="'Toggle ' + zap.name"
                    (checkedChange)="onToggleZap(zap, $event)"
                  />

                  @if (confirmDeleteId() === zap._id) {
                    <div class="flex items-center gap-1" (click)="$event.stopPropagation()">
                      <button
                        type="button"
                        (click)="onDeleteZap(zap)"
                        class="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700 cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        (click)="confirmDeleteId.set(null)"
                        class="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  } @else {
                    <button
                      type="button"
                      (click)="onAskDelete($event, zap)"
                      title="Delete Zap"
                      class="rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-red-600 group-hover:opacity-100 cursor-pointer"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private zapService = inject(ZapService);
  private router = inject(Router);

  user = signal<User | null>(null);
  zaps = signal<Zap[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');
  confirmDeleteId = signal<string | null>(null);

  ngOnInit(): void {
    this.auth.user$.subscribe((u) => {
      this.user.set(u);
    });
    this.loadZaps();
  }

  loadZaps(): void {
    this.loading.set(true);
    this.error.set('');
    this.zapService.listZaps().subscribe({
      next: (list) => {
        this.zaps.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your Zaps.');
        this.loading.set(false);
      },
    });
  }

  onCreateZap(): void {
    this.router.navigate(['/zaps/new']);
  }

  onOpenZap(zap: Zap): void {
    if (zap._id) {
      this.router.navigate(['/zaps', zap._id]);
    }
  }

  onToggleZap(zap: Zap, enabled: boolean): void {
    if (!zap._id) return;
    const prev = zap.enabled;
    zap.enabled = enabled;
    this.zapService.toggleZap(zap._id, enabled).subscribe({
      next: (updated) => {
        this.zaps.update((items) => items.map((item) => (item._id === updated._id ? updated : item)));
      },
      error: () => {
        zap.enabled = prev;
        this.error.set('Failed to update Zap status.');
      },
    });
  }

  onAskDelete(event: MouseEvent, zap: Zap): void {
    event.stopPropagation();
    this.confirmDeleteId.set(zap._id || null);
  }

  onDeleteZap(zap: Zap): void {
    if (!zap._id) return;
    this.zapService.deleteZap(zap._id).subscribe({
      next: () => {
        this.zaps.update((items) => items.filter((item) => item._id !== zap._id));
        this.confirmDeleteId.set(null);
      },
      error: () => {
        this.error.set('Failed to delete Zap.');
        this.confirmDeleteId.set(null);
      },
    });
  }

  formatTriggerSummary(zap: Zap): string {
    const app = getAppById(zap.trigger.app)?.name || 'Select trigger';
    const event = getTriggerEventById(zap.trigger.event)?.name;
    return event ? `${app}: ${event}` : app;
  }

  formatActionSummary(zap: Zap): string {
    const actions = getZapActions(zap);
    const first = actions[0];
    const app = getAppById(first?.app || '')?.name || 'Select action';
    const event = getActionEventById(first?.event || '')?.name;
    const base = event ? `${app}: ${event}` : app;
    return actions.length > 1 ? `${base} (+${actions.length - 1} more)` : base;
  }

  getFirstActionApp(zap: Zap): string {
    return getZapActions(zap)[0]?.app || 'default';
  }

  getActionCount(zap: Zap): number {
    return getZapActions(zap).length;
  }
}
