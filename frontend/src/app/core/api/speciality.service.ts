import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { Speciality } from '../models/doctor.models';

export interface UpdateSpecialityRequest {
  specialityId: number;
  name: string;
  description: string | null;
}

export interface CreateSpecialityRequest {
  name: string;
  description: string | null;
}

@Injectable({ providedIn: 'root' })
export class SpecialityService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Speciality[]> {
    return this.http.get<Speciality[]>(`${API_BASE_URL}/Speciality`);
  }

  create(request: CreateSpecialityRequest): Observable<Speciality> {
    return this.http.post<Speciality>(`${API_BASE_URL}/Speciality`, request);
  }

  update(id: number, request: UpdateSpecialityRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${API_BASE_URL}/Speciality/${id}`,
      request,
    );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_BASE_URL}/Speciality/${id}`);
  }
}
