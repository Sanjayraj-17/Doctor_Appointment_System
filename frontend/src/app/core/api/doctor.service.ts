import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { Doctor } from '../models/doctor.models';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly http = inject(HttpClient);

  getDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${API_BASE_URL}/Doctor`);
  }

  getDoctorById(doctorId: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${API_BASE_URL}/Doctor/${doctorId}`);
  }

  getMyProfile(): Observable<Doctor> {
    return this.http.get<Doctor>(`${API_BASE_URL}/Doctor/me`);
  }

  searchDoctorsBySpeciality(specialityId: number): Observable<Doctor[]> {
    const params = new HttpParams().set('specialityId', specialityId);
    return this.http.get<Doctor[]>(`${API_BASE_URL}/Doctor/search`, { params });
  }
}
