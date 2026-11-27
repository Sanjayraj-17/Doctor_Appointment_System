namespace Doctor_Appointment_System.DTOs.Auth;

public sealed record AuthUserResponse(
    int PatientId,
    string FullName,
    string Email,
    string Role);

public sealed record AuthResponse(
    bool Success,
    string Message,
    string Token,
    DateTime ExpiresAt,
    AuthUserResponse User);
