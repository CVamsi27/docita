import type { IFhirObservationBuilder } from '../fhir-observation-builder.port';
import { buildQuantityVitalObservation } from '../fhir-observation-builder.helpers';
import type {
  VitalObservationContext,
  VitalWithRelations,
} from '../fhir-vital-sign.types';

export class HeartRateObservationBuilder implements IFhirObservationBuilder {
  build(vital: VitalWithRelations, context: VitalObservationContext) {
    if (!vital.pulse) return [];

    return [
      buildQuantityVitalObservation({
        vitalId: vital.id,
        idSuffix: 'hr',
        context,
        loincCode: '8867-4',
        loincDisplay: 'Heart rate',
        text: 'Heart Rate',
        value: vital.pulse,
        unit: 'beats/minute',
        ucumCode: '/min',
      }),
    ];
  }
}
