import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService, User } from './auth.service';
import { ZAP_EVENTS, Zap, ZapService } from './zap.service';
import { AvatarMenuComponent } from './components/avatar-menu.component';
import { ToggleSwitchComponent } from './components/toggle-switch.component';
import { CreateZapModalComponent } from './components/create-zap-modal.component';
import { ZapDetailModalComponent } from './components/zap-detail-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    AvatarMenuComponent,
    ToggleSwitchComponent,
    CreateZapModalComponent,
    ZapDetailModalComponent,
  ],
  template: `
    @if (user()) {
      <div class="min-h-screen bg-white text-gray-900 relative">
        <!-- Floating top-right avatar menu -->
        <div class="fixed top-5 right-6 z-40">
          <app-avatar-menu [user]="user()!" (signOut)="onLogout()" />
        </div>

        <!-- Main single-page container -->
        <main class="max-w-3xl mx-auto px-6 pt-16 pb-20">
          <!-- Header -->
          <div class="flex items-center justify-between gap-4 mb-8">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gray-900 grid place-items-center text-base font-black text-white">
                Z
              </div>
              <div>
                <h1 class="text-lg font-bold text-gray-900 tracking-tight leading-tight">Zaps</h1>
                <p class="text-xs text-gray-500">Automate your GitHub workflows</p>
              </div>
            </div>

            <button
              type="button"
              (click)="showCreateModal.set(true)"
              class="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 border border-gray-900 rounded-xl text-white text-xs font-semibold hover:bg-gray-800 active:bg-gray-700 transition-colors shadow-sm cursor-pointer"
            >
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Create a Zap
            </button>
          </div>

          <!-- Zaps List -->
          @if (loading()) {
            <div class="space-y-3">
              @for (i of [1, 2, 3]; track i) {
                <div class="h-20 bg-gray-50 border border-gray-200 rounded-2xl animate-pulse"></div>
              }
            </div>
          } @else if (zaps().length === 0) {
            <div class="border border-gray-200 rounded-2xl p-12 text-center bg-white shadow-sm">
              <div class="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 grid place-items-center mx-auto mb-4">
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 class="text-sm font-bold text-gray-900 mb-1">No Zaps yet</h2>
              <p class="text-xs text-gray-500 max-w-xs mx-auto mb-6">
                Create your first Zap to automatically react when events happen on your GitHub repositories.
              </p>
              <button
                type="button"
                (click)="showCreateModal.set(true)"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 rounded-xl text-white text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Create your first Zap
              </button>
            </div>
          } @else {
            <div class="space-y-2.5">
              @for (zap of zaps(); track zap._id) {
                <div
                  (click)="selectedZap.set(zap)"
                  class="group flex items-center justify-between gap-4 px-5 py-4 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-sm transition-all duration-150 cursor-pointer"
                >
                  <div class="flex items-center gap-3.5 min-w-0">
                    <span
                      class="w-2 h-2 rounded-full shrink-0 transition-colors"
                      [class.bg-green-500]="zap.enabled"
                      [class.shadow-[0_0_8px_#22c55e]]="zap.enabled"
                      [class.bg-gray-300]="!zap.enabled"
                    ></span>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900 truncate">{{ zap.name }}</span>
                        <span class="px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-600 rounded-md truncate">
                          {{ zap.repoFullName }}
                        </span>
                      </div>
                      <div class="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <span>{{ getEventLabel(zap.event) }}</span>
                        <span class="text-gray-300">&rarr;</span>
                        <span>Place a comment</span>
                        @if (zap.triggerCount > 0) {
                          <span class="text-gray-300">&middot;</span>
                          <span class="text-gray-400">{{ zap.triggerCount }} runs</span>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-3 shrink-0">
                    <app-toggle-switch
                      [checked]="zap.enabled"
                      (checkedChange)="onToggleZap(zap, $event)"
                    />
                  </div>
                </div>
              }
            </div>
          }
        </main>

        @if (showCreateModal() || editingZap()) {
          <app-create-zap-modal
            [zap]="editingZap()"
            (close)="closeFormModal()"
            (created)="onZapCreated($event)"
            (updated)="onZapUpdated($event)"
          />
        }

        @if (selectedZap()) {
          <app-zap-detail-modal
            [zap]="selectedZap()!"
            (close)="selectedZap.set(null)"
            (toggleEnabled)="onToggleZap(selectedZap()!, $event)"
            (editZap)="onEditZap(selectedZap()!)"
            (deleteZap)="onDeleteZap(selectedZap()!)"
          />
        }
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private zapService = inject(ZapService);

  user = signal<User | null>(null);
  zaps = signal<Zap[]>([]);
  loading = signal(true);
  showCreateModal = signal(false);
  editingZap = signal<Zap | null>(null);
  selectedZap = signal<Zap | null>(null);

  ngOnInit(): void {
    this.auth.user$.subscribe((u) => {
      this.user.set(u);
      if (u) {
        this.loadZaps();
      }
    });
  }

  loadZaps(): void {
    this.loading.set(true);
    this.zapService.getZaps().subscribe({
      next: (list) => {
        this.zaps.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  getEventLabel(event: string): string {
    return ZAP_EVENTS.find((e) => e.value === event)?.label || event;
  }

  onZapCreated(zap: Zap): void {
    this.zaps.update((list) => [zap, ...list]);
    this.closeFormModal();
  }

  onZapUpdated(updated: Zap): void {
    this.zaps.update((list) => list.map((z) => (z._id === updated._id ? updated : z)));
    this.closeFormModal();
  }

  onEditZap(zap: Zap): void {
    this.selectedZap.set(null);
    this.editingZap.set(zap);
  }

  closeFormModal(): void {
    this.showCreateModal.set(false);
    this.editingZap.set(null);
  }

  onToggleZap(zap: Zap, enabled: boolean): void {
    this.zapService.updateZap(zap._id, { enabled }).subscribe({
      next: (updated) => {
        this.zaps.update((list) => list.map((z) => (z._id === updated._id ? updated : z)));
        if (this.selectedZap()?._id === updated._id) {
          this.selectedZap.set(updated);
        }
      },
    });
  }

  onDeleteZap(zap: Zap): void {
    this.zapService.deleteZap(zap._id).subscribe({
      next: () => {
        this.zaps.update((list) => list.filter((z) => z._id !== zap._id));
        this.selectedZap.set(null);
      },
    });
  }

  onLogout(): void {
    this.auth.logout();
  }
}
