import { describe, expect, it } from '@jest/globals';
import {
  SEED_DEFAULT_CLINIC_PLAN,
  SEED_DOCTOR_PLANS,
  SEED_STAFF_PLANS,
  seededSignatureUploadedAt,
  seededSignatures,
} from './seed-clinic-users-factory';

describe('seed clinic-users factory', () => {
  it('exposes the 4-doctor roster with unique emails and 90000... phones', () => {
    expect(SEED_DOCTOR_PLANS).toHaveLength(4);
    const emails = SEED_DOCTOR_PLANS.map((d) => d.email);
    expect(new Set(emails).size).toBe(emails.length);
    for (const doctor of SEED_DOCTOR_PLANS) {
      expect(doctor.name).toBeTruthy();
      expect(doctor.phoneNumber).toMatch(/^\+91 9876543\d{3}$/);
      expect(doctor.specialization).toBeTruthy();
      expect(doctor.hospitalRole).toBeTruthy();
      expect(doctor.qualification).toBeTruthy();
      expect(doctor.registrationNumber).toMatch(/^K/);
      expect(doctor.licenseNumber).toMatch(/^KA-/);
      expect(doctor.yearsOfExperience).toBeGreaterThan(0);
      expect(doctor.consultationFee).toBeGreaterThan(0);
    }
  });

  it('only the admin-doctor and primary doctor carry signature urls', () => {
    const withSignature = SEED_DOCTOR_PLANS.filter((d) => d.signatureUrl);
    expect(withSignature.map((d) => d.key).sort()).toEqual([
      'adminDoctor',
      'doctor1',
    ]);
  });

  it('exposes the 4-staff roster with unique emails', () => {
    expect(SEED_STAFF_PLANS).toHaveLength(4);
    const emails = SEED_STAFF_PLANS.map((s) => s.email);
    expect(new Set(emails).size).toBe(emails.length);
    for (const staff of SEED_STAFF_PLANS) {
      expect(staff.name).toBeTruthy();
      expect(['RECEPTIONIST', 'NURSE']).toContain(staff.role);
      if (staff.phoneNumber) {
        expect(staff.phoneNumber).toMatch(/^\+91 9876543\d{3}$/);
      }
    }
  });

  it('pins the default clinic plan identity and fields', () => {
    expect(SEED_DEFAULT_CLINIC_PLAN.id).toBe('default-clinic-id');
    expect(SEED_DEFAULT_CLINIC_PLAN.name).toBe('Docita General Hospital');
    expect(SEED_DEFAULT_CLINIC_PLAN.tier).toBe('ENTERPRISE');
    expect(SEED_DEFAULT_CLINIC_PLAN.planMode).toBe('FULL');
    expect(SEED_DEFAULT_CLINIC_PLAN.email).toMatch(/@docita\.work$/);
  });

  it('exposes the placeholder signature catalog and a valid uploaded-at date', () => {
    expect(Object.keys(seededSignatures).sort()).toEqual([
      'adminDoctor',
      'clinicAdmin',
      'doctor',
      'internal',
    ]);
    for (const url of Object.values(seededSignatures)) {
      expect(url).toMatch(/^https:\/\/placehold\.co\/300x100\//);
    }
    expect(seededSignatureUploadedAt.toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });
});
