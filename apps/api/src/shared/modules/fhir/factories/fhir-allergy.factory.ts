import { getPatientFullName } from '@workspace/utils';
import { Injectable } from '@nestjs/common';
import { PatientAllergy } from '@workspace/db';
import { FhirAllergyIntolerance } from '@/shared/modules/fhir/interfaces/fhir.interfaces';

type AllergyWithRelations = PatientAllergy & {
  patient: { firstName: string; lastName: string };
};

@Injectable()
export class FhirAllergyFactory {
  createMany(allergies: AllergyWithRelations[]): FhirAllergyIntolerance[] {
    return allergies.map((allergy) => {
      const patientId = allergy.patientId;
      const patientDisplay = getPatientFullName(allergy.patient);

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

      if (allergy.onsetDate) {
        fhirAllergy.onsetDateTime = allergy.onsetDate.toISOString();
      }

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
}
