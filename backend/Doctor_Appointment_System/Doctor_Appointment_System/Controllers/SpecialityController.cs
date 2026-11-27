
using Doctor_Appointment_System.Data;
using Doctor_Appointment_System.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Doctor_Appointment_System.Controllers;

[Route("api/[controller]")]
[ApiController]
public class SpecialityController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public SpecialityController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/speciality
    [HttpGet]
    public async Task<IActionResult> GetAllSpecialities()
    {
        var specialities = await _context.Specialities
            .AsNoTracking()
            .ToListAsync();

        return Ok(specialities);
    }

    // GET: api/speciality/1
    [HttpGet("{id}")]
    public async Task<IActionResult> GetSpecialityById(int id)
    {
        var speciality = await _context.Specialities
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SpecialityId == id);

        if (speciality == null)
            return NotFound(new
            {
                message = "Speciality not found."
            });

        return Ok(speciality);
    }

    // POST: api/speciality
    [HttpPost]
    public async Task<IActionResult> CreateSpeciality(
        Speciality speciality)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        bool exists = await _context.Specialities
            .AnyAsync(s =>
                s.Name.ToLower() == speciality.Name.ToLower());

        if (exists)
            return Conflict(new
            {
                message = "Speciality already exists."
            });

        speciality.SpecialityId = 0;

        _context.Specialities.Add(speciality);

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetSpecialityById),
            new { id = speciality.SpecialityId },
            speciality);
    }

    // PUT: api/speciality/1
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSpeciality(
        int id,
        Speciality updatedSpeciality)
    {
        if (id != updatedSpeciality.SpecialityId)
            return BadRequest(new
            {
                message = "Speciality ID mismatch."
            });

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var speciality = await _context.Specialities
            .FindAsync(id);

        if (speciality == null)
            return NotFound(new
            {
                message = "Speciality not found."
            });

        bool duplicate = await _context.Specialities
            .AnyAsync(s =>
                s.SpecialityId != id &&
                s.Name.ToLower() ==
                updatedSpeciality.Name.ToLower());

        if (duplicate)
            return Conflict(new
            {
                message = "Speciality name already exists."
            });

        speciality.Name = updatedSpeciality.Name;
        speciality.Description = updatedSpeciality.Description;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Speciality updated successfully."
        });
    }

    // DELETE: api/speciality/1
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSpeciality(int id)
    {
        var speciality = await _context.Specialities
            .FindAsync(id);

        if (speciality == null)
            return NotFound(new
            {
                message = "Speciality not found."
            });

        bool hasDoctors = await _context.Doctors
            .AnyAsync(d => d.SpecialityId == id);

        if (hasDoctors)
            return Conflict(new
            {
                message = "Cannot delete speciality because doctors are assigned to it."
            });

        _context.Specialities.Remove(speciality);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Speciality deleted successfully."
        });
    }

    // GET: api/speciality/database-check
    [HttpGet("database-check")]
    public async Task<IActionResult> CheckDatabase()
    {
        var connection = _context.Database.GetDbConnection();

        return Ok(new
        {
            Database = connection.Database,
            Server = connection.DataSource,
            SpecialityCount =
                await _context.Specialities.CountAsync()
        });
    }
}
