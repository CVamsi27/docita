import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditService, AuditLogFilter } from './audit.service';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { AnyAuditResponseDto } from './dto/audit.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('audit-logs')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ZodSerializerDto(AnyAuditResponseDto)
  async getAuditLogs(
    @Req() req: Request & { user: { clinicId?: string; role?: string } },
    @Query() filter: AuditLogFilter,
  ) {
    const userRole = req.user?.role;
    if (!userRole) {
      throw new UnauthorizedException('User role is required');
    }
    const userClinicId = req.user?.clinicId;

    if (userRole !== 'SUPER_ADMIN' && userClinicId) {
      filter.clinicId = userClinicId;
    }

    return this.auditService.getAuditLogs(filter, userRole);
  }
}
