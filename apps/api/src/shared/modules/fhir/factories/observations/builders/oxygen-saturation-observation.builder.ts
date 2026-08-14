import type { IFhirObservationBuilder } from '../fhir-observation-builder.port';
import { buildQuantityVitalObservation } from '../fhir-observation-builder.helpers';
import type {
  VitalObservationContext,
  VitalWithRelations,
} from '../fhir-vital-sign.types';

export class OxygenSaturationObservationBuilder implements IFhirObservationBuilder {
  build(vital: VitalWithRelations, context: VitalObservationContext) {
    if (!vital.spo2) return [];

    return [
      buildQuantityVitalObservation({
        vitalId: vital.id,
        idSuffix: 'spo2',
        context,
        loincCode: '2708-6',
        loincDisplay: 'Oxygen saturation in Arterial blood',
        text: 'Oxygen Saturation',
        value: vital.spo2,
        unit: '%',
        ucumCode: '%',
      }),
    ];
  }
}
