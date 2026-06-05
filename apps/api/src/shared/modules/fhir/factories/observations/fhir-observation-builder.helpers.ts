import { getPatientFullName } from '@workspace/utils';
import { FhirObservation } from '@/shared/modules/fhir/interfaces/fhir.interfaces';
import type {
  VitalObservationContext,
  VitalWithRelations,
} from './fhir-vital-sign.types';

const OBSERVATION_CATEGORY_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/observation-category';
export const LOINC_SYSTEM = 'http://loinc.org';
export const UCUM_SYSTEM = 'http://unitsofmeasure.org';

export function buildVitalObservationContext(
  vital: VitalWithRelations,
): VitalObservationContext {
  return {
    effectiveDateTime: vital.appointment.startTime.toISOString(),
    patientDisplay: getPatientFullName(vital.appointment.patient),
    encounterRef: `Encounter/${vital.appointmentId}`,
    subjectRef: `Patient/${vital.appointment.patientId}`,
  };
}

export function vitalSignsCategory(): NonNullable<FhirObservation['category']> {
  return [
    {
      coding: [
        {
          system: OBSERVATION_CATEGORY_SYSTEM,
          code: 'vital-signs',
          display: 'Vital Signs',
        },
      ],
    },
  ];
}

export function buildQuantityVitalObservation(input: {
  vitalId: string;
  idSuffix: string;
  context: VitalObservationContext;
  loincCode: string;
  loincDisplay: string;
  text: string;
  value: number;
  unit: string;
  ucumCode: string;
  component?: NonNullable<FhirObservation['component']>;
}): FhirObservation {
  const observation: FhirObservation = {
    resourceType: 'Observation',
    id: `${input.vitalId}-${input.idSuffix}`,
    status: 'final',
    category: vitalSignsCategory(),
    code: {
      coding: [
        {
          system: LOINC_SYSTEM,
          code: input.loincCode,
          display: input.loincDisplay,
        },
      ],
      text: input.text,
    },
    subject: {
      reference: input.context.subjectRef,
      display: input.context.patientDisplay,
    },
    encounter: { reference: input.context.encounterRef },
    effectiveDateTime: input.context.effectiveDateTime,
    valueQuantity: {
      value: input.value,
      unit: input.unit,
      system: UCUM_SYSTEM,
      code: input.ucumCode,
    },
  };

  if (input.component) {
    observation.component = input.component;
  }

  return observation;
}
