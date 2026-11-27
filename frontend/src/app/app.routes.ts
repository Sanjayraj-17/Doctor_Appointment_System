import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'patient-login',
    pathMatch: 'full',
  },
  {
    path: 'patient-login',
    loadComponent: () =>
      import('./features/auth/patient-login/patient-login')
        .then((m) => m.PatientLogin),
  },
  {
    path: 'admin-login',
    loadComponent: () =>
      import('./features/auth/admin-login/admin-login')
        .then((m) => m.AdminLogin),
  },
  {
    path: 'patient-register',
    loadComponent: () =>
      import('./features/auth/patient-register/patient-register')
        .then((m) => m.PatientRegister),
  },
];