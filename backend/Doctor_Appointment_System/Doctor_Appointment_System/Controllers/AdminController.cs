
using Doctor_Appointment_System.Data;
using Doctor_Appointment_System.DTOs.Admin;
using Doctor_Appointment_System.DTOs.Doctor;
using Doctor_Appointment_System.Enums;
using Doctor_Appointment_System.Models;
using Doctor_Appointment_System.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ApplicationDbContext _context;

    public AdminController(
        IAdminService adminService,
        ApplicationDbContext context)
    {
        _adminService = adminService;
        _context = context;
    }

    [HttpPost("doctors")]
    public async Task<IActionResult> CreateDoctor(
        [FromBody] CreateDoctorAccountRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _adminService.RegisterDoctorAsync(
            request,
            cancellationToken);

        return result.Status switch
        {
            AdminOperationStatus.Success => CreatedAtAction(
                actionName: "GetDoctorById",
                controllerName: "Doctor",
                routeValues: new { id = result.Doctor!.DoctorId },
                value: result.Doctor),

            AdminOperationStatus.Invalid => BadRequest(new
            {
                success = false,
                message = result.Message,
                errors = result.Errors
            }),

            AdminOperationStatus.Conflict => Conflict(new
            {
                success = false,
                message = result.Message
            }),

            AdminOperationStatus.NotFound => NotFound(new
            {
                success = false,
                message = result.Message
            }),

            _ => StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message = result.Message ?? "Doctor registration could not be completed."
                })
        };
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<AdminDashboardStatisticsResponse>> GetDashboardStatistics(
        CancellationToken cancellationToken)
    {
        var statistics = new AdminDashboardStatisticsResponse(
                await _context.Patients.CountAsync(cancellationToken),
                await _context.Doctors.CountAsync(cancellationToken),
                await _context.Doctors.CountAsync(
                    doctor => doctor.IsActive,
                    cancellationToken),
                await _context.Appointments.CountAsync(cancellationToken),
                await _context.Appointments.CountAsync(
                    appointment => appointment.Status == AppointmentStatus.Pending,
                    cancellationToken),
                await _context.Appointments.CountAsync(
                    appointment => appointment.Status == AppointmentStatus.Confirmed,
                    cancellationToken),
                await _context.Appointments.CountAsync(
                    appointment => appointment.Status == AppointmentStatus.Completed,
                    cancellationToken),
                await _context.Appointments.CountAsync(
                    appointment => appointment.Status == AppointmentStatus.Cancelled,
                    cancellationToken));

        return Ok(statistics);
    }

    [HttpGet("patients")]
    public async Task<ActionResult<IReadOnlyList<AdminPatientResponse>>> GetPatients(
        CancellationToken cancellationToken)
    {
        var patients = await (
                from patient in _context.Patients.AsNoTracking()
                join user in _context.Users.AsNoTracking()
                    on patient.UserId equals user.Id
                orderby user.FullName
                select new AdminPatientResponse(
                    patient.PatientId,
                    user.FullName,
                    user.Email ?? string.Empty,
                    patient.DateOfBirth,
                    patient.Gender,
                    patient.PhoneNumber,
                    patient.Address))
                .ToListAsync(cancellationToken);

        return Ok(patients);
    }

    [HttpGet("doctors")]
    public async Task<ActionResult<IReadOnlyList<DoctorResponse>>> GetDoctors(
        CancellationToken cancellationToken)
    {
        var doctors = await DoctorResponseQuery(_context.Doctors.AsNoTracking())
                .ToListAsync(cancellationToken);

        return Ok(doctors);
    }

    [HttpGet("appointments")]
    public async Task<ActionResult<IReadOnlyList<AdminAppointmentResponse>>> GetAppointments(
        [FromQuery] DateOnly? date,
        [FromQuery] int? doctorId,
        [FromQuery] int? patientId,
        [FromQuery] AppointmentStatus? status,
        CancellationToken cancellationToken)
    {
        if ((doctorId.HasValue && doctorId.Value <= 0) ||
                (patientId.HasValue && patientId.Value <= 0))
                return BadRequest(new { message = "DoctorId and PatientId filters must be positive." });

        if (status.HasValue && !Enum.IsDefined(status.Value))
                return BadRequest(new { message = "Status filter is invalid." });

        var appointments = _context.Appointments.AsNoTracking();
        if (date.HasValue)
                appointments = appointments.Where(appointment =>
                    appointment.AppointmentDate == date.Value);
        if (doctorId.HasValue)
                appointments = appointments.Where(appointment =>
                    appointment.DoctorId == doctorId.Value);
        if (patientId.HasValue)
                appointments = appointments.Where(appointment =>
                    appointment.PatientId == patientId.Value);
        if (status.HasValue)
                appointments = appointments.Where(appointment =>
                    appointment.Status == status.Value);

        var result = await AdminAppointmentQuery(
                    appointments
                        .OrderBy(appointment => appointment.AppointmentDate)
                        .ThenBy(appointment => appointment.StartTime))
                .ToListAsync(cancellationToken);

        return Ok(result);
    }

    [HttpGet("appointments/{id:int}")]
    public async Task<ActionResult<AdminAppointmentResponse>> GetAppointment(
        int id,
        CancellationToken cancellationToken)
    {
        var appointment = await AdminAppointmentQuery(
                    _context.Appointments
                        .AsNoTracking()
                        .Where(item => item.AppointmentId == id))
                .FirstOrDefaultAsync(cancellationToken);

        return appointment is null ? NotFound() : Ok(appointment);
    }

    private IQueryable<DoctorResponse> DoctorResponseQuery(
        IQueryable<Doctor> doctors)
    {
        return
                from doctor in doctors
                join user in _context.Users.AsNoTracking()
                    on doctor.UserId equals user.Id
                join speciality in _context.Specialities.AsNoTracking()
                    on doctor.SpecialityId equals speciality.SpecialityId
                orderby user.FullName
                select new DoctorResponse(
                    doctor.DoctorId,
                    user.FullName,
                    doctor.Qualification,
                    doctor.ExperienceYears,
                    doctor.ConsultationFee,
                    doctor.SpecialityId,
                    speciality.Name,
                    doctor.Bio,
                    doctor.IsActive);
    }

    private IQueryable<AdminAppointmentResponse> AdminAppointmentQuery(
        IQueryable<Appointment> appointments)
    {
        return
                from appointment in appointments
                join patient in _context.Patients.AsNoTracking()
                    on appointment.PatientId equals patient.PatientId
                join patientUser in _context.Users.AsNoTracking()
                    on patient.UserId equals patientUser.Id
                join doctor in _context.Doctors.AsNoTracking()
                    on appointment.DoctorId equals doctor.DoctorId
                join doctorUser in _context.Users.AsNoTracking()
                    on doctor.UserId equals doctorUser.Id
                join speciality in _context.Specialities.AsNoTracking()
                    on doctor.SpecialityId equals speciality.SpecialityId
                select new AdminAppointmentResponse(
                    appointment.AppointmentId,
                    patient.PatientId,
                    patientUser.FullName,
                    doctor.DoctorId,
                    doctorUser.FullName,
                    doctor.Qualification,
                    speciality.Name,
                    appointment.AppointmentDate,
                    appointment.StartTime,
                    appointment.EndTime,
                    appointment.Reason,
                    appointment.Status,
                    appointment.CreatedAt);
    }
}
