import { Prisma } from '@workspace/db';
import { Logger } from '@nestjs/common';
import { DATABASE_CONSTANTS } from '@/shared/modules/config/app-constants';

const logger = new Logger('SlowQueryLogger');

export const slowQueryExtension = Prisma.defineExtension({
  name: 'slow-query-logging',
  query: {
    $allOperations: async ({ operation, model, args, query }) => {
      const start = performance.now();
      const result = await query(args);
      const end = performance.now();
      const duration = end - start;

      if (duration > DATABASE_CONSTANTS.SLOW_QUERY_THRESHOLD_MS) {
        logger.warn(
          `Slow query detected: ${model}.${operation} took ${duration.toFixed(2)}ms`,
        );
      }
      return result;
    },
  },
});
