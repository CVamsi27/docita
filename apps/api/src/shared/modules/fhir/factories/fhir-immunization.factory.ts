import { Injectable } from '@nestjs/common';
import { Immunization } from '@workspace/db';
import { FhirImmunization } from '@/shared/modules/fhir/interfaces/fhir.interfaces';

@Injectable()
export class FhirImmunizationFactory {
  createMany(immunizations: Immunization[]): FhirImmunization[] {
    return immunizations.map((imm) => {
      const fhirImmunization: FhirImmunization = {
        resourceType: 'Immunization',
        id: imm.id,
        status: 'completed',
        vaccineCode: {
          coding: [],
          text: imm.vaccineName,
        },
        patient: { reference: `Patient/${imm.patientId}` },
        occurrenceDateTime: imm.administeredDate.toISOString(),
        recorded: imm.createdAt.toISOString(),
      };

      if (imm.cvxCode) {
        fhirImmunization.vaccineCode.coding.push({
          system: 'http://hl7.org/fhir/sid/cvx',
          code: imm.cvxCode,
          display: imm.vaccineName,
        });
      }

      if (imm.ndcCode) {
        fhirImmunization.vaccineCode.coding.push({
          system: 'http://hl7.org/fhir/sid/ndc',
          code: imm.ndcCode,
          display: imm.vaccineName,
        });
      }

      if (imm.lotNumber) {
        fhirImmunization.lotNumber = imm.lotNumber;
      }

      if (imm.expirationDate) {
        fhirImmunization.expirationDate = imm.expirationDate
          .toISOString()
          .split('T')[0];
      }

      if (imm.site) {
        fhirImmunization.site = {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: this.getSiteCode(imm.site),
              display: imm.site.replace('_', ' '),
            },
          ],
        };
      }

      if (imm.route) {
        fhirImmunization.route = {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: this.getRouteCode(imm.route),
              display: imm.route,
            },
          ],
        };
      }

      return fhirImmunization;
    });
  }

  private getSiteCode(site: string): string {
    const siteCodes: Record<string, string> = {
      LEFT_ARM: '368208006',
      RIGHT_ARM: '368209003',
      LEFT_THIGH: '61396006',
      RIGHT_THIGH: '11207009',
      LEFT_DELTOID: '419161000',
      RIGHT_DELTOID: '419465000',
      OTHER: '419161000',
    };
    return siteCodes[site] || '368208006';
  }

  private getRouteCode(route: string): string {
    const routeCodes: Record<string, string> = {
      IM: '78421000',
      SC: '34206005',
      ID: '372464004',
      PO: '26643006',
      IN: '46713006',
      OTHER: '47625008',
    };
    return routeCodes[route] || '78421000';
  }
}
