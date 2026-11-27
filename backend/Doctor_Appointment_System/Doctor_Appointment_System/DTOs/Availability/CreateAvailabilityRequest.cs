namespace Doctor_Appointment_System.DTOs.Availability;

public class CreateAvailabilityRequest
{
    public int DoctorId { get; set; }

    public DateOnly AvailableDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public bool IsAvailable { get; set; } = true;
}