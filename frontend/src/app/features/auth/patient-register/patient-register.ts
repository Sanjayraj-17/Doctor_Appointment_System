import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { getApiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { getClinicDate } from '../../../core/utils/clinic-time';

@Component({
  selector: 'app-patient-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './patient-register.html',
  styleUrl: './patient-register.css',
})
export class PatientRegister {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly maxDob = getClinicDate();
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
    address: ['', [Validators.required, Validators.maxLength(250)]],
  });

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    if (this.registerForm.controls.dateOfBirth.value > this.maxDob) {
      this.errorMessage = 'Date of birth cannot be in the future.';
      return;
    }

    this.isSubmitting = true;

    this.authService.register(this.registerForm.getRawValue()).subscribe({
      next: (response) => {
        this.authService.saveSession(response);
        this.registerForm.reset();
        this.isSubmitting = false;
        this.successMessage = this.authService.navigateToDashboardIfConfigured()
          ? ''
          : 'Registration successful.';
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.errorMessage = getApiErrorMessage(
          error,
          'Registration failed. Please review your details and try again.',
        );
        this.isSubmitting = false;
        this.cdr.markForCheck();
      },
    });
  }
}
