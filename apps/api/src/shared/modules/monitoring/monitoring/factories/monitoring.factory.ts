import { Injectable } from '@nestjs/common';
import {
  ApiRequestInput,
  ApiRequestSchema,
  ErrorLogInput,
  ErrorLogSchema,
} from '@/shared/modules/monitoring/monitoring/schemas/monitoring.schema';

@Injectable()
export class MonitoringFactory {
  createApiRequest(data: ApiRequestInput) {
    return ApiRequestSchema.parse(data);
  }

  createErrorLog(data: ErrorLogInput) {
    return ErrorLogSchema.parse(data);
  }
}
