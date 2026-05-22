import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Put,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import {
  ClinicApiQuotaResponse,
  ClinicApiQuotaUpsertRequest,
  clinicApiQuotaUpsertSchema,
} from '@workspace/types';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TenantRateLimitService } from '@/shared/modules/tenant-rate-limit/tenant-rate-limit.service';

const toResponse = (
  clinicId: string,
  quota: {
    rps: number;
    rpm: number;
    monthlyBudget: number;
    currentMonthUsed: number;
    currentMonthResetsAt: Date;
  },
  now: Date,
  notes?: string | null,
): ClinicApiQuotaResponse => ({
  clinicId,
  rps: quota.rps,
  rpm: quota.rpm,
  monthlyBudget: quota.monthlyBudget,
  currentMonthUsed: quota.currentMonthUsed,
  currentMonthResetsAt: quota.currentMonthResetsAt.toISOString(),
  notes: notes ?? null,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

@Controller('internal/clinics/:clinicId/api-quota')
@ApiTags('Internal - Clinic API Quota')
@Roles(Role.INTERNAL)
@ApiBearerAuth()
export class ClinicApiQuotasController {
  constructor(
    private readonly service: TenantRateLimitService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the resolved API quota for a clinic' })
  async getQuota(
    @Param('clinicId') clinicId: string,
  ): Promise<ClinicApiQuotaResponse> {
    const resolved = await this.service.getQuota(clinicId);
    return toResponse(clinicId, resolved, this.clock.now());
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Override the API quota for a clinic' })
  async upsertQuota(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(clinicApiQuotaUpsertSchema))
    body: ClinicApiQuotaUpsertRequest,
  ): Promise<ClinicApiQuotaResponse> {
    const updated = await this.service.upsertQuota(clinicId, body);
    return toResponse(clinicId, updated, this.clock.now(), body.notes);
  }
}
