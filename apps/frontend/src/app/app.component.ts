import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styles: ``,
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    // Check if the user already has a valid session (cookie) with the backend
    this.auth.me().subscribe({
      next: () => {
        const path = window.location.pathname;
        if (path === '/' || path === '/login') {
          this.router.navigateByUrl('/dashboard');
        }
      },
      error: () => this.router.navigateByUrl('/login'),
    });
  }
}
