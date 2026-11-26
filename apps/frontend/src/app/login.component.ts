import { Component, inject, AfterViewInit, ElementRef, viewChild, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="login-page min-h-screen w-full flex items-center justify-center bg-white overflow-hidden relative">
      <div class="glass-card relative z-1 w-full max-w-md p-10 bg-white border border-gray-200 rounded-2xl shadow-lg text-center">
        <div class="brand flex flex-col items-center gap-3 mb-8">
          <div class="mark w-16 h-16 rounded-xl bg-gray-900 grid place-items-center text-2xl font-black text-white">Z</div>
          <div class="name text-xl font-bold text-gray-900 tracking-tight">Zap</div>
          <div class="tag text-xs text-gray-500 font-normal">Workflow automation</div>
        </div>

        <div class="divider flex items-center gap-4 text-gray-400 text-xs mb-6">
          <span class="flex-1 h-[1px] bg-gray-200"></span>
          <span>Continue with</span>
          <span class="flex-1 h-[1px] bg-gray-200"></span>
        </div>

        <button
          #magneticBtn
          class="btn-github w-full inline-flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 shadow-sm"
          (click)="onLogin()"
        >
          <svg class="gh-icon w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C-4.42 7.42-2.95 6.69-2.95 6.69-.94 5.16 0 5.98 0 5.98 2.4 6.15 2.4 6.15 2.4 8.31 3.51 8.21 5.32 9.24 5.32 9.24 4.11 10.15 4.9 10.15 5.7 7.13 7.92 7.65 8.27 9.52 7.65 8.27 7.45 9.5 9.34 9.6 11.13 9.6 3.73 10.79 5.8 10.99 7.18 10.92 8.96 10.7 10.22 10.7 10.22 12.28 11.25 12.97 13.52 12.97 13.52 8.81 14.23 13 14.23 13 14.23 16.16 13.97 19.5 10.45 19.5 10.45 15.85 9.4 17.4 7.55 17.4 7.55 12.1 5.78 9.12 5.54 7.14 5.54 7.14 5.24 4.11 6.54 2.84 8.49 2.43 1.19-1.01 2.97-1.58 5.11-1.73-.39-1.17-.63-2.41-.83-3.72 0 0-.67-.21-2.2-.82-.72-.14-1.47-.23-2.21-.23-.74 0-1.49.09-2.21.23-1.53.61-2.2.82-2.2.82-.2 1.31-.44 2.55-.83 3.72 2.14.15 3.92.72 5.11 1.73 1.95.41 3.25 1.69 3.25 1.69.89 2.01 1.55 3.87 1.55 3.87 1.11 1.95 1.61 3.06 1.61 3.87 0 .32.22.69.82.577 4.76-1.58 8.2-6.08 8.2-11.385 0-6.627-5.373-12-12-12" />
          </svg>
          Sign in with GitHub
        </button>

        <p class="hint text-[12px] text-gray-500 leading-relaxed">By signing in, you agree to our terms.</p>
      </div>
    </div>
  `,
})
export class LoginComponent implements AfterViewInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private magneticBtn = viewChild<ElementRef<HTMLButtonElement>>('magneticBtn');

  constructor() {
    effect(() => {
      const btn = this.magneticBtn();
      if (!btn) return;
      const el = btn.nativeElement;

      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const dist = Math.hypot(dx, dy);

        // Only react when cursor is within 150px of the button center
        const radius = 150;
        if (dist < radius) {
          const strength = 0.15;
          const moveX = dx * strength;
          const moveY = dy * strength;
          el.style.transform = `translate(${moveX}px, ${moveY}px)`;
          el.style.transition = '';
        } else {
          el.style.transform = '';
          el.style.transition = 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)';
        }
      };

      const onLeave = () => {
        el.style.transform = '';
        el.style.transition = 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)';
      };

      window.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);

      return () => {
        window.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      };
    });
  }

  ngAfterViewInit(): void {}

  onLogin(): void {
    this.auth.login();
  }
}
