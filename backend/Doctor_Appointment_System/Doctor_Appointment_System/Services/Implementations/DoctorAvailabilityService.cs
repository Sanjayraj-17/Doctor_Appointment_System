
using Doctor_Appointment_System.Configuration;
using Doctor_Appointment_System.Data;
using Doctor_Appointment_System.DTOs.Availability;
using Doctor_Appointment_System.Enums;
using Doctor_Appointment_System.Models;
using Doctor_Appointment_System.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Doctor_Appointment_System.Services.Implementations;

public class DoctorAvailabilityService : IDoctorAvailabilityService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly int _appointmentDurationMinutes;

    public DoctorAvailabilityService(
        ApplicationDbContext context,
        IConfiguration configuration,
        IOptions<AppointmentOptions> appointmentOptions)
    {
        _context = context;
        _configuration = configuration;
        _appointmentDurationMinutes = appointmentOptions.Value.DurationMinutes;

        if (_appointmentDurationMinutes <= 0)
        {
            throw new InvalidOperationException(
                "Appointment:DurationMinutes must be greater than zero.");
        }
    }

    public async Task<AvailabilityResult> CreateAsync(
        CreateAvailabilityRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = ValidateDateAndTime(
            request.AvailableDate,
            request.StartTime,
            request.EndTime);

        if (validationResult is not null)
            return validationResult;

        var doctorExists = await DoctorExistsAsync(
            request.DoctorId,
            cancellationToken);

        if (!doctorExists)
        {
            return new AvailabilityResult(
                AvailabilityResultStatus.NotFound,
                Message: "Doctor not found.");
        }

        var overlaps = await HasOverlappingAvailabilityAsync(
            request.DoctorId,
            request.AvailableDate,
            request.StartTime,
            request.EndTime,
            null,
            cancellationToken);

        if (overlaps)
        {
            return new AvailabilityResult(
                AvailabilityResultStatus.Conflict,
                Message: "The availability slot overlaps an existing slot for this doctor.");
        }

        var availability = new DoctorAvailability
        {
            DoctorId = request.DoctorId,
            AvailableDate = request.AvailableDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            IsAvailable = request.IsAvailable
        };

        _context.DoctorAvailabilities.Add(availability);

        await _context.SaveChangesAsync(cancellationToken);

        return new AvailabilityResult(
            AvailabilityResultStatus.Success,
            availability);
    }

    public async Task<bool> DoctorExistsAsync(
        int doctorId,
        CancellationToken cancellationToken = default)
    {
        return await _context.Doctors
            .AnyAsync(
                doctor => doctor.DoctorId == doctorId,
                cancellationToken);
    }

    public async Task<IReadOnlyList<DoctorAvailability>> GetByDoctorAsync(
        int doctorId,
        CancellationToken cancellationToken = default)
    {
        return await _context.DoctorAvailabilities
            .AsNoTracking()
            .Where(availability => availability.DoctorId == doctorId)
            .OrderBy(availability => availability.AvailableDate)
            .ThenBy(availability => availability.StartTime)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AvailableAppointmentSlotResponse>> GetAvailableSlotsAsync(
        int doctorId,
        DateOnly availableDate,
        CancellationToken cancellationToken = default)
    {
        var doctorIsActive = await _context.Doctors
            .AsNoTracking()
            .Where(doctor => doctor.DoctorId == doctorId)
            .Select(doctor => (bool?)doctor.IsActive)
            .SingleOrDefaultAsync(cancellationToken);

        if (doctorIsActive != true)
        {
            return [];
        }

        var availability = await _context.DoctorAvailabilities
            .AsNoTracking()
            .Where(item =>
                item.DoctorId == doctorId &&
                item.AvailableDate == availableDate &&
                item.IsAvailable)
            .OrderBy(item => item.StartTime)
            .ToListAsync(cancellationToken);

        if (availability.Count == 0)
        {
            return [];
        }

        var bookedAppointments = await _context.Appointments
            .AsNoTracking()
            .Where(appointment =>
                appointment.DoctorId == doctorId &&
                appointment.AppointmentDate == availableDate &&
                appointment.Status != AppointmentStatus.Cancelled)
            .Select(appointment => new
            {
                appointment.StartTime,
                appointment.EndTime
            })
            .ToListAsync(cancellationToken);

        var clinicNow = TimeZoneInfo.ConvertTime(
            DateTimeOffset.UtcNow,
            ClinicTimeZoneResolver.Resolve(_configuration));
        var clinicToday = DateOnly.FromDateTime(clinicNow.DateTime);
        var clinicCurrentTime = TimeOnly.FromDateTime(clinicNow.DateTime);
        var slots = new List<AvailableAppointmentSlotResponse>();

        if (availableDate < clinicToday)
        {
            return slots;
        }

        foreach (var window in availability)
        {
            var windowDuration = window.EndTime.ToTimeSpan() - window.StartTime.ToTimeSpan();
            var durationTicks = TimeSpan.FromMinutes(_appointmentDurationMinutes).Ticks;

            for (var offsetTicks = 0L;
                 offsetTicks + durationTicks <= windowDuration.Ticks;
                 offsetTicks += durationTicks)
            {
                var startTime = window.StartTime.Add(
                    TimeSpan.FromTicks(offsetTicks));
                var endTime = startTime.AddMinutes(_appointmentDurationMinutes);

                if (availableDate == clinicToday && startTime <= clinicCurrentTime)
                {
                    continue;
                }

                var isBooked = bookedAppointments.Any(appointment =>
                    startTime < appointment.EndTime &&
                    endTime > appointment.StartTime);

                if (!isBooked)
                {
                    slots.Add(new AvailableAppointmentSlotResponse(
                        availableDate,
                        startTime,
                        endTime));
                }
            }
        }

        return slots;
    }

    public async Task<DoctorAvailability?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _context.DoctorAvailabilities
            .AsNoTracking()
            .FirstOrDefaultAsync(
                availability => availability.AvailabilityId == id,
                cancellationToken);
    }

    public async Task<AvailabilityResult> UpdateAsync(
        int id,
        UpdateAvailabilityRequest request,
        CancellationToken cancellationToken = default)
    {
        var availability = await _context.DoctorAvailabilities
            .FirstOrDefaultAsync(
                item => item.AvailabilityId == id,
                cancellationToken);

        if (availability is null)
        {
            return new AvailabilityResult(
                AvailabilityResultStatus.NotFound,
                Message: "Availability record not found.");
        }

        var validationResult = ValidateDateAndTime(
            request.AvailableDate,
            request.StartTime,
            request.EndTime);

        if (validationResult is not null)
            return validationResult;

        var doctorExists = await DoctorExistsAsync(
            request.DoctorId,
            cancellationToken);

        if (!doctorExists)
        {
            return new AvailabilityResult(
                AvailabilityResultStatus.NotFound,
                Message: "Doctor not found.");
        }

        var overlaps = await HasOverlappingAvailabilityAsync(
            request.DoctorId,
            request.AvailableDate,
            request.StartTime,
            request.EndTime,
            id,
            cancellationToken);

        if (overlaps)
        {
            return new AvailabilityResult(
                AvailabilityResultStatus.Conflict,
                Message: "The availability slot overlaps an existing slot for this doctor.");
        }

        availability.DoctorId = request.DoctorId;
        availability.AvailableDate = request.AvailableDate;
        availability.StartTime = request.StartTime;
        availability.EndTime = request.EndTime;
        availability.IsAvailable = request.IsAvailable;

        await _context.SaveChangesAsync(cancellationToken);

        return new AvailabilityResult(
            AvailabilityResultStatus.Success,
            availability);
    }

    public async Task<AvailabilityResult> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var availability = await _context.DoctorAvailabilities
            .FirstOrDefaultAsync(
                item => item.AvailabilityId == id,
                cancellationToken);

        if (availability is null)
        {
            return new AvailabilityResult(
                AvailabilityResultStatus.NotFound,
                Message: "Availability record not found.");
        }

        _context.DoctorAvailabilities.Remove(availability);

        await _context.SaveChangesAsync(cancellationToken);

        return new AvailabilityResult(
            AvailabilityResultStatus.Success);
    }

    private async Task<bool> HasOverlappingAvailabilityAsync(
        int doctorId,
        DateOnly availableDate,
        TimeOnly startTime,
        TimeOnly endTime,
        int? excludedAvailabilityId,
        CancellationToken cancellationToken)
    {
        return await _context.DoctorAvailabilities.AnyAsync(
            availability =>
                availability.DoctorId == doctorId &&
                availability.AvailableDate == availableDate &&
                (!excludedAvailabilityId.HasValue ||
                 availability.AvailabilityId != excludedAvailabilityId.Value) &&
                startTime < availability.EndTime &&
                endTime > availability.StartTime,
            cancellationToken);
    }

    private AvailabilityResult? ValidateDateAndTime(
        DateOnly availableDate,
        TimeOnly startTime,
        TimeOnly endTime)
    {
        var clinicNow = TimeZoneInfo.ConvertTime(
            DateTimeOffset.UtcNow,
            ClinicTimeZoneResolver.Resolve(_configuration));
        var todayInIndia = DateOnly.FromDateTime(clinicNow.DateTime);

        if (availableDate < todayInIndia)
        {
            return new AvailabilityResult(
                AvailabilityResultStatus.Invalid,
                Message: "Availability date cannot be in the past.");
        }

        if (startTime >= endTime)
        {
            return new AvailabilityResult(
                AvailabilityResultStatus.Invalid,
                Message: "Start time must be earlier than end time.");
        }

        if (availableDate == todayInIndia &&
            startTime <= TimeOnly.FromDateTime(clinicNow.DateTime))
        {
            return new AvailabilityResult(
                AvailabilityResultStatus.Invalid,
                Message: "Availability start time must be in the future.");
        }

        return null;
    }
}
