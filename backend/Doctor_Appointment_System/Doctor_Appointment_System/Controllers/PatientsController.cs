using System.Security.Claims;
using Doctor_Appointment_System.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Doctor_Appointment_System.Controllers;

[ApiController]
[Route("api/patients")]
[Authorize(Roles = "Patient")]
public sealed class PatientsController : ControllerBase
{
    private readonly IPatientService _patientService;

    public PatientsController(IPatientService patientService)
    {
        _patientService = patientService;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, message = "Authentication is required" });
        }

        var profile = await _patientService.GetProfileAsync(userId, cancellationToken);
        if (profile is null)
        {
            return NotFound(new { success = false, message = "Patient profile was not found" });
        }

        return Ok(new
        {
            success = true,
            message = "Patient profile retrieved successfully",
            data = profile
        });
    }

    [HttpGet("me/appointments")]
    public Task<IActionResult> GetAppointments(CancellationToken cancellationToken)
    {
        return GetAppointmentsAsync(historyOnly: false, cancellationToken);
    }

    [HttpGet("me/appointments/history")]
    public Task<IActionResult> GetAppointmentHistory(CancellationToken cancellationToken)
    {
        return GetAppointmentsAsync(historyOnly: true, cancellationToken);
    }

    private async Task<IActionResult> GetAppointmentsAsync(
        bool historyOnly,
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, message = "Authentication is required" });
        }

        var appointments = await _patientService.GetAppointmentsAsync(userId, historyOnly, cancellationToken);
        if (appointments is null)
        {
            return NotFound(new { success = false, message = "Patient profile was not found" });
        }

        return Ok(new
        {
            success = true,
            message = historyOnly
                ? "Patient appointment history retrieved successfully"
                : "Patient appointments retrieved successfully",
            data = appointments
        });
    }
}
