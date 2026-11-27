using Doctor_Appointment_System.Data;
using Doctor_Appointment_System.DTOs.Auth;
using Doctor_Appointment_System.Models;
using Doctor_Appointment_System.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Services;

public class AuthService : IAuthService
{
    private const string PatientRole = "Patient";
    private readonly ApplicationDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        ApplicationDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ILogger<AuthService> logger)
    {
        _dbContext = dbContext;
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
    }

    public async Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim();
        var existingUser = await _userManager.FindByEmailAsync(email);
        if (existingUser is not null)
        {
            return new AuthResult(false, StatusCodes.Status409Conflict, "Email is already registered");
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = request.FullName.Trim(),
                PhoneNumber = request.PhoneNumber.Trim()
            };

            var createUserResult = await _userManager.CreateAsync(user, request.Password);
            if (!createUserResult.Succeeded)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new AuthResult(
                    false,
                    StatusCodes.Status400BadRequest,
                    "Registration failed",
                    createUserResult.Errors.Select(error => error.Description).ToArray());
            }

            if (!await _roleManager.RoleExistsAsync(PatientRole))
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError("Required role {Role} does not exist.", PatientRole);
                return new AuthResult(false, StatusCodes.Status500InternalServerError, "Registration could not be completed");
            }

            var addRoleResult = await _userManager.AddToRoleAsync(user, PatientRole);
            if (!addRoleResult.Succeeded)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError("Could not assign the Patient role to user {UserId}.", user.Id);
                return new AuthResult(false, StatusCodes.Status500InternalServerError, "Registration could not be completed");
            }

            _dbContext.Patients.Add(new Patient
            {
                UserId = user.Id,
                DateOfBirth = request.DateOfBirth!.Value,
                Gender = request.Gender!.Value,
                PhoneNumber = request.PhoneNumber.Trim(),
                Address = request.Address.Trim()
            });

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return new AuthResult(true, StatusCodes.Status201Created, "Patient registered successfully");
        }
        catch (Exception exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(exception, "Patient registration failed for {Email}.", email);
            return new AuthResult(false, StatusCodes.Status500InternalServerError, "Registration could not be completed");
        }
    }
}
