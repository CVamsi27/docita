import { Injectable, Logger } from '@nestjs/common';
import { ParsedMedicalFields } from '@workspace/types';

import {
  extractClinicName,
  extractDoctorName,
  extractDates,
  extractMrn,
  extractPreferredName,
  extractPronouns,
  extractAddress,
  extractLanguage,
  extractEmergencyContact,
  extractInvoiceTotal,
  extractInvoiceTax,
  extractInvoiceDiscount,
  extractInvoiceSubtotal,
  extractInvoiceItems,
  extractPhoneNumber,
  extractEmail,
  extractAge,
  extractBloodType,
  extractBloodPressure,
  extractTemperature,
  extractPulse,
  extractSpO2,
  extractMedications,
  extractHemoglobin,
  extractGlucose,
  extractCreatinine,
  extractDiagnosis,
  extractPatientName,
  extractGender,
} from './text-parser.helpers';

@Injectable()
export class TextParserService {
  private readonly logger = new Logger(TextParserService.name);

  parseExtractedText(text: string): ParsedMedicalFields {
    const fields: ParsedMedicalFields = {
      firstName: '',
      lastName: '',
      mrn: '',
      preferredName: '',
      pronouns: '',
      address: '',
      preferredLanguage: '',
      age: '',
      gender: 'MALE',
      phoneNumber: '',
      email: '',
      bloodType: '',
      emergencyContact: null,
      dateOfBirth: '',
      visitDate: '',
      invoiceDate: '',
      admissionDate: '',
      clinicName: '',
      doctorName: '',
      diagnosis: '',
      symptoms: [],
      allergies: [],
      medicalHistory: [],
      medications: [],
      vitals: {
        bp: '',
        temp: '',
        pulse: '',
        respiratoryRate: '',
        spO2: '',
        glucose: '',
      },
      labValues: {
        glucose: '',
        hemoglobin: '',
        creatinine: '',
      },
      invoice: {
        total: null,
        tax: null,
        discount: null,
        subtotal: null,
        items: [],
      },
    };

    const lines = text.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      extractClinicName(line, fields);
      extractDoctorName(line, fields);
      extractDates(line, fields);
      extractMrn(line, fields);
      extractPreferredName(line, fields);
      extractPronouns(line, fields);
      extractAddress(line, fields);
      extractLanguage(line, fields);
      extractEmergencyContact(line, fields);
      extractInvoiceTotal(line, fields);
      extractInvoiceTax(line, fields);
      extractInvoiceDiscount(line, fields);
      extractInvoiceSubtotal(line, fields);
      extractInvoiceItems(line, lowerLine, fields);
      extractPhoneNumber(line, fields);
      extractEmail(line, fields);
      extractAge(line, fields);
      extractBloodType(line, fields);
      extractBloodPressure(line, fields);
      extractTemperature(line, fields);
      extractPulse(line, fields);
      extractSpO2(line, fields);
      extractMedications(line, lowerLine, fields);
      extractHemoglobin(line, lowerLine, fields);
      extractGlucose(line, lowerLine, fields);
      extractCreatinine(line, lowerLine, fields);
      extractDiagnosis(line, lowerLine, fields);
      extractPatientName(line, lowerLine, fields);
      extractGender(line, lowerLine, fields);
    }

    return fields;
  }
}
