import type { IFhirObservationBuilder } from './fhir-observation-builder.port';
import { AnthropometryObservationBuilder } from './builders/anthropometry-observation.builder';
import { BloodGlucoseObservationBuilder } from './builders/blood-glucose-observation.builder';
import { BloodPressureObservationBuilder } from './builders/blood-pressure-observation.builder';
import { BodyTemperatureObservationBuilder } from './builders/body-temperature-observation.builder';
import { HeartRateObservationBuilder } from './builders/heart-rate-observation.builder';
import { OxygenSaturationObservationBuilder } from './builders/oxygen-saturation-observation.builder';
import { RespiratoryRateObservationBuilder } from './builders/respiratory-rate-observation.builder';

export function createVitalSignObservationBuilders(): IFhirObservationBuilder[] {
  return [
    new BloodPressureObservationBuilder(),
    new HeartRateObservationBuilder(),
    new BodyTemperatureObservationBuilder(),
    new OxygenSaturationObservationBuilder(),
    new RespiratoryRateObservationBuilder(),
    new AnthropometryObservationBuilder(),
    new BloodGlucoseObservationBuilder(),
  ];
}
