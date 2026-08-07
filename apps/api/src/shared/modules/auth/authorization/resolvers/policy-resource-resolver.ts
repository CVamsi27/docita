import { Inject, Injectable } from '@nestjs/common';
import { PatientResourceResolver } from './patient-resource.resolver';
import { AppointmentResourceResolver } from './appointment-resource.resolver';
import { PrescriptionResourceResolver } from './prescription-resource.resolver';
import { InvoiceResourceResolver } from './invoice-resource.resolver';
import { LabOrderResourceResolver } from './lab-order-resource.resolver';
import { AuditLogResourceResolver } from './audit-log-resource.resolver';
import type { PolicyResourceResolver } from './policy-resource-resolver.interface';

/** DI registry mirroring ResourcePolicyRegistry: resource → resolver. */
@Injectable()
export class PolicyResourceResolverRegistry {
  private readonly resolvers: ReadonlyMap<string, PolicyResourceResolver>;

  constructor(
    @Inject(PatientResourceResolver) patient: PolicyResourceResolver,
    @Inject(AppointmentResourceResolver) appointment: PolicyResourceResolver,
    @Inject(PrescriptionResourceResolver) prescription: PolicyResourceResolver,
    @Inject(InvoiceResourceResolver) invoice: PolicyResourceResolver,
    @Inject(LabOrderResourceResolver) labOrder: PolicyResourceResolver,
    @Inject(AuditLogResourceResolver) auditLog: PolicyResourceResolver,
  ) {
    this.resolvers = new Map<string, PolicyResourceResolver>([
      ['patient', patient],
      ['appointment', appointment],
      ['prescription', prescription],
      ['invoice', invoice],
      ['lab-order', labOrder],
      ['audit-log', auditLog],
    ]);
  }

  get(resource: string): PolicyResourceResolver | undefined {
    return this.resolvers.get(resource);
  }
}
