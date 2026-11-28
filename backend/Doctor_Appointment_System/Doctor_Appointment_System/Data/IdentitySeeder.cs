using Doctor_Appointment_System.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Data;

public static class IdentitySeeder
{
    private static readonly string[] Roles = ["Patient", "Doctor", "Admin"];

    public static async Task SeedAsync(
        IServiceProvider services,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var scopedServices = scope.ServiceProvider;
        var roleManager = scopedServices.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scopedServices.GetRequiredService<UserManager<ApplicationUser>>();
        var logger = scopedServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger(nameof(IdentitySeeder));

        foreach (var role in Roles)
        {
            if (await roleManager.RoleExistsAsync(role))
                continue;

            var roleResult = await roleManager.CreateAsync(new IdentityRole(role));
            if (!roleResult.Succeeded)
            {
                var errors = string.Join(", ", roleResult.Errors.Select(error => error.Description));
                throw new InvalidOperationException($"Failed to create role {role}: {errors}");
            }
        }

        if (!environment.IsDevelopment())
            return;

        var adminConfiguration = configuration.GetSection("SeedAdmin");
        var email = adminConfiguration["Email"]?.Trim();
        var password = adminConfiguration["Password"];
        var fullName = adminConfiguration["FullName"]?.Trim();
        var phoneNumber = adminConfiguration["PhoneNumber"]?.Trim();

        if (string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(password) ||
            string.IsNullOrWhiteSpace(fullName) ||
            string.IsNullOrWhiteSpace(phoneNumber))
        {
            logger.LogWarning(
                "Development Admin seeding was skipped because required SeedAdmin configuration is incomplete.");
            return;
        }

        var existingAdmin = await userManager.FindByEmailAsync(email);
        if (existingAdmin is not null)
        {
            if (await userManager.IsInRoleAsync(existingAdmin, "Admin"))
                return;

            logger.LogWarning(
                "Development Admin seeding was skipped because the configured account already exists without the Admin role. No role changes were made.");
            return;
        }

        var dbContext = scopedServices.GetRequiredService<ApplicationDbContext>();
        await using var transaction = await dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        try
        {
            var admin = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = fullName,
                PhoneNumber = phoneNumber
            };

            var createResult = await userManager.CreateAsync(admin, password);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(error => error.Description));
                throw new InvalidOperationException($"Failed to create the Development Admin account: {errors}");
            }

            var roleResult = await userManager.AddToRoleAsync(admin, "Admin");
            if (!roleResult.Succeeded)
            {
                var errors = string.Join(", ", roleResult.Errors.Select(error => error.Description));
                throw new InvalidOperationException($"Failed to assign the Admin role: {errors}");
            }

            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
