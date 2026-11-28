import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  AdminDashboardStatistics,
  AdminPatient,
  CreateDoctorAccountRequest,
  DoctorAccountDetails,
  UpdateDoctorRequest,
} from '../models/admin.models';
import { AdminAppointment, AppointmentStatus } from '../models/appointment.models';
import { Doctor } from '../models/doctor.models';

export interface AdminAppointmentFilters {
  date?: string;
  doctorId?: number;
  patientId?: number;
  status?: AppointmentStatus | '';
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<AdminDashboardStatistics> {
    return this.http.get<AdminDashboardStatistics>(`${API_BASE_URL}/Admin/dashboard`);
  }

  getPatients(): Observable<AdminPatient[]> {
    return this.http.get<AdminPatient[]>(`${API_BASE_URL}/Admin/patients`);
  }

  getDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${API_BASE_URL}/Admin/doctors`);
  }

  createDoctor(request: CreateDoctorAccountRequest): Observable<DoctorAccountDetails> {
    return this.http.post<DoctorAccountDetails>(
      `${API_BASE_URL}/Admin/doctors`,
      request,
    );
  }

  updateDoctor(
    doctorId: number,
    request: UpdateDoctorRequest,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${API_BASE_URL}/Doctor/${doctorId}`,
      request,
    );
  }

  deactivateDoctor(doctorId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_BASE_URL}/Doctor/${doctorId}`);
  }

  getAppointments(filters: AdminAppointmentFilters = {}): Observable<AdminAppointment[]> {
    let params = new HttpParams();
    if (filters.date) {
      params = params.set('date', filters.date);
    }
    if (filters.doctorId) {
      params = params.set('doctorId', filters.doctorId);
    }
    if (filters.patientId) {
      params = params.set('patientId', filters.patientId);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<AdminAppointment[]>(`${API_BASE_URL}/Admin/appointments`, {
      params,
    });
  }

  getAppointment(appointmentId: number): Observable<AdminAppointment> {
    return this.http.get<AdminAppointment>(
      `${API_BASE_URL}/Admin/appointments/${appointmentId}`,
    );
  }
}
