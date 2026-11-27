import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAddDoctor } from './admin-add-doctor';

describe('AdminAddDoctor', () => {
  let component: AdminAddDoctor;
  let fixture: ComponentFixture<AdminAddDoctor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAddDoctor],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAddDoctor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
