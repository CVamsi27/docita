import { Injectable } from '@nestjs/common';
import { Prescription, Medication, User } from '@workspace/db';
import { FhirMedicationRequest } from '../interfaces/fhir.interfaces';

type PrescriptionWithRelations = Prescription & {
  medications: Medication[];
  patient: { firstName: string; lastName: string };
  doctor: { id: string; name: string };
};

@Injectable()
export class FhirMedicationFactory {
  createMany(
    prescriptions: PrescriptionWithRelations[],
  ): FhirMedicationRequest[] {
    const medicationRequests: FhirMedicationRequest[] = [];

    for (const prescription of prescriptions) {
      const patientRef = `Patient/${prescription.patientId}`;
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
        if (med.ndcCode && request.medicationCodeableConcept?.coding) {
          request.medicationCodeableConcept.coding.push({
            system: 'http://hl7.org/fhir/sid/ndc',
            code: med.ndcCode,
            display: med.name,
          });
        }

        // Add RxNorm code if available
        if (med.rxNormCui && request.medicationCodeableConcept?.coding) {
          request.medicationCodeableConcept.coding.push({
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: med.rxNormCui,
            display: med.name,
          });
        }

        // Add dispense request if quantity/refills available
        if (med.quantity || med.refillsAllowed) {
          request.dispenseRequest = {};
          if (med.quantity) {
            request.dispenseRequest.quantity = {
              value: med.quantity,
              unit: 'units',
            };
          }
          if (med.refillsAllowed) {
            request.dispenseRequest.numberOfRepeatsAllowed = med.refillsAllowed;
          }
        }

        medicationRequests.push(request);
      }
    }

    return medicationRequests;
  }

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
}
