import { Prisma } from '@workspace/db';
import { Logger } from '@nestjs/common';

const logger = new Logger('SlowQueryLogger');
const SLOW_QUERY_THRESHOLD = 500; // ms

export const slowQueryExtension = Prisma.defineExtension({
  name: 'slow-query-logging',
  query: {
    $allOperations: async ({ operation, model, args, query }) => {
      const start = performance.now();
      const result = await query(args);
      const end = performance.now();
      const duration = end - start;

      if (duration > SLOW_QUERY_THRESHOLD) {
        logger.warn(
          `Slow query detected: ${model}.${operation} took ${duration.toFixed(2)}ms`,
        );
      }
      return result;
    },
  },
});
