using Doctor_Appointment_System.DTOs.Availability;
using Doctor_Appointment_System.Models;

namespace Doctor_Appointment_System.Services.Interfaces;

public enum AvailabilityResultStatus
{
    Success,
    NotFound,
    Invalid,
    Conflict
}

public sealed record AvailabilityResult(
    AvailabilityResultStatus Status,
    DoctorAvailability? Availability = null,
    string? Message = null);

public interface IDoctorAvailabilityService
{
    Task<AvailabilityResult> CreateAsync(
        CreateAvailabilityRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DoctorExistsAsync(
        int doctorId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DoctorAvailability>> GetByDoctorAsync(
        int doctorId,
        CancellationToken cancellationToken = default);

    Task<DoctorAvailability?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<AvailabilityResult> UpdateAsync(
        int id,
        UpdateAvailabilityRequest request,
        CancellationToken cancellationToken = default);

    Task<AvailabilityResult> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default);
}
