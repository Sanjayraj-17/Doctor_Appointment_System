
using Doctor_Appointment_System.Data;
using Doctor_Appointment_System.DTOs.Admin;
using Doctor_Appointment_System.Models;
using Doctor_Appointment_System.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Services.Implementations;

public class AdminService : IAdminService
{
    private const string DoctorRole = "Doctor";

    private readonly ApplicationDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ILogger<AdminService> _logger;

    public AdminService(
        ApplicationDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ILogger<AdminService> logger)
    {
        _dbContext = dbContext;
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
    }

    public async Task<AdminDoctorRegistrationResult> RegisterDoctorAsync(
        CreateDoctorAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        // 1. Basic request validation
        if (request is null ||
            string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.PhoneNumber) ||
            string.IsNullOrWhiteSpace(request.Qualification) ||
            request.SpecialityId <= 0 ||
            request.ExperienceYears < 0 ||
            request.ExperienceYears > 60 ||
            request.ConsultationFee < 0)
        {
            return new AdminDoctorRegistrationResult(
                AdminOperationStatus.Invalid,
                Message: "Invalid doctor registration details.");
        }

        var email = request.Email.Trim();
        var fullName = request.FullName.Trim();
        var phoneNumber = request.PhoneNumber.Trim();
        var qualification = request.Qualification.Trim();

        if (string.IsNullOrWhiteSpace(fullName) ||
            string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(qualification))
        {
            return new AdminDoctorRegistrationResult(
                AdminOperationStatus.Invalid,
                Message: "Required fields cannot contain only whitespace.");
        }

        try
        {
            // 2. Check duplicate email
            cancellationToken.ThrowIfCancellationRequested();

            var existingUser = await _userManager.FindByEmailAsync(email);

            if (existingUser is not null)
            {
                return new AdminDoctorRegistrationResult(
                    AdminOperationStatus.Conflict,
                    Message: "Email is already registered.");
            }

            // 3. Validate speciality
            var specialityExists = await _dbContext.Specialities
                .AnyAsync(
                    speciality => speciality.SpecialityId == request.SpecialityId,
                    cancellationToken);

            if (!specialityExists)
            {
                return new AdminDoctorRegistrationResult(
                    AdminOperationStatus.NotFound,
                    Message: "Speciality not found.");
            }

            // 4. Validate Doctor role
            if (!await _roleManager.RoleExistsAsync(DoctorRole))
            {
                _logger.LogError(
                    "Required Identity role {Role} does not exist.",
                    DoctorRole);

                return new AdminDoctorRegistrationResult(
                    AdminOperationStatus.Failure,
                    Message: "Doctor registration is not configured correctly.");
            }

            // 5. Start transaction
            await using var transaction = await _dbContext.Database
                .BeginTransactionAsync(cancellationToken);

            try
            {
                // 6. Create Identity user
                var user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FullName = fullName,
                    PhoneNumber = phoneNumber
                };

                var createUserResult = await _userManager.CreateAsync(
                    user,
                    request.Password);

                if (!createUserResult.Succeeded)
                {
                    await transaction.RollbackAsync(cancellationToken);

                    return new AdminDoctorRegistrationResult(
                        AdminOperationStatus.Invalid,
                        Message: "Doctor account validation failed.",
                        Errors: createUserResult.Errors
                            .Select(error => error.Description)
                            .ToArray());
                }

                // 7. Assign Doctor role
                var addRoleResult = await _userManager.AddToRoleAsync(
                    user,
                    DoctorRole);

                if (!addRoleResult.Succeeded)
                {
                    await transaction.RollbackAsync(cancellationToken);

                    _logger.LogError(
                        "Failed to assign Doctor role to newly created user.");

                    return new AdminDoctorRegistrationResult(
                        AdminOperationStatus.Failure,
                        Message: "Doctor registration could not be completed.");
                }

                // 8. Create Doctor profile
                var doctor = new Doctor
                {
                    UserId = user.Id,
                    SpecialityId = request.SpecialityId,
                    Qualification = qualification,
                    ExperienceYears = request.ExperienceYears,
                    ConsultationFee = request.ConsultationFee,
                    Bio = string.IsNullOrWhiteSpace(request.Bio)
                        ? null
                        : request.Bio.Trim(),
                    IsActive = true
                };

                _dbContext.Doctors.Add(doctor);

                await _dbContext.SaveChangesAsync(cancellationToken);

                // 9. Commit transaction
                await transaction.CommitAsync(cancellationToken);

                _logger.LogInformation(
                    "Doctor profile {DoctorId} created successfully.",
                    doctor.DoctorId);

                // 10. Return safe response
                return new AdminDoctorRegistrationResult(
                    AdminOperationStatus.Success,
                    Doctor: new DoctorAccountDetails(
                        doctor.DoctorId,
                        user.FullName,
                        user.Email!,
                        user.PhoneNumber!,
                        doctor.SpecialityId,
                        doctor.Qualification,
                        doctor.ExperienceYears,
                        doctor.ConsultationFee,
                        doctor.Bio),
                    Message: "Doctor registered successfully.");
            }
            catch (OperationCanceledException)
            {
                await transaction.RollbackAsync(CancellationToken.None);
                throw;
            }
            catch (DbUpdateException exception)
            {
                await transaction.RollbackAsync(CancellationToken.None);

                _logger.LogError(
                    exception,
                    "Database update failed during Doctor registration.");

                return new AdminDoctorRegistrationResult(
                    AdminOperationStatus.Conflict,
                    Message: "Doctor registration conflicted with existing database records.");
            }
            catch (Exception exception)
            {
                await transaction.RollbackAsync(CancellationToken.None);

                _logger.LogError(
                    exception,
                    "Doctor registration failed for email {Email}.",
                    email);

                return new AdminDoctorRegistrationResult(
                    AdminOperationStatus.Failure,
                    Message: "Doctor registration could not be completed.");
            }
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "An unexpected error occurred during Doctor registration.");

            return new AdminDoctorRegistrationResult(
                AdminOperationStatus.Failure,
                Message: "Doctor registration could not be completed.");
        }
    }
}
