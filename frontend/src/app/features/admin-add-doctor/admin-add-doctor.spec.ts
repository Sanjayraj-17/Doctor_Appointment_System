import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminAddDoctor } from './admin-add-doctor';

describe('AdminAddDoctor', () => {
  let component: AdminAddDoctor;
  let fixture: ComponentFixture<AdminAddDoctor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAddDoctor],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAddDoctor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
