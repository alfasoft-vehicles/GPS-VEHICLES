import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, switchMap } from 'rxjs';
import { URLBASE } from '../../../environments/environment';

export interface User {
  name: string;
}

export interface LoginResponse {
  access_token: string;
  token_type?: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  token_type?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'user';

  private http = inject(HttpClient);
  private router = inject(Router);

  // ---- Getters ----

  get accessToken(): string | null {
    return sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  get user(): User | null {
    const userStr = sessionStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  get isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // ---- Session Storage ----

  private saveSession(response: LoginResponse): void {
    sessionStorage.setItem(this.ACCESS_TOKEN_KEY, response.access_token);
  }

  private saveUser(user: User): void {
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private updateAccessToken(token: string): void {
    sessionStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  private clearSession(): void {
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
  }

  // ---- API Methods ----

  login(username: string, password: string): Observable<User> {
    return this.http
      .post<LoginResponse>(
        `${URLBASE}/users/login`,
        { username, password },
        { withCredentials: true },
      )
      .pipe(
        switchMap((response) => {
          this.saveSession(response);
          return this.getUserInfo();
        }),
        tap((user) => this.saveUser(user)),
        catchError((error) => {
          return throwError(() => error);
        }),
      );
  }

  getUserInfo(): Observable<User> {
    return this.http.get<User>(`${URLBASE}/users/info`);
  }

  refreshAccessToken(): Observable<RefreshTokenResponse> {
    return this.http
      .post<RefreshTokenResponse>(`${URLBASE}/users/refresh-token`, {}, { withCredentials: true })
      .pipe(
        tap((response) => this.updateAccessToken(response.access_token)),
        catchError((error) => {
          this.clearSession();
          this.router.navigate(['/login']);
          return throwError(() => error);
        }),
      );
  }

  logout(): void {
    this.http
      .post(`${URLBASE}/users/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => []))
      .subscribe({
        complete: () => {
          this.clearSession();
          this.router.navigate(['/login']);
        },
      });
  }
}
