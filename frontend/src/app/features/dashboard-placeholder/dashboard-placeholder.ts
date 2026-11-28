import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard-placeholder',
  standalone: true,
  template: `
    <main class="dashboard-placeholder">
      <h1>{{ role }} dashboard</h1>
      <p>This protected dashboard page will be implemented in the next phase.</p>
      <button type="button" (click)="logout()">Log out</button>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      padding: clamp(1.5rem, 5vw, 4rem);
      background: #f5f8f7;
    }

    .dashboard-placeholder {
      max-width: 48rem;
      margin: 0 auto;
      padding: clamp(1.5rem, 4vw, 3rem);
      border-radius: 1rem;
      background: #fff;
      box-shadow: 0 0.5rem 2rem rgb(20 50 40 / 8%);
    }

    button {
      min-height: 2.75rem;
      padding: 0.65rem 1rem;
      border: 0;
      border-radius: 0.5rem;
      color: #fff;
      background: #176b58;
      cursor: pointer;
    }
  `],
})
export class DashboardPlaceholder {
  private readonly authService = inject(AuthService);
  readonly role = this.authService.getRole() ?? 'User';

  logout(): void {
    this.authService.logout();
  }
}
