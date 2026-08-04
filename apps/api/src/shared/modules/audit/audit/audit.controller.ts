import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuditService } from './audit.service';
import {
  AuditLogsApiAccess,
  AuditSummaryApiAccess,
} from '@/shared/modules/audit/audit/audit.controller.access';
import { AuditLogFilterDto, AuditLogListResponseDto } from './dto/audit.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('audit-logs')
@AuditLogsApiAccess()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ZodSerializerDto(AuditLogListResponseDto)
  async getAuditLogs(
    @Req()
    req: ExpressRequest & { user: { clinicId?: string; role?: string } },
    @Query() filter: AuditLogFilterDto,
  ) {
    const userRole = req.user?.role;
    if (!userRole) throw new UnauthorizedException('User role is required');
    const userClinicId = req.user?.clinicId;

    if (userRole !== 'INTERNAL' && userClinicId) {
      filter.clinicId = userClinicId;
    }

    return this.auditService.getAuditLogs(filter, userRole);
  }
}

@Controller('audit')
@AuditSummaryApiAccess()
export class AuditSummaryController {
  constructor(private readonly auditService: AuditService) {}

  @Get('recent')
  async getRecentAuditLogs(
    @Req() req: ExpressRequest & { user?: { clinicId?: string } },
    @Query('limit') limit?: string,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId)
      throw new UnauthorizedException('Clinic context is required');

    return this.auditService.getRecentAuditSummary(
      clinicId,
      limit ? Number(limit) : undefined,
    );
  }
}
