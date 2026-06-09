import { FhirObservation } from '@/shared/modules/fhir/interfaces/fhir.interfaces';
import type { IFhirObservationBuilder } from '../fhir-observation-builder.port';
import {
  LOINC_SYSTEM,
  UCUM_SYSTEM,
  vitalSignsCategory,
} from '../fhir-observation-builder.helpers';
import type {
  VitalObservationContext,
  VitalWithRelations,
} from '../fhir-vital-sign.types';

export class BloodPressureObservationBuilder implements IFhirObservationBuilder {
  build(
    vital: VitalWithRelations,
    context: VitalObservationContext,
  ): FhirObservation[] {
    const systolicBP = vital.systolicBP;
    const diastolicBP = vital.diastolicBP;
    if (!systolicBP || !diastolicBP) return [];

    return [
      {
        resourceType: 'Observation',
        id: `${vital.id}-bp`,
        status: 'final',
        category: vitalSignsCategory(),
        code: {
          coding: [
            {
              system: LOINC_SYSTEM,
              code: '85354-9',
              display: 'Blood pressure panel with all children optional',
            },
          ],
          text: 'Blood Pressure',
        },
        subject: {
          reference: context.subjectRef,
          display: context.patientDisplay,
        },
        encounter: { reference: context.encounterRef },
        effectiveDateTime: context.effectiveDateTime,
        component: [
          {
            code: {
              coding: [
                {
                  system: LOINC_SYSTEM,
                  code: '8480-6',
                  display: 'Systolic blood pressure',
                },
              ],
            },
            valueQuantity: {
              value: systolicBP,
              unit: 'mmHg',
              system: UCUM_SYSTEM,
              code: 'mm[Hg]',
            },
          },
          {
            code: {
              coding: [
                {
                  system: LOINC_SYSTEM,
                  code: '8462-4',
                  display: 'Diastolic blood pressure',
                },
              ],
            },
            valueQuantity: {
              value: diastolicBP,
              unit: 'mmHg',
              system: UCUM_SYSTEM,
              code: 'mm[Hg]',
            },
          },
        ],
      },
    ];
  }
}
