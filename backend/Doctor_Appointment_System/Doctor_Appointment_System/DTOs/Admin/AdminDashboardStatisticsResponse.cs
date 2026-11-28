namespace Doctor_Appointment_System.DTOs.Admin;

public sealed record AdminDashboardStatisticsResponse(
    int PatientCount,
    int DoctorCount,
    int ActiveDoctorCount,
    int AppointmentCount,
    int PendingAppointmentCount,
    int ConfirmedAppointmentCount,
    int CompletedAppointmentCount,
    int CancelledAppointmentCount);
