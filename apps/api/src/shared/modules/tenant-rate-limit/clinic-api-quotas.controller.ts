import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
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
  notes?: string | null,
): ClinicApiQuotaResponse => ({
  clinicId,
  rps: quota.rps,
  rpm: quota.rpm,
  monthlyBudget: quota.monthlyBudget,
  currentMonthUsed: quota.currentMonthUsed,
  currentMonthResetsAt: quota.currentMonthResetsAt.toISOString(),
  notes: notes ?? null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

@Controller('internal/clinics/:clinicId/api-quota')
@ApiTags('Internal - Clinic API Quota')
@Roles(Role.INTERNAL)
@ApiBearerAuth()
export class ClinicApiQuotasController {
  constructor(private readonly service: TenantRateLimitService) {}

  @Get()
  @ApiOperation({ summary: 'Get the resolved API quota for a clinic' })
  async getQuota(
    @Param('clinicId') clinicId: string,
  ): Promise<ClinicApiQuotaResponse> {
    const resolved = await this.service.getQuota(clinicId);
    return toResponse(clinicId, resolved);
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
    return toResponse(clinicId, updated, body.notes);
  }
}
