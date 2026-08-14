// jscpd:ignore-start
import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { PatientPortalSession } from '@/shared/modules/auth/auth/patient-portal-session.decorator';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireAuthenticatedUserId } from '@/shared/modules/auth/auth/clinic-request-context';
import { PatientPortalService } from '@/domains/patient-portal/application/services/patient-portal.service';
import { PatientPortalContextService } from '@/domains/patient-portal/application/services/patient-portal-context.service';
import { parsePaginationInt } from '@/shared/common/utils/string.utils';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { auditPatientPortalRead } from '@/domains/patient-portal/presentation/controllers/patient-portal-controller.helpers';

@ApiTags('patient-portal')
@Controller('patient-portal')
@PatientPortalSession()
@UseGuards(JwtAuthGuard)
@Roles(Role.PATIENT)
@SkipSubscriptionCheck()
@ApiBearerAuth('JWT-auth')
export class PatientPortalRecordsController {
  constructor(
    private readonly portalService: PatientPortalService,
    private readonly contextService: PatientPortalContextService,
    private readonly auditService: AuditService,
  ) {}

  @Get('prescriptions')
  @ApiOperation({ summary: 'List patient prescriptions' })
  async getPrescriptions(
    @Request() req: RequestWithUser,
    @Query() query: { limit?: string; offset?: string },
  ) {
    await auditPatientPortalRead(
      this.contextService,
      this.auditService,
      req,
      'VIEW_HISTORY',
    );
    return this.portalService.getPrescriptions(
      requireAuthenticatedUserId(req),
      {
        limit: parsePaginationInt(query.limit, { min: 1, max: 200 }),
        offset: parsePaginationInt(query.offset, { min: 0 }),
      },
    );
  }

  @Get('prescriptions/:id')
  @ApiOperation({ summary: 'Get prescription detail' })
  async getPrescriptionById(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    await auditPatientPortalRead(
      this.contextService,
      this.auditService,
      req,
      'VIEW_HISTORY',
    );
    return this.portalService.getPrescriptionById(
      // jscpd:ignore-end
      requireAuthenticatedUserId(req),
      id,
    );
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List patient invoices' })
  async getInvoices(
    @Request() req: RequestWithUser,
    @Query() query: { status?: string; limit?: string; offset?: string },
  ) {
    return this.portalService.getInvoices(requireAuthenticatedUserId(req), {
      status: query.status,
      limit: parsePaginationInt(query.limit, { min: 1, max: 200 }),
      offset: parsePaginationInt(query.offset, { min: 0 }),
    });
  }
}
