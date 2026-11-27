import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  experience: string;
  fee: number;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './booking.html',
  styleUrl: './booking.css',
})
export class Booking implements OnInit {
  doctor: Doctor | undefined;

  appointmentDate = '';
  selectedSlot = '';
  reason = '';

  availableSlots = [
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
  ];

  showConfirmation = false;
  bookingConfirmed = false;

  // Temporary data for testing.
  // Replace this with doctor data from your backend later.
  private doctors: Doctor[] = [
    {
      id: 1,
      name: 'Dr. Arun Kumar',
      specialty: 'Cardiologist',
      experience: '8 years experience',
      fee: 500,
    },
    {
      id: 2,
      name: 'Dr. Priya Sharma',
      specialty: 'Dermatologist',
      experience: '5 years experience',
      fee: 400,
    },
    {
      id: 3,
      name: 'Dr. Rahul Menon',
      specialty: 'Neurologist',
      experience: '10 years experience',
      fee: 600,
    },
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const doctorId = Number(
      this.route.snapshot.paramMap.get('doctorId')
    );

    this.doctor = this.doctors.find(
      doctor => doctor.id === doctorId
    );
  }

  get today(): string {
    return new Date().toISOString().split('T')[0];
  }

  openConfirmation(): void {
    if (!this.appointmentDate || !this.selectedSlot) {
      return;
    }

    this.showConfirmation = true;
  }

  closeConfirmation(): void {
    this.showConfirmation = false;
  }

  confirmBooking(): void {
    if (!this.doctor || !this.appointmentDate || !this.selectedSlot) {
      return;
    }

    // The booking is only confirmed in the UI for now.
    // Later, send these details to your backend API.
    this.bookingConfirmed = true;
    this.showConfirmation = false;
  }
}