import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ToggleSwitchComponent } from './toggle-switch.component';
import { ZAP_EVENTS, Zap } from '../zap.service';

@Component({
  selector: 'app-zap-detail-modal',
  standalone: true,
  imports: [ToggleSwitchComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-[2px] p-4" (click)="close.emit()">
      <div
        class="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
        (click)="$event.stopPropagation()"
      >
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-2.5 min-w-0">
            <span
              class="w-2.5 h-2.5 rounded-full shrink-0"
              [class.bg-green-500]="zap.enabled"
              [class.bg-gray-300]="!zap.enabled"
            ></span>
            <h2 class="text-base font-bold text-gray-900 truncate">{{ zap.name }}</h2>
          </div>
          <div class="flex items-center gap-3">
            <app-toggle-switch [checked]="zap.enabled" (checkedChange)="toggleEnabled.emit($event)" />
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
        </div>

        <div class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
              <div class="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Repository</div>
              <div class="text-xs font-semibold text-gray-900 mt-1 truncate">{{ zap.repoFullName }}</div>
            </div>
            <div class="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
              <div class="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Triggers</div>
              <div class="text-xs font-semibold text-gray-900 mt-1">{{ zap.triggerCount || 0 }} runs</div>
            </div>
          </div>

          <div class="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Event</span>
              <span class="text-xs font-semibold text-gray-900">{{ eventLabel }}</span>
            </div>
            <div class="h-[1px] bg-gray-200"></div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Action</span>
              <span class="text-xs font-semibold text-gray-900">Place a comment</span>
            </div>
            @if (zap.actionConfig.commentBody) {
              <div class="pt-1">
                <div class="text-[11px] text-gray-400 mb-1">Comment body</div>
                <div class="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-2.5">
                  {{ zap.actionConfig.commentBody }}
                </div>
              </div>
            }
          </div>

          @if (zap.webhookStatus === 'local_only') {
            <div class="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
              {{ zap.webhookError }}
            </div>
          } @else if (zap.webhookStatus === 'error') {
            <div class="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700">
              Webhook error: {{ zap.webhookError }}
            </div>
          }

          <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              (click)="deleteZap.emit()"
              class="px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
            >
              Delete Zap
            </button>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="editZap.emit()"
                class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                (click)="close.emit()"
                class="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ZapDetailModalComponent {
  @Input({ required: true }) zap!: Zap;
  @Output() close = new EventEmitter<void>();
  @Output() toggleEnabled = new EventEmitter<boolean>();
  @Output() editZap = new EventEmitter<void>();
  @Output() deleteZap = new EventEmitter<void>();

  get eventLabel(): string {
    return ZAP_EVENTS.find((e) => e.value === this.zap.event)?.label || this.zap.event;
  }
}
