import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { getApiErrorMessage } from '../../core/api/api-error';
import { DoctorService } from '../../core/api/doctor.service';
import { PatientService } from '../../core/api/patient.service';
import { SpecialityService } from '../../core/api/speciality.service';
import { AuthService } from '../../core/auth/auth.service';
import { PatientProfile } from '../../core/auth/auth.models';
import { AppointmentStatus } from '../../core/models/appointment.models';
import { Doctor, Speciality } from '../../core/models/doctor.models';
import {
  Gender,
  PatientAppointment,
  UpdatePatientProfileRequest,
} from '../../core/models/patient.models';
import { formatDateOnly, formatTimeOnly, getClinicDateTime } from '../../core/utils/clinic-time';

type PatientSection = 'overview' | 'doctors' | 'appointments' | 'history' | 'profile';
type AppointmentViewMode = 'upcoming' | 'all';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly doctorService = inject(DoctorService);
  private readonly patientService = inject(PatientService);
  private readonly specialityService = inject(SpecialityService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly clinicToday = getClinicDateTime().date;
  readonly profileForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    dateOfBirth: ['', Validators.required],
    gender: this.formBuilder.nonNullable.control<Gender | ''>('', Validators.required),
    phoneNumber: ['', [Validators.required, Validators.maxLength(15)]],
    address: ['', [Validators.required, Validators.maxLength(250)]],
  });

  activeSection: PatientSection = 'overview';
  appointmentViewMode: AppointmentViewMode = 'upcoming';

  patientName = this.authService.getCurrentUser()?.fullName ?? 'Patient';
  profile: PatientProfile | null = null;
  profileLoading = false;
  profileSaving = false;
  profileEditing = false;
  profileError = '';
  profileMessage = '';

  doctors: Doctor[] = [];
  private allActiveDoctors: Doctor[] = [];
  private doctorSearchVersion = 0;
  specialities: Speciality[] = [];
  doctorsLoading = false;
  specialitiesLoading = false;
  doctorsError = '';
  specialitiesError = '';
  doctorSearchText = '';
  selectedSpecialityId = '';
  expandedDoctorId: number | null = null;

  appointments: PatientAppointment[] = [];
  history: PatientAppointment[] = [];
  appointmentsLoading = false;
  historyLoading = false;
  appointmentsError = '';
  historyError = '';
  appointmentActionError = '';
  cancellationMessage = '';
  confirmingCancellationId: number | null = null;
  cancellingAppointmentId: number | null = null;

  ngOnInit(): void {
    this.profileForm.disable();
    this.loadProfile();
    this.loadDoctors();
    this.loadSpecialities();
    this.loadAppointments();
    this.loadHistory();
  }

  scrollToSection(section: PatientSection): void {
    this.activeSection = section;
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  get upcomingAppointments(): PatientAppointment[] {
    const now = getClinicDateTime();
    return this.appointments
      .filter((appointment) =>
        this.canCancel(appointment.status) &&
        (appointment.appointmentDate > now.date ||
          (appointment.appointmentDate === now.date &&
            appointment.startTime.slice(0, 5) > now.time)),
      )
      .sort((left, right) =>
        `${left.appointmentDate}T${left.startTime}`.localeCompare(
          `${right.appointmentDate}T${right.startTime}`,
        ),
      );
  }

  get displayedAppointments(): PatientAppointment[] {
    if (this.appointmentViewMode === 'upcoming') {
      return this.upcomingAppointments;
    }

    return [...this.appointments].sort((left, right) =>
      `${right.appointmentDate}T${right.startTime}`.localeCompare(
        `${left.appointmentDate}T${left.startTime}`,
      ),
    );
  }

  get visibleDoctors(): Doctor[] {
    const search = this.doctorSearchText.trim().toLowerCase();
    if (!search) {
      return this.doctors;
    }

    return this.doctors.filter((doctor) =>
      [doctor.fullName, doctor.qualification, doctor.specialityName, doctor.bio ?? '']
        .some((value) => value.toLowerCase().includes(search)),
    );
  }

  toggleDoctorDetails(doctorId: number): void {
    this.expandedDoctorId = this.expandedDoctorId === doctorId ? null : doctorId;
  }

  clearDoctorFilters(): void {
    this.doctorSearchText = '';
    if (this.selectedSpecialityId) {
      this.onSpecialityChanged('');
    }
  }

  onSpecialityChanged(specialityId: string): void {
    this.selectedSpecialityId = specialityId;
    this.doctorsError = '';
    const searchVersion = ++this.doctorSearchVersion;
    if (!specialityId) {
      this.doctors = this.allActiveDoctors;
      this.doctorsLoading = false;
      return;
    }

    this.doctorsLoading = true;
    this.doctorService
      .searchDoctorsBySpeciality(Number(specialityId))
      .pipe(
        finalize(() => {
          if (searchVersion === this.doctorSearchVersion) {
            this.doctorsLoading = false;
            this.cdr.markForCheck();
          }
        }),
      )
      .subscribe({
        next: (doctors) => {
          if (searchVersion !== this.doctorSearchVersion) {
            return;
          }
          this.doctors = doctors.filter((doctor) => doctor.isActive);
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (searchVersion !== this.doctorSearchVersion) {
            return;
          }
          this.doctorsError = getApiErrorMessage(error, 'Doctors could not be loaded.');
          this.doctors = [];
          this.cdr.markForCheck();
        },
      });
  }

  beginProfileEdit(): void {
    this.profileMessage = '';
    this.profileError = '';
    this.profileEditing = true;
    this.profileForm.enable();
  }

  cancelProfileEdit(): void {
    if (this.profile) {
      this.setProfileForm(this.profile);
    }
    this.profileEditing = false;
    this.profileForm.disable();
    this.profileError = '';
  }

  saveProfile(): void {
    if (!this.profile || this.profileForm.invalid || this.profileSaving) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const values = this.profileForm.getRawValue();
    if (!isGender(values.gender)) {
      this.profileForm.controls.gender.markAsTouched();
      return;
    }

    this.profileSaving = true;
    this.profileMessage = '';
    this.profileError = '';
    const request: UpdatePatientProfileRequest = {
      ...values,
      gender: values.gender,
    };

    this.patientService
      .updateProfile(request)
      .pipe(
        finalize(() => {
          this.profileSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (profile) => {
          this.profile = profile;
          this.patientName = profile.fullName;
          this.authService.updateCurrentUserFullName(profile.fullName);
          this.setProfileForm(profile);
          this.profileEditing = false;
          this.profileForm.disable();
          this.profileMessage = 'Your profile has been updated.';
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.profileError = getApiErrorMessage(error, 'Your profile could not be updated.');
          this.cdr.markForCheck();
        },
      });
  }

  canCancel(status: AppointmentStatus): boolean {
    return status === 'Pending' || status === 'Confirmed';
  }

  requestCancellation(appointmentId: number): void {
    this.confirmingCancellationId = appointmentId;
    this.appointmentActionError = '';
    this.cancellationMessage = '';
  }

  keepAppointment(): void {
    this.confirmingCancellationId = null;
  }

  cancelAppointment(appointment: PatientAppointment): void {
    if (!this.canCancel(appointment.status) || this.cancellingAppointmentId !== null) {
      return;
    }

    this.cancellingAppointmentId = appointment.appointmentId;
    this.confirmingCancellationId = null;
    this.appointmentActionError = '';
    this.cancellationMessage = '';
    this.patientService
      .cancelAppointment(appointment.appointmentId)
      .pipe(
        finalize(() => {
          this.cancellingAppointmentId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.cancellationMessage = 'The appointment was cancelled.';
          this.loadAppointments();
          this.loadHistory();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.appointmentActionError = getApiErrorMessage(
            error,
            'The appointment could not be cancelled.',
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

  retryProfileLoad(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.profileLoading = true;
    this.profileError = '';
    this.authService
      .getProfile()
      .pipe(
        finalize(() => {
          this.profileLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (profile) => {
          this.profile = profile;
          this.patientName = profile.fullName;
          this.setProfileForm(profile);
          this.profileForm.disable();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.profileError = getApiErrorMessage(error, 'Your profile could not be loaded.');
          this.cdr.markForCheck();
        },
      });
  }

  private loadDoctors(): void {
    this.doctorsLoading = true;
    this.doctorsError = '';
    this.doctorService
      .getDoctors()
      .pipe(
        finalize(() => {
          this.doctorsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (doctors) => {
          this.allActiveDoctors = doctors.filter((doctor) => doctor.isActive);
          if (!this.selectedSpecialityId) {
            this.doctors = this.allActiveDoctors;
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.doctorsError = getApiErrorMessage(error, 'Doctors could not be loaded.');
          this.cdr.markForCheck();
        },
      });
  }

  private loadSpecialities(): void {
    this.specialitiesLoading = true;
    this.specialitiesError = '';
    this.specialityService
      .getAll()
      .pipe(
        finalize(() => {
          this.specialitiesLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (specialities) => {
          this.specialities = specialities;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.specialitiesError = getApiErrorMessage(
            error,
            'Specialities could not be loaded.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  private loadAppointments(): void {
    this.appointmentsLoading = true;
    this.appointmentsError = '';
    this.patientService
      .getAppointments()
      .pipe(
        finalize(() => {
          this.appointmentsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (appointments) => {
          this.appointments = appointments;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.appointmentsError = getApiErrorMessage(
            error,
            'Your appointments could not be loaded.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  private loadHistory(): void {
    this.historyLoading = true;
    this.historyError = '';
    this.patientService
      .getAppointmentHistory()
      .pipe(
        finalize(() => {
          this.historyLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (history) => {
          this.history = history;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.historyError = getApiErrorMessage(
            error,
            'Your appointment history could not be loaded.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  private setProfileForm(profile: PatientProfile): void {
    this.profileForm.setValue({
      fullName: profile.fullName,
      dateOfBirth: profile.dateOfBirth.slice(0, 10),
      gender: profile.gender,
      phoneNumber: profile.phoneNumber,
      address: profile.address,
    });
  }
}

function isGender(value: string): value is Gender {
  return value === 'Male' || value === 'Female' || value === 'Other';
}
