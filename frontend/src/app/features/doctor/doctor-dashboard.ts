import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AppointmentService } from '../../core/api/appointment.service';
import { AvailabilityService } from '../../core/api/availability.service';
import { getApiErrorMessage } from '../../core/api/api-error';
import { DoctorService } from '../../core/api/doctor.service';
import { AuthService } from '../../core/auth/auth.service';
import { AppointmentResponse, AppointmentStatus } from '../../core/models/appointment.models';
import { AvailabilityRequest, DoctorAvailability } from '../../core/models/availability.models';
import { Doctor } from '../../core/models/doctor.models';
import {
  formatDateOnly,
  formatTimeOnly,
  getClinicDate,
  getClinicDateTime,
} from '../../core/utils/clinic-time';

type DoctorSection = 'overview' | 'appointments' | 'availability' | 'profile';
type DoctorAppointmentTab = 'upcoming' | 'history' | 'all';
type AppointmentFilter = 'All' | AppointmentStatus;

@Component({
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ReactiveFormsModule],
  selector: 'app-doctor-dashboard',
  styleUrl: './doctor-dashboard.css',
  templateUrl: './doctor-dashboard.html',
})
export class DoctorDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly doctorService = inject(DoctorService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly availabilityService = inject(AvailabilityService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly clinicToday = getClinicDate();
  readonly availabilityForm = this.formBuilder.nonNullable.group({
    availableDate: ['', Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    isAvailable: [true],
  });

  activeSection: DoctorSection = 'overview';
  appointmentTab: DoctorAppointmentTab = 'upcoming';

  doctor: Doctor | null = null;
  doctorLoading = false;
  doctorError = '';

  appointments: AppointmentResponse[] = [];
  appointmentsLoading = false;
  appointmentsError = '';
  appointmentFilter: AppointmentFilter = 'All';
  appointmentActionId: number | null = null;
  confirmingCancellationId: number | null = null;
  appointmentActionError = '';
  appointmentMessage = '';

  selectedAppointment: AppointmentResponse | null = null;
  appointmentDetailLoading = false;
  appointmentDetailError = '';

  availabilities: DoctorAvailability[] = [];
  availabilitiesLoading = false;
  availabilitiesError = '';
  availabilityFormVisible = false;
  editingAvailabilityId: number | null = null;
  deletingAvailabilityId: number | null = null;
  confirmingAvailabilityDeleteId: number | null = null;
  availabilitySaving = false;
  availabilityError = '';
  availabilityMessage = '';

  ngOnInit(): void {
    this.doctorLoading = true;
    this.doctorError = '';
    this.doctorService
      .getMyProfile()
      .pipe(
        finalize(() => {
          this.doctorLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (doctor) => {
          this.doctor = doctor;
          this.loadAppointments();
          this.loadAvailabilities();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.doctorError = getApiErrorMessage(
            error,
            'Your Doctor profile could not be loaded.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  scrollToSection(section: DoctorSection): void {
    this.activeSection = section;
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  get upcomingAppointments(): AppointmentResponse[] {
    const now = getClinicDateTime();
    return this.appointments
      .filter(
        (item) =>
          (item.status === 'Pending' || item.status === 'Confirmed') &&
          (item.appointmentDate > now.date ||
            (item.appointmentDate === now.date && item.startTime.slice(0, 5) > now.time)),
      )
      .sort((left, right) =>
        `${left.appointmentDate}T${left.startTime}`.localeCompare(
          `${right.appointmentDate}T${right.startTime}`,
        ),
      );
  }

  get historyAppointments(): AppointmentResponse[] {
    const now = getClinicDateTime();
    return this.appointments
      .filter(
        (item) =>
          item.status === 'Completed' ||
          item.status === 'Cancelled' ||
          item.appointmentDate < now.date ||
          (item.appointmentDate === now.date && item.startTime.slice(0, 5) <= now.time),
      )
      .sort((left, right) =>
        `${right.appointmentDate}T${right.startTime}`.localeCompare(
          `${left.appointmentDate}T${left.startTime}`,
        ),
      );
  }

  get visibleAppointments(): AppointmentResponse[] {
    const base =
      this.appointmentTab === 'upcoming'
        ? this.upcomingAppointments
        : this.appointmentTab === 'history'
          ? this.historyAppointments
          : [...this.appointments].sort((left, right) =>
              `${right.appointmentDate}T${right.startTime}`.localeCompare(
                `${left.appointmentDate}T${left.startTime}`,
              ),
            );

    return this.appointmentFilter === 'All'
      ? base
      : base.filter((item) => item.status === this.appointmentFilter);
  }

  get upcomingCount(): number {
    return this.upcomingAppointments.length;
  }

  get minAvailabilityTime(): string {
    const now = getClinicDateTime();
    return this.availabilityForm.controls.availableDate.value === now.date ? now.time : '';
  }

  countByStatus(status: AppointmentStatus): number {
    return this.appointments.filter((item) => item.status === status).length;
  }

  setAppointmentTab(tab: DoctorAppointmentTab): void {
    this.appointmentTab = tab;
    this.appointmentFilter = 'All';
  }

  setAppointmentFilter(filter: AppointmentFilter): void {
    this.appointmentFilter = filter;
  }

  viewAppointmentDetails(appointmentId: number): void {
    if (this.selectedAppointment?.appointmentId === appointmentId) {
      this.selectedAppointment = null;
      return;
    }

    this.selectedAppointment = null;
    this.appointmentDetailError = '';
    this.appointmentDetailLoading = true;
    this.appointmentService
      .getById(appointmentId)
      .pipe(
        finalize(() => {
          this.appointmentDetailLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (appointment) => {
          this.selectedAppointment = appointment;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.appointmentDetailError = getApiErrorMessage(
            error,
            'Appointment details could not be loaded.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  requestStatusChange(
    appointment: AppointmentResponse,
    status: AppointmentStatus,
  ): void {
    if (
      !this.isTransitionAllowed(appointment.status, status) ||
      this.appointmentActionId !== null
    ) {
      return;
    }

    this.appointmentActionError = '';
    this.appointmentMessage = '';
    if (status === 'Cancelled') {
      this.confirmingCancellationId = appointment.appointmentId;
      return;
    }
    this.updateAppointmentStatus(appointment.appointmentId, status);
  }

  confirmCancellation(appointmentId: number): void {
    const appointment = this.appointments.find((item) => item.appointmentId === appointmentId);
    if (!appointment || !this.isTransitionAllowed(appointment.status, 'Cancelled')) {
      this.confirmingCancellationId = null;
      return;
    }
    this.confirmingCancellationId = null;
    this.updateAppointmentStatus(appointmentId, 'Cancelled');
  }

  keepAppointment(): void {
    this.confirmingCancellationId = null;
  }

  isPastAvailability(item: DoctorAvailability): boolean {
    const now = getClinicDateTime();
    return (
      item.availableDate < now.date ||
      (item.availableDate === now.date && item.startTime.slice(0, 5) <= now.time)
    );
  }

  beginAddAvailability(): void {
    this.cancelAvailabilityEdit();
    this.availabilityFormVisible = true;
    this.availabilityMessage = '';
    this.availabilityError = '';
  }

  editAvailability(item: DoctorAvailability): void {
    if (this.isPastAvailability(item)) {
      this.availabilityError = 'Past availability windows cannot be edited.';
      return;
    }
    this.editingAvailabilityId = item.availabilityId;
    this.availabilityFormVisible = true;
    this.availabilityMessage = '';
    this.availabilityError = '';
    this.availabilityForm.setValue({
      availableDate: item.availableDate.slice(0, 10),
      startTime: formatTimeOnly(item.startTime),
      endTime: formatTimeOnly(item.endTime),
      isAvailable: item.isAvailable,
    });
  }

  cancelAvailabilityEdit(): void {
    this.editingAvailabilityId = null;
    this.availabilityFormVisible = false;
    this.availabilityForm.reset({
      availableDate: '',
      startTime: '',
      endTime: '',
      isAvailable: true,
    });
    this.availabilityError = '';
  }

  saveAvailability(): void {
    this.availabilityError = '';
    this.availabilityMessage = '';
    if (this.availabilityForm.invalid) {
      this.availabilityForm.markAllAsTouched();
      return;
    }

    const values = this.availabilityForm.getRawValue();
    const now = getClinicDateTime();
    if (
      values.availableDate < now.date ||
      (values.availableDate === now.date && values.startTime <= now.time)
    ) {
      this.availabilityError = 'Choose a future date and a start time that has not passed.';
      return;
    }
    if (values.startTime >= values.endTime) {
      this.availabilityError = 'End time must be later than start time.';
      return;
    }

    const request: AvailabilityRequest = {
      availableDate: values.availableDate,
      startTime: values.startTime,
      endTime: values.endTime,
      isAvailable: values.isAvailable,
    };
    const operation =
      this.editingAvailabilityId === null
        ? this.availabilityService.create(request)
        : this.availabilityService.update(this.editingAvailabilityId, request);

    this.availabilitySaving = true;
    operation
      .pipe(
        finalize(() => {
          this.availabilitySaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.availabilityMessage =
            this.editingAvailabilityId === null
              ? 'Availability added.'
              : 'Availability updated.';
          this.cancelAvailabilityEdit();
          this.loadAvailabilities();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.availabilityError = getApiErrorMessage(
            error,
            'Availability could not be saved.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  requestAvailabilityDelete(availabilityId: number): void {
    this.confirmingAvailabilityDeleteId = availabilityId;
    this.availabilityError = '';
    this.availabilityMessage = '';
  }

  cancelAvailabilityDelete(): void {
    this.confirmingAvailabilityDeleteId = null;
  }

  deleteAvailability(availabilityId: number): void {
    if (
      this.confirmingAvailabilityDeleteId !== availabilityId ||
      this.deletingAvailabilityId !== null
    ) {
      return;
    }

    this.confirmingAvailabilityDeleteId = null;
    this.deletingAvailabilityId = availabilityId;
    this.availabilityError = '';
    this.availabilityService
      .delete(availabilityId)
      .pipe(
        finalize(() => {
          this.deletingAvailabilityId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.availabilityMessage = 'Availability deleted.';
          this.loadAvailabilities();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.availabilityError = getApiErrorMessage(
            error,
            'Availability could not be deleted.',
          );
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

  logout(): void {
    this.authService.logout();
  }

  private loadAppointments(): void {
    this.appointmentsLoading = true;
    this.appointmentsError = '';
    this.appointmentService
      .getForDoctor()
      .pipe(
        finalize(() => {
          this.appointmentsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (appointments) => {
          this.appointments = appointments;
          if (this.selectedAppointment) {
            this.selectedAppointment =
              appointments.find(
                (item) => item.appointmentId === this.selectedAppointment!.appointmentId,
              ) ?? null;
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.appointmentsError = getApiErrorMessage(
            error,
            'Appointments could not be loaded.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  private loadAvailabilities(): void {
    if (!this.doctor) {
      return;
    }
    this.availabilitiesLoading = true;
    this.availabilitiesError = '';
    this.availabilityService
      .getForDoctor(this.doctor.doctorId)
      .pipe(
        finalize(() => {
          this.availabilitiesLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (availability) => {
          this.availabilities = availability;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.availabilitiesError = getApiErrorMessage(
            error,
            'Availability could not be loaded.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  private updateAppointmentStatus(
    appointmentId: number,
    status: AppointmentStatus,
  ): void {
    this.appointmentActionId = appointmentId;
    this.appointmentService
      .updateStatus(appointmentId, status)
      .pipe(
        finalize(() => {
          this.appointmentActionId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.appointmentMessage = `Appointment ${status.toLowerCase()}.`;
          this.loadAppointments();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.appointmentActionError = getApiErrorMessage(
            error,
            'The appointment status could not be changed.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  private isTransitionAllowed(
    current: AppointmentStatus,
    requested: AppointmentStatus,
  ): boolean {
    return current === 'Pending'
      ? requested === 'Confirmed' || requested === 'Cancelled'
      : current === 'Confirmed' &&
          (requested === 'Completed' || requested === 'Cancelled');
  }
}
