import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-add-doctor',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-add-doctor.html',
  styleUrl: './admin-add-doctor.css'
})
export class AdminAddDoctor {
private apiUrl = 'http://localhost:5122/api/Admin/doctors';
  doctor = {
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
  isSaving = false;

  constructor(private http: HttpClient) {}

  saveDoctor(): void {
    this.message = '';
    this.isSaving = true;

    const token = localStorage.getItem('token');

    if (!token) {
      this.message = 'Admin token not found. Please log in through the backend-connected Admin login.';
      this.isSaving = false;
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.post(this.apiUrl, this.doctor, { headers }).subscribe({
      next: () => {
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
      error: (error) => {
        this.message =
          error.error?.message || 'Could not add doctor. Check the API URL, token, and backend.';
        this.isSaving = false;
      }
    });
  }
}