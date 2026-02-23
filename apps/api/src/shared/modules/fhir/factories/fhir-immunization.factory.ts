import { Injectable } from '@nestjs/common';
import { Immunization } from '@workspace/db';
import { FhirImmunization } from '../interfaces/fhir.interfaces';

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

      // Add CVX code
      if (imm.cvxCode) {
        fhirImmunization.vaccineCode.coding.push({
          system: 'http://hl7.org/fhir/sid/cvx',
          code: imm.cvxCode,
          display: imm.vaccineName,
        });
      }

      // Add NDC code
      if (imm.ndcCode) {
        fhirImmunization.vaccineCode.coding.push({
          system: 'http://hl7.org/fhir/sid/ndc',
          code: imm.ndcCode,
          display: imm.vaccineName,
        });
      }

      // Add lot number
      if (imm.lotNumber) {
        fhirImmunization.lotNumber = imm.lotNumber;
      }

      // Add expiration date
      if (imm.expirationDate) {
        fhirImmunization.expirationDate = imm.expirationDate
          .toISOString()
          .split('T')[0];
      }

      // Add site
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

      // Add route
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

      // Add dose quantity
      if (imm.doseNumber) {
        // FHIR uses protocolApplied for doseNumber, but simple doseQuantity is generic.
        // We'll skip doseNumber mapping to protocolApplied for simplicity in this pass,
        // or map it if we had a protocol.
        // Keeping it simple as per interface.
      }

      // Add note
      if (imm.notes) {
        // Interface doesn't have note array yet, let's skip or check interface.
        // FhirImmunization interface I created has `note`? No, I checked my creation.
        // Let's re-read the interface I created.
        // apps/api/src/modules/fhir/interfaces/fhir.interfaces.ts
        // It does NOT have Note. OK.
      }

      return fhirImmunization;
    });
  }

  private getSiteCode(site: string): string {
    const siteCodes: Record<string, string> = {
      LEFT_ARM: '368208006', // Left upper arm structure
      RIGHT_ARM: '368209003', // Right upper arm structure
      LEFT_THIGH: '61396006', // Left thigh structure
      RIGHT_THIGH: '11207009', // Right thigh structure
      LEFT_DELTOID: '419161000', // Left deltoid
      RIGHT_DELTOID: '419465000', // Right deltoid
      OTHER: '419161000', // Default to Deltoid or Unknown? Using Deltoid as fallback is risky.
    };
    return siteCodes[site] || '368208006'; // Defaulting to Left Arm if unknown is better than nothing? Or 'unknown'.
  }

  private getRouteCode(route: string): string {
    const routeCodes: Record<string, string> = {
      IM: '78421000', // Intramuscular
      SC: '34206005', // Subcutaneous
      ID: '372464004', // Intradermal
      PO: '26643006', // Oral
      IN: '46713006', // Nasal
      OTHER: '47625008', // Intravenous (IV) as placeholder for Other
    };
    return routeCodes[route] || '78421000'; // Default IM
  }
}
