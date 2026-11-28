using Doctor_Appointment_System.Data;
using Doctor_Appointment_System.Configuration;
using Doctor_Appointment_System.DTOs.Patients;
using Doctor_Appointment_System.Enums;
using Doctor_Appointment_System.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Services;

public sealed class PatientService : IPatientService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IConfiguration _configuration;

    public PatientService(
        ApplicationDbContext dbContext,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _configuration = configuration;
    }

    public async Task<PatientProfileResponse?> GetProfileAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Patients
            .AsNoTracking()
            .Where(patient => patient.UserId == userId)
            .Select(patient => new PatientProfileResponse(
                patient.PatientId,
                patient.User.FullName,
                patient.User.Email ?? string.Empty,
                patient.DateOfBirth,
                patient.Gender,
                patient.PhoneNumber,
                patient.Address))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<PatientProfileResponse?> UpdateProfileAsync(
        string userId,
        UpdatePatientProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var patient = await _dbContext.Patients
            .Include(item => item.User)
            .SingleOrDefaultAsync(
                item => item.UserId == userId,
                cancellationToken);

        if (patient is null)
        {
            return null;
        }

        patient.User.FullName = request.FullName.Trim();
        patient.DateOfBirth = request.DateOfBirth!.Value;
        patient.Gender = request.Gender!.Value;
        patient.PhoneNumber = request.PhoneNumber.Trim();
        patient.Address = request.Address.Trim();

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetProfileAsync(userId, cancellationToken);
    }

    public async Task<IReadOnlyList<PatientAppointmentResponse>?> GetAppointmentsAsync(
        string userId,
        bool historyOnly,
        CancellationToken cancellationToken = default)
    {
        var patientId = await _dbContext.Patients
            .AsNoTracking()
            .Where(patient => patient.UserId == userId)
            .Select(patient => (int?)patient.PatientId)
            .SingleOrDefaultAsync(cancellationToken);

        if (patientId is null)
        {
            return null;
        }

        var clinicNow = TimeZoneInfo.ConvertTime(
            DateTimeOffset.UtcNow,
            ClinicTimeZoneResolver.Resolve(_configuration));
        var today = DateOnly.FromDateTime(clinicNow.DateTime);
        var appointmentsQuery = _dbContext.Appointments
            .AsNoTracking()
            .Include(appointment => appointment.Doctor)
                .ThenInclude(doctor => doctor!.Speciality)
            .Where(appointment => appointment.PatientId == patientId.Value);

        if (historyOnly)
        {
            appointmentsQuery = appointmentsQuery.Where(appointment =>
                appointment.Status == AppointmentStatus.Completed ||
                appointment.Status == AppointmentStatus.Cancelled ||
                appointment.AppointmentDate < today);
        }

        var appointments = await appointmentsQuery
            .OrderBy(appointment => appointment.AppointmentDate)
            .ThenBy(appointment => appointment.StartTime)
            .ToListAsync(cancellationToken);

        var doctorUserIds = appointments
            .Where(appointment => appointment.Doctor is not null)
            .Select(appointment => appointment.Doctor!.UserId)
            .Distinct()
            .ToArray();
        var doctorNames = await _dbContext.Users
            .AsNoTracking()
            .Where(user => doctorUserIds.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, user => user.FullName, cancellationToken);

        return appointments
            .Select(appointment => new PatientAppointmentResponse(
                appointment.AppointmentId,
                appointment.DoctorId,
                appointment.Doctor is not null && doctorNames.TryGetValue(appointment.Doctor.UserId, out var doctorName)
                    ? doctorName
                    : null,
                appointment.Doctor?.Qualification,
                appointment.Doctor?.Speciality?.Name,
                appointment.AppointmentDate,
                appointment.StartTime,
                appointment.EndTime,
                appointment.Reason,
                appointment.Status))
            .ToArray();
    }
}
