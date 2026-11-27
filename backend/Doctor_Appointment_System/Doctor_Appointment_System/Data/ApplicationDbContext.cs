using Doctor_Appointment_System.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Patient> Patients => Set<Patient>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Patient>(entity =>
        {
            entity.HasKey(patient => patient.PatientId);
            entity.HasIndex(patient => patient.UserId).IsUnique();
            entity.Property(patient => patient.Address).HasMaxLength(250).IsRequired();
            entity.Property(patient => patient.PhoneNumber).HasMaxLength(15).IsRequired();

            entity.HasOne(patient => patient.User)
                .WithOne(user => user.Patient)
                .HasForeignKey<Patient>(patient => patient.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
