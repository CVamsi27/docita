import { DATE_FORMATS, formatDate } from '@workspace/utils';
import { BaseDocumentBuilder } from './base-document.builder';

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PrescriptionData {
  prescriptionNumber: string;
  date: Date;
  clinic: {
    name: string;
    address: string;
    phone: string;
  };
  doctor: {
    name: string;
    qualification: string;
    registrationNumber: string;
  };
  patient: {
    name: string;
    age: number;
    gender: string;
    phone: string;
  };
  diagnosis: string;
  medications: Medication[];
  additionalNotes?: string;
}

export class PrescriptionDocumentBuilder extends BaseDocumentBuilder {
  buildFromData(data: PrescriptionData): this {
    this.addHeading(data.clinic.name, 1)
      .addParagraph(data.clinic.address)
      .addParagraph(`Phone: ${data.clinic.phone}`)

      .addHeading(`Prescription #${data.prescriptionNumber}`, 2)
      .addParagraph(`Date: ${formatDate(data.date, DATE_FORMATS.DATE_MEDIUM)}`)

      .addHeading('Prescribed By', 2)
      .addParagraph(data.doctor.name)
      .addParagraph(`Qualification: ${data.doctor.qualification}`)
      .addParagraph(`Reg. No: ${data.doctor.registrationNumber}`)

      .addHeading('Patient Details', 2)
      .addParagraph(`Name: ${data.patient.name}`)
      .addParagraph(`Age: ${data.patient.age} years`)
      .addParagraph(`Gender: ${data.patient.gender}`)
      .addParagraph(`Phone: ${data.patient.phone}`)

      .addHeading('Diagnosis', 2)
      .addParagraph(data.diagnosis)

      .addHeading('Medications', 2);

    const medicationList = data.medications.map(
      (m) =>
        `${m.name} - ${m.dosage}, ${m.frequency} for ${m.duration}${m.instructions ? ` (${m.instructions})` : ''}`,
    );
    this.addList(medicationList);

    if (data.additionalNotes) {
      this.addHeading('Additional Notes', 2).addParagraph(data.additionalNotes);
    }

    return this;
  }
}
