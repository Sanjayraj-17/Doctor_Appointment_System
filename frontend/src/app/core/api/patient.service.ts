import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { ApiEnvelope } from '../models/api.models';
import { AppointmentResponse } from '../models/appointment.models';
import {
  PatientAppointment,
  UpdatePatientProfileRequest,
} from '../models/patient.models';
import { PatientProfile } from '../auth/auth.models';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly http = inject(HttpClient);

  updateProfile(request: UpdatePatientProfileRequest): Observable<PatientProfile> {
    return this.http
      .put<ApiEnvelope<PatientProfile>>(`${API_BASE_URL}/patients/me`, request)
      .pipe(map(response => response.data));
  }

  getAppointments(): Observable<PatientAppointment[]> {
    return this.http
      .get<ApiEnvelope<PatientAppointment[]>>(`${API_BASE_URL}/patients/me/appointments`)
      .pipe(map(response => response.data));
  }

  getAppointmentHistory(): Observable<PatientAppointment[]> {
    return this.http
      .get<ApiEnvelope<PatientAppointment[]>>(
        `${API_BASE_URL}/patients/me/appointments/history`,
      )
      .pipe(map(response => response.data));
  }

  cancelAppointment(appointmentId: number): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(
      `${API_BASE_URL}/Appointment/${appointmentId}/cancel`,
      {},
    );
  }
}
