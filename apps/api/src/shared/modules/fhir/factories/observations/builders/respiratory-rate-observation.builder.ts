import type { IFhirObservationBuilder } from '../fhir-observation-builder.port';
import { buildQuantityVitalObservation } from '../fhir-observation-builder.helpers';
import type {
  VitalObservationContext,
  VitalWithRelations,
} from '../fhir-vital-sign.types';

export class RespiratoryRateObservationBuilder implements IFhirObservationBuilder {
  build(vital: VitalWithRelations, context: VitalObservationContext) {
    if (!vital.respiratoryRate) {
      return [];
    }

    return [
      buildQuantityVitalObservation({
        vitalId: vital.id,
        idSuffix: 'rr',
        context,
        loincCode: '9279-1',
        loincDisplay: 'Respiratory rate',
        text: 'Respiratory Rate',
        value: vital.respiratoryRate,
        unit: 'breaths/minute',
        ucumCode: '/min',
      }),
    ];
  }
}
