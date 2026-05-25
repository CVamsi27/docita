import { Test, TestingModule } from '@nestjs/testing';
import { FhirObservationFactory } from './fhir-observation.factory';
import type { VitalWithRelations } from './observations/fhir-vital-sign.types';

describe('FhirObservationFactory', () => {
  let factory: FhirObservationFactory;

  const vital: VitalWithRelations = {
    id: 'vital-1',
    appointmentId: 'appt-1',
    systolicBP: 120,
    diastolicBP: 80,
    pulse: 72,
    temperature: 37,
    spo2: 98,
    respiratoryRate: 16,
    height: 170,
    weight: 70,
    bmi: 24.2,
    bloodGlucose: 95,
    appointment: {
      patientId: 'patient-1',
      startTime: new Date('2026-05-19T10:00:00.000Z'),
      patient: { firstName: 'Jane', lastName: 'Doe' },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FhirObservationFactory],
    }).compile();

    factory = module.get(FhirObservationFactory);
  });

  it('creates one observation per populated vital field', () => {
    const observations = factory.createMany([vital]);

    expect(observations).toHaveLength(9);
    expect(observations.map((o) => o.id)).toEqual(
      expect.arrayContaining([
        'vital-1-bp',
        'vital-1-hr',
        'vital-1-temp',
        'vital-1-spo2',
        'vital-1-rr',
        'vital-1-height',
        'vital-1-weight',
        'vital-1-bmi',
        'vital-1-glucose',
      ]),
    );
  });

  it('skips observations when vital values are absent', () => {
    const observations = factory.createMany([
      {
        ...vital,
        pulse: null,
        temperature: null,
        spo2: null,
        respiratoryRate: null,
        height: null,
        weight: null,
        bmi: null,
        bloodGlucose: null,
        systolicBP: null,
        diastolicBP: null,
      },
    ]);

    expect(observations).toHaveLength(0);
  });

  it('requires both BP components for blood pressure observation', () => {
    const observations = factory.createMany([
      {
        ...vital,
        diastolicBP: null,
        pulse: null,
        temperature: null,
        spo2: null,
        respiratoryRate: null,
        height: null,
        weight: null,
        bmi: null,
        bloodGlucose: null,
      },
    ]);

    expect(observations).toHaveLength(0);
  });
});
