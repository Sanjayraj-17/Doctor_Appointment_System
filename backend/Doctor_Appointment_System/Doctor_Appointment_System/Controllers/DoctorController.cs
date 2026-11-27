
using Doctor_Appointment_System.Data;
using Doctor_Appointment_System.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DoctorController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DoctorController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/doctor
    [HttpGet]
    public async Task<IActionResult> GetAllDoctors()
    {
        var doctors = await _context.Doctors
            .Include(d => d.Speciality)
            .AsNoTracking()
            .ToListAsync();

        return Ok(doctors);
    }

    // GET: api/doctor/5
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

    // GET: api/doctor/search?specialityId=1
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

    // POST: api/doctor
    [HttpPost]
    public async Task<IActionResult> CreateDoctor(Doctor doctor)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var specialityExists = await _context.Specialities
            .AnyAsync(s => s.SpecialityId == doctor.SpecialityId);

        if (!specialityExists)
            return BadRequest(new { message = "Invalid speciality ID." });

        doctor.DoctorId = 0;
        doctor.Speciality = null;

        _context.Doctors.Add(doctor);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetDoctorById),
            new { id = doctor.DoctorId },
            doctor);
    }

    // PUT: api/doctor/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDoctor(
        int id, Doctor updatedDoctor)
    {
        if (id != updatedDoctor.DoctorId)
            return BadRequest(new { message = "Doctor ID mismatch." });

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var doctor = await _context.Doctors.FindAsync(id);

        if (doctor == null)
            return NotFound(new { message = "Doctor not found." });

        var specialityExists = await _context.Specialities
            .AnyAsync(s => s.SpecialityId == updatedDoctor.SpecialityId);

        if (!specialityExists)
            return BadRequest(new { message = "Invalid speciality ID." });

        doctor.SpecialityId = updatedDoctor.SpecialityId;
        doctor.Qualification = updatedDoctor.Qualification;
        doctor.ExperienceYears = updatedDoctor.ExperienceYears;
        doctor.ConsultationFee = updatedDoctor.ConsultationFee;
        doctor.Bio = updatedDoctor.Bio;
        doctor.IsActive = updatedDoctor.IsActive;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Doctor updated successfully." });
    }

    // DELETE: api/doctor/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDoctor(int id)
    {
        var doctor = await _context.Doctors.FindAsync(id);

        if (doctor == null)
            return NotFound(new { message = "Doctor not found." });

        doctor.IsActive = false;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Doctor deactivated successfully." });
    }
}
