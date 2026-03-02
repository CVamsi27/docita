import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FhirService } from './fhir.service';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  FhirResourceDto,
  FhirBundleDto,
  FhirResourceListDto,
} from './dto/fhir.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import type { AuthenticatedRequest } from '@workspace/types';

@Controller('fhir')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @Get('Patient/:id')
  @ZodSerializerDto(FhirResourceDto)
  async getPatient(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user.clinicId;
    if (!clinicId) throw new BadRequestException('Clinic ID required');
    return this.fhirService.getPatientResource(id, clinicId);
  }

  @Get('Observation')
  @ZodSerializerDto(FhirResourceListDto)
  async getObservations(
    @Query('patient') patientId: string,
    @Query('encounter') encounterId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user.clinicId;
    if (!clinicId) throw new BadRequestException('Clinic ID required');
    return this.fhirService.getVitalSignObservations(
      patientId,
      clinicId,
      encounterId,
    );
  }

  @Get('MedicationRequest')
  @ZodSerializerDto(FhirResourceListDto)
  async getMedicationRequests(
    @Query('patient') patientId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user.clinicId;
    if (!clinicId) throw new BadRequestException('Clinic ID required');
    return this.fhirService.getMedicationRequests(patientId, clinicId);
  }

  @Get('Condition')
  @ZodSerializerDto(FhirResourceListDto)
  async getConditions(
    @Query('patient') patientId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user.clinicId;
    if (!clinicId) throw new BadRequestException('Clinic ID required');
    return this.fhirService.getConditions(patientId, clinicId);
  }

  @Get('AllergyIntolerance')
  @ZodSerializerDto(FhirResourceListDto)
  async getAllergyIntolerances(
    @Query('patient') patientId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user.clinicId;
    if (!clinicId) throw new BadRequestException('Clinic ID required');
    return this.fhirService.getAllergyIntolerances(patientId, clinicId);
  }

  @Get('Appointment/:id')
  @ZodSerializerDto(FhirResourceDto)
  async getAppointment(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user.clinicId;
    if (!clinicId) throw new BadRequestException('Clinic ID required');
    return this.fhirService.getAppointmentResource(id, clinicId);
  }

  @Get('Appointment')
  @ZodSerializerDto(FhirResourceListDto)
  async getAppointments(
    @Query('patient') patientId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user.clinicId;
    if (!clinicId) throw new BadRequestException('Clinic ID required');
    return this.fhirService.getAppointments(patientId, clinicId);
  }

  @Get('Bundle/:patientId')
  @ZodSerializerDto(FhirBundleDto)
  async getPatientBundle(
    @Param('patientId') patientId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user.clinicId;
    if (!clinicId) throw new BadRequestException('Clinic ID required');
    return this.fhirService.getPatientBundle(patientId, clinicId);
  }

  @Get('export/ccd/:patientId')
  async exportCCD(
    @Param('patientId') patientId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user.clinicId;
    if (!clinicId) throw new BadRequestException('Clinic ID required');
    return this.fhirService.getCCDExport(patientId, clinicId);
  }

  @Get('metadata')
  @ZodSerializerDto(FhirResourceDto)
  getCapabilityStatement() {
    return this.fhirService.getCapabilityStatement();
  }
}
