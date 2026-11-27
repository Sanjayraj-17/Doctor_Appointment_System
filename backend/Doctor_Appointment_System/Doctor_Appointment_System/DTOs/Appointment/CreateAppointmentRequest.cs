using System.ComponentModel.DataAnnotations;

namespace Doctor_Appointment_System.DTOs.Appointment;

public class CreateAppointmentRequest
{
    [Range(1, int.MaxValue)]
    public int DoctorId { get; set; }

    public DateOnly AppointmentDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    [StringLength(500)]
    public string? Reason { get; set; }
}