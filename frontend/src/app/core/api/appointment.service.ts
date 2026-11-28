import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  AppointmentResponse,
  AppointmentStatus,
  CreateAppointmentRequest,
} from '../models/appointment.models';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);

  create(request: CreateAppointmentRequest): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(`${API_BASE_URL}/Appointment`, request);
  }

  getForDoctor(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${API_BASE_URL}/Appointment/doctor`);
  }

  getById(appointmentId: number): Observable<AppointmentResponse> {
    return this.http.get<AppointmentResponse>(`${API_BASE_URL}/Appointment/${appointmentId}`);
  }

  updateStatus(
    appointmentId: number,
    status: AppointmentStatus,
  ): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(
      `${API_BASE_URL}/Appointment/${appointmentId}/status`,
      { status },
    );
  }
}
