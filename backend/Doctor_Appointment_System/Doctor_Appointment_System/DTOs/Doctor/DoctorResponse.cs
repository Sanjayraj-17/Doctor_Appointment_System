namespace Doctor_Appointment_System.DTOs.Doctor;

public sealed record DoctorResponse(
    int DoctorId,
    string FullName,
    string Qualification,
    int ExperienceYears,
    decimal ConsultationFee,
    int SpecialityId,
    string SpecialityName,
    string? Bio,
    bool IsActive);
