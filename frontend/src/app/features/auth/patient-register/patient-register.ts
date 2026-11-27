
import { Component, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

@Component({
  selector: 'app-patient-register',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './patient-register.html',
  styleUrl: './patient-register.css'
})
export class PatientRegister {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  // Replace xxxx with your backend HTTPS port.
  private readonly apiUrl =
    'https://localhost:7243/api/Auth/register';

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

    this.http.post(this.apiUrl, this.registerForm.getRawValue()).subscribe({
      next: () => {
        this.successMessage = 'Patient registered successfully!';
        this.registerForm.reset();
        this.isSubmitting = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          error.error?.message ||
          'Registration failed. Please try again.';

        this.isSubmitting = false;
      }
    });
  }
}
