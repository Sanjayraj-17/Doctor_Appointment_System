namespace Doctor_Appointment_System.DTOs.Availability;

public sealed record AvailableAppointmentSlotResponse(
    DateOnly AvailableDate,
    TimeOnly StartTime,
    TimeOnly EndTime);
