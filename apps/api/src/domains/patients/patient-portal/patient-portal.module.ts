import { Module } from '@nestjs/common';
import { PatientPortalController } from './patient-portal.controller';
import { PatientPortalService } from './patient-portal.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PatientsModule } from '../patients/patients.module';
import { AppointmentsModule } from '../appointments/appointments.module';
// Domain services (SRP decomposition)
import { PatientDashboardService } from './domain-services/patient-dashboard.service';
import { PatientRecordsService } from './domain-services/patient-records.service';
import { PatientProfileService } from './domain-services/patient-profile.service';
import { PatientConsentService } from './domain-services/patient-consent.service';

@Module({
  imports: [PrismaModule, PatientsModule, AppointmentsModule],
  controllers: [PatientPortalController],
  providers: [
    // Domain services (each handles one responsibility)
    PatientDashboardService,
    PatientRecordsService,
    PatientProfileService,
    PatientConsentService,
    // Facade: kept for backward compatibility, delegates to domain services
    PatientPortalService,
  ],
  exports: [PatientPortalService],
})
export class PatientPortalModule {}
