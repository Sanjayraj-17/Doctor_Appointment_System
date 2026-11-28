import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthRole } from './auth.models';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiredRole = route.data['requiredRole'] as AuthRole | undefined;

  if (!requiredRole) {
    return router.createUrlTree(['/patient-login']);
  }

  if (!authService.isAuthenticated()) {
    return router.createUrlTree([authService.getLoginPath(requiredRole)]);
  }

  const currentRole = authService.getRole();
  if (currentRole === requiredRole) {
    return true;
  }

  if (currentRole) {
    return router.createUrlTree([authService.getDashboardPath(currentRole)]);
  }

  authService.clearSession();
  return router.createUrlTree([authService.getLoginPath(requiredRole)]);
};
