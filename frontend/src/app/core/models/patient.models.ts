import { AppointmentStatus } from './appointment.models';

export type Gender = 'Male' | 'Female' | 'Other';

export interface UpdatePatientProfileRequest {
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber: string;
  address: string;
}

export interface PatientAppointment {
  appointmentId: number;
  doctorId: number;
  doctorName: string | null;
  doctorQualification: string | null;
  specialityName: string | null;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  status: AppointmentStatus;
}

