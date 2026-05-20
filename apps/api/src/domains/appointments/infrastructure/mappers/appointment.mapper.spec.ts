import { describe, expect, it } from '@jest/globals';
import { AppointmentStatus as PrismaAppointmentStatus } from '@workspace/db';
import { appointmentListItemResponseSchema } from '@workspace/types';
import type { Appointment as PrismaAppointment } from '@workspace/db';
import { AppointmentMapper } from './appointment.mapper';

describe('AppointmentMapper.toListItem', () => {
  it('omits detail-only clinical fields so list contract strict schema parses', () => {
    const raw = {
      id: 'appt-list-contract',
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      startTime: new Date('2026-04-01T09:00:00.000Z'),
      endTime: new Date('2026-04-01T09:30:00.000Z'),
      status: PrismaAppointmentStatus.SCHEDULED,
      notes: null,
      consultationNotes: null,
      observations: null,
      chiefComplaint: 'cough',
      historyOfPresentIllness: 'HPI should not appear on list payloads',
      pastMedicalHistory: 'PMH',
      reviewOfSystems: null,
      provisionalDiagnosis: null,
      treatmentHistory: null,
      treatmentPlan: 'plan',
      clinicalImpression: null,
      differentialDiagnosis: null,
      finalDiagnosis: null,
      followUpPlan: null,
      generalExamination: {},
      systemicExamination: null,
      investigations: null,
      growthData: null,
      ophthalmologyExam: null,
      cardiologyExam: null,
      gynecologyExam: null,
      dermatologyExam: null,
      psychiatryExam: null,
      dentalChart: null,
      type: 'consultation',
      createdAt: new Date('2026-04-01T08:00:00.000Z'),
      updatedAt: new Date('2026-04-01T08:00:00.000Z'),
      version: 1,
      patient: {
        id: 'patient-1',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '9999999999',
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Smith',
      },
    } as unknown as PrismaAppointment & {
      patient: {
        id: string;
        firstName: string;
        lastName: string;
        phoneNumber: string;
      };
      doctor: { id: string; name: string };
    };

    const listItem = AppointmentMapper.toListItem(raw);
    const parsed = appointmentListItemResponseSchema.safeParse(listItem);
    expect(parsed.success).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(listItem, 'historyOfPresentIllness'),
    ).toBe(false);
  });
});

describe('AppointmentMapper.toDomain', () => {
  it('parses annotated clinical Json columns with Zod', () => {
    const raw = {
      id: 'appt-parse',
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      startTime: new Date('2026-04-01T09:00:00.000Z'),
      endTime: new Date('2026-04-01T09:30:00.000Z'),
      status: PrismaAppointmentStatus.SCHEDULED,
      notes: null,
      consultationNotes: null,
      observations: null,
      chiefComplaint: null,
      historyOfPresentIllness: null,
      pastMedicalHistory: null,
      reviewOfSystems: null,
      provisionalDiagnosis: null,
      treatmentHistory: null,
      treatmentPlan: null,
      clinicalImpression: null,
      differentialDiagnosis: null,
      finalDiagnosis: null,
      followUpPlan: null,
      generalExamination: { pallor: true },
      systemicExamination: null,
      investigations: [{ name: 'CBC', status: 'ORDERED' }],
      growthData: null,
      ophthalmologyExam: null,
      cardiologyExam: null,
      gynecologyExam: null,
      dermatologyExam: null,
      psychiatryExam: null,
      dentalChart: null,
      type: 'consultation',
      createdAt: new Date('2026-04-01T08:00:00.000Z'),
      updatedAt: new Date('2026-04-01T08:00:00.000Z'),
      version: 1,
    } as unknown as Parameters<typeof AppointmentMapper.toDomain>[0];

    const domain = AppointmentMapper.toDomain(raw);
    expect(domain.toPlain().generalExamination).toMatchObject({ pallor: true });
    expect(domain.toPlain().investigations).toHaveLength(1);
  });
});
