namespace Doctor_Appointment_System.Configuration;

public sealed class AppointmentOptions
{
    public const string SectionName = "Appointment";

    public int DurationMinutes { get; set; } = 30;
}

public static class ClinicTimeZoneResolver
{
    public static TimeZoneInfo Resolve(IConfiguration configuration)
    {
        var configuredTimeZoneId =
            configuration[$"{AppointmentOptions.SectionName}:ClinicTimeZoneId"]
            ?? configuration["ClinicTimeZoneId"];

        if (!string.IsNullOrWhiteSpace(configuredTimeZoneId))
        {
            return TimeZoneInfo.FindSystemTimeZoneById(configuredTimeZoneId);
        }

        return TimeZoneInfo.FindSystemTimeZoneById(
            OperatingSystem.IsWindows()
                ? "India Standard Time"
                : "Asia/Kolkata");
    }
}
