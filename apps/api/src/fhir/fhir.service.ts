/**
 * FHIR R4 Service
 *
 * Provides HL7 FHIR R4 resource mapping and export capabilities for
 * hospital interoperability and health information exchange.
 *
 * Supported Resources:
 * - Patient: Demographics and identifiers
 * - Observation: Vital signs and lab results
 * - MedicationRequest: Prescriptions
 * - Condition: Diagnoses and medical conditions
 * - AllergyIntolerance: Patient allergies
 * - Immunization: Vaccination records
 *
 * Standards:
 * - FHIR R4 (4.0.1)
 * - US Core Implementation Guide
 * - IHE profiles for document sharing
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// FHIR R4 Resource Types
interface FhirResource {
  resourceType: string;
  id: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
}

interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: Array<{
    use?: string;
    type?: { coding: Array<{ system: string; code: string; display: string }> };
    system?: string;
    value: string;
  }>;
  active?: boolean;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
  }>;
  telecom?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  address?: Array<{
    use?: string;
    type?: string;
    text?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  maritalStatus?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  communication?: Array<{
    language: {
      coding: Array<{ system: string; code: string; display: string }>;
    };
    preferred?: boolean;
  }>;
  extension?: Array<{
    url: string;
    valueCode?: string;
    valueCoding?: { system: string; code: string; display: string };
    valueString?: string;
  }>;
  contact?: Array<{
    relationship?: Array<{
      coding: Array<{ system: string; code: string; display: string }>;
    }>;
    name?: { family?: string; given?: string[] };
    telecom?: Array<{ system?: string; value?: string; use?: string }>;
  }>;
}

interface FhirObservation extends FhirResource {
  resourceType: 'Observation';
  status:
    | 'registered'
    | 'preliminary'
    | 'final'
    | 'amended'
    | 'corrected'
    | 'cancelled'
    | 'entered-in-error'
    | 'unknown';
  category?: Array<{
    coding: Array<{ system: string; code: string; display: string }>;
  }>;
  code: {
    coding: Array<{ system: string; code: string; display: string }>;
    text?: string;
  };
  subject: { reference: string; display?: string };
  encounter?: { reference: string };
  effectiveDateTime?: string;
  issued?: string;
  valueQuantity?: { value: number; unit: string; system: string; code: string };
  valueString?: string;
  component?: Array<{
    code: { coding: Array<{ system: string; code: string; display: string }> };
    valueQuantity?: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  }>;
}

interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  status:
    | 'active'
    | 'on-hold'
    | 'cancelled'
    | 'completed'
    | 'entered-in-error'
    | 'stopped'
    | 'draft'
    | 'unknown';
  intent:
    | 'proposal'
    | 'plan'
    | 'order'
    | 'original-order'
    | 'reflex-order'
    | 'filler-order'
    | 'instance-order'
    | 'option';
  medicationCodeableConcept?: {
    coding: Array<{ system: string; code: string; display: string }>;
    text?: string;
  };
  subject: { reference: string; display?: string };
  encounter?: { reference: string };
  authoredOn?: string;
  requester?: { reference: string; display?: string };
  dosageInstruction?: Array<{
    sequence?: number;
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: string;
        when?: string[];
      };
      code?: {
        coding: Array<{ system: string; code: string; display: string }>;
      };
    };
    route?: {
      coding: Array<{ system: string; code: string; display: string }>;
    };
    doseAndRate?: Array<{
      type?: {
        coding: Array<{ system: string; code: string; display: string }>;
      };
      doseQuantity?: {
        value: number;
        unit: string;
        system: string;
        code: string;
      };
    }>;
  }>;
  dispenseRequest?: {
    numberOfRepeatsAllowed?: number;
    quantity?: { value: number; unit: string };
    expectedSupplyDuration?: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  };
}

interface FhirCondition extends FhirResource {
  resourceType: 'Condition';
  clinicalStatus?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  verificationStatus?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  category?: Array<{
    coding: Array<{ system: string; code: string; display: string }>;
  }>;
  severity?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  code?: {
    coding: Array<{ system: string; code: string; display: string }>;
    text?: string;
  };
  subject: { reference: string; display?: string };
  encounter?: { reference: string };
  onsetDateTime?: string;
  abatementDateTime?: string;
  recordedDate?: string;
  note?: Array<{ text: string }>;
}

interface FhirAllergyIntolerance extends FhirResource {
  resourceType: 'AllergyIntolerance';
  clinicalStatus?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  verificationStatus?: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  type?: 'allergy' | 'intolerance';
  category?: Array<'food' | 'medication' | 'environment' | 'biologic'>;
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code?: {
    coding: Array<{ system: string; code: string; display: string }>;
    text?: string;
  };
  patient: { reference: string; display?: string };
  onsetDateTime?: string;
  recordedDate?: string;
  recorder?: { reference: string; display?: string };
  reaction?: Array<{
    manifestation: Array<{
      coding: Array<{ system: string; code: string; display: string }>;
      text?: string;
    }>;
    severity?: 'mild' | 'moderate' | 'severe';
  }>;
}

interface FhirImmunization extends FhirResource {
  resourceType: 'Immunization';
  status: 'completed' | 'entered-in-error' | 'not-done';
  vaccineCode: {
    coding: Array<{ system: string; code: string; display: string }>;
    text?: string;
  };
  patient: { reference: string; display?: string };
  occurrenceDateTime?: string;
  recorded?: string;
  lotNumber?: string;
  expirationDate?: string;
  site?: { coding: Array<{ system: string; code: string; display: string }> };
  route?: { coding: Array<{ system: string; code: string; display: string }> };
  doseQuantity?: { value: number; unit: string };
  performer?: Array<{ actor: { reference: string; display?: string } }>;
  reaction?: Array<{ date?: string; detail?: { reference: string } }>;
}

interface FhirBundle extends FhirResource {
  resourceType: 'Bundle';
  type:
    | 'document'
    | 'message'
    | 'transaction'
    | 'transaction-response'
    | 'batch'
    | 'batch-response'
    | 'history'
    | 'searchset'
    | 'collection';
  timestamp?: string;
  total?: number;
  entry?: Array<{
    fullUrl?: string;
    resource: FhirResource;
  }>;
}

@Injectable()
export class FhirService {
  constructor(private prisma: PrismaService) {}

  /**
   * Map internal patient to FHIR R4 Patient resource
   */
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

    const fhirPatient: FhirPatient = {
      resourceType: 'Patient',
      id: patient.id,
      meta: {
        lastUpdated: patient.updatedAt.toISOString(),
        profile: [
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient',
        ],
      },
      identifier: [],
      active: true,
      name: [
        {
          use: 'official',
          family: patient.lastName,
          given: [patient.firstName],
        },
      ],
      telecom: [],
      birthDate: patient.dateOfBirth.toISOString().split('T')[0],
      extension: [],
    };

    // Add MRN identifier if present
    if ((patient as any).mrn) {
      fhirPatient.identifier!.push({
        use: 'usual',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MR',
              display: 'Medical Record Number',
            },
          ],
        },
        value: (patient as any).mrn,
      });
    }

    // Add phone
    if (patient.phoneNumber) {
      fhirPatient.telecom!.push({
        system: 'phone',
        value: patient.phoneNumber,
        use: 'mobile',
      });
    }

    // Add email
    if (patient.email) {
      fhirPatient.telecom!.push({
        system: 'email',
        value: patient.email,
        use: 'home',
      });
    }

    // Map gender
    const genderMap: Record<string, 'male' | 'female' | 'other' | 'unknown'> = {
      MALE: 'male',
      FEMALE: 'female',
      OTHER: 'other',
      INTERSEX: 'other',
      NON_BINARY: 'other',
      PREFER_NOT_TO_SAY: 'unknown',
    };
    fhirPatient.gender = genderMap[patient.gender] || 'unknown';

    // Add address
    if (patient.address) {
      fhirPatient.address = [
        {
          use: 'home',
          text: patient.address,
        },
      ];
    }

    // Add race extension (US Core)
    if ((patient as any).race) {
      fhirPatient.extension!.push({
        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
        valueString: (patient as any).race,
      });
    }

    // Add ethnicity extension (US Core)
    if ((patient as any).ethnicity) {
      fhirPatient.extension!.push({
        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
        valueString: (patient as any).ethnicity,
      });
    }

    // Add preferred language
    if ((patient as any).preferredLanguage) {
      fhirPatient.communication = [
        {
          language: {
            coding: [
              {
                system: 'urn:ietf:bcp:47',
                code: (patient as any).preferredLanguage,
                display: (patient as any).preferredLanguage,
              },
            ],
          },
          preferred: true,
        },
      ];
    }

    // Add emergency contact
    if ((patient as any).emergencyContactName) {
      fhirPatient.contact = [
        {
          relationship: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
                  code: 'C',
                  display:
                    (patient as any).emergencyContactRelation ||
                    'Emergency Contact',
                },
              ],
            },
          ],
          name: {
            family: (patient as any).emergencyContactName,
          },
          telecom: (patient as any).emergencyContactPhone
            ? [
                {
                  system: 'phone',
                  value: (patient as any).emergencyContactPhone,
                  use: 'mobile',
                },
              ]
            : undefined,
        },
      ];
    }

    return fhirPatient;
  }

  /**
   * Map vital signs to FHIR R4 Observation resources
   */
  async getVitalSignObservations(
    patientId: string,
    clinicId: string,
    appointmentId?: string,
  ): Promise<FhirObservation[]> {
    const where: any = {
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
          select: {
            id: true,
            patientId: true,
            startTime: true,
            patient: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const observations: FhirObservation[] = [];
    const patientRef = `Patient/${patientId}`;

    for (const vital of vitalSigns) {
      const effectiveDateTime = vital.appointment.startTime.toISOString();
      const patientDisplay = `${vital.appointment.patient.firstName} ${vital.appointment.patient.lastName}`;
      const encounterRef = `Encounter/${vital.appointmentId}`;

      // Blood Pressure (as component observation)
      const systolicBP = (vital as any).systolicBP;
      const diastolicBP = (vital as any).diastolicBP;

      if (systolicBP && diastolicBP) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-bp`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '85354-9',
                display: 'Blood pressure panel with all children optional',
              },
            ],
            text: 'Blood Pressure',
          },
          subject: { reference: patientRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          component: [
            {
              code: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '8480-6',
                    display: 'Systolic blood pressure',
                  },
                ],
              },
              valueQuantity: {
                value: systolicBP,
                unit: 'mmHg',
                system: 'http://unitsofmeasure.org',
                code: 'mm[Hg]',
              },
            },
            {
              code: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '8462-4',
                    display: 'Diastolic blood pressure',
                  },
                ],
              },
              valueQuantity: {
                value: diastolicBP,
                unit: 'mmHg',
                system: 'http://unitsofmeasure.org',
                code: 'mm[Hg]',
              },
            },
          ],
        });
      }

      // Heart Rate
      if (vital.pulse) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-hr`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8867-4',
                display: 'Heart rate',
              },
            ],
            text: 'Heart Rate',
          },
          subject: { reference: patientRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.pulse,
            unit: 'beats/minute',
            system: 'http://unitsofmeasure.org',
            code: '/min',
          },
        });
      }

      // Temperature
      if (vital.temperature) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-temp`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8310-5',
                display: 'Body temperature',
              },
            ],
            text: 'Body Temperature',
          },
          subject: { reference: patientRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.temperature,
            unit: 'Cel',
            system: 'http://unitsofmeasure.org',
            code: 'Cel',
          },
        });
      }

      // SpO2
      if (vital.spo2) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-spo2`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '2708-6',
                display: 'Oxygen saturation in Arterial blood',
              },
            ],
            text: 'Oxygen Saturation',
          },
          subject: { reference: patientRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.spo2,
            unit: '%',
            system: 'http://unitsofmeasure.org',
            code: '%',
          },
        });
      }

      // Respiratory Rate
      if (vital.respiratoryRate) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-rr`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '9279-1',
                display: 'Respiratory rate',
              },
            ],
            text: 'Respiratory Rate',
          },
          subject: { reference: patientRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.respiratoryRate,
            unit: 'breaths/minute',
            system: 'http://unitsofmeasure.org',
            code: '/min',
          },
        });
      }

      // Height
      if (vital.height) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-height`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8302-2',
                display: 'Body height',
              },
            ],
            text: 'Height',
          },
          subject: { reference: patientRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.height,
            unit: 'cm',
            system: 'http://unitsofmeasure.org',
            code: 'cm',
          },
        });
      }

      // Weight
      if (vital.weight) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-weight`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '29463-7',
                display: 'Body weight',
              },
            ],
            text: 'Weight',
          },
          subject: { reference: patientRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.weight,
            unit: 'kg',
            system: 'http://unitsofmeasure.org',
            code: 'kg',
          },
        });
      }

      // BMI
      if (vital.bmi) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-bmi`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '39156-5',
                display: 'Body mass index (BMI)',
              },
            ],
            text: 'BMI',
          },
          subject: { reference: patientRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.bmi,
            unit: 'kg/m2',
            system: 'http://unitsofmeasure.org',
            code: 'kg/m2',
          },
        });
      }

      // Blood Glucose
      if (vital.bloodGlucose) {
        observations.push({
          resourceType: 'Observation',
          id: `${vital.id}-glucose`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '2339-0',
                display: 'Glucose [Mass/volume] in Blood',
              },
            ],
            text: 'Blood Glucose',
          },
          subject: { reference: patientRef, display: patientDisplay },
          encounter: { reference: encounterRef },
          effectiveDateTime,
          valueQuantity: {
            value: vital.bloodGlucose,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL',
          },
        });
      }
    }

    return observations;
  }

  /**
   * Map medications/prescriptions to FHIR R4 MedicationRequest resources
   */
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

    const medicationRequests: FhirMedicationRequest[] = [];
    const patientRef = `Patient/${patientId}`;

    for (const prescription of prescriptions) {
      const patientDisplay = `${prescription.patient.firstName} ${prescription.patient.lastName}`;

      for (const med of prescription.medications) {
        const request: FhirMedicationRequest = {
          resourceType: 'MedicationRequest',
          id: med.id,
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: {
            coding: [],
            text: med.name,
          },
          subject: { reference: patientRef, display: patientDisplay },
          encounter: { reference: `Encounter/${prescription.appointmentId}` },
          authoredOn: prescription.createdAt.toISOString(),
          requester: {
            reference: `Practitioner/${prescription.doctorId}`,
            display: prescription.doctor.name,
          },
          dosageInstruction: [
            {
              text: `${med.dosage} ${med.route} ${med.frequency} for ${med.duration}`,
              route: {
                coding: [
                  {
                    system: 'http://snomed.info/sct',
                    code: this.getRouteCode(med.route),
                    display: med.route,
                  },
                ],
              },
            },
          ],
        };

        // Add NDC code if available
        const ndcCode = (med as any).ndcCode;
        if (ndcCode && request.medicationCodeableConcept?.coding) {
          request.medicationCodeableConcept.coding.push({
            system: 'http://hl7.org/fhir/sid/ndc',
            code: ndcCode,
            display: med.name,
          });
        }

        // Add RxNorm code if available
        const rxNormCui = (med as any).rxNormCui;
        if (rxNormCui && request.medicationCodeableConcept?.coding) {
          request.medicationCodeableConcept.coding.push({
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: rxNormCui,
            display: med.name,
          });
        }

        // Add dispense request if quantity/refills available
        const quantity = (med as any).quantity;
        const refillsAllowed = (med as any).refillsAllowed;
        if (quantity || refillsAllowed) {
          request.dispenseRequest = {};
          if (quantity) {
            request.dispenseRequest.quantity = {
              value: quantity,
              unit: 'units',
            };
          }
          if (refillsAllowed) {
            request.dispenseRequest.numberOfRepeatsAllowed = refillsAllowed;
          }
        }

        medicationRequests.push(request);
      }
    }

    return medicationRequests;
  }

  /**
   * Map diagnoses/conditions to FHIR R4 Condition resources
   */
  async getConditions(
    patientId: string,
    clinicId: string,
  ): Promise<FhirCondition[]> {
    // Get from PatientMedicalCondition
    const conditions = await this.prisma.patientMedicalCondition.findMany({
      where: {
        patientId,
        patient: { clinicId },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    // Get from appointment diagnoses
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
          select: {
            id: true,
            startTime: true,
            patient: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const fhirConditions: FhirCondition[] = [];
    const patientRef = `Patient/${patientId}`;

    // Map medical conditions
    for (const condition of conditions) {
      const patientDisplay = `${condition.patient.firstName} ${condition.patient.lastName}`;

      const fhirCondition: FhirCondition = {
        resourceType: 'Condition',
        id: condition.id,
        clinicalStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: this.mapConditionStatus(condition.status),
              display: condition.status,
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/condition-ver-status',
              code: 'confirmed',
              display: 'Confirmed',
            },
          ],
        },
        category: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/condition-category',
                code: this.mapConditionCategory(condition.conditionType),
                display: condition.conditionType,
              },
            ],
          },
        ],
        code: {
          coding: [],
          text: condition.conditionName,
        },
        subject: { reference: patientRef, display: patientDisplay },
        recordedDate: condition.createdAt.toISOString(),
      };

      // Add ICD code if available
      if (condition.icdCode && fhirCondition.code?.coding) {
        fhirCondition.code.coding.push({
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: condition.icdCode,
          display: condition.conditionName,
        });
      }

      // Add onset date
      if (condition.diagnosedDate) {
        fhirCondition.onsetDateTime = condition.diagnosedDate.toISOString();
      }

      // Add abatement date if resolved
      if (condition.resolvedDate) {
        fhirCondition.abatementDateTime = condition.resolvedDate.toISOString();
      }

      // Add severity
      if (condition.severity) {
        fhirCondition.severity = {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: this.mapSeverityCode(condition.severity),
              display: condition.severity,
            },
          ],
        };
      }

      // Add notes
      if (condition.notes) {
        fhirCondition.note = [{ text: condition.notes }];
      }

      fhirConditions.push(fhirCondition);
    }

    // Map appointment diagnoses
    for (const diagnosis of diagnoses) {
      if (!diagnosis.icdCode) continue;

      const patientDisplay = `${diagnosis.appointment.patient.firstName} ${diagnosis.appointment.patient.lastName}`;

      fhirConditions.push({
        resourceType: 'Condition',
        id: diagnosis.id,
        clinicalStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active',
              display: 'Active',
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/condition-ver-status',
              code: 'confirmed',
              display: 'Confirmed',
            },
          ],
        },
        category: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/condition-category',
                code: diagnosis.isPrimary
                  ? 'problem-list-item'
                  : 'encounter-diagnosis',
                display: diagnosis.isPrimary
                  ? 'Problem List Item'
                  : 'Encounter Diagnosis',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: diagnosis.icdCode.code,
              display: diagnosis.icdCode.description,
            },
          ],
          text: diagnosis.icdCode.description,
        },
        subject: { reference: patientRef, display: patientDisplay },
        encounter: { reference: `Encounter/${diagnosis.appointment.id}` },
        recordedDate: diagnosis.createdAt.toISOString(),
        note: diagnosis.notes ? [{ text: diagnosis.notes }] : undefined,
      });
    }

    return fhirConditions;
  }

  /**
   * Map allergies to FHIR R4 AllergyIntolerance resources
   */
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

    return allergies.map((allergy) => {
      const patientDisplay = `${allergy.patient.firstName} ${allergy.patient.lastName}`;

      const categoryMap: Record<
        string,
        'food' | 'medication' | 'environment' | 'biologic'
      > = {
        DRUG: 'medication',
        FOOD: 'food',
        ENVIRONMENTAL: 'environment',
        LATEX: 'environment',
        INSECT: 'environment',
        CONTRAST: 'medication',
        OTHER: 'environment',
      };

      const criticalityMap: Record<
        string,
        'low' | 'high' | 'unable-to-assess'
      > = {
        MILD: 'low',
        MODERATE: 'low',
        SEVERE: 'high',
        LIFE_THREATENING: 'high',
      };

      const fhirAllergy: FhirAllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: allergy.id,
        clinicalStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
              code: 'active',
              display: 'Active',
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
              code: allergy.isVerified ? 'confirmed' : 'unconfirmed',
              display: allergy.isVerified ? 'Confirmed' : 'Unconfirmed',
            },
          ],
        },
        type: 'allergy',
        category: [categoryMap[allergy.allergyType] || 'environment'],
        criticality: criticalityMap[allergy.severity] || 'unable-to-assess',
        code: {
          coding: [],
          text: allergy.allergen,
        },
        patient: { reference: `Patient/${patientId}`, display: patientDisplay },
        recordedDate: allergy.createdAt.toISOString(),
      };

      // Add onset date
      if (allergy.onsetDate) {
        fhirAllergy.onsetDateTime = allergy.onsetDate.toISOString();
      }

      // Add reaction
      if (allergy.reaction) {
        const severityMap: Record<string, 'mild' | 'moderate' | 'severe'> = {
          MILD: 'mild',
          MODERATE: 'moderate',
          SEVERE: 'severe',
          LIFE_THREATENING: 'severe',
        };

        fhirAllergy.reaction = [
          {
            manifestation: [
              {
                coding: [],
                text: allergy.reaction,
              },
            ],
            severity: severityMap[allergy.severity] || 'moderate',
          },
        ];
      }

      return fhirAllergy;
    });
  }

  /**
   * Get complete patient bundle with all resources
   */
  async getPatientBundle(
    patientId: string,
    clinicId: string,
  ): Promise<FhirBundle> {
    const [patient, observations, medicationRequests, conditions, allergies] =
      await Promise.all([
        this.getPatientResource(patientId, clinicId),
        this.getVitalSignObservations(patientId, clinicId),
        this.getMedicationRequests(patientId, clinicId),
        this.getConditions(patientId, clinicId),
        this.getAllergyIntolerances(patientId, clinicId),
      ]);

    const entries: Array<{ fullUrl: string; resource: FhirResource }> = [
      { fullUrl: `Patient/${patient.id}`, resource: patient },
    ];

    // Add observations
    for (const obs of observations) {
      entries.push({ fullUrl: `Observation/${obs.id}`, resource: obs });
    }

    // Add medication requests
    for (const med of medicationRequests) {
      entries.push({ fullUrl: `MedicationRequest/${med.id}`, resource: med });
    }

    // Add conditions
    for (const condition of conditions) {
      entries.push({
        fullUrl: `Condition/${condition.id}`,
        resource: condition,
      });
    }

    // Add allergies
    for (const allergy of allergies) {
      entries.push({
        fullUrl: `AllergyIntolerance/${allergy.id}`,
        resource: allergy,
      });
    }

    return {
      resourceType: 'Bundle',
      id: `patient-bundle-${patientId}`,
      type: 'collection',
      timestamp: new Date().toISOString(),
      total: entries.length,
      entry: entries,
    };
  }

  // Helper methods
  private getRouteCode(route: string): string {
    const routeCodes: Record<string, string> = {
      PO: '26643006',
      IV: '47625008',
      IM: '78421000',
      SC: '34206005',
      TOP: '6064005',
      INH: '18679011000001101',
      SL: '37839007',
      NAS: '46713006',
      OPH: '54485002',
      OT: '10547007',
      PR: '37161004',
      TD: '45890007',
      BUC: '372449004',
      PV: '16857009',
      NEB: '46713006',
    };
    return routeCodes[route] || '26643006';
  }

  private mapConditionStatus(status: string): string {
    const statusMap: Record<string, string> = {
      ACTIVE: 'active',
      MANAGED: 'active',
      RESOLVED: 'resolved',
      IN_REMISSION: 'remission',
    };
    return statusMap[status] || 'active';
  }

  private mapConditionCategory(type: string): string {
    const categoryMap: Record<string, string> = {
      CHRONIC: 'problem-list-item',
      ACUTE: 'encounter-diagnosis',
      CONGENITAL: 'problem-list-item',
      INFECTIOUS: 'encounter-diagnosis',
      AUTOIMMUNE: 'problem-list-item',
      PSYCHIATRIC: 'problem-list-item',
      OTHER: 'encounter-diagnosis',
    };
    return categoryMap[type] || 'encounter-diagnosis';
  }

  private mapSeverityCode(severity: string): string {
    const severityCodes: Record<string, string> = {
      MILD: '255604002',
      MODERATE: '6736007',
      SEVERE: '24484000',
      CRITICAL: '442452003',
    };
    return severityCodes[severity] || '6736007';
  }
}
