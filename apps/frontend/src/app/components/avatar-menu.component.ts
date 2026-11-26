import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { User } from '../auth.service';

@Component({
  selector: 'app-avatar-menu',
  standalone: true,
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="toggle($event)"
        class="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:border-gray-300 hover:bg-gray-50 transition-all duration-150 cursor-pointer"
        aria-label="User menu"
      >
        <div class="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold grid place-items-center uppercase">
          {{ initials }}
        </div>
        <span class="text-xs font-medium text-gray-700 hidden sm:inline">&#64;{{ user.username }}</span>
        <svg class="w-3.5 h-3.5 text-gray-400 transition-transform duration-150" [class.rotate-180]="open()" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
        </svg>
      </button>

      @if (open()) {
        <div
          class="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-50"
          (click)="$event.stopPropagation()"
        >
          <div class="px-3.5 py-2.5 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500"></span>
              <span class="text-xs font-semibold text-gray-900 truncate">&#64;{{ user.username }}</span>
            </div>
            @if (user.email) {
              <p class="text-[11px] text-gray-400 truncate mt-0.5">{{ user.email }}</p>
            }
          </div>

          <button
            type="button"
            (click)="onSignOut()"
            class="w-full text-left px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      }
    </div>
  `,
})
export class AvatarMenuComponent {
  @Input({ required: true }) user!: User;
  @Output() signOut = new EventEmitter<void>();

  open = signal(false);

  get initials(): string {
    return (this.user?.username || 'U').slice(0, 2);
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  onSignOut(): void {
    this.open.set(false);
    this.signOut.emit();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.open.set(false);
  }
}
