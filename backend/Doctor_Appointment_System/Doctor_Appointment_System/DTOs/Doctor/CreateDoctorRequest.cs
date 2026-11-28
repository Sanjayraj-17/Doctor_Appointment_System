using System.ComponentModel.DataAnnotations;

namespace Doctor_Appointment_System.DTOs.Doctor;

public class CreateDoctorRequest
{
    [Required]
    public string UserId { get; set; } = string.Empty;

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