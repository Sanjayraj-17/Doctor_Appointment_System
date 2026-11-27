import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-patient-login',
  standalone: true,
  styleUrl: './patient-login.css',
  templateUrl: './patient-login.html',
})
export class PatientLogin {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: response => {
        this.authService.saveSession(response);
        this.isSubmitting = false;
        this.successMessage = this.authService.navigateToDashboardIfConfigured()
          ? ''
          : 'Login successful. The Patient Dashboard route is not configured yet.';
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Login failed. Please check your credentials.';
        this.isSubmitting = false;
      }
    });
  }
}
