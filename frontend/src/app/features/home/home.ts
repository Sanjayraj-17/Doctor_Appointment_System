import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  experience: string;
  fee: number;
  available: boolean;
  nextSlot: string;
}

interface Appointment {
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  status: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  searchTerm = '';

  doctors: Doctor[] = [
    {
      id: 1,
      name: 'Dr. Arun Kumar',
      specialty: 'Cardiologist',
      experience: '8 years experience',
      fee: 500,
      available: true,
      nextSlot: '09:00 AM'
    },
    {
      id: 2,
      name: 'Dr. Priya Sharma',
      specialty: 'Dermatologist',
      experience: '5 years experience',
      fee: 400,
      available: true,
      nextSlot: '10:00 AM'
    },
    {
      id: 3,
      name: 'Dr. Rahul Menon',
      specialty: 'Neurologist',
      experience: '10 years experience',
      fee: 600,
      available: true,
      nextSlot: '11:00 AM'
    }
  ];

  appointments: Appointment[] = [];

  get filteredDoctors(): Doctor[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.doctors.filter(doctor =>
      doctor.name.toLowerCase().includes(term) ||
      doctor.specialty.toLowerCase().includes(term)
    );
  }
}