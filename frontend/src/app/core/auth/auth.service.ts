import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable } from 'rxjs';
import { AuthResponse, PatientProfile } from './auth.models';

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  address: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = 'https://localhost:7243/api';
  private readonly storageKey = 'patient-auth-session';

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/register`, request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/login`, request);
  }

  getProfile(): Observable<PatientProfile> {
    return this.http
      .get<{ data: PatientProfile }>(`${this.apiUrl}/patients/me`)
      .pipe(map(response => response.data));
  }

  saveSession(response: AuthResponse): void {
    sessionStorage.setItem(this.storageKey, JSON.stringify(response));
  }

  getToken(): string | null {
    return this.getSession()?.token ?? null;
  }

  getSession(): AuthResponse | null {
    const storedSession = sessionStorage.getItem(this.storageKey);
    if (!storedSession) {
      return null;
    }

    try {
      return JSON.parse(storedSession) as AuthResponse;
    } catch {
      this.clearSession();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  clearSession(): void {
    sessionStorage.removeItem(this.storageKey);
  }

  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/patient-login');
  }

  navigateToDashboardIfConfigured(): boolean {
    const dashboardRoute = this.router.config.some(route => route.path === 'patient-dashboard');
    if (!dashboardRoute) {
      return false;
    }

    void this.router.navigateByUrl('/patient-dashboard');
    return true;
  }
}
