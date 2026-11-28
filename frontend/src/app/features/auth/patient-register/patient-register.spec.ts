import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PatientRegister } from './patient-register';

describe('PatientRegister', () => {
  let component: PatientRegister;
  let fixture: ComponentFixture<PatientRegister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientRegister],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientRegister);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
