export type AuthRole = 'Patient' | 'Doctor' | 'Admin';

export interface AuthUser {
  patientId?: number;
  fullName: string;
  email: string;
  role: AuthRole;
  userId: string;
  doctorId?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface PatientProfile {
  patientId: number;
  fullName: string;
  email: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  phoneNumber: string;
  address: string;
}

export function isAuthRole(value: unknown): value is AuthRole {
  return value === 'Patient' || value === 'Doctor' || value === 'Admin';
}
