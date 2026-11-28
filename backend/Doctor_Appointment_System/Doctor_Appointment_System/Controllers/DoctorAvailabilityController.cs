
using System.Security.Claims;
using Doctor_Appointment_System.Data;
using Doctor_Appointment_System.DTOs.Availability;
using Doctor_Appointment_System.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class DoctorAvailabilityController : ControllerBase
{
    private readonly IDoctorAvailabilityService _availabilityService;
    private readonly ApplicationDbContext _context;

    public DoctorAvailabilityController(
        IDoctorAvailabilityService availabilityService,
        ApplicationDbContext context)
    {
        _availabilityService = availabilityService;
        _context = context;
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<IActionResult> Create(
        CreateAvailabilityRequest request,
        CancellationToken cancellationToken)
    {
        if (User.IsInRole("Doctor"))
        {
            var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
            if (doctorId is null)
                return NotFound(new { message = "Doctor profile not found." });

            request.DoctorId = doctorId.Value;
        }

        var result = await _availabilityService.CreateAsync(
            request, cancellationToken);

        return ToActionResult(result, () => CreatedAtAction(
            nameof(GetById),
            new { id = result.Availability!.AvailabilityId },
            result.Availability));
    }

    [HttpGet("doctor/{doctorId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetByDoctor(
        int doctorId,
        CancellationToken cancellationToken)
    {
        var doctorExists = await _availabilityService
            .DoctorExistsAsync(doctorId, cancellationToken);

        if (!doctorExists)
            return NotFound(new { message = "Doctor not found." });

        var availability = await _availabilityService
            .GetByDoctorAsync(doctorId, cancellationToken);

        return Ok(availability);
    }

    [HttpGet("doctor/{doctorId:int}/slots")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvailableSlots(
        int doctorId,
        [FromQuery] DateOnly date,
        CancellationToken cancellationToken)
    {
        if (date == default)
            return BadRequest(new { message = "A valid availability date is required." });

        var doctorExists = await _availabilityService
            .DoctorExistsAsync(doctorId, cancellationToken);

        if (!doctorExists)
            return NotFound(new { message = "Doctor not found." });

        var slots = await _availabilityService.GetAvailableSlotsAsync(
            doctorId,
            date,
            cancellationToken);

        return Ok(slots);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var availability = await _availabilityService
            .GetByIdAsync(id, cancellationToken);

        if (availability is null)
            return NotFound(new { message = "Availability record not found." });

        return Ok(availability);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<IActionResult> Update(
        int id,
        UpdateAvailabilityRequest request,
        CancellationToken cancellationToken)
    {
        if (User.IsInRole("Doctor"))
        {
            var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
            if (doctorId is null)
                return NotFound(new { message = "Doctor profile not found." });

            var existing = await _availabilityService.GetByIdAsync(id, cancellationToken);
            if (existing is null)
                return NotFound(new { message = "Availability record not found." });

            if (existing.DoctorId != doctorId.Value)
                return Forbid();

            request.DoctorId = doctorId.Value;
        }

        var result = await _availabilityService
            .UpdateAsync(id, request, cancellationToken);

        return ToActionResult(result, () => Ok(result.Availability));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        if (User.IsInRole("Doctor"))
        {
            var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
            if (doctorId is null)
                return NotFound(new { message = "Doctor profile not found." });

            var existing = await _availabilityService.GetByIdAsync(id, cancellationToken);
            if (existing is null)
                return NotFound(new { message = "Availability record not found." });

            if (existing.DoctorId != doctorId.Value)
                return Forbid();
        }

        var result = await _availabilityService
            .DeleteAsync(id, cancellationToken);

        return result.Status switch
        {
            AvailabilityResultStatus.Success => NoContent(),
            AvailabilityResultStatus.NotFound => NotFound(
                new { message = result.Message }),
            _ => BadRequest(new { message = result.Message })
        };
    }

    private IActionResult ToActionResult(
        AvailabilityResult result,
        Func<IActionResult> successResult)
    {
        return result.Status switch
        {
            AvailabilityResultStatus.Success => successResult(),
            AvailabilityResultStatus.NotFound => NotFound(
                new { message = result.Message }),
            AvailabilityResultStatus.Conflict => Conflict(
                new { message = result.Message }),
            _ => BadRequest(new { message = result.Message })
        };
    }

    private async Task<int?> GetCurrentDoctorIdAsync(
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return null;

        return await _context.Doctors
            .Where(doctor => doctor.UserId == userId)
            .Select(doctor => (int?)doctor.DoctorId)
            .SingleOrDefaultAsync(cancellationToken);
    }
}
