import { Component, inject, OnInit } from '@angular/core';
import { AuthService, User } from './auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    @if (user) {
      <div class="dashboard-page min-h-screen w-full flex items-center justify-center bg-white overflow-hidden relative">
        <div class="glass-card relative z-1 w-full max-w-md p-10 bg-white border border-gray-200 rounded-2xl shadow-lg text-center">
          <div class="brand flex flex-col items-center gap-3 mb-8">
            <div class="mark w-16 h-16 rounded-xl bg-gray-900 grid place-items-center text-2xl font-black text-white">Z</div>
            <div class="name text-xl font-bold text-gray-900 tracking-tight">Zap</div>
            <div class="tag text-xs text-gray-500 font-normal">Dashboard</div>
          </div>

          <div class="divider flex items-center gap-4 text-gray-400 text-xs mb-6">
            <span class="flex-1 h-[1px] bg-gray-200"></span>
            <span>Signed in as</span>
            <span class="flex-1 h-[1px] bg-gray-200"></span>
          </div>

          <div class="user-badge inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 mb-8">
            <span class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse-custom"></span>
            <span>&#64;{{ user.username }}</span>
          </div>

          <h1 class="text-2xl font-bold text-gray-900 mb-3">Hello, {{ user.username }}</h1>
          <p class="text-gray-500 text-sm mb-10">Your GitHub account is connected. You're ready to build Zaps.</p>

          <button class="btn-create w-full inline-flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 border border-gray-900 rounded-xl text-white text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-gray-800 hover:border-gray-800 active:bg-gray-700 shadow-sm" (click)="onCreateZap()">
            Create your first Zap
          </button>

          <button class="btn-signout mt-4 w-full inline-flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-600 text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 active:bg-gray-100 shadow-sm" (click)="onLogout()">
            Sign out
          </button>

          <p class="hint text-[12px] text-gray-400 leading-relaxed mt-6">Zap builder coming next phase 🚀</p>
        </div>
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);

  user!: User;

  ngOnInit(): void {
    this.auth.user$.subscribe((u) => {
      if (u) this.user = u;
    });
  }

  onLogout(): void {
    this.auth.logout();
  }

  onCreateZap(): void {
    // Placeholder for Zap builder (future phase)
    alert('Zap builder coming next phase 🚀');
  }
}
