
using Doctor_Appointment_System.Data;
using Doctor_Appointment_System.DTOs.Doctor;
using Doctor_Appointment_System.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DoctorController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public DoctorController(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    // GET: api/Doctor
    [HttpGet]
    public async Task<IActionResult> GetAllDoctors()
    {
        var doctors = await _context.Doctors
            .Include(d => d.Speciality)
            .AsNoTracking()
            .ToListAsync();

        return Ok(doctors);
    }

    // GET: api/Doctor/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetDoctorById(int id)
    {
        var doctor = await _context.Doctors
            .Include(d => d.Speciality)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.DoctorId == id);

        if (doctor == null)
            return NotFound(new { message = "Doctor not found." });

        return Ok(doctor);
    }

    // GET: api/Doctor/search?specialityId=1
    [HttpGet("search")]
    public async Task<IActionResult> SearchDoctors(
        [FromQuery] int? specialityId)
    {
        var query = _context.Doctors
            .Include(d => d.Speciality)
            .AsNoTracking()
            .Where(d => d.IsActive);

        if (specialityId.HasValue)
        {
            query = query.Where(
                d => d.SpecialityId == specialityId.Value);
        }

        var doctors = await query.ToListAsync();

        return Ok(doctors);
    }

    // POST: api/Doctor
    // Admin only: creates a profile for an existing Doctor Identity user.
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateDoctor(
        [FromBody] CreateDoctorRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _userManager.FindByIdAsync(request.UserId);

        if (user == null)
            return BadRequest(new
            {
                message = "Identity user not found."
            });

        var isDoctor = await _userManager.IsInRoleAsync(user, "Doctor");

        if (!isDoctor)
            return BadRequest(new
            {
                message = "The selected user does not have the Doctor role."
            });

        var doctorProfileExists = await _context.Doctors
            .AnyAsync(d => d.UserId == request.UserId);

        if (doctorProfileExists)
            return Conflict(new
            {
                message = "A Doctor profile already exists for this user."
            });

        var specialityExists = await _context.Specialities
            .AnyAsync(s => s.SpecialityId == request.SpecialityId);

        if (!specialityExists)
            return BadRequest(new
            {
                message = "Invalid speciality ID."
            });

        var doctor = new Doctor
        {
            UserId = request.UserId,
            SpecialityId = request.SpecialityId,
            Qualification = request.Qualification.Trim(),
            ExperienceYears = request.ExperienceYears,
            ConsultationFee = request.ConsultationFee,
            Bio = string.IsNullOrWhiteSpace(request.Bio)
                ? null
                : request.Bio.Trim(),
            IsActive = true
        };

        _context.Doctors.Add(doctor);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetDoctorById),
            new { id = doctor.DoctorId },
            doctor);
    }

    // PUT: api/Doctor/5
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateDoctor(
        int id,
        [FromBody] UpdateDoctorRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var doctor = await _context.Doctors.FindAsync(id);

        if (doctor == null)
            return NotFound(new
            {
                message = "Doctor not found."
            });

        var specialityExists = await _context.Specialities
            .AnyAsync(s => s.SpecialityId == request.SpecialityId);

        if (!specialityExists)
            return BadRequest(new
            {
                message = "Invalid speciality ID."
            });

        doctor.SpecialityId = request.SpecialityId;
        doctor.Qualification = request.Qualification.Trim();
        doctor.ExperienceYears = request.ExperienceYears;
        doctor.ConsultationFee = request.ConsultationFee;
        doctor.Bio = string.IsNullOrWhiteSpace(request.Bio)
            ? null
            : request.Bio.Trim();
        doctor.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Doctor updated successfully."
        });
    }

    // DELETE: api/Doctor/5
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteDoctor(int id)
    {
        var doctor = await _context.Doctors.FindAsync(id);

        if (doctor == null)
            return NotFound(new
            {
                message = "Doctor not found."
            });

        doctor.IsActive = false;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Doctor deactivated successfully."
        });
    }
}
