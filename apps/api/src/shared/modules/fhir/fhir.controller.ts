/**
 * FHIR R4 Controller
 *
 * Provides REST endpoints for FHIR R4 resource access and export.
 * Supports hospital interoperability and health information exchange.
 */

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
import { Roles } from '../auth/auth/roles.decorator';
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

  /**
   * Get FHIR Patient resource
   * GET /fhir/Patient/:id
   */
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

  /**
   * Get FHIR Observation resources (vital signs)
   * GET /fhir/Observation?patient=:patientId&encounter=:appointmentId
   */
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

  /**
   * Get FHIR MedicationRequest resources
   * GET /fhir/MedicationRequest?patient=:patientId
   */
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

  /**
   * Get FHIR Condition resources
   * GET /fhir/Condition?patient=:patientId
   */
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

  /**
   * Get FHIR AllergyIntolerance resources
   * GET /fhir/AllergyIntolerance?patient=:patientId
   */
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

  /**
   * Get FHIR Appointment resource
   * GET /fhir/Appointment/:id
   */
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

  /**
   * Get FHIR Appointment resources for a patient
   * GET /fhir/Appointment?patient=:patientId
   */
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

  /**
   * Get complete patient bundle with all FHIR resources
   * GET /fhir/Bundle/:patientId
   */
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

  /**
   * Export patient data as CCD (Continuity of Care Document)
   * GET /fhir/export/ccd/:patientId
   */
  @Get('export/ccd/:patientId')
  // CCD is XML, so we might return a string or object.
  // Assuming it returns string or wrapping object.
  // If string, we might need a specific DTO or just bypass serializer for this one or use a String DTO.
  // Let's assume it returns a wrapped response for now.
  async exportCCD(
    @Param('patientId') patientId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user.clinicId;
    if (!clinicId) throw new BadRequestException('Clinic ID required');
    return this.fhirService.getCCDExport(patientId, clinicId);
  }

  /**
   * FHIR Capability Statement (metadata)
   * GET /fhir/metadata
   */
  @Get('metadata')
  @ZodSerializerDto(FhirResourceDto)
  getCapabilityStatement() {
    return this.fhirService.getCapabilityStatement();
  }
}
