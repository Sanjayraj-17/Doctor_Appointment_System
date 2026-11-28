using Doctor_Appointment_System.DTOs.Admin;

namespace Doctor_Appointment_System.Services.Interfaces;

public interface IAdminService
{
    Task<AdminDoctorRegistrationResult> RegisterDoctorAsync(
        CreateDoctorAccountRequest request,
        CancellationToken cancellationToken = default);
}

public enum AdminOperationStatus
{
    Success,
    Invalid,
    NotFound,
    Conflict,
    Failure
}

public sealed record DoctorAccountDetails(
    int DoctorId,
    string FullName,
    string Email,
    string PhoneNumber,
    int SpecialityId,
    string Qualification,
    int ExperienceYears,
    decimal ConsultationFee,
    string? Bio);

public sealed record AdminDoctorRegistrationResult(
    AdminOperationStatus Status,
    DoctorAccountDetails? Doctor = null,
    string? Message = null,
    IReadOnlyCollection<string>? Errors = null);