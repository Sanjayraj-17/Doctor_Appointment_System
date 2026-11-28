import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthRole } from './auth.models';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  const requiredRole = route.data['requiredRole'] as AuthRole | undefined;
  return router.createUrlTree(
    [authService.getLoginPath(requiredRole ?? null)],
    { queryParams: { returnUrl: state.url } }
  );
};
