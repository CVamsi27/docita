import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuditService, AuditLogFilter } from './audit.service';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { Role } from '@workspace/db';
import { Feature } from '@workspace/types';
import { AnyAuditResponseDto } from './dto/audit.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('audit-logs')
@Roles(Role.ADMIN, Role.INTERNAL)
@RequireFeature(Feature.AUDIT_LOGS)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ZodSerializerDto(AnyAuditResponseDto)
  async getAuditLogs(
    @Req()
    req: ExpressRequest & { user: { clinicId?: string; role?: string } },
    @Query() filter: AuditLogFilter,
  ) {
    const userRole = req.user?.role;
    if (!userRole) {
      throw new UnauthorizedException('User role is required');
    }
    const userClinicId = req.user?.clinicId;

    if (userRole !== 'INTERNAL' && userClinicId) {
      filter.clinicId = userClinicId;
    }

    return this.auditService.getAuditLogs(filter, userRole);
  }
}

@Controller('audit')
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR)
@RequireFeature(Feature.AUDIT_LOGS)
export class AuditSummaryController {
  constructor(private readonly auditService: AuditService) {}

  @Get('recent')
  async getRecentAuditLogs(
    @Req() req: ExpressRequest & { user?: { clinicId?: string } },
    @Query('limit') limit?: string,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new UnauthorizedException('Clinic context is required');
    }

    return this.auditService.getRecentAuditSummary(
      clinicId,
      limit ? Number(limit) : undefined,
    );
  }
}
