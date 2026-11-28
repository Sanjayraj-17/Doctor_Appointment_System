using System.ComponentModel.DataAnnotations;
using Doctor_Appointment_System.Enums;

namespace Doctor_Appointment_System.DTOs.Appointment;

public class UpdateAppointmentStatusRequest
{
    [EnumDataType(typeof(AppointmentStatus))]
    public AppointmentStatus Status { get; set; }
}