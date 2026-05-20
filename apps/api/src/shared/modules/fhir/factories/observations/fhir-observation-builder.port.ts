import { FhirObservation } from '@/shared/modules/fhir/interfaces/fhir.interfaces';
import type {
  VitalObservationContext,
  VitalWithRelations,
} from './fhir-vital-sign.types';

export interface IFhirObservationBuilder {
  build(
    vital: VitalWithRelations,
    context: VitalObservationContext,
  ): FhirObservation[];
}
