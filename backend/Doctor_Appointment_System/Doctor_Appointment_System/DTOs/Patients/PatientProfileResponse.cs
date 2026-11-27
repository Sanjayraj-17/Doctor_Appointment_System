using Doctor_Appointment_System.Enums;

namespace Doctor_Appointment_System.DTOs.Patients;

public sealed record PatientProfileResponse(
    int PatientId,
    string FullName,
    string Email,
    DateTime DateOfBirth,
    Gender Gender,
    string PhoneNumber,
    string Address);
