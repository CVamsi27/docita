import { Prisma } from '@workspace/db';
import { AsyncLocalStorage } from 'async_hooks';
import { ForbiddenException } from '@nestjs/common';

const auditArchivalStorage = new AsyncLocalStorage<{
  archivalMode: boolean;
}>();

const IMMUTABLE_MODELS = ['AuditLog', 'AuditLogArchive'] as const;
const IMMUTABLE_MODEL_SET = new Set<string>(IMMUTABLE_MODELS);

export const auditImmutabilityExtension = Prisma.defineExtension({
  name: 'audit-immutability',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !IMMUTABLE_MODEL_SET.has(model)) {
          return query(args);
        }

        const isDeleteOperation =
          operation === 'delete' || operation === 'deleteMany';

        if (isDeleteOperation) {
          const context = auditArchivalStorage.getStore();
          if (!context?.archivalMode) {
            throw new ForbiddenException(
              `Audit logs are immutable. Model '${model}' cannot be deleted outside of the scheduled archival process.`,
            );
          }
        }

        return query(args);
      },
    },
  },
});

export function runInArchivalMode<T>(fn: () => Promise<T>): Promise<T> {
  return auditArchivalStorage.run({ archivalMode: true }, fn);
}
