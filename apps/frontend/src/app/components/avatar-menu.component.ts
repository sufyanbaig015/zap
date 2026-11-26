import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { AuthService, User } from '../auth.service';

@Component({
  selector: 'app-avatar-menu',
  standalone: true,
  template: `
    @if (user()) {
      <div [class]="inline() ? 'relative z-40' : 'fixed top-4 right-5 z-40'">
        <button
          type="button"
          (click)="toggleMenu()"
          class="group flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 p-1 pr-2.5 shadow-sm backdrop-blur-sm transition-all duration-150 hover:border-gray-300 hover:shadow-md cursor-pointer"
          aria-haspopup="menu"
          [attr.aria-expanded]="open()"
        >
          <div class="relative h-7 w-7 shrink-0">
            @if (user()!.avatar) {
              <img
                [src]="user()!.avatar"
                [alt]="user()!.username"
                class="h-7 w-7 rounded-full object-cover border border-gray-200"
              />
            } @else {
              <div class="grid h-7 w-7 place-items-center rounded-full bg-gray-900 text-xs font-bold text-white uppercase">
                {{ user()!.username.charAt(0) }}
              </div>
            }
            <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"></span>
          </div>
          <span class="text-xs font-medium text-gray-700 group-hover:text-gray-900 max-w-[110px] truncate">
            &#64;{{ user()!.username }}
          </span>
          <svg
            class="h-3.5 w-3.5 text-gray-400 transition-transform duration-150"
            [class.rotate-180]="open()"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        @if (open()) {
          <div
            role="menu"
            class="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5"
          >
            <div class="px-3 py-2 border-b border-gray-100">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-900 truncate">&#64;{{ user()!.username }}</span>
                <span class="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                  GitHub
                </span>
              </div>
              @if (user()!.email) {
                <p class="mt-0.5 text-[11px] text-gray-500 truncate">{{ user()!.email }}</p>
              }
            </div>

            <div class="pt-1">
              <button
                type="button"
                role="menuitem"
                (click)="onLogout()"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
              >
                <svg class="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class AvatarMenuComponent {
  private auth = inject(AuthService);
  private el = inject(ElementRef);

  user = input<User | null>(null);
  inline = input<boolean>(false);
  open = signal(false);

  toggleMenu(): void {
    this.open.update((v) => !v);
  }

  onLogout(): void {
    this.open.set(false);
    this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.el.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}
