using Doctor_Appointment_System.DTOs.Auth;
using Doctor_Appointment_System.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Doctor_Appointment_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new
            {
                success = false,
                message = "Validation failed",
                errors = ModelState
                    .Where(entry => entry.Value?.Errors.Count > 0)
                    .ToDictionary(
                        entry => entry.Key,
                        entry => entry.Value!.Errors.Select(error => error.ErrorMessage).ToArray())
            });
        }

        var result = await _authService.RegisterAsync(request, cancellationToken);
        return CreateResponse(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new
            {
                success = false,
                message = "Validation failed",
                errors = ModelState
                    .Where(entry => entry.Value?.Errors.Count > 0)
                    .ToDictionary(
                        entry => entry.Key,
                        entry => entry.Value!.Errors.Select(error => error.ErrorMessage).ToArray())
            });
        }

        var result = await _authService.LoginAsync(request, cancellationToken);
        return CreateResponse(result);
    }

    private IActionResult CreateResponse(AuthResult result)
    {
        if (result.Succeeded)
        {
            return StatusCode(result.StatusCode, result.Data);
        }

        var response = new Dictionary<string, object?>
        {
            ["success"] = false,
            ["message"] = result.Message
        };

        if (result.Errors is { Count: > 0 })
        {
            response["errors"] = result.Errors;
        }

        return StatusCode(result.StatusCode, response);
    }
}
