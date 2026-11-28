import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const isAuthRequest =
    request.url.includes('/Auth/login') ||
    request.url.includes('/Auth/register');
  const isApiRequest = request.url.startsWith(API_BASE_URL);
  const authorizedRequest = token && isApiRequest && !isAuthRequest
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token && isApiRequest && !isAuthRequest) {
        authService.handleUnauthorized();
      }

      return throwError(() => error);
    })
  );
};
