import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../core/api/admin.service';
import { getApiErrorMessage } from '../../core/api/api-error';
import { SpecialityService, UpdateSpecialityRequest } from '../../core/api/speciality.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  AdminDashboardStatistics,
  AdminPatient,
  CreateDoctorAccountRequest,
  UpdateDoctorRequest,
} from '../../core/models/admin.models';
import { AdminAppointment, AppointmentStatus } from '../../core/models/appointment.models';
import { Doctor, Speciality } from '../../core/models/doctor.models';
import { formatDateOnly, formatTimeOnly } from '../../core/utils/clinic-time';

type AdminSection = 'overview' | 'patients' | 'doctors' | 'specialities' | 'appointments';
type AdminAppointmentStatusFilter = AppointmentStatus | '';

@Component({
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule, ReactiveFormsModule],
  selector: 'app-admin-dashboard',
  styleUrl: './admin-dashboard.css',
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly specialityService = inject(SpecialityService);
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly doctorCreateForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phoneNumber: ['', [Validators.required, Validators.maxLength(15)]],
    specialityId: [0, [Validators.required, Validators.min(1)]],
    qualification: ['', [Validators.required, Validators.maxLength(150)]],
    experienceYears: [0, [Validators.required, Validators.min(0), Validators.max(60)]],
    consultationFee: [0, [Validators.required, Validators.min(0), Validators.max(99999999)]],
    bio: ['', Validators.maxLength(1000)],
  });
  readonly doctorUpdateForm = this.formBuilder.nonNullable.group({
    specialityId: [0, [Validators.required, Validators.min(1)]],
    qualification: ['', [Validators.required, Validators.maxLength(150)]],
    experienceYears: [0, [Validators.required, Validators.min(0), Validators.max(60)]],
    consultationFee: [0, [Validators.required, Validators.min(0), Validators.max(99999999)]],
    bio: ['', Validators.maxLength(1000)],
    isActive: [true],
  });
  readonly specialityForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
  });
  readonly appointmentFilterForm = this.formBuilder.nonNullable.group({
    date: [''],
    doctorId: [0],
    patientId: [0],
    status: ['' as AdminAppointmentStatusFilter],
  });

  activeSection: AdminSection = 'overview';
  adminName = this.authService.getCurrentUser()?.fullName ?? 'Admin';

  statistics: AdminDashboardStatistics | null = null;
  statisticsLoading = false;
  statisticsError = '';
  patients: AdminPatient[] = [];
  patientsLoading = false;
  patientsError = '';
  patientSearch = '';
  selectedPatientId: number | null = null;
  doctors: Doctor[] = [];
  doctorsLoading = false;
  doctorsError = '';
  doctorSearch = '';
  doctorActiveFilter: 'All' | 'Active' | 'Inactive' = 'All';
  specialities: Speciality[] = [];
  specialitiesLoading = false;
  specialitiesError = '';
  appointments: AdminAppointment[] = [];
  appointmentsLoading = false;
  appointmentsError = '';
  selectedAppointment: AdminAppointment | null = null;
  appointmentDetailLoading = false;
  appointmentDetailError = '';

  doctorFormMode: 'closed' | 'create' | 'edit' = 'closed';
  editingDoctorId: number | null = null;
  editingDoctorName = '';
  savingDoctor = false;
  doctorActionId: number | null = null;
  confirmingDoctorDeactivationId: number | null = null;
  doctorMessage = '';
  doctorActionError = '';

  editingSpecialityId: number | null = null;
  savingSpeciality = false;
  confirmingSpecialityDeleteId: number | null = null;
  specialityMessage = '';
  specialityActionError = '';

  ngOnInit(): void {
    this.loadStatistics();
    this.loadPatients();
    this.loadDoctors();
    this.loadSpecialities();
    this.loadAppointments();
  }

  scrollToSection(section: AdminSection): void {
    this.activeSection = section;
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  get visiblePatients(): AdminPatient[] {
    const search = this.patientSearch.trim().toLowerCase();
    if (!search) {
      return this.patients;
    }
    return this.patients.filter((patient) =>
      [patient.fullName, patient.email, patient.phoneNumber, String(patient.patientId)]
        .some((value) => value.toLowerCase().includes(search)),
    );
  }

  get visibleDoctors(): Doctor[] {
    const search = this.doctorSearch.trim().toLowerCase();
    return this.doctors.filter((doctor) => {
      const matchesSearch =
        !search ||
        [doctor.fullName, doctor.qualification, doctor.specialityName]
          .some((value) => value.toLowerCase().includes(search));
      const matchesActive =
        this.doctorActiveFilter === 'All' ||
        (this.doctorActiveFilter === 'Active' ? doctor.isActive : !doctor.isActive);
      return matchesSearch && matchesActive;
    });
  }

  get selectedPatient(): AdminPatient | null {
    return this.patients.find((patient) => patient.patientId === this.selectedPatientId) ?? null;
  }

  selectPatient(patientId: number): void {
    this.selectedPatientId = this.selectedPatientId === patientId ? null : patientId;
  }

  applyAppointmentFilters(): void {
    const values = this.appointmentFilterForm.getRawValue();
    this.loadAppointments({
      date: values.date || undefined,
      doctorId: values.doctorId > 0 ? values.doctorId : undefined,
      patientId: values.patientId > 0 ? values.patientId : undefined,
      status: values.status || undefined,
    });
  }

  clearAppointmentFilters(): void {
    this.appointmentFilterForm.reset({ date: '', doctorId: 0, patientId: 0, status: '' });
    this.selectedAppointment = null;
    this.loadAppointments();
  }

  viewAppointment(appointmentId: number): void {
    if (this.selectedAppointment?.appointmentId === appointmentId) {
      this.selectedAppointment = null;
      return;
    }

    this.selectedAppointment = null;
    this.appointmentDetailError = '';
    this.appointmentDetailLoading = true;
    this.adminService
      .getAppointment(appointmentId)
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

  startDoctorCreation(): void {
    this.doctorFormMode = 'create';
    this.editingDoctorId = null;
    this.editingDoctorName = '';
    this.doctorActionError = '';
    this.doctorMessage = '';
    this.doctorCreateForm.reset({
      fullName: '',
      email: '',
      password: '',
      phoneNumber: '',
      specialityId: 0,
      qualification: '',
      experienceYears: 0,
      consultationFee: 0,
      bio: '',
    });
  }

  startDoctorEdit(doctor: Doctor): void {
    this.doctorFormMode = 'edit';
    this.editingDoctorId = doctor.doctorId;
    this.editingDoctorName = doctor.fullName;
    this.doctorActionError = '';
    this.doctorMessage = '';
    this.doctorUpdateForm.setValue({
      specialityId: doctor.specialityId,
      qualification: doctor.qualification,
      experienceYears: doctor.experienceYears,
      consultationFee: doctor.consultationFee,
      bio: doctor.bio ?? '',
      isActive: doctor.isActive,
    });
  }

  cancelDoctorForm(): void {
    this.doctorFormMode = 'closed';
    this.editingDoctorId = null;
    this.editingDoctorName = '';
    this.doctorCreateForm.reset({
      fullName: '',
      email: '',
      password: '',
      phoneNumber: '',
      specialityId: 0,
      qualification: '',
      experienceYears: 0,
      consultationFee: 0,
      bio: '',
    });
    this.doctorUpdateForm.reset({
      specialityId: 0,
      qualification: '',
      experienceYears: 0,
      consultationFee: 0,
      bio: '',
      isActive: true,
    });
  }

  createDoctor(): void {
    if (this.doctorCreateForm.invalid || this.savingDoctor) {
      this.doctorCreateForm.markAllAsTouched();
      return;
    }

    const values = this.doctorCreateForm.getRawValue();
    const request: CreateDoctorAccountRequest = {
      ...values,
      bio: values.bio.trim() || null,
    };
    this.savingDoctor = true;
    this.doctorActionError = '';
    this.doctorMessage = '';
    this.adminService
      .createDoctor(request)
      .pipe(
        finalize(() => {
          this.savingDoctor = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (doctor) => {
          this.doctorMessage = `Doctor account created for ${doctor.fullName}.`;
          this.cancelDoctorForm();
          this.loadDoctors();
          this.loadStatistics();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.doctorActionError = getApiErrorMessage(
            error,
            'The Doctor account could not be created.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  saveDoctorChanges(): void {
    if (this.editingDoctorId === null || this.doctorUpdateForm.invalid || this.savingDoctor) {
      this.doctorUpdateForm.markAllAsTouched();
      return;
    }
    const values = this.doctorUpdateForm.getRawValue();
    const request: UpdateDoctorRequest = {
      ...values,
      bio: values.bio.trim() || null,
    };

    this.savingDoctor = true;
    this.doctorActionError = '';
    this.doctorMessage = '';
    this.adminService
      .updateDoctor(this.editingDoctorId, request)
      .pipe(
        finalize(() => {
          this.savingDoctor = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.doctorMessage = 'Doctor details updated.';
          this.cancelDoctorForm();
          this.loadDoctors();
          this.loadStatistics();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.doctorActionError = getApiErrorMessage(
            error,
            'Doctor details could not be updated.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  requestDoctorDeactivation(doctorId: number): void {
    this.confirmingDoctorDeactivationId = doctorId;
    this.doctorActionError = '';
  }

  cancelDoctorDeactivation(): void {
    this.confirmingDoctorDeactivationId = null;
  }

  toggleDoctorActive(doctor: Doctor): void {
    if (this.doctorActionId !== null) {
      return;
    }
    this.doctorActionId = doctor.doctorId;
    this.doctorActionError = '';
    this.doctorMessage = '';
    const operation = doctor.isActive
      ? this.adminService.deactivateDoctor(doctor.doctorId)
      : this.adminService.updateDoctor(doctor.doctorId, {
          specialityId: doctor.specialityId,
          qualification: doctor.qualification,
          experienceYears: doctor.experienceYears,
          consultationFee: doctor.consultationFee,
          bio: doctor.bio,
          isActive: true,
        });

    operation
      .pipe(
        finalize(() => {
          this.doctorActionId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.confirmingDoctorDeactivationId = null;
          this.doctorMessage = doctor.isActive ? 'Doctor deactivated.' : 'Doctor activated.';
          this.loadDoctors();
          this.loadStatistics();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.doctorActionError = getApiErrorMessage(
            error,
            'Doctor status could not be changed.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  startSpecialityEdit(speciality: Speciality): void {
    this.editingSpecialityId = speciality.specialityId;
    this.specialityActionError = '';
    this.specialityMessage = '';
    this.specialityForm.setValue({
      name: speciality.name,
      description: speciality.description ?? '',
    });
  }

  cancelSpecialityEdit(): void {
    this.editingSpecialityId = null;
    this.specialityForm.reset({ name: '', description: '' });
    this.specialityActionError = '';
  }

  saveSpeciality(): void {
    if (this.specialityForm.invalid || this.savingSpeciality) {
      this.specialityForm.markAllAsTouched();
      return;
    }

    const values = this.specialityForm.getRawValue();
    const description = values.description.trim() || null;
    this.savingSpeciality = true;
    this.specialityActionError = '';
    this.specialityMessage = '';

    if (this.editingSpecialityId === null) {
      this.specialityService
        .create({ name: values.name.trim(), description })
        .pipe(
          finalize(() => {
            this.savingSpeciality = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (speciality) => {
            this.specialityMessage = `${speciality.name} speciality added.`;
            this.cancelSpecialityEdit();
            this.loadSpecialities();
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.specialityActionError = getApiErrorMessage(
              error,
              'Speciality could not be added.',
            );
            this.cdr.markForCheck();
          },
        });
      return;
    }

    const request: UpdateSpecialityRequest = {
      specialityId: this.editingSpecialityId,
      name: values.name.trim(),
      description,
    };
    this.specialityService
      .update(this.editingSpecialityId, request)
      .pipe(
        finalize(() => {
          this.savingSpeciality = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.specialityMessage = 'Speciality updated.';
          this.cancelSpecialityEdit();
          this.loadSpecialities();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.specialityActionError = getApiErrorMessage(
            error,
            'Speciality could not be updated.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  requestSpecialityDelete(specialityId: number): void {
    this.confirmingSpecialityDeleteId = specialityId;
    this.specialityActionError = '';
  }

  cancelSpecialityDelete(): void {
    this.confirmingSpecialityDeleteId = null;
  }

  deleteSpeciality(specialityId: number): void {
    if (this.confirmingSpecialityDeleteId !== specialityId || this.savingSpeciality) {
      return;
    }
    this.savingSpeciality = true;
    this.confirmingSpecialityDeleteId = null;
    this.specialityActionError = '';
    this.specialityService
      .delete(specialityId)
      .pipe(
        finalize(() => {
          this.savingSpeciality = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          this.specialityMessage = response.message;
          this.loadSpecialities();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.specialityActionError = getApiErrorMessage(
            error,
            'Speciality could not be deleted.',
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

  private loadStatistics(): void {
    this.statisticsLoading = true;
    this.statisticsError = '';
    this.adminService
      .getDashboard()
      .pipe(
        finalize(() => {
          this.statisticsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (statistics) => {
          this.statistics = statistics;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.statisticsError = getApiErrorMessage(
            error,
            'Dashboard statistics could not be loaded.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  private loadPatients(): void {
    this.patientsLoading = true;
    this.patientsError = '';
    this.adminService
      .getPatients()
      .pipe(
        finalize(() => {
          this.patientsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (patients) => {
          this.patients = patients;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.patientsError = getApiErrorMessage(error, 'Patient records could not be loaded.');
          this.cdr.markForCheck();
        },
      });
  }

  private loadDoctors(): void {
    this.doctorsLoading = true;
    this.doctorsError = '';
    this.adminService
      .getDoctors()
      .pipe(
        finalize(() => {
          this.doctorsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (doctors) => {
          this.doctors = doctors;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.doctorsError = getApiErrorMessage(error, 'Doctor records could not be loaded.');
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

  private loadAppointments(filters: Parameters<AdminService['getAppointments']>[0] = {}): void {
    this.appointmentsLoading = true;
    this.appointmentsError = '';
    this.adminService
      .getAppointments(filters)
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
            'Appointments could not be loaded.',
          );
          this.cdr.markForCheck();
        },
      });
  }
}
