using Microsoft.AspNetCore.Identity;

namespace Doctor_Appointment_System.Models;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;

    public Patient? Patient { get; set; }
}
