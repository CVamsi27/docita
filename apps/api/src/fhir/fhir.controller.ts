/**
 * FHIR R4 Controller
 *
 * Provides REST endpoints for FHIR R4 resource access and export.
 * Supports hospital interoperability and health information exchange.
 *
 * Endpoints:
 * - GET /fhir/Patient/:id - Get patient resource
 * - GET /fhir/Observation - Get observations (vital signs)
 * - GET /fhir/MedicationRequest - Get medication requests
 * - GET /fhir/Condition - Get conditions/diagnoses
 * - GET /fhir/AllergyIntolerance - Get allergies
 * - GET /fhir/Bundle/:patientId - Get complete patient bundle
 */

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FhirService } from './fhir.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fhir')
@UseGuards(JwtAuthGuard)
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  /**
   * Get FHIR Patient resource
   * GET /fhir/Patient/:id
   */
  @Get('Patient/:id')
  async getPatient(@Param('id') id: string, @Request() req: any) {
    const clinicId = req.user.clinicId;
    return this.fhirService.getPatientResource(id, clinicId);
  }

  /**
   * Get FHIR Observation resources (vital signs)
   * GET /fhir/Observation?patient=:patientId&encounter=:appointmentId
   */
  @Get('Observation')
  async getObservations(
    @Query('patient') patientId: string,
    @Query('encounter') encounterId: string,
    @Request() req: any,
  ) {
    const clinicId = req.user.clinicId;
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
  async getMedicationRequests(
    @Query('patient') patientId: string,
    @Request() req: any,
  ) {
    const clinicId = req.user.clinicId;
    return this.fhirService.getMedicationRequests(patientId, clinicId);
  }

  /**
   * Get FHIR Condition resources
   * GET /fhir/Condition?patient=:patientId
   */
  @Get('Condition')
  async getConditions(
    @Query('patient') patientId: string,
    @Request() req: any,
  ) {
    const clinicId = req.user.clinicId;
    return this.fhirService.getConditions(patientId, clinicId);
  }

  /**
   * Get FHIR AllergyIntolerance resources
   * GET /fhir/AllergyIntolerance?patient=:patientId
   */
  @Get('AllergyIntolerance')
  async getAllergyIntolerances(
    @Query('patient') patientId: string,
    @Request() req: any,
  ) {
    const clinicId = req.user.clinicId;
    return this.fhirService.getAllergyIntolerances(patientId, clinicId);
  }

  /**
   * Get complete patient bundle with all FHIR resources
   * GET /fhir/Bundle/:patientId
   */
  @Get('Bundle/:patientId')
  async getPatientBundle(
    @Param('patientId') patientId: string,
    @Request() req: any,
  ) {
    const clinicId = req.user.clinicId;
    return this.fhirService.getPatientBundle(patientId, clinicId);
  }

  /**
   * Export patient data as CCD (Continuity of Care Document)
   * GET /fhir/export/ccd/:patientId
   *
   * Returns the patient bundle in a format suitable for CCD generation
   */
  @Get('export/ccd/:patientId')
  async exportCCD(@Param('patientId') patientId: string, @Request() req: any) {
    const clinicId = req.user.clinicId;
    const bundle = await this.fhirService.getPatientBundle(patientId, clinicId);

    // Add document metadata for CCD
    return {
      ...bundle,
      type: 'document',
      meta: {
        profile: [
          'http://hl7.org/fhir/us/ccda/StructureDefinition/CCDA-on-FHIR-Continuity-of-Care-Document',
        ],
      },
      identifier: {
        system: 'urn:ietf:rfc:3986',
        value: `urn:uuid:${patientId}-ccd-${Date.now()}`,
      },
    };
  }

  /**
   * FHIR Capability Statement (metadata)
   * GET /fhir/metadata
   */
  @Get('metadata')
  getCapabilityStatement() {
    return {
      resourceType: 'CapabilityStatement',
      id: 'docita-fhir-server',
      name: 'DocitaFHIRServer',
      title: 'Docita FHIR R4 Server',
      status: 'active',
      experimental: false,
      date: new Date().toISOString(),
      publisher: 'Docita',
      description: 'FHIR R4 API for Docita Healthcare Platform',
      kind: 'instance',
      software: {
        name: 'Docita',
        version: '1.0.0',
      },
      fhirVersion: '4.0.1',
      format: ['json'],
      rest: [
        {
          mode: 'server',
          security: {
            cors: true,
            service: [
              {
                coding: [
                  {
                    system:
                      'http://terminology.hl7.org/CodeSystem/restful-security-service',
                    code: 'OAuth',
                    display: 'OAuth',
                  },
                ],
              },
            ],
            description: 'JWT Bearer token authentication required',
          },
          resource: [
            {
              type: 'Patient',
              profile:
                'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient',
              interaction: [{ code: 'read' }],
              searchParam: [{ name: '_id', type: 'token' }],
            },
            {
              type: 'Observation',
              profile:
                'http://hl7.org/fhir/us/core/StructureDefinition/us-core-vital-signs',
              interaction: [{ code: 'search-type' }],
              searchParam: [
                { name: 'patient', type: 'reference' },
                { name: 'encounter', type: 'reference' },
              ],
            },
            {
              type: 'MedicationRequest',
              profile:
                'http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest',
              interaction: [{ code: 'search-type' }],
              searchParam: [{ name: 'patient', type: 'reference' }],
            },
            {
              type: 'Condition',
              profile:
                'http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition',
              interaction: [{ code: 'search-type' }],
              searchParam: [{ name: 'patient', type: 'reference' }],
            },
            {
              type: 'AllergyIntolerance',
              profile:
                'http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance',
              interaction: [{ code: 'search-type' }],
              searchParam: [{ name: 'patient', type: 'reference' }],
            },
            {
              type: 'Bundle',
              interaction: [{ code: 'read' }],
            },
          ],
        },
      ],
    };
  }
}
