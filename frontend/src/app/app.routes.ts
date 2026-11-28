import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

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
    path: 'doctor-login',
    loadComponent: () =>
      import('./features/auth/doctor-login/doctor-login')
        .then((m) => m.DoctorLogin),
  },
  {
    path: 'patient-register',
    loadComponent: () =>
      import('./features/auth/patient-register/patient-register')
        .then((m) => m.PatientRegister),
  },
  {
    path: 'patient-dashboard',
    canActivate: [authGuard, roleGuard],
    data: { requiredRole: 'Patient' },
    loadComponent: () =>
      import('./features/home/home')
        .then((m) => m.Home),
  },
  {
    path: 'book-appointment/:doctorId',
    canActivate: [authGuard, roleGuard],
    data: { requiredRole: 'Patient' },
    loadComponent: () =>
      import('./features/appointments/book-appointment')
        .then((m) => m.BookAppointment),
  },
  {
    path: 'doctor-dashboard',
    canActivate: [authGuard, roleGuard],
    data: { requiredRole: 'Doctor' },
    loadComponent: () =>
      import('./features/doctor/doctor-dashboard')
        .then((m) => m.DoctorDashboard),
  },
  {
    path: 'admin-dashboard',
    canActivate: [authGuard, roleGuard],
    data: { requiredRole: 'Admin' },
    loadComponent: () =>
      import('./features/admin/admin-dashboard')
        .then((m) => m.AdminDashboard),
  },
  {
    path: 'admin-add-doctor',
    canActivate: [authGuard, roleGuard],
    data: { requiredRole: 'Admin' },
    loadComponent: () =>
      import('./features/admin-add-doctor/admin-add-doctor')
        .then((m) => m.AdminAddDoctor),
  },
  {
    path: '**',
    redirectTo: 'patient-login',
  },
];
