import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-patient-register',
 imports: [FormsModule],
  templateUrl: './patient-register.html',
  styleUrl: './patient-register.css',
})
export class PatientRegister {
  constructor(private router: Router) {}

  registrationSuccessful() {
    alert('Registration successful!');
    this.router.navigate(['/patient-dashboard']);
  }
}