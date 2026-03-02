import { createZodDto } from 'nestjs-zod';
import { dashboardStatsResponseSchema } from '@workspace/types';

export class DashboardStatsResponseDto extends createZodDto(
  dashboardStatsResponseSchema,
) {}
