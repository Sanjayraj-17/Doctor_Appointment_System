import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-admin-login',
  standalone: true,
   imports: [FormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLogin {
  constructor(private router: Router) {}

  login(): void {
    this.router.navigate(['/admin-dashboard']);
  }
}