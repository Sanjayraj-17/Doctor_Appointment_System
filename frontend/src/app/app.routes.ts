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
  {
    path: 'patient-dashboard',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'book-appointment/:doctorId',
    loadComponent: () =>
      import('./features/booking/booking').then((m) => m.Booking),
  },
  {
  path: 'admin-dashboard',
  loadComponent: () =>
    import('./features/admin-dashboard/admin-dashboard')
      .then((m) => m.AdminDashboard),
},
{
  path: 'admin-add-doctor',
  loadComponent: () =>
    import('./features/admin-add-doctor/admin-add-doctor')
      .then((m) => m.AdminAddDoctor),
},
];