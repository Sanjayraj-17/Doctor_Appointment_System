import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/api/admin.service';
import { getApiErrorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { CreateDoctorAccountRequest } from '../../core/models/admin.models';

@Component({
  selector: 'app-admin-add-doctor',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-add-doctor.html',
  styleUrl: './admin-add-doctor.css'
})
export class AdminAddDoctor {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);

  doctor: CreateDoctorAccountRequest = {
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    specialityId: 0,
    qualification: '',
    experienceYears: 0,
    consultationFee: 0,
    bio: ''
  };

  message = '';
  isError = false;
  isSaving = false;

  saveDoctor(): void {
    this.message = '';
    this.isError = false;

    if (!this.authService.getToken()) {
      this.isError = true;
      this.message = 'Admin session not found. Please log in through Admin login.';
      return;
    }

    this.isSaving = true;
    const payload: CreateDoctorAccountRequest = {
      ...this.doctor,
      bio: this.doctor.bio?.trim() || null
    };

    this.adminService.createDoctor(payload).subscribe({
      next: () => {
        this.isError = false;
        this.message = 'Doctor added successfully.';
        this.isSaving = false;

        this.doctor = {
          fullName: '',
          email: '',
          password: '',
          phoneNumber: '',
          specialityId: 0,
          qualification: '',
          experienceYears: 0,
          consultationFee: 0,
          bio: ''
        };
      },
      error: (error: unknown) => {
        this.isError = true;
        this.message = getApiErrorMessage(
          error,
          'Could not add doctor. Check the entered details and backend connection.'
        );
        this.isSaving = false;
      }
    });
  }
}