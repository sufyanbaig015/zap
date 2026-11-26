import { Component, EventEmitter, HostListener, Input, Output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="relative">
      <button
        type="button"
        [disabled]="disabled"
        (click)="toggle($event)"
        class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-left text-sm transition-all duration-150 hover:border-gray-400 focus:outline-none focus:border-gray-900 disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer"
      >
        <span class="truncate" [class.text-gray-900]="selectedOption" [class.text-gray-400]="!selectedOption">
          {{ selectedOption?.label || placeholder }}
        </span>
        <svg class="w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150" [class.rotate-180]="open()" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
        </svg>
      </button>

      @if (open()) {
        <div
          class="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          @if (searchable) {
            <div class="p-2 border-b border-gray-100">
              <input
                type="text"
                [ngModel]="query()"
                (ngModelChange)="query.set($event)"
                placeholder="Search..."
                class="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
            </div>
          }

          <div class="max-h-52 overflow-y-auto py-1">
            @for (opt of filteredOptions; track opt.value) {
              <button
                type="button"
                (click)="select(opt)"
                class="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                [class.bg-gray-50]="opt.value === value"
              >
                <div class="min-w-0">
                  <div class="text-xs font-medium text-gray-900 truncate">{{ opt.label }}</div>
                  @if (opt.description) {
                    <div class="text-[11px] text-gray-400 truncate">{{ opt.description }}</div>
                  }
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  @if (opt.badge) {
                    <span class="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">{{ opt.badge }}</span>
                  }
                  @if (opt.value === value) {
                    <svg class="w-3.5 h-3.5 text-gray-900" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                  }
                </div>
              </button>
            } @empty {
              <div class="px-3.5 py-3 text-xs text-gray-400 text-center">No options found</div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CustomSelectComponent {
  @Input() options: SelectOption[] = [];
  @Input() value = '';
  @Input() placeholder = 'Select an option';
  @Input() searchable = false;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  open = signal(false);
  query = signal('');

  get selectedOption(): SelectOption | undefined {
    return this.options.find((o) => o.value === this.value);
  }

  get filteredOptions(): SelectOption[] {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.options;
    return this.options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
    );
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.open.update((v) => !v);
    if (!this.open()) this.query.set('');
  }

  select(opt: SelectOption): void {
    this.valueChange.emit(opt.value);
    this.open.set(false);
    this.query.set('');
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.open.set(false);
  }
}
