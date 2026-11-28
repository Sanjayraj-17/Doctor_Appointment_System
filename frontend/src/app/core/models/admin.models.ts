import { Gender } from './patient.models';

export interface AdminDashboardStatistics {
  patientCount: number;
  doctorCount: number;
  activeDoctorCount: number;
  appointmentCount: number;
  pendingAppointmentCount: number;
  confirmedAppointmentCount: number;
  completedAppointmentCount: number;
  cancelledAppointmentCount: number;
}

export interface AdminPatient {
  patientId: number;
  fullName: string;
  email: string;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber: string;
  address: string;
}

export interface CreateDoctorAccountRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  specialityId: number;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  bio: string | null;
}

export interface DoctorAccountDetails {
  doctorId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  specialityId: number;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  bio: string | null;
}

export interface UpdateDoctorRequest {
  specialityId: number;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  bio: string | null;
  isActive: boolean;
}
