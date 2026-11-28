using Doctor_Appointment_System.Enums;

namespace Doctor_Appointment_System.DTOs.Admin;

public sealed record AdminPatientResponse(
    int PatientId,
    string FullName,
    string Email,
    DateTime DateOfBirth,
    Gender Gender,
    string PhoneNumber,
    string Address);
