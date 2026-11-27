
import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-patient-register',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './patient-register.html',
  styleUrl: './patient-register.css'
})
export class PatientRegister {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  registerForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    dateOfBirth: ['', Validators.required],
    gender: ['', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.maxLength(15)]],
    address: ['', [Validators.required, Validators.maxLength(250)]]
  });

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.authService.register(this.registerForm.getRawValue()).subscribe({
      next: response => {
        this.authService.saveSession(response);
        this.registerForm.reset();
        this.isSubmitting = false;
        this.successMessage = this.authService.navigateToDashboardIfConfigured()
          ? ''
          : 'Registration successful. The Patient Dashboard route is not configured yet.';
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.getErrorMessage(error, 'Registration failed. Please try again.');
        this.isSubmitting = false;
      }
    });
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const apiErrors = error.error?.errors as Record<string, string[]> | undefined;
    const validationMessage = apiErrors
      ? Object.values(apiErrors).flat().join(' ')
      : '';

    return validationMessage || error.error?.message || fallback;
  }
}
