using Doctor_Appointment_System.DTOs.Availability;
using Doctor_Appointment_System.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Doctor_Appointment_System.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DoctorAvailabilityController : ControllerBase
{
    private readonly IDoctorAvailabilityService _availabilityService;

    public DoctorAvailabilityController(IDoctorAvailabilityService availabilityService)
    {
        _availabilityService = availabilityService;
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        CreateAvailabilityRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _availabilityService.CreateAsync(request, cancellationToken);

        return ToActionResult(result, () => CreatedAtAction(
            nameof(GetById),
            new { id = result.Availability!.AvailabilityId },
            result.Availability));
    }

    [HttpGet("doctor/{doctorId:int}")]
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

    [HttpGet("{id:int}")]
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
    public async Task<IActionResult> Update(
        int id,
        UpdateAvailabilityRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _availabilityService
            .UpdateAsync(id, request, cancellationToken);

        return ToActionResult(result, () => Ok(result.Availability));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _availabilityService
            .DeleteAsync(id, cancellationToken);

        return result.Status switch
        {
            AvailabilityResultStatus.Success => NoContent(),
            AvailabilityResultStatus.NotFound => NotFound(new { message = result.Message }),
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
            AvailabilityResultStatus.NotFound => NotFound(new { message = result.Message }),
            AvailabilityResultStatus.Conflict => Conflict(new { message = result.Message }),
            _ => BadRequest(new { message = result.Message })
        };
    }
}
