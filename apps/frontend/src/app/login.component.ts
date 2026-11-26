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
          <svg class="gh-icon w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
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
