import {
  extractClinicName,
  extractDoctorName,
  extractDates,
  extractMrn,
} from './document-parsers';
import { createEmptyFields } from './test-helpers';

describe('extractClinicName', () => {
  it('extracts hospital name', () => {
    const fields = createEmptyFields();
    extractClinicName('Hospital: City Medical Center', fields);
    expect(fields.clinicName).toBe('City Medical Center');
  });

  it('extracts clinic name', () => {
    const fields = createEmptyFields();
    extractClinicName('Clinic: Health Plus', fields);
    expect(fields.clinicName).toBe('Health Plus');
  });

  it('does not overwrite existing clinic name', () => {
    const fields = createEmptyFields();
    fields.clinicName = 'Existing Clinic';
    extractClinicName('Hospital: New Hospital', fields);
    expect(fields.clinicName).toBe('Existing Clinic');
  });

  it('does nothing when no clinic keyword found', () => {
    const fields = createEmptyFields();
    extractClinicName('No match here at all', fields);
    expect(fields.clinicName).toBe('');
  });
});

describe('extractDoctorName', () => {
  it('extracts doctor name with Dr prefix', () => {
    const fields = createEmptyFields();
    extractDoctorName('Doctor: Dr. Smith', fields);
    expect(fields.doctorName).toBe('Dr. Smith');
  });

  it('does not overwrite existing doctor name', () => {
    const fields = createEmptyFields();
    fields.doctorName = 'Existing Doctor';
    extractDoctorName('Doctor: New Doctor', fields);
    expect(fields.doctorName).toBe('Existing Doctor');
  });

  it('does nothing when no doctor keyword found', () => {
    const fields = createEmptyFields();
    extractDoctorName('No match here', fields);
    expect(fields.doctorName).toBe('');
  });
});

describe('extractDates', () => {
  it('extracts date of birth', () => {
    const fields = createEmptyFields();
    extractDates('DOB: 15-03-1990', fields);
    expect(fields.dateOfBirth).toBe('15-03-1990');
  });

  it('extracts visit date', () => {
    const fields = createEmptyFields();
    extractDates('Visit Date: 20/07/2026', fields);
    expect(fields.visitDate).toBe('20/07/2026');
  });

  it('extracts admission date', () => {
    const fields = createEmptyFields();
    extractDates('Admission: 01-06-2026', fields);
    expect(fields.admissionDate).toBe('01-06-2026');
  });

  it('extracts invoice date', () => {
    const fields = createEmptyFields();
    extractDates('Invoice Date: 15/07/2026', fields);
    expect(fields.invoiceDate).toBe('15/07/2026');
  });

  it('does not overwrite existing visit date', () => {
    const fields = createEmptyFields();
    fields.visitDate = '01/01/2026';
    extractDates('Date: 15/07/2026', fields);
    expect(fields.visitDate).toBe('01/01/2026');
  });

  it('does nothing when no date found', () => {
    const fields = createEmptyFields();
    extractDates('No date here', fields);
    expect(fields.visitDate).toBe('');
  });
});

describe('extractMrn', () => {
  it('extracts MRN', () => {
    const fields = createEmptyFields();
    extractMrn('MRN: ABC-12345', fields);
    expect(fields.mrn).toBe('ABC-12345');
  });

  it('extracts medical record number', () => {
    const fields = createEmptyFields();
    extractMrn('Medical Record Number: 98765', fields);
    expect(fields.mrn).toBe('98765');
  });

  it('does nothing when no MRN keyword found', () => {
    const fields = createEmptyFields();
    extractMrn('No match here', fields);
    expect(fields.mrn).toBe('');
  });
});
