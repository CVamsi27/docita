// jscpd:ignore-start
import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
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
import { PatientPortalService } from '@/domains/patient-portal/application/services/patient-portal.service';
import { PatientPortalContextService } from '@/domains/patient-portal/application/services/patient-portal-context.service';
import { parsePaginationInt } from '@/shared/common/utils/string.utils';
import { AppointmentRequestService } from '@/domains/appointments/application/services/appointment-request.service';
import { PatientAppointmentRequestCreateDto } from '@/domains/appointments/application/dto/appointments.dto';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { auditPatientPortalRead } from '@/domains/patient-portal/presentation/controllers/patient-portal-controller.helpers';
import { requireAuthenticatedUserId } from '@/shared/modules/auth/auth/clinic-request-context';

@ApiTags('patient-portal')
@Controller('patient-portal')
@PatientPortalSession()
@UseGuards(JwtAuthGuard)
@Roles(Role.PATIENT)
@SkipSubscriptionCheck()
@ApiBearerAuth('JWT-auth')
export class PatientPortalController {
  constructor(
    private readonly portalService: PatientPortalService,
    private readonly contextService: PatientPortalContextService,
    private readonly appointmentRequestService: AppointmentRequestService,
    private readonly auditService: AuditService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get patient portal dashboard' })
  async getDashboard(@Request() req: RequestWithUser) {
    await auditPatientPortalRead(
      this.contextService,
      this.auditService,
      req,
      'VIEW_PROFILE',
    );
    return this.portalService.getDashboard(requireAuthenticatedUserId(req));
  }

  @Get('appointments')
  @ApiOperation({ summary: 'List patient appointments' })
  async getAppointments(
    @Request() req: RequestWithUser,
    @Query()
    query: {
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    await auditPatientPortalRead(
      this.contextService,
      this.auditService,
      req,
      'VIEW_HISTORY',
    );
    return this.portalService.getAppointments(requireAuthenticatedUserId(req), {
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: parsePaginationInt(query.limit, { min: 1, max: 200 }),
      offset: parsePaginationInt(query.offset, { min: 0 }),
    });
  }

  @Get('appointments/:id')
  @ApiOperation({ summary: 'Get appointment detail' })
  async getAppointmentById(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    await auditPatientPortalRead(
      this.contextService,
      this.auditService,
      req,
      'VIEW_HISTORY',
    );
    return this.portalService.getAppointmentById(
      requireAuthenticatedUserId(req),
      id,
    );
  }

  @Post('appointments/request')
  @ApiOperation({ summary: 'Request a new appointment' })
  async requestAppointment(
    @Request() req: RequestWithUser,
    @Body() body: PatientAppointmentRequestCreateDto,
  ) {
    const { patientId, clinicId } = await this.contextService.getPatientContext(
      requireAuthenticatedUserId(req),
    );
    return this.appointmentRequestService.createPatientRequest(
      patientId,
      clinicId,
      body,
    );
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get patient profile' })
  async getProfile(@Request() req: RequestWithUser) {
    await auditPatientPortalRead(
      this.contextService,
      this.auditService,
      req,
      'VIEW_PROFILE',
    );
    return this.portalService.getProfile(requireAuthenticatedUserId(req));
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update patient profile' })
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      phoneNumber?: string;
      email?: string;
      address?: string;
      whatsappConsent?: boolean;
      preferredName?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelation?: string;
    },
  ) {
    return this.portalService.updateProfile(
      // jscpd:ignore-end
      requireAuthenticatedUserId(req),
      body,
    );
  }

  @Get('consent')
  @ApiOperation({ summary: 'Get consent settings' })
  async getConsent(@Request() req: RequestWithUser) {
    await auditPatientPortalRead(
      this.contextService,
      this.auditService,
      req,
      'VIEW_PROFILE',
    );
    return this.portalService.getConsent(requireAuthenticatedUserId(req));
  }

  @Patch('consent')
  @ApiOperation({ summary: 'Update consent settings' })
  async updateConsent(
    @Request() req: RequestWithUser,
    @Body() body: { whatsappConsent?: boolean; dataStorageConsent?: boolean },
  ) {
    return this.portalService.updateConsent(
      requireAuthenticatedUserId(req),
      body,
    );
  }

  @Post('profile/delete-request')
  @ApiOperation({ summary: 'Request patient data deletion' })
  async requestDataDeletion(
    @Request() req: RequestWithUser,
    @Body() body: { reason: string; confirmDeletion?: boolean },
  ) {
    return this.portalService.requestDataDeletion(
      requireAuthenticatedUserId(req),
      body,
    );
  }
}
