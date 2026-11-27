using Doctor_Appointment_System.DTOs.Auth;

namespace Doctor_Appointment_System.Services.Interfaces;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
}

public sealed record AuthResult(
    bool Succeeded,
    int StatusCode,
    string Message,
    AuthResponse? Data = null,
    IReadOnlyCollection<string>? Errors = null);
