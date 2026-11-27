
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Doctor_Appointment_System.Enums;

namespace Doctor_Appointment_System.Models
{
    public class Appointment
    {
        [Key]
        public int AppointmentId { get; set; }

        // Patient foreign key
        [Required]
        public int PatientId { get; set; }

        // Doctor foreign key
        [Required]
        public int DoctorId { get; set; }

        [Required]
        public DateOnly AppointmentDate { get; set; }

        [Required]
        public TimeOnly StartTime { get; set; }

        [Required]
        public TimeOnly EndTime { get; set; }

        [StringLength(500)]
        public string? Reason { get; set; }

        public AppointmentStatus Status { get; set; }
            = AppointmentStatus.Pending;

        public DateTime CreatedAt { get; set; }
            = DateTime.UtcNow;

        // Navigation properties
        public Patient? Patient { get; set; }

        public Doctor? Doctor { get; set; }
    }
}
