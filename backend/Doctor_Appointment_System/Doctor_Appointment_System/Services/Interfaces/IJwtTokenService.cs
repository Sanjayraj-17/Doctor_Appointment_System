using Doctor_Appointment_System.Models;

namespace Doctor_Appointment_System.Services.Interfaces;

public interface IJwtTokenService
{
    JwtTokenResult CreateToken(ApplicationUser user, Patient patient, string role);
}

public sealed record JwtTokenResult(string Token, DateTime ExpiresAt);
