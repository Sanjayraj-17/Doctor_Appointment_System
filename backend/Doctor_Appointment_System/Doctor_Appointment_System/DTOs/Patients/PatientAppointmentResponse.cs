using Doctor_Appointment_System.Enums;

namespace Doctor_Appointment_System.DTOs.Patients;

public sealed record PatientAppointmentResponse(
    int AppointmentId,
    int DoctorId,
    string? DoctorName,
    string? DoctorQualification,
    string? SpecialityName,
    DateOnly AppointmentDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string? Reason,
    AppointmentStatus Status);
