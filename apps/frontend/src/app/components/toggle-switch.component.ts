import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label() || 'Toggle'"
      [disabled]="disabled()"
      (click)="onToggle($event)"
      class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
      [class.bg-gray-900]="checked()"
      [class.border-gray-900]="checked()"
      [class.bg-gray-200]="!checked()"
      [class.border-gray-300]="!checked()"
    >
      <span
        class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200"
        [class.translate-x-4]="checked()"
        [class.translate-x-0.5]="!checked()"
      ></span>
    </button>
  `,
})
export class ToggleSwitchComponent {
  checked = input<boolean>(false);
  disabled = input<boolean>(false);
  label = input<string>('');
  stopPropagation = input<boolean>(false);
  checkedChange = output<boolean>();

  onToggle(event: MouseEvent): void {
    if (this.stopPropagation()) {
      event.stopPropagation();
    }
    if (this.disabled()) return;
    this.checkedChange.emit(!this.checked());
  }
}
