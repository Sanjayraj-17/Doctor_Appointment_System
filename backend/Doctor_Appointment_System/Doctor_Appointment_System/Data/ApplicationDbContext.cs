
using Doctor_Appointment_System.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Database tables
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Speciality> Specialities => Set<Speciality>();
    public DbSet<DoctorAvailability> DoctorAvailabilities
        => Set<DoctorAvailability>();
    public DbSet<Appointment> Appointments => Set<Appointment>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Patient - ApplicationUser (One-to-One)
        builder.Entity<Patient>(entity =>
        {
            entity.HasKey(p => p.PatientId);

            entity.HasIndex(p => p.UserId)
                .IsUnique();

            entity.Property(p => p.Address)
                .HasMaxLength(250)
                .IsRequired();

            entity.Property(p => p.PhoneNumber)
                .HasMaxLength(15)
                .IsRequired();

            entity.HasOne(p => p.User)
                .WithOne(u => u.Patient)
                .HasForeignKey<Patient>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Doctor - ApplicationUser (One-to-One)
        builder.Entity<Doctor>(entity =>
        {
            entity.HasIndex(d => d.UserId)
                .IsUnique();

            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Doctor - Speciality (Many-to-One)
        builder.Entity<Doctor>()
            .HasOne(d => d.Speciality)
            .WithMany()
            .HasForeignKey(d => d.SpecialityId)
            .OnDelete(DeleteBehavior.Restrict);

        // DoctorAvailability - Doctor (Many-to-One)
        builder.Entity<DoctorAvailability>()
            .HasOne(a => a.Doctor)
            .WithMany()
            .HasForeignKey(a => a.DoctorId)
            .OnDelete(DeleteBehavior.Cascade);

        // Appointment - Patient (Many-to-One)
        builder.Entity<Appointment>()
            .HasOne(a => a.Patient)
            .WithMany()
            .HasForeignKey(a => a.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        // Appointment - Doctor (Many-to-One)
        builder.Entity<Appointment>()
            .HasOne(a => a.Doctor)
            .WithMany()
            .HasForeignKey(a => a.DoctorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
