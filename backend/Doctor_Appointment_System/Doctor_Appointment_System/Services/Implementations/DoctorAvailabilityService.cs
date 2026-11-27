using Doctor_Appointment_System.Data;
using Doctor_Appointment_System.DTOs.Availability;
using Doctor_Appointment_System.Models;
using Doctor_Appointment_System.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Services.Implementations;

public class DoctorAvailabilityService : IDoctorAvailabilityService
{
    private readonly ApplicationDbContext _context;

    public DoctorAvailabilityService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AvailabilityResult> CreateAsync(
        CreateAvailabilityRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = ValidateDateAndTime(request.AvailableDate, request.StartTime, request.EndTime);
        if (validationResult is not null)
            return validationResult;

        var doctorExists = await DoctorExistsAsync(request.DoctorId, cancellationToken);

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
            .AnyAsync(doctor => doctor.DoctorId == doctorId, cancellationToken);
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

    public async Task<DoctorAvailability?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _context.DoctorAvailabilities
            .AsNoTracking()
            .FirstOrDefaultAsync(availability => availability.AvailabilityId == id, cancellationToken);
    }

    public async Task<AvailabilityResult> UpdateAsync(
        int id,
        UpdateAvailabilityRequest request,
        CancellationToken cancellationToken = default)
    {
        var availability = await _context.DoctorAvailabilities
            .FirstOrDefaultAsync(item => item.AvailabilityId == id, cancellationToken);

        if (availability is null)
        {
            return new AvailabilityResult(
                AvailabilityResultStatus.NotFound,
                Message: "Availability record not found.");
        }

        var validationResult = ValidateDateAndTime(request.AvailableDate, request.StartTime, request.EndTime);
        if (validationResult is not null)
            return validationResult;

        var doctorExists = await DoctorExistsAsync(request.DoctorId, cancellationToken);

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
            .FirstOrDefaultAsync(item => item.AvailabilityId == id, cancellationToken);

        if (availability is null)
        {
            return new AvailabilityResult(
                AvailabilityResultStatus.NotFound,
                Message: "Availability record not found.");
        }

        _context.DoctorAvailabilities.Remove(availability);
        await _context.SaveChangesAsync(cancellationToken);

        return new AvailabilityResult(AvailabilityResultStatus.Success);
    }

    private async Task<bool> HasOverlappingAvailabilityAsync(
        int doctorId,
        DateOnly availableDate,
        TimeOnly startTime,
        TimeOnly endTime,
        int? excludedAvailabilityId,
        CancellationToken cancellationToken)
    {
        return await _context.DoctorAvailabilities.AnyAsync(availability =>
            availability.DoctorId == doctorId &&
            availability.AvailableDate == availableDate &&
            (!excludedAvailabilityId.HasValue || availability.AvailabilityId != excludedAvailabilityId.Value) &&
            startTime < availability.EndTime &&
            endTime > availability.StartTime,
            cancellationToken);
    }

    private static AvailabilityResult? ValidateDateAndTime(
        DateOnly availableDate,
        TimeOnly startTime,
        TimeOnly endTime)
    {
        if (availableDate < DateOnly.FromDateTime(DateTime.Today))
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

        return null;
    }
}
