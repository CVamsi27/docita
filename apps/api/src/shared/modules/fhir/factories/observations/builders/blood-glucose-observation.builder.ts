import type { IFhirObservationBuilder } from '../fhir-observation-builder.port';
import { buildQuantityVitalObservation } from '../fhir-observation-builder.helpers';
import type {
  VitalObservationContext,
  VitalWithRelations,
} from '../fhir-vital-sign.types';

export class BloodGlucoseObservationBuilder implements IFhirObservationBuilder {
  build(vital: VitalWithRelations, context: VitalObservationContext) {
    if (!vital.bloodGlucose) return [];

    return [
      buildQuantityVitalObservation({
        vitalId: vital.id,
        idSuffix: 'glucose',
        context,
        loincCode: '2339-0',
        loincDisplay: 'Glucose [Mass/volume] in Blood',
        text: 'Blood Glucose',
        value: vital.bloodGlucose,
        unit: 'mg/dL',
        ucumCode: 'mg/dL',
      }),
    ];
  }
}
