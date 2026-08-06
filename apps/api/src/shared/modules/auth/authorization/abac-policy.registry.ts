import { Injectable } from '@nestjs/common';
import {
  AppointmentAbacPolicy,
  PatientAbacPolicy,
} from '@workspace/authorization';
import type { AbacPolicy } from '@workspace/authorization';

/**
 * Resolves a resource key to its pure ABAC policy. Add a resource by
 * implementing an AbacPolicy in packages/authorization and registering it here.
 */
@Injectable()
export class AbacPolicyRegistry {
  private readonly policies: ReadonlyMap<string, AbacPolicy>;

  constructor(patient: PatientAbacPolicy, appointment: AppointmentAbacPolicy) {
    this.policies = new Map<string, AbacPolicy>([
      ['patient', patient],
      ['appointment', appointment],
    ]);
  }

  get(resource: string): AbacPolicy | undefined {
    return this.policies.get(resource);
  }
}
