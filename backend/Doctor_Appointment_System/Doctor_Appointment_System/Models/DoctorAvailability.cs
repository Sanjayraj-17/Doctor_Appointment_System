
using System.ComponentModel.DataAnnotations;

namespace Doctor_Appointment_System.Models
{
    public class DoctorAvailability
    {
        [Key]
        public int AvailabilityId { get; set; }

        // Foreign key to Doctor
        [Required]
        public int DoctorId { get; set; }

        [Required]
        public DateOnly AvailableDate { get; set; }

        [Required]
        public TimeOnly StartTime { get; set; }

        [Required]
        public TimeOnly EndTime { get; set; }

        public bool IsAvailable { get; set; } = true;

        // Navigation property
        public Doctor? Doctor { get; set; }
    }
}
