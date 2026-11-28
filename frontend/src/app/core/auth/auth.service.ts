import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { AuthResponse, AuthRole, AuthUser, isAuthRole, PatientProfile } from './auth.models';

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
  private readonly storageKey = 'patient-auth-session';

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/Auth/register`, request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/Auth/login`, request);
  }

  loginDoctor(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/Auth/login/doctor`, request);
  }

  loginAdmin(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/Auth/login/admin`, request);
  }

  getProfile(): Observable<PatientProfile> {
    return this.http
      .get<{ data: PatientProfile }>(`${API_BASE_URL}/patients/me`)
      .pipe(map(response => response.data));
  }

  saveSession(response: AuthResponse): void {
    sessionStorage.setItem(this.storageKey, JSON.stringify(response));
  }

  updateCurrentUserFullName(fullName: string): void {
    const session = this.getSession();
    if (!session) {
      return;
    }

    this.saveSession({
      ...session,
      user: {
        ...session.user,
        fullName,
      },
    });
  }

  getToken(): string | null {
    return this.getSession()?.token ?? null;
  }

  getCurrentUser(): AuthUser | null {
    return this.getSession()?.user ?? null;
  }

  getRole(): AuthRole | null {
    const role = this.getCurrentUser()?.role;
    return isAuthRole(role) ? role : null;
  }

  getSession(): AuthResponse | null {
    const storedSession = sessionStorage.getItem(this.storageKey);
    if (!storedSession) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(storedSession);
      if (typeof parsed !== 'object' || parsed === null) {
        this.clearSession();
        return null;
      }

      const session = parsed as Partial<AuthResponse>;
      if (
        typeof session.token !== 'string' ||
        typeof session.user !== 'object' ||
        session.user === null ||
        !isAuthRole((session.user as AuthUser).role)
      ) {
        this.clearSession();
        return null;
      }

      return session as AuthResponse;
    } catch {
      this.clearSession();
      return null;
    }
  }

  isAuthenticated(): boolean {
    const session = this.getSession();
    if (!session?.token || !this.getRole()) {
      return false;
    }

    const expiry = Date.parse(session.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      this.clearSession();
      return false;
    }

    return true;
  }

  clearSession(): void {
    sessionStorage.removeItem(this.storageKey);
  }

  logout(): void {
    const loginPath = this.getLoginPath(this.getRole());
    this.clearSession();
    void this.router.navigateByUrl(loginPath);
  }

  handleUnauthorized(): void {
    const loginPath = this.getLoginPath(this.getRole());
    this.clearSession();

    if (this.router.url.split('?')[0] !== loginPath) {
      void this.router.navigateByUrl(loginPath);
    }
  }

  getLoginPath(role: AuthRole | null): string {
    switch (role) {
      case 'Doctor':
        return '/doctor-login';
      case 'Admin':
        return '/admin-login';
      default:
        return '/patient-login';
    }
  }

  getDashboardPath(role: AuthRole): string {
    switch (role) {
      case 'Doctor':
        return '/doctor-dashboard';
      case 'Admin':
        return '/admin-dashboard';
      default:
        return '/patient-dashboard';
    }
  }

  navigateToDashboardIfConfigured(returnUrl?: string | null): boolean {
    const role = this.getRole();
    if (!role) {
      return false;
    }

    if (returnUrl && this.isSafeReturnUrlForRole(returnUrl, role)) {
      void this.router.navigateByUrl(returnUrl);
      return true;
    }

    const dashboardPath = this.getDashboardPath(role);
    const routePath = dashboardPath.slice(1);
    if (!this.router.config.some(route => route.path === routePath)) {
      return false;
    }

    void this.router.navigateByUrl(dashboardPath);
    return true;
  }

  private isSafeReturnUrlForRole(url: string, role: AuthRole): boolean {
    if (!url.startsWith('/') || url.startsWith('//')) {
      return false;
    }

    const path = url.split('?')[0].split('#')[0];
    if (role === 'Patient') {
      return path === '/patient-dashboard' || path.startsWith('/book-appointment/');
    }
    if (role === 'Doctor') {
      return path === '/doctor-dashboard';
    }
    if (role === 'Admin') {
      return path === '/admin-dashboard';
    }
    return false;
  }
}
