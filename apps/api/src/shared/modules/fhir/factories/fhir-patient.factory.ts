import { Injectable } from '@nestjs/common';
import { Patient } from '@workspace/db';
import { FhirPatient } from '@/shared/modules/fhir/interfaces/fhir.interfaces';

@Injectable()
export class FhirPatientFactory {
  create(patient: Patient): FhirPatient {
    const identifier: NonNullable<FhirPatient['identifier']> = [];
    const telecom: NonNullable<FhirPatient['telecom']> = [];
    const extension: NonNullable<FhirPatient['extension']> = [];

    if (patient.mrn) {
      identifier.push({
        use: 'usual',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0003',
              code: 'MR',
              display: 'Medical Record Number',
            },
          ],
        },
        value: patient.mrn,
      });
    }

    if (patient.phoneNumber) {
      telecom.push({
        system: 'phone',
        value: patient.phoneNumber,
        use: 'mobile',
      });
    }

    if (patient.email) {
      telecom.push({
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
    const gender = genderMap[patient.gender] || 'unknown';

    const address = patient.address
      ? [
          {
            use: 'home' as const,
            text: patient.address,
          },
        ]
      : undefined;

    if (patient.race) {
      extension.push({
        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
        valueString: patient.race,
      });
    }

    if (patient.ethnicity) {
      extension.push({
        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
        valueString: patient.ethnicity,
      });
    }

    const communication = patient.preferredLanguage
      ? [
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
        ]
      : undefined;

    const contact = patient.emergencyContactName
      ? [
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
        ]
      : undefined;

    return {
      resourceType: 'Patient',
      id: patient.id,
      meta: {
        lastUpdated: patient.updatedAt.toISOString(),
        profile: [
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient',
        ],
      },
      identifier,
      active: true,
      name: [
        {
          use: 'official',
          family: patient.lastName,
          given: [patient.firstName],
        },
      ],
      telecom,
      birthDate: patient.dateOfBirth.toISOString().split('T')[0],
      extension,
      gender,
      address,
      communication,
      contact,
    };
  }
}
