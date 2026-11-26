import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked"
      [disabled]="disabled"
      (click)="onToggle($event)"
      class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      [class.bg-gray-900]="checked"
      [class.bg-gray-200]="!checked"
    >
      <span
        class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
        [class.translate-x-4]="checked"
        [class.translate-x-0]="!checked"
      ></span>
    </button>
  `,
})
export class ToggleSwitchComponent {
  @Input() checked = false;
  @Input() disabled = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  onToggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.checkedChange.emit(!this.checked);
  }
}
