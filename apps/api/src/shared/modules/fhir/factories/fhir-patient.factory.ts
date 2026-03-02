import { Injectable } from '@nestjs/common';
import { Patient } from '@workspace/db';
import { FhirPatient } from '@/shared/modules/fhir/interfaces/fhir.interfaces';

@Injectable()
export class FhirPatientFactory {
  create(patient: Patient): FhirPatient {
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

    if (patient.mrn) {
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
        value: patient.mrn,
      });
    }

    if (patient.phoneNumber) {
      fhirPatient.telecom!.push({
        system: 'phone',
        value: patient.phoneNumber,
        use: 'mobile',
      });
    }

    if (patient.email) {
      fhirPatient.telecom!.push({
        system: 'email',
        value: patient.email,
        use: 'home',
      });
    }

    const genderMap: Record<string, 'male' | 'female' | 'other' | 'unknown'> = {
      MALE: 'male',
      FEMALE: 'female',
      OTHER: 'other',
      INTERSEX: 'other',
      NON_BINARY: 'other',
      PREFER_NOT_TO_SAY: 'unknown',
    };
    fhirPatient.gender = genderMap[patient.gender] || 'unknown';

    if (patient.address) {
      fhirPatient.address = [
        {
          use: 'home',
          text: patient.address,
        },
      ];
    }

    if (patient.race) {
      fhirPatient.extension!.push({
        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
        valueString: patient.race,
      });
    }

    if (patient.ethnicity) {
      fhirPatient.extension!.push({
        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
        valueString: patient.ethnicity,
      });
    }

    if (patient.preferredLanguage) {
      fhirPatient.communication = [
        {
          language: {
            coding: [
              {
                system: 'urn:ietf:bcp:47',
                code: patient.preferredLanguage,
                display: patient.preferredLanguage,
              },
            ],
          },
          preferred: true,
        },
      ];
    }

    if (patient.emergencyContactName) {
      fhirPatient.contact = [
        {
          relationship: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
                  code: 'C',
                  display:
                    patient.emergencyContactRelation || 'Emergency Contact',
                },
              ],
            },
          ],
          name: {
            family: patient.emergencyContactName,
          },
          telecom: patient.emergencyContactPhone
            ? [
                {
                  system: 'phone',
                  value: patient.emergencyContactPhone,
                  use: 'mobile',
                },
              ]
            : undefined,
        },
      ];
    }

    return fhirPatient;
  }
}
