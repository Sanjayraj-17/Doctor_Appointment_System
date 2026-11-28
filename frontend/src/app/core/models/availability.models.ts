export interface DoctorAvailability {
  availabilityId: number;
  doctorId: number;
  availableDate: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface AvailabilityRequest {
  doctorId?: number;
  availableDate: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}
