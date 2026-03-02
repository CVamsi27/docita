import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
import {
  FhirAllergyIntolerance,
  FhirAppointment,
  FhirBundle,
  FhirCondition,
  FhirImmunization,
  FhirMedicationRequest,
  FhirObservation,
  FhirPatient,
  FhirResource,
} from './interfaces/fhir.interfaces';
import { FhirPatientFactory } from './factories/fhir-patient.factory';
import { FhirObservationFactory } from './factories/fhir-observation.factory';
import { FhirMedicationFactory } from './factories/fhir-medication.factory';
import { FhirConditionFactory } from './factories/fhir-condition.factory';
import { FhirAllergyFactory } from './factories/fhir-allergy.factory';
import { FhirImmunizationFactory } from './factories/fhir-immunization.factory';
import { FhirAppointmentFactory } from './factories/fhir-appointment.factory';

@Injectable()
export class FhirService {
  constructor(
    private prisma: PrismaService,
    private patientFactory: FhirPatientFactory,
    private observationFactory: FhirObservationFactory,
    private medicationFactory: FhirMedicationFactory,
    private conditionFactory: FhirConditionFactory,
    private allergyFactory: FhirAllergyFactory,
    private immunizationFactory: FhirImmunizationFactory,
    private appointmentFactory: FhirAppointmentFactory,
  ) {}

  async getPatientResource(
    patientId: string,
    clinicId: string,
  ): Promise<FhirPatient> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }

    return this.patientFactory.create(patient);
  }

  async getVitalSignObservations(
    patientId: string,
    clinicId: string,
    appointmentId?: string,
  ): Promise<FhirObservation[]> {
    const where: Prisma.VitalSignWhereInput = {
      appointment: {
        patientId,
        clinicId,
      },
    };

    if (appointmentId) {
      where.appointmentId = appointmentId;
    }

    const vitalSigns = await this.prisma.vitalSign.findMany({
      where,
      include: {
        appointment: {
          include: {
            patient: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return this.observationFactory.createMany(vitalSigns);
  }

  async getMedicationRequests(
    patientId: string,
    clinicId: string,
  ): Promise<FhirMedicationRequest[]> {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        patientId,
        appointment: { clinicId },
      },
      include: {
        medications: true,
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return this.medicationFactory.createMany(prescriptions);
  }

  async getConditions(
    patientId: string,
    clinicId: string,
  ): Promise<FhirCondition[]> {
    const conditions = await this.prisma.patientMedicalCondition.findMany({
      where: {
        patientId,
        patient: { clinicId },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    const diagnoses = await this.prisma.diagnosis.findMany({
      where: {
        appointment: {
          patientId,
          clinicId,
        },
      },
      include: {
        icdCode: true,
        appointment: {
          include: {
            patient: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const medicalConditions =
      this.conditionFactory.createFromConditions(conditions);
    const diagnosisConditions =
      this.conditionFactory.createFromDiagnoses(diagnoses);

    return [...medicalConditions, ...diagnosisConditions];
  }

  async getAllergyIntolerances(
    patientId: string,
    clinicId: string,
  ): Promise<FhirAllergyIntolerance[]> {
    const allergies = await this.prisma.patientAllergy.findMany({
      where: {
        patientId,
        patient: { clinicId },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    return this.allergyFactory.createMany(allergies);
  }

  async getImmunizations(
    patientId: string,
    clinicId: string,
  ): Promise<FhirImmunization[]> {
    const immunizations = await this.prisma.immunization.findMany({
      where: {
        patientId,
        patient: { clinicId },
      },
      orderBy: { administeredDate: 'desc' },
    });

    return this.immunizationFactory.createMany(immunizations);
  }

  async getAppointments(
    patientId: string,
    clinicId: string,
  ): Promise<FhirAppointment[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        patientId,
        clinicId,
      },
      orderBy: { startTime: 'desc' },
      take: 50,
    });

    return this.appointmentFactory.createMany(appointments);
  }

  async getAppointmentResource(
    appointmentId: string,
    clinicId: string,
  ): Promise<FhirAppointment> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment ${appointmentId} not found`);
    }

    return this.appointmentFactory.create(appointment);
  }

  async getPatientBundle(
    patientId: string,
    clinicId: string,
  ): Promise<FhirBundle> {
    const patient = await this.getPatientResource(patientId, clinicId);
    const observations = await this.getVitalSignObservations(
      patientId,
      clinicId,
    );
    const medicationRequests = await this.getMedicationRequests(
      patientId,
      clinicId,
    );
    const conditions = await this.getConditions(patientId, clinicId);
    const allergies = await this.getAllergyIntolerances(patientId, clinicId);
    const immunizations = await this.getImmunizations(patientId, clinicId);
    const appointments = await this.getAppointments(patientId, clinicId);

    const entries: Array<{ fullUrl: string; resource: FhirResource }> = [
      {
        fullUrl: `Patient/${patientId}`,
        resource: patient,
      },
    ];

    observations.forEach((obs) => {
      entries.push({ fullUrl: `Observation/${obs.id}`, resource: obs });
    });

    medicationRequests.forEach((req) => {
      entries.push({ fullUrl: `MedicationRequest/${req.id}`, resource: req });
    });

    conditions.forEach((cond) => {
      entries.push({ fullUrl: `Condition/${cond.id}`, resource: cond });
    });

    allergies.forEach((alg) => {
      entries.push({ fullUrl: `AllergyIntolerance/${alg.id}`, resource: alg });
    });

    immunizations.forEach((imm) => {
      entries.push({ fullUrl: `Immunization/${imm.id}`, resource: imm });
    });

    appointments.forEach((appt) => {
      entries.push({ fullUrl: `Appointment/${appt.id}`, resource: appt });
    });

    return {
      resourceType: 'Bundle',
      id: `patient-bundle-${patientId}`,
      type: 'collection',
      timestamp: new Date().toISOString(),
      total: entries.length,
      entry: entries,
    };
  }

  async getCCDExport(patientId: string, clinicId: string) {
    const bundle = await this.getPatientBundle(patientId, clinicId);

    return {
      ...bundle,
      type: 'document',
      meta: {
        profile: [
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient',
        ],
      },
      identifier: {
        system: 'urn:ietf:rfc:3986',
        value: `urn:uuid:${patientId}-ccd-${Date.now()}`,
      },
    };
  }

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
              profile: 'http://hl7.org/fhir/StructureDefinition/Patient',
              interaction: [{ code: 'read' }],
              searchParam: [{ name: '_id', type: 'token' }],
            },
            {
              type: 'Observation',
              profile: 'http://hl7.org/fhir/StructureDefinition/Observation',
              interaction: [{ code: 'search-type' }],
              searchParam: [
                { name: 'patient', type: 'reference' },
                { name: 'encounter', type: 'reference' },
              ],
            },
            {
              type: 'MedicationRequest',
              profile:
                'http://hl7.org/fhir/StructureDefinition/MedicationRequest',
              interaction: [{ code: 'search-type' }],
              searchParam: [{ name: 'patient', type: 'reference' }],
            },
            {
              type: 'Condition',
              profile: 'http://hl7.org/fhir/StructureDefinition/Condition',
              interaction: [{ code: 'search-type' }],
              searchParam: [{ name: 'patient', type: 'reference' }],
            },
            {
              type: 'AllergyIntolerance',
              profile:
                'http://hl7.org/fhir/StructureDefinition/AllergyIntolerance',
              interaction: [{ code: 'search-type' }],
              searchParam: [{ name: 'patient', type: 'reference' }],
            },
            {
              type: 'Immunization',
              profile: 'http://hl7.org/fhir/StructureDefinition/Immunization',
              interaction: [{ code: 'search-type' }],
              searchParam: [{ name: 'patient', type: 'reference' }],
            },
            {
              type: 'Appointment',
              profile: 'http://hl7.org/fhir/StructureDefinition/Appointment',
              interaction: [{ code: 'read' }, { code: 'search-type' }],
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
