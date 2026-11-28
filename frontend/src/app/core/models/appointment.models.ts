export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface AppointmentResponse {
  appointmentId: number;
  patientId: number;
  doctorId: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  status: AppointmentStatus;
  createdAt: string;
}

export interface CreateAppointmentRequest {
  doctorId: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason: string | null;
}

export interface AvailableAppointmentSlot {
  availableDate: string;
  startTime: string;
  endTime: string;
}

export interface AdminAppointment {
  appointmentId: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  doctorQualification: string;
  specialityName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  status: AppointmentStatus;
  createdAt: string;
}
