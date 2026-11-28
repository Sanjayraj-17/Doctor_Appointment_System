
using System.ComponentModel.DataAnnotations;

namespace Doctor_Appointment_System.Models
{
    public class Speciality
    {
        public int SpecialityId { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }
    }
}

