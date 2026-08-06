import { Inject, Injectable } from '@nestjs/common';
import { PatientResourceResolver } from './patient-resource.resolver';
import { AppointmentResourceResolver } from './appointment-resource.resolver';
import type { PolicyResourceResolver } from './policy-resource-resolver.interface';

/** DI registry mirroring ResourcePolicyRegistry: resource → resolver. */
@Injectable()
export class PolicyResourceResolverRegistry {
  private readonly resolvers: ReadonlyMap<string, PolicyResourceResolver>;

  constructor(
    @Inject(PatientResourceResolver) patient: PolicyResourceResolver,
    @Inject(AppointmentResourceResolver) appointment: PolicyResourceResolver,
  ) {
    this.resolvers = new Map<string, PolicyResourceResolver>([
      ['patient', patient],
      ['appointment', appointment],
    ]);
  }

  get(resource: string): PolicyResourceResolver | undefined {
    return this.resolvers.get(resource);
  }
}
