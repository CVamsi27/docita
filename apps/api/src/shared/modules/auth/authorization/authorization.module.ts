import { Module } from '@nestjs/common';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { AuthorizationService } from './authorization.service';
import { ResourcePolicyRegistry } from './policies/registry';
import { AppointmentPolicy } from './policies/appointment.policy';
import { PatientPolicy } from './policies/patient.policy';
import { PrescriptionPolicy } from './policies/prescription.policy';
import { InvoicePolicy } from './policies/invoice.policy';
import { GenericTenantPolicy } from './policies/generic.policy';
import { AbacPolicyRegistry } from './abac-policy.registry';
import { PatientResourceResolver } from './resolvers/patient-resource.resolver';
import { AppointmentResourceResolver } from './resolvers/appointment-resource.resolver';
import { PolicyResourceResolverRegistry } from './resolvers/policy-resource-resolver';
import {
  AppointmentAbacPolicy,
  PatientAbacPolicy,
} from '@workspace/authorization';

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
    AbacPolicyRegistry,
    PatientAbacPolicy,
    AppointmentAbacPolicy,
    PatientResourceResolver,
    AppointmentResourceResolver,
    PolicyResourceResolverRegistry,
  ],
  exports: [
    AuthorizationService,
    AbacPolicyRegistry,
    PolicyResourceResolverRegistry,
  ],
})
export class AuthorizationModule {}
