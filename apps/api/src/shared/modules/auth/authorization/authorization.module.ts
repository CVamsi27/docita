import { Module } from '@nestjs/common';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { AuthorizationService } from './authorization.service';
import { ResourcePolicyRegistry } from './policies/registry';
import { AppointmentPolicy } from './policies/appointment.policy';
import { PatientPolicy } from './policies/patient.policy';
import { PrescriptionPolicy } from './policies/prescription.policy';
import { InvoicePolicy } from './policies/invoice.policy';
import { GenericTenantPolicy } from './policies/generic.policy';

@Module({
  imports: [AuthModule],
  providers: [
    AuthorizationService,
    ResourcePolicyRegistry,
    AppointmentPolicy,
    PatientPolicy,
    PrescriptionPolicy,
    InvoicePolicy,
    GenericTenantPolicy,
  ],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
