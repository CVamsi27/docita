import type { IFhirObservationBuilder } from '../fhir-observation-builder.port';
import { buildQuantityVitalObservation } from '../fhir-observation-builder.helpers';
import type {
  VitalObservationContext,
  VitalWithRelations,
} from '../fhir-vital-sign.types';

/** Height, weight, and BMI (LOINC anthropometry family). */
export class AnthropometryObservationBuilder implements IFhirObservationBuilder {
  build(vital: VitalWithRelations, context: VitalObservationContext) {
    const observations = [];

    if (vital.height) {
      observations.push(
        buildQuantityVitalObservation({
          vitalId: vital.id,
          idSuffix: 'height',
          context,
          loincCode: '8302-2',
          loincDisplay: 'Body height',
          text: 'Height',
          value: vital.height,
          unit: 'cm',
          ucumCode: 'cm',
        }),
      );
    }

    if (vital.weight) {
      observations.push(
        buildQuantityVitalObservation({
          vitalId: vital.id,
          idSuffix: 'weight',
          context,
          loincCode: '29463-7',
          loincDisplay: 'Body weight',
          text: 'Body Weight',
          value: vital.weight,
          unit: 'kg',
          ucumCode: 'kg',
        }),
      );
    }

    if (vital.bmi) {
      observations.push(
        buildQuantityVitalObservation({
          vitalId: vital.id,
          idSuffix: 'bmi',
          context,
          loincCode: '39156-5',
          loincDisplay: 'Body mass index (BMI)',
          text: 'BMI',
          value: vital.bmi,
          unit: 'kg/m2',
          ucumCode: 'kg/m2',
        }),
      );
    }

    return observations;
  }
}
