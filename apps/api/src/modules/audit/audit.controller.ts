import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuditService, AuditLogFilter } from './audit.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAuditLogs(@Req() req: any, @Query() filter: AuditLogFilter) {
    const userRole = req.user?.role || 'DOCTOR';
    return this.auditService.getAuditLogs(filter, userRole);
  }
}
