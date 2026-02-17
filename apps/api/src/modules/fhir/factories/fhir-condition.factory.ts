import { Injectable } from '@nestjs/common';
import {
  PatientMedicalCondition,
  Diagnosis,
  Appointment,
  Patient,
  IcdCode,
} from '@workspace/db';
import { FhirCondition } from '../interfaces/fhir.interfaces';

type MedicalConditionWithRelations = PatientMedicalCondition & {
  patient: { firstName: string; lastName: string };
};

type DiagnosisWithRelations = Diagnosis & {
  icdCode: IcdCode;
  appointment: Appointment & {
    patient: { firstName: string; lastName: string };
  };
};

@Injectable()
export class FhirConditionFactory {
  createFromConditions(
    conditions: MedicalConditionWithRelations[],
  ): FhirCondition[] {
    const fhirConditions: FhirCondition[] = [];

    for (const condition of conditions) {
      const patientId = condition.patientId;
      const patientRef = `Patient/${patientId}`;
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
    return fhirConditions;
  }

  createFromDiagnoses(diagnoses: DiagnosisWithRelations[]): FhirCondition[] {
    const fhirConditions: FhirCondition[] = [];

    for (const diagnosis of diagnoses) {
      if (!diagnosis.icdCode) continue;

      const patientId = diagnosis.appointment.patientId; // Assuming implicit or explicit relation
      const patientRef = `Patient/${diagnosis.appointment.patientId}`;
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
