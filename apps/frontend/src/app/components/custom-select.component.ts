import { Component, computed, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  template: `
    <div class="relative w-full">
      <button
        type="button"
        [disabled]="disabled()"
        (click)="toggle()"
        class="flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm transition-all duration-150 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
        [class.border-gray-900]="open()"
        [class.ring-2]="open()"
        [class.ring-gray-200]="open()"
        [class.border-gray-200]="!open()"
        [class.hover:border-gray-300]="!open() && !disabled()"
      >
        <div class="min-w-0 flex-1">
          @if (selectedOption()) {
            <div class="flex items-center gap-2">
              <span class="truncate font-medium text-gray-900">{{ selectedOption()!.label }}</span>
              @if (selectedOption()!.badge) {
                <span class="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {{ selectedOption()!.badge }}
                </span>
              }
            </div>
          } @else {
            <span class="text-gray-400">{{ placeholder() }}</span>
          }
        </div>

        @if (loading()) {
          <span class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></span>
        } @else {
          <svg
            class="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150"
            [class.rotate-180]="open()"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        }
      </button>

      @if (open()) {
        <div class="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5">
          @if (searchable()) {
            <div class="border-b border-gray-100 p-2">
              <input
                type="text"
                [value]="query()"
                (input)="onSearchInput($event)"
                [placeholder]="searchPlaceholder()"
                class="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none"
                autofocus
              />
            </div>
          }

          <div class="max-h-56 overflow-y-auto p-1">
            @if (loading()) {
              <div class="px-3 py-4 text-center text-xs text-gray-400">Loading...</div>
            } @else if (filteredOptions().length === 0) {
              <div class="px-3 py-4 text-center text-xs text-gray-400">{{ emptyText() }}</div>
            } @else {
              @for (opt of filteredOptions(); track opt.value) {
                <button
                  type="button"
                  [disabled]="opt.disabled"
                  (click)="selectOption(opt)"
                  class="flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  [class.bg-gray-100]="opt.value === value()"
                  [class.hover:bg-gray-50]="opt.value !== value() && !opt.disabled"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="truncate text-xs font-medium text-gray-900">{{ opt.label }}</span>
                      @if (opt.badge) {
                        <span class="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-200">
                          {{ opt.badge }}
                        </span>
                      }
                    </div>
                    @if (opt.sublabel) {
                      <p class="mt-0.5 text-[11px] text-gray-500 line-clamp-1">{{ opt.sublabel }}</p>
                    }
                  </div>
                  @if (opt.value === value()) {
                    <svg class="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  }
                </button>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CustomSelectComponent {
  private el = inject(ElementRef);

  options = input<SelectOption[]>([]);
  value = input<string>('');
  placeholder = input<string>('Select an option');
  searchPlaceholder = input<string>('Search...');
  emptyText = input<string>('No options found');
  searchable = input<boolean>(false);
  loading = input<boolean>(false);
  disabled = input<boolean>(false);

  valueChange = output<string>();

  open = signal(false);
  query = signal('');

  selectedOption = computed(() => this.options().find((o) => o.value === this.value()));

  filteredOptions = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel && o.sublabel.toLowerCase().includes(q)),
    );
  });

  toggle(): void {
    if (this.disabled()) return;
    this.open.update((v) => !v);
    if (this.open()) {
      this.query.set('');
    }
  }

  onSearchInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this.query.set(inputEl.value);
  }

  selectOption(opt: SelectOption): void {
    if (opt.disabled) return;
    this.valueChange.emit(opt.value);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.el.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}
