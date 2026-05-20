import { Injectable } from '@nestjs/common';
import { FhirObservation } from '@/shared/modules/fhir/interfaces/fhir.interfaces';
import { buildVitalObservationContext } from './observations/fhir-observation-builder.helpers';
import type { IFhirObservationBuilder } from './observations/fhir-observation-builder.port';
import { createVitalSignObservationBuilders } from './observations/fhir-vital-sign-observation.registry';
import type { VitalWithRelations } from './observations/fhir-vital-sign.types';

export type { VitalWithRelations } from './observations/fhir-vital-sign.types';

@Injectable()
export class FhirObservationFactory {
  private readonly builders: IFhirObservationBuilder[];

  constructor() {
    this.builders = createVitalSignObservationBuilders();
  }

  createMany(vitals: VitalWithRelations[]): FhirObservation[] {
    const observations: FhirObservation[] = [];

    for (const vital of vitals) {
      const context = buildVitalObservationContext(vital);
      for (const builder of this.builders) {
        observations.push(...builder.build(vital, context));
      }
    }

    return observations;
  }
}
