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
    private const string DoctorRole = "Doctor";
    private const string AdminRole = "Admin";

    private static readonly string[] SupportedRoles =
    [
        PatientRole,
        DoctorRole,
        AdminRole
    ];

    private readonly ApplicationDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        ApplicationDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IJwtTokenService jwtTokenService,
        ILogger<AuthService> logger)
    {
        _dbContext = dbContext;
        _userManager = userManager;
        _roleManager = roleManager;
        _jwtTokenService = jwtTokenService;
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
                    Errors: createUserResult.Errors.Select(error => error.Description).ToArray());
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

            var patient = new Patient
            {
                UserId = user.Id,
                DateOfBirth = request.DateOfBirth!.Value,
                Gender = request.Gender!.Value,
                PhoneNumber = request.PhoneNumber.Trim(),
                Address = request.Address.Trim()
            };
            _dbContext.Patients.Add(patient);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var token = _jwtTokenService.CreateToken(user, PatientRole);
            return new AuthResult(
                true,
                StatusCodes.Status201Created,
                "Patient registered successfully",
                new AuthResponse(
                    true,
                    "Patient registered successfully",
                    token.Token,
                    token.ExpiresAt,
                    new AuthUserResponse(patient.PatientId, user.FullName, user.Email!, PatientRole, user.Id)));
        }
        catch (Exception exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(exception, "Patient registration failed for {Email}.", email);
            return new AuthResult(false, StatusCodes.Status500InternalServerError, "Registration could not be completed");
        }
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        return await LoginAsync(request, PatientRole, cancellationToken);
    }

    public async Task<AuthResult> LoginAsync(
        LoginRequest request,
        string expectedRole,
        CancellationToken cancellationToken = default)
    {
        var role = SupportedRoles.FirstOrDefault(
            supportedRole => string.Equals(
                supportedRole,
                expectedRole,
                StringComparison.OrdinalIgnoreCase));
        if (role is null)
        {
            throw new ArgumentOutOfRangeException(nameof(expectedRole), "Unsupported authentication role.");
        }

        try
        {
            return await AuthenticateForRoleAsync(request, role, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Authentication failed unexpectedly for role {Role}.", role);
            return new AuthResult(
                false,
                StatusCodes.Status500InternalServerError,
                "Authentication could not be completed");
        }
    }

    private async Task<AuthResult> AuthenticateForRoleAsync(
        LoginRequest request,
        string role,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim();
        var invalidCredentials = new AuthResult(false, StatusCodes.Status401Unauthorized, "Invalid email or password");
        var user = await _userManager.FindByEmailAsync(email);

        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            return invalidCredentials;
        }

        var roles = await _userManager.GetRolesAsync(user);
        if (!roles.Contains(role, StringComparer.OrdinalIgnoreCase))
        {
            return invalidCredentials;
        }

        AuthUserResponse authUser;
        switch (role)
        {
            case PatientRole:
            {
                var patient = await _dbContext.Patients
                    .AsNoTracking()
                    .SingleOrDefaultAsync(currentPatient => currentPatient.UserId == user.Id, cancellationToken);
                if (patient is null)
                {
                    _logger.LogError("User {UserId} has the Patient role but no patient profile.", user.Id);
                    return invalidCredentials;
                }

                authUser = new AuthUserResponse(
                    patient.PatientId,
                    user.FullName,
                    user.Email ?? string.Empty,
                    PatientRole,
                    user.Id);
                break;
            }
            case DoctorRole:
            {
                var doctor = await _dbContext.Doctors
                    .AsNoTracking()
                    .SingleOrDefaultAsync(currentDoctor => currentDoctor.UserId == user.Id, cancellationToken);
                if (doctor is null)
                {
                    _logger.LogError("User {UserId} has the Doctor role but no doctor profile.", user.Id);
                    return invalidCredentials;
                }

                authUser = new AuthUserResponse(
                    null,
                    user.FullName,
                    user.Email ?? string.Empty,
                    DoctorRole,
                    user.Id,
                    doctor.DoctorId);
                break;
            }
            case AdminRole:
                authUser = new AuthUserResponse(
                    null,
                    user.FullName,
                    user.Email ?? string.Empty,
                    AdminRole,
                    user.Id);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(role), "Unsupported authentication role.");
        }

        var token = _jwtTokenService.CreateToken(user, role);
        return new AuthResult(
            true,
            StatusCodes.Status200OK,
            "Login successful",
            new AuthResponse(
                true,
                "Login successful",
                token.Token,
                token.ExpiresAt,
                authUser));
    }
}
