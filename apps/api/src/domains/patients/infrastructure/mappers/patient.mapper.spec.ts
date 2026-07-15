import { beforeEach, describe, expect, it } from '@jest/globals';
import { Gender } from '@workspace/db';
import { Patient } from '@/domains/patients/core/entities/patient.entity';
import { PatientMapper } from './patient.mapper';

const basePatientProps = {
  id: 'patient-1',
  clinicId: 'clinic-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  gender: Gender.FEMALE,
  dateOfBirth: new Date('1990-12-10T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  version: 1,
};

describe('PatientMapper write-side phone normalization', () => {
  it('normalizes a bare 10-digit phone to +91… on create', () => {
    const patient = new Patient({
      ...basePatientProps,
      phoneNumber: '9812345678',
    });

    const input = PatientMapper.toPrismaUncheckedCreateInput(patient);
    expect(input.phoneNumber).toBe('+919812345678');
  });

  it('strips punctuation and normalizes a 91-prefixed number on create', () => {
    const patient = new Patient({
      ...basePatientProps,
      phoneNumber: '(91) 98123 45678',
    });

    const input = PatientMapper.toPrismaUncheckedCreateInput(patient);
    expect(input.phoneNumber).toBe('+919812345678');
  });

  it('is idempotent for an already-E.164 number on create', () => {
    const patient = new Patient({
      ...basePatientProps,
      phoneNumber: '+919812345678',
    });

    const input = PatientMapper.toPrismaUncheckedCreateInput(patient);
    expect(input.phoneNumber).toBe('+919812345678');
  });

  it('normalizes the phone on update without dropping other fields', () => {
    const patient = new Patient({
      ...basePatientProps,
      phoneNumber: '9812345678',
      email: 'ada@example.test',
    });

    const input = PatientMapper.toPrismaUncheckedUpdateInput(patient);
    expect(input.phoneNumber).toBe('+919812345678');
    expect(input.email).toBe('ada@example.test');
    expect(input.firstName).toBe('Ada');
  });

  it('leaves a null phone null on update (no spurious + sign)', () => {
    const patient = new Patient({
      ...basePatientProps,
      phoneNumber: undefined,
    });

    const input = PatientMapper.toPrismaUncheckedUpdateInput(patient);
    expect(input.phoneNumber).toBeUndefined();
  });
});
