using Doctor_Appointment_System.Enums;

namespace Doctor_Appointment_System.DTOs.Admin;

public sealed record AdminAppointmentResponse(
    int AppointmentId,
    int PatientId,
    string PatientName,
    int DoctorId,
    string DoctorName,
    string DoctorQualification,
    string SpecialityName,
    DateOnly AppointmentDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string? Reason,
    AppointmentStatus Status,
    DateTime CreatedAt);
