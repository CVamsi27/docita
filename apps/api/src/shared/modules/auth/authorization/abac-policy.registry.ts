import { Injectable } from '@nestjs/common';
import {
  AppointmentAbacPolicy,
  AuditLogAbacPolicy,
  InvoiceAbacPolicy,
  LabOrderAbacPolicy,
  PatientAbacPolicy,
  PrescriptionAbacPolicy,
} from '@workspace/authorization';
import type { AbacPolicy } from '@workspace/authorization';

/**
 * Resolves a resource key to its pure ABAC policy. Add a resource by
 * implementing an AbacPolicy in packages/authorization and registering it here.
 */
@Injectable()
export class AbacPolicyRegistry {
  private readonly policies: ReadonlyMap<string, AbacPolicy>;

  constructor(
    patient: PatientAbacPolicy,
    appointment: AppointmentAbacPolicy,
    prescription: PrescriptionAbacPolicy,
    invoice: InvoiceAbacPolicy,
    labOrder: LabOrderAbacPolicy,
    auditLog: AuditLogAbacPolicy,
  ) {
    this.policies = new Map<string, AbacPolicy>([
      ['patient', patient],
      ['appointment', appointment],
      ['prescription', prescription],
      ['invoice', invoice],
      ['lab-order', labOrder],
      ['audit-log', auditLog],
    ]);
  }

  get(resource: string): AbacPolicy | undefined {
    return this.policies.get(resource);
  }
}
