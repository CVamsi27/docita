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
