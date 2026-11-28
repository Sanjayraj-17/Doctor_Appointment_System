using System.Text.Json.Serialization;

namespace Doctor_Appointment_System.DTOs.Auth;

public sealed record AuthUserResponse(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    int? PatientId,
    string FullName,
    string Email,
    string Role,
    string UserId,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    int? DoctorId = null);

public sealed record AuthResponse(
    bool Success,
    string Message,
    string Token,
    DateTime ExpiresAt,
    AuthUserResponse User);
