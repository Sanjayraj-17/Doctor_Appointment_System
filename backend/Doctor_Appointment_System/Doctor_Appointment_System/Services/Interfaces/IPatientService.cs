using Doctor_Appointment_System.DTOs.Patients;

namespace Doctor_Appointment_System.Services.Interfaces;

public interface IPatientService
{
    Task<PatientProfileResponse?> GetProfileAsync(string userId, CancellationToken cancellationToken = default);

    Task<PatientProfileResponse?> UpdateProfileAsync(
        string userId,
        UpdatePatientProfileRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PatientAppointmentResponse>?> GetAppointmentsAsync(
        string userId,
        bool historyOnly,
        CancellationToken cancellationToken = default);
}
