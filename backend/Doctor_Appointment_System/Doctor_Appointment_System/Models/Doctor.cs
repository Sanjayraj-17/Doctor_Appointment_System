
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Doctor_Appointment_System.Models
{
    public class Doctor
    {
        [Key]
        public int DoctorId { get; set; }

        // References the Identity user's Id
        [Required]
        public string UserId { get; set; } = string.Empty;

        // Foreign key to Speciality
        [Required]
        public int SpecialityId { get; set; }

        [Required]
        [StringLength(150)]
        public string Qualification { get; set; } = string.Empty;

        [Range(0, 60)]
        public int ExperienceYears { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        [Range(0, 99999999)]
        public decimal ConsultationFee { get; set; }

        [StringLength(1000)]
        public string? Bio { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation property
        public Speciality? Speciality { get; set; }
    }
}
