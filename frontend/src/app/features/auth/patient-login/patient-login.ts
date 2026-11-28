import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-patient-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './patient-login.html',
  styleUrl: './patient-login.css',
})
export class PatientLogin {
  constructor(private router: Router) {}

  loginSuccessful() {
    alert('Login successful!');
    this.router.navigate(['/patient-dashboard']);
  }
}