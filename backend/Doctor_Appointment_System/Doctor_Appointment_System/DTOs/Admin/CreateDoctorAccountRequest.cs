using System.ComponentModel.DataAnnotations;

namespace Doctor_Appointment_System.DTOs.Admin;

public class CreateDoctorAccountRequest
{
    [Required]
    [StringLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [StringLength(15)]
    public string PhoneNumber { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int SpecialityId { get; set; }

    [Required]
    [StringLength(150)]
    public string Qualification { get; set; } = string.Empty;

    [Range(0, 60)]
    public int ExperienceYears { get; set; }

    [Range(0, 99999999)]
    public decimal ConsultationFee { get; set; }

    [StringLength(1000)]
    public string? Bio { get; set; }
}
