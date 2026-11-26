import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from './auth.service';
import { ZapService } from './services/zap.service';
import {
  AVAILABLE_APPS,
  GITHUB_ACTION_EVENTS,
  GITHUB_TRIGGER_EVENTS,
  GitHubRepo,
  Zap,
  ZapAction,
  ZapRun,
  createEmptyAction,
  getActionEventById,
  getAppById,
  getTriggerEventById,
  getZapActions,
} from './models/zap.model';
import { AvatarMenuComponent } from './components/avatar-menu.component';
import { ToggleSwitchComponent } from './components/toggle-switch.component';
import { CustomSelectComponent, SelectOption } from './components/custom-select.component';
import { AppIconComponent } from './components/app-icon.component';

type ActiveStep = { type: 'trigger' } | { type: 'action'; index: number } | null;

@Component({
  selector: 'app-zap-builder',
  standalone: true,
  imports: [
    FormsModule,
    AvatarMenuComponent,
    ToggleSwitchComponent,
    CustomSelectComponent,
    AppIconComponent,
  ],
  template: `
    <div class="flex h-screen w-full flex-col overflow-hidden bg-[#fafaf9] text-gray-900">
      <!-- Top Header Bar -->
      <header class="relative z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4">
        <div class="flex min-w-0 items-center gap-3">
          <button
            type="button"
            (click)="goBack()"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Zaps
          </button>

          <span class="h-4 w-px shrink-0 bg-gray-200"></span>

          <input
            type="text"
            [ngModel]="zap().name"
            (ngModelChange)="updateName($event)"
            placeholder="Untitled Zap"
            class="w-40 sm:w-64 min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-gray-900 placeholder:text-gray-400 hover:border-gray-200 focus:border-gray-300 focus:bg-white focus:outline-none"
          />
        </div>

        <div class="flex shrink-0 items-center gap-2.5">
          @if (saveMessage()) {
            <span class="hidden md:inline-block text-xs font-medium text-emerald-600">
              {{ saveMessage() }}
            </span>
          }
          @if (errorMessage()) {
            <span class="hidden md:inline-block text-xs font-medium text-red-600">
              {{ errorMessage() }}
            </span>
          }

          <button
            type="button"
            (click)="openRunLogs()"
            class="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
            [class.border-gray-900]="runsPanelOpen()"
            [class.bg-gray-50]="runsPanelOpen()"
          >
            <svg class="h-3.5 w-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Run logs
          </button>

          <div class="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
            <span class="text-[11px] font-medium" [class.text-emerald-700]="zap().enabled" [class.text-gray-500]="!zap().enabled">
              {{ zap().enabled ? 'On' : 'Off' }}
            </span>
            <app-toggle-switch
              [checked]="zap().enabled"
              label="Enable Zap"
              (checkedChange)="toggleEnabled($event)"
            />
          </div>

          <button
            type="button"
            [disabled]="saving()"
            (click)="saveZap()"
            class="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
          >
            @if (saving()) {
              <span class="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
              Saving...
            } @else {
              Save
            }
          </button>

          <span class="hidden sm:block h-4 w-px bg-gray-200"></span>

          <app-avatar-menu [user]="user()" [inline]="true" />
        </div>
      </header>

      @if (warningMessage()) {
        <div class="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <span>{{ warningMessage() }}</span>
          <button
            type="button"
            (click)="warningMessage.set('')"
            class="shrink-0 rounded p-0.5 text-amber-700 hover:bg-amber-100 cursor-pointer"
            aria-label="Dismiss warning"
          >
            ✕
          </button>
        </div>
      }

      <!-- Main Workspace: Pannable Dotted Canvas + Side Panel -->
      <div class="relative flex flex-1 overflow-hidden">
        <!-- Pannable Flow Canvas -->
        <main
          class="relative flex-1 overflow-hidden select-none"
          [class.cursor-grab]="!isPanning()"
          [class.cursor-grabbing]="isPanning()"
          [style.background-color]="'#fafaf9'"
          [style.background-image]="'radial-gradient(#d4d4d8 1px, transparent 1px)'"
          [style.background-size]="20 * zoom() + 'px ' + 20 * zoom() + 'px'"
          [style.background-position]="panX() + 'px ' + panY() + 'px'"
          (mousedown)="onCanvasMouseDown($event)"
          (wheel)="onCanvasWheel($event)"
          (click)="onCanvasClick($event)"
        >
          <!-- Transformable Flow Layer -->
          <div
            class="flex min-h-full w-full justify-center pt-14 pb-24"
            [style.transform]="'translate(' + panX() + 'px, ' + panY() + 'px) scale(' + zoom() + ')'"
            [style.transform-origin]="'top center'"
          >
            @if (loadingZap()) {
              <div class="flex w-full max-w-[360px] flex-col items-center gap-6 px-4">
                <div class="h-24 w-full animate-pulse rounded-xl border border-gray-200 bg-white"></div>
                <div class="h-24 w-full animate-pulse rounded-xl border border-gray-200 bg-white"></div>
              </div>
            } @else {
              <div class="flex w-full max-w-[360px] flex-col items-center px-4">
                <!-- STEP 1: TRIGGER CARD -->
                <div
                  (mousedown)="$event.stopPropagation()"
                  (click)="selectTrigger($event)"
                  class="w-full rounded-xl bg-white p-4 transition-all duration-150 cursor-pointer"
                  [class.border]="true"
                  [class.border-dashed]="!zap().trigger.app"
                  [class.border-gray-400]="!zap().trigger.app && !isTriggerActive()"
                  [class.border-gray-900]="isTriggerActive()"
                  [class.ring-2]="isTriggerActive()"
                  [class.ring-gray-200]="isTriggerActive()"
                  [class.border-gray-200]="zap().trigger.app && !isTriggerActive()"
                  [class.shadow-sm]="!isTriggerActive()"
                  [class.shadow-md]="isTriggerActive()"
                  [class.hover:border-gray-500]="!isTriggerActive()"
                >
                  @if (!zap().trigger.app) {
                    <div class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
                      <svg class="h-3 w-3 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      Trigger
                    </div>
                    <p class="mt-2.5 text-xs font-medium text-gray-600">
                      <span class="font-semibold text-gray-900">1.</span> Select the event that starts your Zap
                    </p>
                  } @else {
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <div class="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-900">
                          <app-icon [appId]="zap().trigger.app" iconClass="h-4 w-4" />
                        </div>
                        <span class="text-xs font-semibold text-gray-900">{{ getAppName(zap().trigger.app) }}</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <span class="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                          1. Trigger
                        </span>
                        <span
                          class="h-2 w-2 rounded-full"
                          [class.bg-emerald-500]="isTriggerComplete()"
                          [class.bg-amber-400]="!isTriggerComplete()"
                          [title]="isTriggerComplete() ? 'Configured' : 'Incomplete'"
                        ></span>
                      </div>
                    </div>

                    <p class="mt-2.5 text-xs font-semibold text-gray-900">
                      {{ getTriggerEventName(zap().trigger.event) || 'Select a trigger event...' }}
                    </p>

                    @if (zap().trigger.repository) {
                      <div class="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        <svg class="h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                        </svg>
                        {{ zap().trigger.repository }}
                      </div>
                    } @else {
                      <p class="mt-1.5 text-[11px] text-amber-600">Select a repository</p>
                    }
                  }
                </div>

                <!-- ACTIONS LOOP -->
                @for (act of zap().actions; track $index) {
                  <!-- CONNECTOR WITH ADD BUTTON -->
                  <div class="flex flex-col items-center py-1" (mousedown)="$event.stopPropagation()">
                    <div class="h-4 w-px bg-indigo-400/70"></div>
                    <button
                      type="button"
                      (click)="insertActionAt($index, $event)"
                      title="Add action step here"
                      class="my-0.5 grid h-6 w-6 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-2xs transition-all hover:scale-110 hover:border-gray-900 hover:bg-gray-900 hover:text-white cursor-pointer"
                    >
                      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <div class="h-4 w-px bg-indigo-400/70"></div>
                  </div>

                  <!-- ACTION CARD -->
                  <div
                    (mousedown)="$event.stopPropagation()"
                    (click)="selectAction($index, $event)"
                    class="group relative w-full rounded-xl bg-white p-4 transition-all duration-150 cursor-pointer"
                    [class.border]="true"
                    [class.border-dashed]="!act.app"
                    [class.border-gray-400]="!act.app && !isActionActive($index)"
                    [class.border-gray-900]="isActionActive($index)"
                    [class.ring-2]="isActionActive($index)"
                    [class.ring-gray-200]="isActionActive($index)"
                    [class.border-gray-200]="act.app && !isActionActive($index)"
                    [class.shadow-sm]="!isActionActive($index)"
                    [class.shadow-md]="isActionActive($index)"
                    [class.hover:border-gray-500]="!isActionActive($index)"
                  >
                    @if (!act.app) {
                      <div class="flex items-center justify-between">
                        <div class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
                          <svg class="h-3 w-3 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                          </svg>
                          Action
                        </div>

                        @if (zap().actions.length > 1) {
                          <button
                            type="button"
                            (click)="removeAction($index, $event)"
                            title="Delete action"
                            class="rounded-md p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 cursor-pointer"
                          >
                            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        }
                      </div>
                      <p class="mt-2.5 text-xs font-medium text-gray-600">
                        <span class="font-semibold text-gray-900">{{ $index + 2 }}.</span> Select the event for your Zap to run
                      </p>
                    } @else {
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                          <div class="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-900">
                            <app-icon [appId]="act.app" iconClass="h-4 w-4" />
                          </div>
                          <span class="text-xs font-semibold text-gray-900">{{ getAppName(act.app) }}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                            {{ $index + 2 }}. Action
                          </span>
                          <span
                            class="h-2 w-2 rounded-full"
                            [class.bg-emerald-500]="isActionComplete(act)"
                            [class.bg-amber-400]="!isActionComplete(act)"
                            [title]="isActionComplete(act) ? 'Configured' : 'Incomplete'"
                          ></span>
                          @if (zap().actions.length > 1) {
                            <button
                              type="button"
                              (click)="removeAction($index, $event)"
                              title="Delete action"
                              class="rounded-md p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 cursor-pointer"
                            >
                              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          }
                        </div>
                      </div>

                      <p class="mt-2.5 text-xs font-semibold text-gray-900">
                        {{ getActionEventName(act.event) || 'Select an action event...' }}
                      </p>

                      @if (act.repository) {
                        <div class="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          <svg class="h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                          </svg>
                          {{ act.repository }}
                        </div>
                      } @else {
                        <p class="mt-1.5 text-[11px] text-amber-600">Select a repository</p>
                      }

                      @if (act.event === 'pull_request.comment' && act.config.commentBody) {
                        <p class="mt-2 line-clamp-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-[11px] text-gray-600">
                          "{{ act.config.commentBody }}"
                        </p>
                      }
                    }
                  </div>
                }

                <!-- TRAILING CONNECTOR WITH ADD BUTTON -->
                <div class="flex flex-col items-center py-1" (mousedown)="$event.stopPropagation()">
                  <div class="h-4 w-px bg-indigo-400/70"></div>
                  <button
                    type="button"
                    (click)="insertActionAt(zap().actions.length, $event)"
                    title="Add another action"
                    class="my-0.5 grid h-6 w-6 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-2xs transition-all hover:scale-110 hover:border-gray-900 hover:bg-gray-900 hover:text-white cursor-pointer"
                  >
                    <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Floating Canvas Controls (Zoom & Reset) -->
          <div
            class="absolute bottom-4 left-4 z-10 flex items-center gap-1 rounded-xl border border-gray-200 bg-white/95 p-1 shadow-sm backdrop-blur-xs"
            (mousedown)="$event.stopPropagation()"
            (click)="$event.stopPropagation()"
          >
            <button
              type="button"
              (click)="adjustZoom(-0.1)"
              title="Zoom out"
              class="grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            >
              −
            </button>
            <span class="min-w-[42px] text-center text-[11px] font-medium text-gray-600">
              {{ zoomPercent() }}%
            </span>
            <button
              type="button"
              (click)="adjustZoom(0.1)"
              title="Zoom in"
              class="grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            >
              +
            </button>
            <span class="h-4 w-px bg-gray-200"></span>
            <button
              type="button"
              (click)="resetView()"
              title="Reset canvas view"
              class="rounded-lg px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </main>

        <!-- SIDE PANEL (Step Configuration) -->
        <aside
          class="absolute top-0 right-0 bottom-0 z-30 flex w-full sm:w-[420px] flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 ease-out"
          [class.translate-x-0]="activeStep() !== null"
          [class.translate-x-full]="activeStep() === null"
          [class.pointer-events-none]="activeStep() === null"
          [attr.aria-hidden]="activeStep() === null"
          (mousedown)="$event.stopPropagation()"
          (click)="$event.stopPropagation()"
        >
            <!-- Panel Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
              <div class="flex items-center gap-2.5">
                <span class="rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-800">
                  {{ stepBadgeLabel() }}
                </span>
                <h2 class="text-sm font-semibold text-gray-900">
                  {{ isTriggerActive() ? 'Configure Trigger' : 'Configure Action' }}
                </h2>
              </div>

              <div class="flex items-center gap-1">
                @if (activeActionIndex() !== null && zap().actions.length > 1) {
                  <button
                    type="button"
                    (click)="removeAction(activeActionIndex()!, $event)"
                    class="rounded-lg px-2 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50 cursor-pointer"
                  >
                    Remove
                  </button>
                }
                <button
                  type="button"
                  (click)="activeStep.set(null)"
                  class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                  aria-label="Close panel"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Panel Body -->
            <div class="flex-1 space-y-5 overflow-y-auto p-5">
              <!-- 1. App Picker -->
              <div>
                <label class="mb-2 block text-xs font-semibold text-gray-700">App</label>
                <div class="space-y-1.5">
                  @for (app of apps; track app.id) {
                    <button
                      type="button"
                      [disabled]="!app.enabled"
                      (click)="selectApp(app.id)"
                      class="flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-150"
                      [class.cursor-pointer]="app.enabled"
                      [class.cursor-not-allowed]="!app.enabled"
                      [class.opacity-55]="!app.enabled"
                      [class.border-gray-900]="currentApp() === app.id"
                      [class.bg-gray-50]="currentApp() === app.id || !app.enabled"
                      [class.ring-1]="currentApp() === app.id"
                      [class.ring-gray-900]="currentApp() === app.id"
                      [class.border-gray-200]="currentApp() !== app.id"
                      [class.hover:border-gray-300]="app.enabled && currentApp() !== app.id"
                    >
                      <div class="flex min-w-0 items-center gap-3">
                        <div class="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-gray-200 bg-white text-gray-900">
                          <app-icon [appId]="app.id" iconClass="h-4 w-4" />
                        </div>
                        <div class="min-w-0">
                          <div class="text-xs font-semibold text-gray-900">{{ app.name }}</div>
                          <div class="truncate text-[11px] text-gray-500">{{ app.description }}</div>
                        </div>
                      </div>

                      @if (!app.enabled) {
                        <span class="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-400">
                          Soon
                        </span>
                      } @else if (currentApp() === app.id) {
                        <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gray-900 text-white">
                          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      }
                    </button>
                  }
                </div>
              </div>

              <!-- 2. Event + Account + Repo (shown once GitHub is selected) -->
              @if (currentApp() === 'github') {
                <div>
                  <label class="mb-2 block text-xs font-semibold text-gray-700">
                    {{ isTriggerActive() ? 'Trigger Event' : 'Action Event' }}
                  </label>
                  <app-custom-select
                    [options]="isTriggerActive() ? triggerEventOptions : actionEventOptions"
                    [value]="currentEvent()"
                    [placeholder]="isTriggerActive() ? 'Choose a trigger event...' : 'Choose an action event...'"
                    (valueChange)="selectEvent($event)"
                  />
                </div>

                <!-- Connected GitHub Account -->
                <div>
                  <label class="mb-2 block text-xs font-semibold text-gray-700">Account</label>
                  <div class="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5">
                    <div class="flex items-center gap-2.5">
                      @if (user()?.avatar) {
                        <img [src]="user()!.avatar" [alt]="user()!.username" class="h-6 w-6 rounded-full border border-gray-200" />
                      } @else {
                        <div class="grid h-6 w-6 place-items-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
                          {{ user()?.username?.charAt(0) || 'G' }}
                        </div>
                      }
                      <div>
                        <div class="text-xs font-semibold text-gray-900">&#64;{{ user()?.username }}</div>
                        <div class="text-[11px] text-gray-500">GitHub OAuth</div>
                      </div>
                    </div>
                    <span class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Connected
                    </span>
                  </div>
                </div>

                <!-- Repository Selector -->
                <div>
                  <div class="mb-2 flex items-center justify-between">
                    <label class="text-xs font-semibold text-gray-700">Repository</label>
                    <div class="flex items-center gap-2">
                      @if (activeActionIndex() !== null && zap().trigger.repository && currentRepository() !== zap().trigger.repository) {
                        <button
                          type="button"
                          (click)="selectRepository(zap().trigger.repository)"
                          class="text-[11px] font-medium text-gray-600 underline hover:text-gray-900 cursor-pointer"
                        >
                          Use trigger repo
                        </button>
                      }
                      <button
                        type="button"
                        (click)="loadRepos()"
                        class="text-[11px] font-medium text-gray-500 hover:text-gray-900 cursor-pointer"
                        title="Refresh repositories"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                  <app-custom-select
                    [options]="repoOptions()"
                    [value]="currentRepository()"
                    [searchable]="true"
                    [loading]="loadingRepos()"
                    placeholder="Select a GitHub repository..."
                    searchPlaceholder="Search repositories..."
                    emptyText="No repositories found"
                    (valueChange)="selectRepository($event)"
                  />
                  @if (repoError()) {
                    <p class="mt-1.5 text-[11px] text-red-600">{{ repoError() }}</p>
                  }
                </div>

                <!-- Action-specific Field Mapping -->
                @if (activeAction(); as act) {
                  @if (act.event === 'pull_request.comment') {
                    <div>
                      <div class="mb-2 flex items-center justify-between">
                        <label class="text-xs font-semibold text-gray-700">Comment Body</label>
                        <span class="text-[11px] text-gray-400">Supports template fields</span>
                      </div>
                      <textarea
                        rows="4"
                        [ngModel]="act.config.commentBody || ''"
                        (ngModelChange)="updateActionConfig('commentBody', $event)"
                        [placeholder]="commentPlaceholder"
                        class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      ></textarea>

                      <div class="mt-2 flex flex-wrap gap-1.5">
                        @for (token of templateTokens; track token.value) {
                          <button
                            type="button"
                            (click)="insertToken(token.value)"
                            class="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
                          >
                            + {{ token.label }}
                          </button>
                        }
                      </div>
                    </div>
                  }

                  @if (act.event === 'pull_request.label') {
                    <div>
                      <label class="mb-2 block text-xs font-semibold text-gray-700">Label Name</label>
                      <input
                        type="text"
                        [ngModel]="act.config.label || ''"
                        (ngModelChange)="updateActionConfig('label', $event)"
                        placeholder="e.g. needs-review"
                        class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                    </div>
                  }

                  @if (act.event === 'issues.create') {
                    <div class="space-y-3">
                      <div>
                        <label class="mb-1.5 block text-xs font-semibold text-gray-700">Issue Title</label>
                        <input
                          type="text"
                          [ngModel]="act.config.issueTitle || ''"
                          (ngModelChange)="updateActionConfig('issueTitle', $event)"
                          [placeholder]="issueTitlePlaceholder"
                          class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                        />
                      </div>
                      <div>
                        <label class="mb-1.5 block text-xs font-semibold text-gray-700">Issue Body</label>
                        <textarea
                          rows="3"
                          [ngModel]="act.config.issueBody || ''"
                          (ngModelChange)="updateActionConfig('issueBody', $event)"
                          placeholder="Describe the issue..."
                          class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                        ></textarea>
                      </div>
                    </div>
                  }
                }
              }
            </div>

            <!-- Panel Footer -->
            <div class="flex items-center justify-between border-t border-gray-200 bg-gray-50/70 px-5 py-3">
              @if (isTriggerActive()) {
                <span class="text-[11px] text-gray-500">
                  {{ isTriggerComplete() ? 'Trigger ready' : 'Select app, event & repo' }}
                </span>
                <button
                  type="button"
                  (click)="activeStep.set({ type: 'action', index: 0 })"
                  class="rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 cursor-pointer"
                >
                  Continue to Action →
                </button>
              } @else if (activeActionIndex() !== null) {
                <span class="text-[11px] text-gray-500">
                  {{ isActionComplete(activeAction()!) ? 'Action ready' : 'Select app, event & repo' }}
                </span>
                <div class="flex items-center gap-2">
                  @if (activeActionIndex()! < zap().actions.length - 1) {
                    <button
                      type="button"
                      (click)="activeStep.set({ type: 'action', index: activeActionIndex()! + 1 })"
                      class="rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 cursor-pointer"
                    >
                      Next Action →
                    </button>
                  } @else {
                    <button
                      type="button"
                      (click)="activeStep.set(null)"
                      class="rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 cursor-pointer"
                    >
                      Done
                    </button>
                  }
                </div>
              }
            </div>
          </aside>

        <!-- RUN LOGS SLIDING SIDE PANEL -->
        <aside
          class="absolute top-0 right-0 bottom-0 z-30 flex w-full sm:w-[420px] flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 ease-out"
          [class.translate-x-0]="runsPanelOpen()"
          [class.translate-x-full]="!runsPanelOpen()"
          [class.pointer-events-none]="!runsPanelOpen()"
          [attr.aria-hidden]="!runsPanelOpen()"
          (mousedown)="$event.stopPropagation()"
          (click)="$event.stopPropagation()"
        >
          <!-- Panel Header -->
          <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
            <div class="flex items-center gap-2">
              @if (selectedRun()) {
                <button
                  type="button"
                  (click)="selectedRun.set(null)"
                  class="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
                >
                  ← All runs
                </button>
              } @else {
                <h2 class="text-sm font-semibold text-gray-900">Run Logs</h2>
              }
            </div>

            <div class="flex items-center gap-1.5">
              @if (!selectedRun() && zap()._id) {
                <button
                  type="button"
                  (click)="loadRuns()"
                  class="rounded-lg px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
                >
                  Refresh
                </button>
              }
              <button
                type="button"
                (click)="closeRunLogs()"
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                aria-label="Close run logs"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Panel Body -->
          <div class="flex-1 overflow-y-auto p-5">
            @if (!zap()._id) {
              <div class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
                <p class="text-xs font-semibold text-gray-800">Save this Zap first</p>
                <p class="mt-1 text-[11px] text-gray-500">Run logs will appear here once your Zap is saved and triggered.</p>
              </div>
            } @else {
              @if (selectedRun(); as run) {
              <!-- Single Run Detail View -->
              <div class="space-y-4">
                <div class="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                  <div class="flex items-center justify-between">
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase"
                      [class.bg-emerald-50]="run.status === 'success'"
                      [class.text-emerald-700]="run.status === 'success'"
                      [class.border-emerald-200]="run.status === 'success'"
                      [class.bg-red-50]="run.status === 'failed'"
                      [class.text-red-700]="run.status === 'failed'"
                      [class.border-red-200]="run.status === 'failed'"
                      [class.bg-amber-50]="run.status === 'running'"
                      [class.text-amber-700]="run.status === 'running'"
                      [class.border-amber-200]="run.status === 'running'"
                    >
                      {{ run.status }}
                    </span>
                    @if (run.durationMs !== undefined) {
                      <span class="text-[11px] font-medium text-gray-500">{{ run.durationMs }}ms</span>
                    }
                  </div>
                  <p class="mt-2 text-xs font-semibold text-gray-900">
                    {{ run.triggerSummary.event || 'Trigger event' }}
                  </p>
                  <p class="mt-0.5 text-[11px] text-gray-500">
                    {{ run.triggerSummary.repository }} · {{ formatRunDate(run.startedAt) }}
                  </p>
                </div>

                <!-- Step-by-step logs -->
                <div class="space-y-3">
                  @for (step of run.steps; track step.stepIndex) {
                    <div class="rounded-xl border border-gray-200 bg-white p-3.5">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                            {{ step.stepIndex + 1 }}. {{ step.type === 'trigger' ? 'Trigger' : 'Action' }}
                          </span>
                          <span class="text-xs font-semibold text-gray-900">{{ step.event }}</span>
                        </div>
                        <span
                          class="text-[10px] font-semibold uppercase"
                          [class.text-emerald-600]="step.status === 'success'"
                          [class.text-red-600]="step.status === 'failed'"
                          [class.text-gray-400]="step.status === 'skipped'"
                        >
                          {{ step.status }}
                        </span>
                      </div>

                      @if (step.error) {
                        <div class="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                          {{ step.error }}
                        </div>
                      }

                      @if (step.input) {
                        <div class="mt-2">
                          <div class="mb-1 text-[10px] font-semibold uppercase text-gray-400">Input</div>
                          <pre class="max-h-32 overflow-auto rounded-lg bg-gray-50 p-2 text-[11px] text-gray-700 border border-gray-100">{{ formatJson(step.input) }}</pre>
                        </div>
                      }

                      @if (step.output) {
                        <div class="mt-2">
                          <div class="mb-1 text-[10px] font-semibold uppercase text-gray-400">Output</div>
                          <pre class="max-h-32 overflow-auto rounded-lg bg-gray-50 p-2 text-[11px] text-gray-700 border border-gray-100">{{ formatJson(step.output) }}</pre>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            } @else {
              <!-- Runs Listing View -->
              @if (loadingRuns()) {
                <div class="space-y-2.5">
                  @for (i of [1, 2, 3]; track i) {
                    <div class="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-50"></div>
                  }
                </div>
              } @else if (runsError()) {
                <div class="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {{ runsError() }}
                </div>
              } @else if (runs().length === 0) {
                <div class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-12 text-center">
                  <div class="mx-auto mb-3 grid h-9 w-9 place-items-center rounded-lg border border-gray-200 bg-white text-gray-500">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <p class="text-xs font-semibold text-gray-800">No runs recorded yet</p>
                  <p class="mt-1 text-[11px] text-gray-500">
                    When this Zap is turned on and triggered by a GitHub event, each execution and its step logs will appear here.
                  </p>
                </div>
              } @else {
                <div class="space-y-2">
                  @for (run of runs(); track run._id) {
                    <button
                      type="button"
                      (click)="selectRun(run)"
                      class="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left transition-all hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                    >
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <span
                            class="h-2 w-2 shrink-0 rounded-full"
                            [class.bg-emerald-500]="run.status === 'success'"
                            [class.bg-red-500]="run.status === 'failed'"
                            [class.bg-amber-400]="run.status === 'running'"
                          ></span>
                          <span class="truncate text-xs font-semibold text-gray-900">
                            {{ run.triggerSummary.event || 'Zap Run' }}
                          </span>
                        </div>
                        <p class="mt-1 truncate text-[11px] text-gray-500">
                          {{ run.triggerSummary.repository }} · {{ formatRunDate(run.startedAt) }}
                        </p>
                      </div>
                      <div class="flex shrink-0 items-center gap-2">
                        @if (run.durationMs !== undefined) {
                          <span class="text-[11px] text-gray-400">{{ run.durationMs }}ms</span>
                        }
                        <svg class="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </div>
                    </button>
                  }
                </div>
              }
            }
            }
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class ZapBuilderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private zapService = inject(ZapService);

  user = signal<User | null>(null);
  activeStep = signal<ActiveStep>(null);
  loadingZap = signal<boolean>(false);
  saving = signal<boolean>(false);
  saveMessage = signal<string>('');
  errorMessage = signal<string>('');
  warningMessage = signal<string>('');

  repos = signal<GitHubRepo[]>([]);
  loadingRepos = signal<boolean>(false);
  repoError = signal<string>('');

  // Run logs drawer state
  runsPanelOpen = signal<boolean>(false);
  runs = signal<ZapRun[]>([]);
  loadingRuns = signal<boolean>(false);
  runsError = signal<string>('');
  selectedRun = signal<ZapRun | null>(null);

  // Canvas pan & zoom state
  panX = signal<number>(0);
  panY = signal<number>(0);
  zoom = signal<number>(1);
  isPanning = signal<boolean>(false);
  private panStartX = 0;
  private panStartY = 0;
  private panMoved = false;

  zoomPercent = computed(() => Math.round(this.zoom() * 100));

  zap = signal<Zap>({
    name: 'Untitled Zap',
    enabled: false,
    trigger: { app: '', event: '', repository: '' },
    actions: [createEmptyAction()],
  });

  readonly apps = AVAILABLE_APPS;

  readonly triggerEventOptions: SelectOption[] = GITHUB_TRIGGER_EVENTS.map((e) => ({
    value: e.id,
    label: e.name,
    sublabel: e.description,
  }));

  readonly actionEventOptions: SelectOption[] = GITHUB_ACTION_EVENTS.map((e) => ({
    value: e.id,
    label: e.name,
    sublabel: e.description,
  }));

  readonly templateTokens = [
    { label: 'PR Title', value: '{{pr.title}}' },
    { label: 'PR Number', value: '{{pr.number}}' },
    { label: 'PR Author', value: '{{pr.author}}' },
    { label: 'Repo Name', value: '{{repo.name}}' },
  ];

  readonly commentPlaceholder = 'Thanks for opening this pull request, {{pr.author}}!';
  readonly issueTitlePlaceholder = 'Follow-up for {{pr.title}}';

  repoOptions = computed<SelectOption[]>(() =>
    this.repos().map((r) => ({
      value: r.fullName,
      label: r.fullName,
      badge: r.private ? 'Private' : 'Public',
    })),
  );

  activeActionIndex = computed<number | null>(() => {
    const step = this.activeStep();
    return step?.type === 'action' ? step.index : null;
  });

  activeAction = computed<ZapAction | null>(() => {
    const idx = this.activeActionIndex();
    if (idx === null) return null;
    return this.zap().actions[idx] || null;
  });

  isTriggerActive = computed(() => this.activeStep()?.type === 'trigger');

  stepBadgeLabel = computed(() => {
    const step = this.activeStep();
    if (!step) return '';
    return step.type === 'trigger' ? '1. Trigger' : `${step.index + 2}. Action`;
  });

  ngOnInit(): void {
    this.auth.user$.subscribe((u) => this.user.set(u));
    this.loadRepos();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.loadZap(id);
    }
  }

  loadZap(id: string): void {
    this.loadingZap.set(true);
    this.zapService.getZap(id).subscribe({
      next: (data) => {
        this.zap.set({
          ...data,
          trigger: data.trigger || { app: '', event: '', repository: '' },
          actions: getZapActions(data),
        });
        this.loadingZap.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load Zap.');
        this.loadingZap.set(false);
      },
    });
  }

  loadRepos(): void {
    this.loadingRepos.set(true);
    this.repoError.set('');
    this.zapService.listGitHubRepos().subscribe({
      next: (list) => {
        this.repos.set(list);
        this.loadingRepos.set(false);
      },
      error: () => {
        this.repoError.set('Could not load GitHub repositories.');
        this.loadingRepos.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // --- Canvas Pan & Zoom ---
  onCanvasMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isPanning.set(true);
    this.panMoved = false;
    this.panStartX = event.clientX - this.panX();
    this.panStartY = event.clientY - this.panY();
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    if (!this.isPanning()) return;
    const nextX = event.clientX - this.panStartX;
    const nextY = event.clientY - this.panStartY;
    if (Math.hypot(nextX - this.panX(), nextY - this.panY()) > 3) {
      this.panMoved = true;
    }
    this.panX.set(nextX);
    this.panY.set(nextY);
  }

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    this.isPanning.set(false);
  }

  onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const delta = event.deltaY < 0 ? 0.08 : -0.08;
      this.adjustZoom(delta);
    } else {
      this.panX.update((x) => x - event.deltaX);
      this.panY.update((y) => y - event.deltaY);
    }
  }

  adjustZoom(delta: number): void {
    this.zoom.update((z) => Math.min(1.5, Math.max(0.6, Math.round((z + delta) * 100) / 100)));
  }

  resetView(): void {
    this.panX.set(0);
    this.panY.set(0);
    this.zoom.set(1);
  }

  onCanvasClick(_event: MouseEvent): void {
    if (this.panMoved) {
      this.panMoved = false;
      return;
    }
    this.activeStep.set(null);
    this.runsPanelOpen.set(false);
  }

  // --- Run Logs Drawer ---
  openRunLogs(): void {
    this.activeStep.set(null);
    this.selectedRun.set(null);
    this.runsPanelOpen.set(true);
    if (this.zap()._id) {
      this.loadRuns();
    }
  }

  closeRunLogs(): void {
    this.runsPanelOpen.set(false);
  }

  loadRuns(): void {
    const id = this.zap()._id;
    if (!id) return;
    this.loadingRuns.set(true);
    this.runsError.set('');
    this.zapService.listZapRuns(id).subscribe({
      next: (list) => {
        this.runs.set(list);
        this.loadingRuns.set(false);
      },
      error: () => {
        this.runsError.set('Could not load run logs.');
        this.loadingRuns.set(false);
      },
    });
  }

  selectRun(run: ZapRun): void {
    const id = this.zap()._id;
    this.selectedRun.set(run);
    if (!id) return;
    this.zapService.getZapRun(id, run._id).subscribe({
      next: (fullRun) => this.selectedRun.set(fullRun),
    });
  }

  formatRunDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  formatJson(obj: Record<string, unknown>): string {
    return JSON.stringify(obj, null, 2);
  }

  // --- Step Selection & Multi-Action Management ---
  selectTrigger(event: MouseEvent): void {
    event.stopPropagation();
    this.runsPanelOpen.set(false);
    this.activeStep.set({ type: 'trigger' });
  }

  selectAction(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.runsPanelOpen.set(false);
    this.activeStep.set({ type: 'action', index });
  }

  isActionActive(index: number): boolean {
    const step = this.activeStep();
    return step?.type === 'action' && step.index === index;
  }

  insertActionAt(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.zap.update((z) => {
      const nextActions = [...z.actions];
      nextActions.splice(index, 0, createEmptyAction());
      return { ...z, actions: nextActions };
    });
    this.activeStep.set({ type: 'action', index });
  }

  removeAction(index: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.zap().actions.length <= 1) return;

    this.zap.update((z) => ({
      ...z,
      actions: z.actions.filter((_, i) => i !== index),
    }));

    const current = this.activeStep();
    if (current?.type === 'action') {
      if (current.index === index) {
        this.activeStep.set(null);
      } else if (current.index > index) {
        this.activeStep.set({ type: 'action', index: current.index - 1 });
      }
    }
  }

  // --- Step Configuration ---
  currentApp(): string {
    if (this.isTriggerActive()) return this.zap().trigger.app;
    return this.activeAction()?.app || '';
  }

  currentEvent(): string {
    if (this.isTriggerActive()) return this.zap().trigger.event;
    return this.activeAction()?.event || '';
  }

  currentRepository(): string {
    if (this.isTriggerActive()) return this.zap().trigger.repository;
    return this.activeAction()?.repository || '';
  }

  selectApp(appId: string): void {
    const step = this.activeStep();
    if (!step) return;
    this.zap.update((z) => {
      if (step.type === 'trigger') {
        return { ...z, trigger: { ...z.trigger, app: appId } };
      }
      const nextActions = z.actions.map((a, i) => (i === step.index ? { ...a, app: appId } : a));
      return { ...z, actions: nextActions };
    });
  }

  selectEvent(eventId: string): void {
    const step = this.activeStep();
    if (!step) return;
    this.zap.update((z) => {
      if (step.type === 'trigger') {
        return { ...z, trigger: { ...z.trigger, event: eventId } };
      }
      const nextActions = z.actions.map((a, i) => (i === step.index ? { ...a, event: eventId } : a));
      return { ...z, actions: nextActions };
    });
  }

  selectRepository(repoFullName: string): void {
    const step = this.activeStep();
    if (!step) return;
    this.zap.update((z) => {
      if (step.type === 'trigger') {
        return { ...z, trigger: { ...z.trigger, repository: repoFullName } };
      }
      const nextActions = z.actions.map((a, i) => (i === step.index ? { ...a, repository: repoFullName } : a));
      return { ...z, actions: nextActions };
    });
  }

  updateActionConfig(key: 'commentBody' | 'label' | 'issueTitle' | 'issueBody', value: string): void {
    const idx = this.activeActionIndex();
    if (idx === null) return;
    this.zap.update((z) => ({
      ...z,
      actions: z.actions.map((a, i) =>
        i === idx
          ? {
              ...a,
              config: {
                ...a.config,
                [key]: value,
              },
            }
          : a,
      ),
    }));
  }

  insertToken(token: string): void {
    const current = this.activeAction()?.config.commentBody || '';
    const separator = current && !current.endsWith(' ') && !current.endsWith('\n') ? ' ' : '';
    this.updateActionConfig('commentBody', `${current}${separator}${token}`);
  }

  updateName(name: string): void {
    this.zap.update((z) => ({ ...z, name }));
  }

  toggleEnabled(enabled: boolean): void {
    this.zap.update((z) => ({ ...z, enabled }));
    const id = this.zap()._id;
    if (id) {
      this.zapService.toggleZap(id, enabled).subscribe({
        next: (updated) => {
          this.zap.update((z) => ({ ...z, enabled: updated.enabled }));
          this.warningMessage.set(updated.webhookWarning || '');
          this.flashSaved(updated.enabled ? 'Zap turned on' : 'Zap turned off');
        },
        error: () => {
          this.zap.update((z) => ({ ...z, enabled: !enabled }));
          this.errorMessage.set('Failed to update status.');
        },
      });
    }
  }

  saveZap(): void {
    this.saving.set(true);
    this.errorMessage.set('');
    const current = this.zap();

    if (current._id) {
      this.zapService.updateZap(current._id, current).subscribe({
        next: (updated) => {
          this.zap.set({
            ...updated,
            trigger: updated.trigger || { app: '', event: '', repository: '' },
            actions: getZapActions(updated),
          });
          this.saving.set(false);
          this.warningMessage.set(updated.webhookWarning || '');
          this.flashSaved('Saved');
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set('Failed to save Zap.');
        },
      });
    } else {
      this.zapService.createZap(current).subscribe({
        next: (created) => {
          this.zap.set({
            ...created,
            trigger: created.trigger || { app: '', event: '', repository: '' },
            actions: getZapActions(created),
          });
          this.saving.set(false);
          this.warningMessage.set(created.webhookWarning || '');
          this.flashSaved('Zap created');
          if (created._id) {
            this.router.navigate(['/zaps', created._id], { replaceUrl: true });
          }
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set('Failed to create Zap.');
        },
      });
    }
  }

  private flashSaved(msg: string): void {
    this.saveMessage.set(msg);
    setTimeout(() => {
      if (this.saveMessage() === msg) {
        this.saveMessage.set('');
      }
    }, 2500);
  }

  isTriggerComplete(): boolean {
    const t = this.zap().trigger;
    return Boolean(t.app && t.event && t.repository);
  }

  isActionComplete(act: ZapAction): boolean {
    if (!act.app || !act.event || !act.repository) return false;
    if (act.event === 'pull_request.comment') {
      return Boolean(act.config?.commentBody?.trim());
    }
    return true;
  }

  getAppName(appId: string): string {
    return getAppById(appId)?.name || appId;
  }

  getTriggerEventName(eventId: string): string {
    return getTriggerEventById(eventId)?.name || '';
  }

  getActionEventName(eventId: string): string {
    return getActionEventById(eventId)?.name || '';
  }
}
