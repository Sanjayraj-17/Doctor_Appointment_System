import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getApiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-doctor-login',
  styleUrl: '../patient-login/patient-login.css',
  templateUrl: './doctor-login.html',
})
export class DoctorLogin {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  isSubmitting = false;
  errorMessage = '';

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.authService.loginDoctor(this.loginForm.getRawValue()).subscribe({
      next: (response) => {
        this.authService.saveSession(response);
        this.isSubmitting = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.authService.navigateToDashboardIfConfigured(returnUrl);
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
