import { Injectable } from '@nestjs/common';
import { VitalSign, Appointment, Patient } from '@workspace/db';
import { FhirObservation } from '../interfaces/fhir.interfaces';

// Type alias for VitalSign with required relations
type VitalWithRelations = VitalSign & {
  appointment: Appointment & {
    patient: { firstName: string; lastName: string };
  };
};

@Injectable()
export class FhirObservationFactory {
  createMany(vitals: VitalWithRelations[]): FhirObservation[] {
    const observations: FhirObservation[] = [];

    for (const vital of vitals) {
      const patientId = vital.appointment.patientId; // Wait, appointment has patientId, but type definition above assumed just patient object. Prisma includes patientId in appointment usually.
      // Actually checking prisma schema, Appointment has patientId.

      const patientRef = `Patient/${(vital.appointment as any).patientId || (vital as any).patientId}`; // Fallback or strict?
      // Ideally caller passes vital loaded with appointment.patient.
      // The original code used appointment.patientId.

      const effectiveDateTime = vital.appointment.startTime.toISOString();
      const patientDisplay = `${vital.appointment.patient.firstName} ${vital.appointment.patient.lastName}`;
      const encounterRef = `Encounter/${vital.appointmentId}`;
      const subjectRef = `Patient/${vital.appointment.patientId}`; // Assuming appointment has patientId loaded.

      // Blood Pressure (as component observation)
      const systolicBP = vital.systolicBP;
      const diastolicBP = vital.diastolicBP;

      if (systolicBP && diastolicBP) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-bp`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '85354-9',
                display: 'Blood pressure panel with all children optional',
              },
            ],
            text: 'Blood Pressure',
          },
          subject: { reference: subjectRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          component: [
            {
              code: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '8480-6',
                    display: 'Systolic blood pressure',
                  },
                ],
              },
              valueQuantity: {
                value: systolicBP,
                unit: 'mmHg',
                system: 'http://unitsofmeasure.org',
                code: 'mm[Hg]',
              },
            },
            {
              code: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '8462-4',
                    display: 'Diastolic blood pressure',
                  },
                ],
              },
              valueQuantity: {
                value: diastolicBP,
                unit: 'mmHg',
                system: 'http://unitsofmeasure.org',
                code: 'mm[Hg]',
              },
            },
          ],
        });
      }

      // Heart Rate
      if (vital.pulse) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-hr`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8867-4',
                display: 'Heart rate',
              },
            ],
            text: 'Heart Rate',
          },
          subject: { reference: subjectRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.pulse,
            unit: 'beats/minute',
            system: 'http://unitsofmeasure.org',
            code: '/min',
          },
        });
      }

      // Temperature
      if (vital.temperature) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-temp`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8310-5',
                display: 'Body temperature',
              },
            ],
            text: 'Body Temperature',
          },
          subject: { reference: subjectRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.temperature,
            unit: 'Cel',
            system: 'http://unitsofmeasure.org',
            code: 'Cel',
          },
        });
      }

      // SpO2
      if (vital.spo2) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-spo2`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '2708-6',
                display: 'Oxygen saturation in Arterial blood',
              },
            ],
            text: 'Oxygen Saturation',
          },
          subject: { reference: subjectRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.spo2,
            unit: '%',
            system: 'http://unitsofmeasure.org',
            code: '%',
          },
        });
      }

      // Respiratory Rate
      if (vital.respiratoryRate) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-rr`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '9279-1',
                display: 'Respiratory rate',
              },
            ],
            text: 'Respiratory Rate',
          },
          subject: { reference: subjectRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.respiratoryRate,
            unit: 'breaths/minute',
            system: 'http://unitsofmeasure.org',
            code: '/min',
          },
        });
      }

      // Height
      if (vital.height) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-height`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8302-2',
                display: 'Body height',
              },
            ],
            text: 'Height',
          },
          subject: { reference: subjectRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.height,
            unit: 'cm',
            system: 'http://unitsofmeasure.org',
            code: 'cm',
          },
        });
      }

      // Weight
      if (vital.weight) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-weight`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '29463-7',
                display: 'Body weight',
              },
            ],
            text: 'Body Weight',
          },
          subject: { reference: subjectRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.weight,
            unit: 'kg',
            system: 'http://unitsofmeasure.org',
            code: 'kg',
          },
        });
      }

      // BMI
      if (vital.bmi) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-bmi`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '39156-5',
                display: 'Body mass index (BMI)',
              },
            ],
            text: 'BMI',
          },
          subject: { reference: subjectRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.bmi,
            unit: 'kg/m2',
            system: 'http://unitsofmeasure.org',
            code: 'kg/m2',
          },
        });
      }

      // Blood Glucose
      if (vital.bloodGlucose) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-glucose`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '2339-0',
                display: 'Glucose [Mass/volume] in Blood',
              },
            ],
            text: 'Blood Glucose',
          },
          subject: { reference: subjectRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.bloodGlucose,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL',
          },
        });
      }
    }

    return observations;
  }
}
