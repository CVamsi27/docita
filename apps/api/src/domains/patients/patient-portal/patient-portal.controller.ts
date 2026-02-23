import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { PatientPortalService } from './patient-portal.service';
import { JwtAuthGuard } from '../../../shared/modules/auth/auth/jwt-auth.guard';
import { RolesGuard } from '../../../shared/modules/auth/auth/roles.guard';
import { Roles } from '../../../shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import type { RequestWithUser } from '../../../common/types/common.types';
import {
  GetPatientPortalSnapshotQueryDto,
  UpdatePatientProfileBodyDto,
  RequestAppointmentBodyDto,
  GetPatientAppointmentsQueryDto,
  GetPatientPrescriptionsQueryDto,
  GetPatientInvoicesQueryDto,
  RequestDataDeletionDto,
  UpdateConsentSettingsDto,
} from './dto/patient-portal.dto';

@ApiTags('patient-portal')
@Controller('patient-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
@ApiBearerAuth()
export class PatientPortalController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  /**
   * Get patient dashboard snapshot
   * Returns aggregated view of upcoming appointments, prescriptions, invoices
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get patient dashboard snapshot' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a patient' })
  async getDashboard(@Request() req: RequestWithUser) {
    const patientId = req.user?.patientId;

    if (!patientId) {
      throw new UnauthorizedException('Patient ID not found in JWT token');
    }

    return this.patientPortalService.getPatientDashboard(patientId);
  }

  /**
   * Get patient's appointments with optional filters
   */
  @Get('appointments')
  @ApiOperation({ summary: 'Get patient appointments' })
  @ApiResponse({
    status: 200,
    description: 'Appointments retrieved successfully',
  })
  async getAppointments(
    @Request() req: RequestWithUser,
    @Query() query: GetPatientAppointmentsQueryDto,
  ) {
    const patientId = req.user?.patientId;

    if (!patientId) {
      throw new UnauthorizedException('Patient ID not found in JWT token');
    }

    return this.patientPortalService.getPatientAppointments(patientId, query);
  }

  /**
   * Get single appointment details
   */
  @Get('appointments/:id')
  @ApiOperation({ summary: 'Get single appointment details' })
  @ApiResponse({
    status: 200,
    description: 'Appointment details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async getAppointmentById(
    @Request() req: RequestWithUser,
    @Param('id') appointmentId: string,
  ) {
    const patientId = req.user?.patientId;

    if (!patientId) {
      throw new UnauthorizedException('Patient ID not found in JWT token');
    }

    return this.patientPortalService.getPatientAppointmentById(
      patientId,
      appointmentId,
    );
  }

  /**
   * Request a new appointment
   */
  @Post('appointments/request')
  @ApiOperation({ summary: 'Request a new appointment' })
  @ApiResponse({
    status: 201,
    description: 'Appointment requested successfully',
  })
  async requestAppointment(
    @Request() req: RequestWithUser,
    @Body() body: RequestAppointmentBodyDto,
  ) {
    const patientId = req.user?.patientId;

    if (!patientId) {
      throw new UnauthorizedException('Patient ID not found in JWT token');
    }

    return this.patientPortalService.requestAppointment(patientId, body);
  }

  /**
   * Get patient's prescriptions
   */
  @Get('prescriptions')
  @ApiOperation({ summary: 'Get patient prescriptions' })
  @ApiResponse({
    status: 200,
    description: 'Prescriptions retrieved successfully',
  })
  async getPrescriptions(
    @Request() req: RequestWithUser,
    @Query() query: GetPatientPrescriptionsQueryDto,
  ) {
    const patientId = req.user?.patientId;

    if (!patientId) {
      throw new UnauthorizedException('Patient ID not found in JWT token');
    }

    return this.patientPortalService.getPatientPrescriptions(patientId, query);
  }

  /**
   * Get single prescription details
   */
  @Get('prescriptions/:id')
  @ApiOperation({ summary: 'Get single prescription details' })
  @ApiResponse({
    status: 200,
    description: 'Prescription details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async getPrescriptionById(
    @Request() req: RequestWithUser,
    @Param('id') prescriptionId: string,
  ) {
    const patientId = req.user?.patientId;

    if (!patientId) {
      throw new UnauthorizedException('Patient ID not found in JWT token');
    }

    return this.patientPortalService.getPatientPrescriptionById(
      patientId,
      prescriptionId,
    );
  }

  /**
   * Get patient's invoices
   */
  @Get('invoices')
  @ApiOperation({ summary: 'Get patient invoices' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async getInvoices(
    @Request() req: RequestWithUser,
    @Query() query: GetPatientInvoicesQueryDto,
  ) {
    const patientId = req.user?.patientId;

    if (!patientId) {
      throw new UnauthorizedException('Patient ID not found in JWT token');
    }

    return this.patientPortalService.getPatientInvoices(patientId, query);
  }

  /**
   * Update patient profile
   * Patients can update limited fields: phone, email, address, whatsapp consent
   */
  @Patch('profile')
  @ApiOperation({ summary: 'Update patient profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body() body: UpdatePatientProfileBodyDto,
  ) {
    const patientId = req.user?.patientId;

    if (!patientId) {
      throw new UnauthorizedException('Patient ID not found in JWT token');
    }

    return this.patientPortalService.updatePatientProfile(patientId, body);
  }

  /**
   * Request data deletion (GDPR/DPDP compliance)
   */
  @Post('profile/delete-request')
  @ApiOperation({ summary: 'Request account and data deletion' })
  @ApiResponse({ status: 200, description: 'Deletion request submitted' })
  async requestDataDeletion(
    @Request() req: RequestWithUser,
    @Body() body: RequestDataDeletionDto,
  ) {
    const patientId = req.user?.patientId;

    if (!patientId) {
      throw new UnauthorizedException('Patient ID not found in JWT token');
    }

    return this.patientPortalService.requestDataDeletion(
      patientId,
      body.reason,
    );
  }

  /**
   * Get patient consent settings
   */
  @Get('consent')
  @ApiOperation({ summary: 'Get patient consent settings' })
  @ApiResponse({ status: 200, description: 'Consent settings retrieved' })
  async getConsentSettings(@Request() req: RequestWithUser) {
    const patientId = req.user?.patientId;

    if (!patientId) {
      throw new UnauthorizedException('Patient ID not found in JWT token');
    }

    return this.patientPortalService.getConsentSettings(patientId);
  }

  /**
   * Update patient consent settings
   */
  @Patch('consent')
  @ApiOperation({ summary: 'Update consent settings (WhatsApp, data storage)' })
  @ApiResponse({ status: 200, description: 'Consent settings updated' })
  async updateConsentSettings(
    @Request() req: RequestWithUser,
    @Body() body: UpdateConsentSettingsDto,
  ) {
    const patientId = req.user?.patientId;

    if (!patientId) {
      throw new UnauthorizedException('Patient ID not found in JWT token');
    }

    return this.patientPortalService.updateConsentSettings(
      patientId,
      body.whatsappConsent,
      body.dataStorageConsent,
    );
  }
}
