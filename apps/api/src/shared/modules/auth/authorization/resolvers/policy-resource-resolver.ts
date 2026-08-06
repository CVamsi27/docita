import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ResourceAttributes } from '@workspace/types';

/**
 * Resolves request context (params/body) into resource attributes for a
 * policy decision. Implementations are per-resource and Nest-bound (they may
 * use Prisma); the policies they feed are pure.
 */
export interface PolicyResourceResolver {
  readonly resource: string;
  resolve(context: ExecutionContext): Promise<ResourceAttributes>;
}

/** DI registry mirroring ResourcePolicyRegistry: resource → resolver. */
@Injectable()
export class PolicyResourceResolverRegistry {
  private readonly resolvers: ReadonlyMap<string, PolicyResourceResolver>;

  constructor(patient: PolicyResourceResolver) {
    this.resolvers = new Map<string, PolicyResourceResolver>([
      ['patient', patient],
    ]);
  }

  get(resource: string): PolicyResourceResolver | undefined {
    return this.resolvers.get(resource);
  }
}
