import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="booking-placeholder">
      <p class="eyebrow">APPOINTMENT BOOKING</p>
      <h1>Booking is coming in Phase 3</h1>
      <p>
        Doctor {{ doctorId }} was selected. No appointment has been created.
        Appointment slots and booking will be connected in the next phase.
      </p>
      <a routerLink="/patient-dashboard">Return to dashboard</a>
    </main>
  `,
  styles: [`
    :host{display:grid;min-height:100vh;place-items:center;padding:1.5rem;background:#f4f8f7;color:#243b35;font-family:Arial,Helvetica,sans-serif}
    .booking-placeholder{max-width:38rem;padding:2rem;border:1px solid #e7efec;border-radius:14px;background:#fff;box-shadow:0 5px 20px #12382c08}
    .eyebrow{color:#6b887e;font-size:.72rem;font-weight:700;letter-spacing:.11em}
    h1{margin:.35rem 0 1rem;font-size:1.7rem}
    p{line-height:1.6;color:#577068}
    a{display:inline-block;margin-top:.5rem;color:#176b58;font-weight:600}
  `],
})
export class BookAppointmentPlaceholder {
  private readonly route = inject(ActivatedRoute);
  readonly doctorId = this.route.snapshot.paramMap.get('doctorId') ?? '';
}
