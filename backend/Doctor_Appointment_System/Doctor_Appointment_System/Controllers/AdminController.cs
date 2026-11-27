
using Doctor_Appointment_System.DTOs.Admin;
using Doctor_Appointment_System.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Doctor_Appointment_System.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
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
}
