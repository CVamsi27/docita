import { Module } from '@nestjs/common';
import { FhirController } from './fhir.controller';
import { FhirService } from './fhir.service';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { FhirPatientFactory } from './factories/fhir-patient.factory';
import { FhirObservationFactory } from './factories/fhir-observation.factory';
import { FhirMedicationFactory } from './factories/fhir-medication.factory';
import { FhirConditionFactory } from './factories/fhir-condition.factory';
import { FhirAllergyFactory } from './factories/fhir-allergy.factory';
import { FhirImmunizationFactory } from './factories/fhir-immunization.factory';
import { FhirAppointmentFactory } from './factories/fhir-appointment.factory';

@Module({
  imports: [PrismaModule],
  controllers: [FhirController],
  providers: [
    FhirService,
    FhirPatientFactory,
    FhirObservationFactory,
    FhirMedicationFactory,
    FhirConditionFactory,
    FhirAllergyFactory,
    FhirImmunizationFactory,
    FhirAppointmentFactory,
  ],
  exports: [FhirService],
})
export class FhirModule {}
