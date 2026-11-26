import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

const API = 'http://localhost:4000';

export interface User {
  id: string;
  githubId: string;
  username: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  /** Load the signed-in user from the backend (session cookie) */
  me(): Observable<User> {
    return this.http.get<User>(`${API}/auth/me`, { withCredentials: true }).pipe(
      tap((user) => this.userSubject.next(user))
    );
  }

  /** Start GitHub OAuth flow (redirects to GitHub) */
  login(): void {
    window.location.href = `${API}/auth/github`;
  }

  /** Logout: call backend then clear local state and redirect to login */
  logout(): void {
    this.http.post(`${API}/auth/logout`, {}, { withCredentials: true }).subscribe({
      next: () => this.onLogout(),
      error: () => this.onLogout(),
    });
  }

  private onLogout(): void {
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  setUser(user: User): void {
    this.userSubject.next(user);
  }

  get isAuthenticated(): boolean {
    return !!this.userSubject.value;
  }
}
