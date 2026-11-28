import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  AvailabilityRequest,
  DoctorAvailability,
} from '../models/availability.models';
import { AvailableAppointmentSlot } from '../models/appointment.models';

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly http = inject(HttpClient);

  getForDoctor(doctorId: number): Observable<DoctorAvailability[]> {
    return this.http.get<DoctorAvailability[]>(
      `${API_BASE_URL}/DoctorAvailability/doctor/${doctorId}`,
    );
  }

  getAvailableSlots(
    doctorId: number,
    date: string,
  ): Observable<AvailableAppointmentSlot[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<AvailableAppointmentSlot[]>(
      `${API_BASE_URL}/DoctorAvailability/doctor/${doctorId}/slots`,
      { params },
    );
  }

  create(request: AvailabilityRequest): Observable<DoctorAvailability> {
    return this.http.post<DoctorAvailability>(
      `${API_BASE_URL}/DoctorAvailability`,
      normalizeAvailabilityRequest(request),
    );
  }

  update(
    availabilityId: number,
    request: AvailabilityRequest,
  ): Observable<DoctorAvailability> {
    return this.http.put<DoctorAvailability>(
      `${API_BASE_URL}/DoctorAvailability/${availabilityId}`,
      normalizeAvailabilityRequest(request),
    );
  }

  delete(availabilityId: number): Observable<void> {
    return this.http.delete<void>(
      `${API_BASE_URL}/DoctorAvailability/${availabilityId}`,
    );
  }
}

function normalizeAvailabilityRequest(request: AvailabilityRequest): AvailabilityRequest {
  return {
    ...request,
    startTime: ensureTimeWithSeconds(request.startTime),
    endTime: ensureTimeWithSeconds(request.endTime),
  };
}

function ensureTimeWithSeconds(time: string): string {
  const trimmed = time.trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
}
