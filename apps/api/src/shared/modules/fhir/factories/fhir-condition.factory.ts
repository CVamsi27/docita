import { getPatientFullName } from '@workspace/utils';
import { Injectable } from '@nestjs/common';
import { PatientMedicalCondition, Diagnosis, IcdCode } from '@workspace/db';
import { FhirCondition } from '@/shared/modules/fhir/interfaces/fhir.interfaces';

type MedicalConditionWithRelations = PatientMedicalCondition & {
  patient: { firstName: string; lastName: string };
};

type DiagnosisWithRelations = Diagnosis & {
  icdCode: Pick<IcdCode, 'code' | 'description'> | null;
  appointment: {
    id: string;
    patientId: string;
    patient: { firstName: string; lastName: string };
  };
};

type FhirCoding = { system: string; code: string; display: string };

@Injectable()
export class FhirConditionFactory {
  /**
   * Builds the `{ coding: [{ system, code, display }] }` shape shared by
   * `clinicalStatus`, `verificationStatus`, `severity`, and (wrapped in an
   * array) `category` across both condition and diagnosis FHIR resources —
   * keeping the single-coding envelope in one place avoids the four call
   * sites drifting on structure while their `system`/`code`/`display`
   * values legitimately differ.
   */
  private buildCodingBlock(
    system: string,
    code: string,
    display: string,
  ): { coding: FhirCoding[] } {
    return { coding: [{ system, code, display }] };
  }

  createFromConditions(
    conditions: MedicalConditionWithRelations[],
  ): FhirCondition[] {
    const fhirConditions: FhirCondition[] = [];

    for (const condition of conditions) {
      const patientId = condition.patientId;
      const patientRef = `Patient/${patientId}`;
      const patientDisplay = getPatientFullName(condition.patient);

      const fhirCondition: FhirCondition = {
        resourceType: 'Condition',
        id: condition.id,
        clinicalStatus: this.buildCodingBlock(
          'http://terminology.hl7.org/CodeSystem/condition-clinical',
          this.mapConditionStatus(condition.status),
          condition.status,
        ),
        verificationStatus: this.buildVerificationStatus(),
        category: [
          this.buildCodingBlock(
            'http://terminology.hl7.org/CodeSystem/condition-category',
            this.mapConditionCategory(condition.conditionType),
            condition.conditionType,
          ),
        ],
        code: {
          coding: [],
          text: condition.conditionName,
        },
        subject: { reference: patientRef, display: patientDisplay },
        recordedDate: condition.createdAt.toISOString(),
      };

      if (condition.icdCode && fhirCondition.code?.coding) {
        fhirCondition.code.coding.push({
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: condition.icdCode,
          display: condition.conditionName,
        });
      }

      if (condition.diagnosedDate) {
        fhirCondition.onsetDateTime = condition.diagnosedDate.toISOString();
      }

      if (condition.resolvedDate) {
        fhirCondition.abatementDateTime = condition.resolvedDate.toISOString();
      }

      if (condition.severity) {
        fhirCondition.severity = this.buildCodingBlock(
          'http://snomed.info/sct',
          this.mapSeverityCode(condition.severity),
          condition.severity,
        );
      }

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

      const _patientId = diagnosis.appointment.patientId;
      const patientRef = `Patient/${diagnosis.appointment.patientId}`;
      const patientDisplay = getPatientFullName(diagnosis.appointment.patient);

      fhirConditions.push({
        resourceType: 'Condition',
        id: diagnosis.id,
        clinicalStatus: this.buildCodingBlock(
          'http://terminology.hl7.org/CodeSystem/condition-clinical',
          'active',
          'Active',
        ),
        verificationStatus: this.buildVerificationStatus(),
        category: [
          this.buildCodingBlock(
            'http://terminology.hl7.org/CodeSystem/condition-category',
            diagnosis.isPrimary ? 'problem-list-item' : 'encounter-diagnosis',
            diagnosis.isPrimary ? 'Problem List Item' : 'Encounter Diagnosis',
          ),
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

  private buildVerificationStatus(): FhirCondition['verificationStatus'] {
    return this.buildCodingBlock(
      'http://terminology.hl7.org/CodeSystem/condition-ver-status',
      'confirmed',
      'Confirmed',
    );
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
