import { createZodDto } from 'nestjs-zod';
import { dashboardStatsSchema } from '@workspace/types';

export class DashboardStatsResponseDto extends createZodDto(
  dashboardStatsSchema,
) {}
