import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AppointmentService } from '../../core/api/appointment.service';
import { AvailabilityService } from '../../core/api/availability.service';
import { getApiErrorMessage } from '../../core/api/api-error';
import { DoctorService } from '../../core/api/doctor.service';
import { PatientService } from '../../core/api/patient.service';
import {
  AppointmentResponse,
  AvailableAppointmentSlot,
} from '../../core/models/appointment.models';
import { DoctorAvailability } from '../../core/models/availability.models';
import { Doctor } from '../../core/models/doctor.models';
import { formatDateOnly, formatTimeOnly, getClinicDate } from '../../core/utils/clinic-time';

@Component({
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule, RouterLink],
  selector: 'app-book-appointment',
  styleUrl: './book-appointment.css',
  templateUrl: './book-appointment.html',
})
export class BookAppointment implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly doctorService = inject(DoctorService);
  private readonly availabilityService = inject(AvailabilityService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly patientService = inject(PatientService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly doctorId = Number(this.route.snapshot.paramMap.get('doctorId'));
  readonly minDate = getClinicDate();
  readonly bookingForm = this.formBuilder.nonNullable.group({
    appointmentDate: ['', Validators.required],
    reason: ['', Validators.maxLength(500)],
  });

  doctor: Doctor | null = null;
  private slotRequestVersion = 0;
  doctorLoading = false;
  doctorError = '';

  availabilities: DoctorAvailability[] = [];
  availabilitiesLoading = false;
  availabilitiesError = '';

  slots: AvailableAppointmentSlot[] = [];
  slotsLoading = false;
  slotsError = '';
  selectedSlot: AvailableAppointmentSlot | null = null;
  submitting = false;
  bookingError = '';
  successAppointment: AppointmentResponse | null = null;
  appointmentListRefreshing = false;
  appointmentListRefreshed = false;
  appointmentListRefreshError = '';

  ngOnInit(): void {
    if (!Number.isInteger(this.doctorId) || this.doctorId <= 0) {
      this.doctorError = 'The selected doctor could not be identified.';
      return;
    }

    this.doctorLoading = true;
    this.doctorService
      .getDoctorById(this.doctorId)
      .pipe(
        finalize(() => {
          this.doctorLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (doctor) => {
          this.doctor = doctor;
          if (!doctor.isActive) {
            this.doctorError = 'This doctor is not currently accepting appointments.';
            this.cdr.markForCheck();
            return;
          }
          this.loadDoctorAvailability();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.doctorError = getApiErrorMessage(
            error,
            'Doctor details could not be loaded.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  get upcomingAvailabilities(): DoctorAvailability[] {
    return this.availabilities
      .filter((item) => item.isAvailable && item.availableDate >= this.minDate)
      .sort((left, right) =>
        `${left.availableDate}T${left.startTime}`.localeCompare(
          `${right.availableDate}T${right.startTime}`,
        ),
      );
  }

  selectAvailableDate(dateValue: string): void {
    if (this.submitting) {
      return;
    }
    this.bookingForm.controls.appointmentDate.setValue(dateValue);
    this.bookingForm.controls.appointmentDate.markAsTouched();
    this.onDateChanged();
  }

  onDateChanged(): void {
    const requestVersion = ++this.slotRequestVersion;
    this.selectedSlot = null;
    this.slots = [];
    this.slotsError = '';
    this.slotsLoading = false;
    this.bookingError = '';

    const date = this.bookingForm.controls.appointmentDate.value;
    if (!date) {
      return;
    }
    if (date < this.minDate) {
      this.slotsError = 'Choose today or a future date.';
      return;
    }
    if (!this.doctor?.isActive) {
      return;
    }

    this.slotsLoading = true;
    this.availabilityService
      .getAvailableSlots(this.doctorId, date)
      .pipe(
        finalize(() => {
          if (requestVersion === this.slotRequestVersion) {
            this.slotsLoading = false;
            this.cdr.markForCheck();
          }
        }),
      )
      .subscribe({
        next: (slots) => {
          if (requestVersion === this.slotRequestVersion) {
            this.slots = slots;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          if (requestVersion !== this.slotRequestVersion) {
            return;
          }
          this.slotsError = getApiErrorMessage(
            error,
            'Available appointment times could not be loaded. Check your connection and try again.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  selectSlot(slot: AvailableAppointmentSlot): void {
    if (!this.slots.includes(slot) || this.submitting) {
      return;
    }
    this.selectedSlot = slot;
    this.bookingError = '';
  }

  confirmBooking(): void {
    if (
      this.submitting ||
      this.successAppointment ||
      !this.doctor?.isActive ||
      !this.selectedSlot ||
      this.bookingForm.controls.appointmentDate.invalid
    ) {
      this.bookingForm.controls.appointmentDate.markAsTouched();
      return;
    }

    this.submitting = true;
    this.bookingForm.disable({ emitEvent: false });
    this.bookingError = '';
    const request = {
      doctorId: this.doctorId,
      appointmentDate: this.selectedSlot.availableDate,
      startTime: this.selectedSlot.startTime,
      endTime: this.selectedSlot.endTime,
      reason: this.bookingForm.controls.reason.value.trim() || null,
    };

    this.appointmentService
      .create(request)
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.bookingForm.enable({ emitEvent: false });
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (appointment) => {
          this.successAppointment = appointment;
          this.refreshPatientAppointments();
          this.cdr.markForCheck();
        },
        error: (error) => {
          const fallback = bookingFallback(error);
          const errorMessage = getApiErrorMessage(error, fallback);
          this.bookingError = errorMessage;
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.selectedSlot = null;
            this.onDateChanged();
            this.bookingError = errorMessage;
          }
          this.cdr.markForCheck();
        },
      });
  }

  formatDate(dateValue: string): string {
    return formatDateOnly(dateValue);
  }

  formatTime(timeValue: string): string {
    return formatTimeOnly(timeValue);
  }

  private loadDoctorAvailability(): void {
    this.availabilitiesLoading = true;
    this.availabilitiesError = '';
    this.availabilityService
      .getForDoctor(this.doctorId)
      .pipe(
        finalize(() => {
          this.availabilitiesLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (items) => {
          this.availabilities = items;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.availabilitiesError = getApiErrorMessage(
            error,
            'Doctor schedule availability could not be loaded.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  private refreshPatientAppointments(): void {
    this.appointmentListRefreshing = true;
    this.appointmentListRefreshed = false;
    this.appointmentListRefreshError = '';
    this.patientService
      .getAppointments()
      .pipe(
        finalize(() => {
          this.appointmentListRefreshing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.appointmentListRefreshed = true;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.appointmentListRefreshError = getApiErrorMessage(
            error,
            'The booking succeeded, but your appointment list could not be refreshed. It will reload when you return to your dashboard.',
          );
          this.cdr.markForCheck();
        },
      });
  }
}

function bookingFallback(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'The appointment could not be booked.';
  }
  if (error.status === 0) {
    return 'A network error prevented the booking. Check your connection and try again.';
  }
  if (error.status === 401) {
    return 'Your session has expired. Sign in again to book an appointment.';
  }
  if (error.status === 409) {
    return 'This time is no longer available. Choose another slot.';
  }
  if (error.status === 400) {
    return 'The booking details were rejected. Review the date and selected time.';
  }
  return 'The appointment could not be booked.';
}
