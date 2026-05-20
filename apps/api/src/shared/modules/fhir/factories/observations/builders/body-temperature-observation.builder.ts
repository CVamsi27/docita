import type { IFhirObservationBuilder } from '../fhir-observation-builder.port';
import { buildQuantityVitalObservation } from '../fhir-observation-builder.helpers';
import type {
  VitalObservationContext,
  VitalWithRelations,
} from '../fhir-vital-sign.types';

export class BodyTemperatureObservationBuilder implements IFhirObservationBuilder {
  build(vital: VitalWithRelations, context: VitalObservationContext) {
    if (!vital.temperature) {
      return [];
    }

    return [
      buildQuantityVitalObservation({
        vitalId: vital.id,
        idSuffix: 'temp',
        context,
        loincCode: '8310-5',
        loincDisplay: 'Body temperature',
        text: 'Body Temperature',
        value: vital.temperature,
        unit: 'Cel',
        ucumCode: 'Cel',
      }),
    ];
  }
}
