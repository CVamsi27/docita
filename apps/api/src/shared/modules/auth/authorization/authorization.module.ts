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
import { PrescriptionResourceResolver } from './resolvers/prescription-resource.resolver';
import { InvoiceResourceResolver } from './resolvers/invoice-resource.resolver';
import { LabOrderResourceResolver } from './resolvers/lab-order-resource.resolver';
import { PolicyResourceResolverRegistry } from './resolvers/policy-resource-resolver';
import {
  AppointmentAbacPolicy,
  InvoiceAbacPolicy,
  LabOrderAbacPolicy,
  PatientAbacPolicy,
  PrescriptionAbacPolicy,
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
    PrescriptionAbacPolicy,
    InvoiceAbacPolicy,
    LabOrderAbacPolicy,
    PatientResourceResolver,
    AppointmentResourceResolver,
    PrescriptionResourceResolver,
    InvoiceResourceResolver,
    LabOrderResourceResolver,
    PolicyResourceResolverRegistry,
  ],
  exports: [
    AuthorizationService,
    AbacPolicyRegistry,
    PolicyResourceResolverRegistry,
  ],
})
export class AuthorizationModule {}
