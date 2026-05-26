import { Injectable } from '@nestjs/common';
import { AppointmentPolicy } from './appointment.policy';
import { PatientPolicy } from './patient.policy';
import { PrescriptionPolicy } from './prescription.policy';
import { InvoicePolicy } from './invoice.policy';
import { GenericTenantPolicy } from './generic.policy';
import type { AuthorizationResource, ResourcePolicy } from '../types';

/**
 * Resolves an {@link AuthorizationResource} to its {@link ResourcePolicy}.
 *
 * Adding a new resource:
 *   1. Add the value to `AuthorizationResource` in `../types.ts`.
 *   2. Implement `ResourcePolicy` in this folder.
 *   3. Register it in the constructor below.
 */
@Injectable()
export class ResourcePolicyRegistry {
  private readonly policies: ReadonlyMap<AuthorizationResource, ResourcePolicy>;

  constructor(
    appointment: AppointmentPolicy,
    patient: PatientPolicy,
    prescription: PrescriptionPolicy,
    invoice: InvoicePolicy,
    generic: GenericTenantPolicy,
  ) {
    this.policies = new Map<AuthorizationResource, ResourcePolicy>([
      ['appointment', appointment],
      ['patient', patient],
      ['prescription', prescription],
      ['invoice', invoice],
      // Resources without bespoke ABAC fall through to a same-clinic tenant check.
      ['report', generic],
      ['staff', generic],
      ['clinic', generic],
      ['broadcast', generic],
      ['generic', generic],
    ]);
  }

  get(resource: AuthorizationResource): ResourcePolicy | undefined {
    return this.policies.get(resource);
  }
}
