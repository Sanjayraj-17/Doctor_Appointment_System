
using System.Data;
using System.Security.Claims;
using Doctor_Appointment_System.Data;
using Doctor_Appointment_System.DTOs.Appointment;
using Doctor_Appointment_System.Enums;
using Doctor_Appointment_System.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AppointmentController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly TimeZoneInfo _clinicTimeZone;

    public AppointmentController(
        ApplicationDbContext context,
        IConfiguration configuration)
    {
        _context = context;

        var timeZoneId = configuration["ClinicTimeZoneId"]
                         ?? "Asia/Kolkata";

        _clinicTimeZone =
            TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
    }

    // POST: api/Appointment
    [HttpPost]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> Create(
        CreateAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        if (userId is null)
            return Unauthorized(new { message = "Invalid user identity." });

        var patient = await _context.Patients
            .FirstOrDefaultAsync(
                p => p.UserId == userId,
                cancellationToken);

        if (patient is null)
            return NotFound(new { message = "Patient profile not found." });

        // Validate date and time using clinic timezone.
        var clinicNow = TimeZoneInfo.ConvertTime(
            DateTimeOffset.UtcNow,
            _clinicTimeZone);

        var clinicToday = DateOnly.FromDateTime(
            clinicNow.DateTime);

        var clinicCurrentTime = TimeOnly.FromDateTime(
            clinicNow.DateTime);

        if (request.AppointmentDate == default)
            return BadRequest(new { message = "Appointment date is required." });

        if (request.AppointmentDate < clinicToday)
            return BadRequest(new { message = "Past appointment dates are not allowed." });

        if (request.AppointmentDate == clinicToday &&
            request.StartTime <= clinicCurrentTime)
        {
            return BadRequest(new { message = "Appointment time must be in the future." });
        }

        if (request.StartTime >= request.EndTime)
            return BadRequest(new { message = "Start time must be earlier than end time." });

        if (request.DoctorId <= 0)
            return BadRequest(new { message = "Valid DoctorId is required." });

        // Serializable transaction protects availability and overlap checks
        // against concurrent booking requests.
        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

        var doctor = await _context.Doctors
            .FirstOrDefaultAsync(
                d => d.DoctorId == request.DoctorId,
                cancellationToken);

        if (doctor is null)
            return NotFound(new { message = "Doctor not found." });

        if (!doctor.IsActive)
            return Conflict(new { message = "This doctor is not currently available." });

        // Check whether one availability slot covers the requested time.
        var hasAvailability = await _context.DoctorAvailabilities
            .AnyAsync(a =>
                a.DoctorId == doctor.DoctorId &&
                a.AvailableDate == request.AppointmentDate &&
                a.IsAvailable &&
                a.StartTime <= request.StartTime &&
                a.EndTime >= request.EndTime,
                cancellationToken);

        if (!hasAvailability)
            return Conflict(new { message = "Doctor is not available for this time slot." });

        // Check overlapping appointments for this doctor.
        var doctorHasOverlap = await _context.Appointments
            .AnyAsync(a =>
                a.DoctorId == doctor.DoctorId &&
                a.AppointmentDate == request.AppointmentDate &&
                a.Status != AppointmentStatus.Cancelled &&
                request.StartTime < a.EndTime &&
                request.EndTime > a.StartTime,
                cancellationToken);

        if (doctorHasOverlap)
            return Conflict(new { message = "Doctor already has an appointment during this time." });

        // Check overlapping appointments for this patient.
        var patientHasOverlap = await _context.Appointments
            .AnyAsync(a =>
                a.PatientId == patient.PatientId &&
                a.AppointmentDate == request.AppointmentDate &&
                a.Status != AppointmentStatus.Cancelled &&
                request.StartTime < a.EndTime &&
                request.EndTime > a.StartTime,
                cancellationToken);

        if (patientHasOverlap)
            return Conflict(new { message = "You already have an appointment during this time." });

        var appointment = new Appointment
        {
            PatientId = patient.PatientId,
            DoctorId = doctor.DoctorId,
            AppointmentDate = request.AppointmentDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            Reason = string.IsNullOrWhiteSpace(request.Reason)
                ? null
                : request.Reason.Trim(),
            Status = AppointmentStatus.Pending
        };

        _context.Appointments.Add(appointment);

        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = appointment.AppointmentId },
            ToResponse(appointment));
    }

    // GET: api/Appointment/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var appointment = await _context.Appointments
            .AsNoTracking()
            .FirstOrDefaultAsync(
                a => a.AppointmentId == id,
                cancellationToken);

        if (appointment is null)
            return NotFound(new { message = "Appointment not found." });

        if (!await CanAccessAppointmentAsync(appointment, cancellationToken))
            return Forbid();

        return Ok(ToResponse(appointment));
    }

    // GET: api/Appointment/patient
    [HttpGet("patient")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> GetForPatient(
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        if (userId is null)
            return Unauthorized();

        var patient = await _context.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(
                p => p.UserId == userId,
                cancellationToken);

        if (patient is null)
            return NotFound(new { message = "Patient profile not found." });

        var appointments = await _context.Appointments
            .AsNoTracking()
            .Where(a => a.PatientId == patient.PatientId)
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.StartTime)
            .ToListAsync(cancellationToken);

        return Ok(appointments.Select(ToResponse));
    }

    // GET: api/Appointment/doctor
    [HttpGet("doctor")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> GetForDoctor(
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        if (userId is null)
            return Unauthorized();

        var doctor = await _context.Doctors
            .AsNoTracking()
            .FirstOrDefaultAsync(
                d => d.UserId == userId,
                cancellationToken);

        if (doctor is null)
            return NotFound(new { message = "Doctor profile not found." });

        var appointments = await _context.Appointments
            .AsNoTracking()
            .Where(a => a.DoctorId == doctor.DoctorId)
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.StartTime)
            .ToListAsync(cancellationToken);

        return Ok(appointments.Select(ToResponse));
    }

    // PUT: api/Appointment/5/cancel
    [HttpPut("{id:int}/cancel")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> Cancel(
        int id,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        if (userId is null)
            return Unauthorized();

        var patient = await _context.Patients
            .FirstOrDefaultAsync(
                p => p.UserId == userId,
                cancellationToken);

        if (patient is null)
            return NotFound(new { message = "Patient profile not found." });

        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(
                a => a.AppointmentId == id,
                cancellationToken);

        if (appointment is null)
            return NotFound(new { message = "Appointment not found." });

        if (appointment.PatientId != patient.PatientId)
            return Forbid();

        if (appointment.Status is AppointmentStatus.Cancelled
            or AppointmentStatus.Completed)
        {
            return Conflict(new { message = "This appointment cannot be cancelled." });
        }

        appointment.Status = AppointmentStatus.Cancelled;

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(appointment));
    }

    // PUT: api/Appointment/5/status
    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> UpdateStatus(
        int id,
        UpdateAppointmentStatusRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        if (userId is null)
            return Unauthorized();

        var doctor = await _context.Doctors
            .FirstOrDefaultAsync(
                d => d.UserId == userId,
                cancellationToken);

        if (doctor is null)
            return NotFound(new { message = "Doctor profile not found." });

        if (!Enum.IsDefined(request.Status))
            return BadRequest(new { message = "Invalid appointment status." });

        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(
                a => a.AppointmentId == id,
                cancellationToken);

        if (appointment is null)
            return NotFound(new { message = "Appointment not found." });

        if (appointment.DoctorId != doctor.DoctorId)
            return Forbid();

        if (!IsAllowedStatusTransition(
                appointment.Status,
                request.Status))
        {
            return Conflict(new { message = "This status transition is not allowed." });
        }

        appointment.Status = request.Status;

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(appointment));
    }

    private static AppointmentResponse ToResponse(Appointment appointment)
    {
        return new AppointmentResponse
        {
            AppointmentId = appointment.AppointmentId,
            PatientId = appointment.PatientId,
            DoctorId = appointment.DoctorId,
            AppointmentDate = appointment.AppointmentDate,
            StartTime = appointment.StartTime,
            EndTime = appointment.EndTime,
            Reason = appointment.Reason,
            Status = appointment.Status.ToString(),
            CreatedAt = appointment.CreatedAt
        };
    }

    private static bool IsAllowedStatusTransition(
        AppointmentStatus current,
        AppointmentStatus requested)
    {
        return current switch
        {
            AppointmentStatus.Pending =>
                requested is AppointmentStatus.Confirmed
                    or AppointmentStatus.Cancelled,

            AppointmentStatus.Confirmed =>
                requested is AppointmentStatus.Completed
                    or AppointmentStatus.Cancelled,

            _ => false
        };
    }

    private string? GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
               ?? User.FindFirstValue("sub");
    }

    private async Task<bool> CanAccessAppointmentAsync(
        Appointment appointment,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        if (userId is null)
            return false;

        if (User.IsInRole("Patient"))
        {
            return await _context.Patients.AnyAsync(
                p => p.PatientId == appointment.PatientId
                     && p.UserId == userId,
                cancellationToken);
        }

        if (User.IsInRole("Doctor"))
        {
            return await _context.Doctors.AnyAsync(
                d => d.DoctorId == appointment.DoctorId
                     && d.UserId == userId,
                cancellationToken);
        }

        return false;
    }
}
