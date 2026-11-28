export interface Doctor {
  doctorId: number;
  fullName: string;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  specialityId: number;
  specialityName: string;
  bio: string | null;
  isActive: boolean;
}

export interface Speciality {
  specialityId: number;
  name: string;
  description: string | null;
}
