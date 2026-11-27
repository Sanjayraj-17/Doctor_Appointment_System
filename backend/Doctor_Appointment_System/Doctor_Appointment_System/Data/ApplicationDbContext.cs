
using Doctor_Appointment_System.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Numerics;

namespace Doctor_Appointment_System.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Database Tables
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

        // Doctor - Speciality (Many-to-One)
        builder.Entity<Doctor>(entity =>
        {
            entity.HasOne(d => d.Speciality)
                .WithMany()
                .HasForeignKey(d => d.SpecialityId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // DoctorAvailability - Doctor (Many-to-One)
        builder.Entity<DoctorAvailability>(entity =>
        {
            entity.HasOne(a => a.Doctor)
                .WithMany()
                .HasForeignKey(a => a.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Appointment - Patient and Doctor
        builder.Entity<Appointment>(entity =>
        {
            entity.HasOne(a => a.Patient)
                .WithMany()
                .HasForeignKey(a => a.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.Doctor)
                .WithMany()
                .HasForeignKey(a => a.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
