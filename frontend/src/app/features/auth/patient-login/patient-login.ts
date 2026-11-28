import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getApiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-patient-login',
  standalone: true,
  styleUrl: './patient-login.css',
  templateUrl: './patient-login.html',
})
export class PatientLogin {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
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
      next: (response) => {
        this.authService.saveSession(response);
        this.isSubmitting = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.successMessage = this.authService.navigateToDashboardIfConfigured(returnUrl)
          ? ''
          : 'Login successful.';
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.errorMessage = getApiErrorMessage(
          error,
          'Login failed. Please check your credentials.',
        );
        this.isSubmitting = false;
        this.cdr.markForCheck();
      },
    });
  }
}
