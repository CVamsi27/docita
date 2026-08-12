import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { AbacPolicyRegistry } from './abac-policy.registry';
import { PatientResourceResolver } from './resolvers/patient-resource.resolver';
import { AppointmentResourceResolver } from './resolvers/appointment-resource.resolver';
import { PrescriptionResourceResolver } from './resolvers/prescription-resource.resolver';
import { InvoiceResourceResolver } from './resolvers/invoice-resource.resolver';
import { LabOrderResourceResolver } from './resolvers/lab-order-resource.resolver';
import { AuditLogResourceResolver } from './resolvers/audit-log-resource.resolver';
import { PolicyResourceResolverRegistry } from './resolvers/policy-resource-resolver';
import {
  AppointmentAbacPolicy,
  AuditLogAbacPolicy,
  InvoiceAbacPolicy,
  LabOrderAbacPolicy,
  PatientAbacPolicy,
  PrescriptionAbacPolicy,
} from '@workspace/authorization';

// Standalone object-level decision module (ADR-0013, Candidate B): mirrors
// packages/authorization. ClinicAuthCacheService (global AuthGuardsModule) and
// PrismaService (global PrismaModule) cover the cross-module deps, so no
// AuthModule import is needed. PolicyGuard (auth/guards) is the consumer; the
// global guard order is documented in app.module.ts.
@Module({
  providers: [
    AuthorizationService,
    AbacPolicyRegistry,
    PatientAbacPolicy,
    AppointmentAbacPolicy,
    PrescriptionAbacPolicy,
    InvoiceAbacPolicy,
    LabOrderAbacPolicy,
    AuditLogAbacPolicy,
    PatientResourceResolver,
    AppointmentResourceResolver,
    PrescriptionResourceResolver,
    InvoiceResourceResolver,
    LabOrderResourceResolver,
    AuditLogResourceResolver,
    PolicyResourceResolverRegistry,
  ],
  exports: [
    AuthorizationService,
    AbacPolicyRegistry,
    PolicyResourceResolverRegistry,
  ],
})
export class AuthorizationModule {}
