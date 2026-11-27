using Doctor_Appointment_System.Enums;

namespace Doctor_Appointment_System.Models;

public class Patient
{
    public int PatientId { get; set; }

    public string UserId { get; set; } = string.Empty;

    public DateTime DateOfBirth { get; set; }

    public Gender Gender { get; set; }

    public string PhoneNumber { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;
}
