import { describe, expect, it } from '@jest/globals';
import type { ParsedMedicalFields } from '@workspace/types';
import {
  extractEmail,
  extractEmergencyContact,
  extractPhoneNumber,
} from './contact-parsers';

function makeFields(): ParsedMedicalFields {
  return {
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    mrn: '',
    age: '',
    gender: 'MALE',
    address: '',
    preferredName: '',
    pronouns: '',
    preferredLanguage: '',
    emergencyContact: { name: '', phoneNumber: '', relation: '' },
    clinicName: '',
    doctorName: '',
    invoiceDate: '',
    admissionDate: '',
    visitDate: '',
    dateOfBirth: '',
    invoice: { items: [], total: 0, tax: 0, discount: 0, subtotal: 0 },
    vitals: { bp: '', temp: '', pulse: '', spO2: '' },
    labValues: { hemoglobin: '', glucose: '', creatinine: '' },
    medications: [],
    diagnosis: '',
  } as unknown as ParsedMedicalFields;
}

describe('extractPhoneNumber', () => {
  it('extracts a 10-digit Indian phone number', () => {
    const f = makeFields();
    extractPhoneNumber('Phone: 9876543210', f);
    expect(f.phoneNumber).toBe('9876543210');
  });

  it('does not overwrite an existing phone number', () => {
    const f = makeFields();
    f.phoneNumber = '1111111111';
    extractPhoneNumber('Phone: 9876543210', f);
    expect(f.phoneNumber).toBe('1111111111');
  });
});

describe('extractEmail', () => {
  it('extracts an email address', () => {
    const f = makeFields();
    extractEmail('Email: user@example.com', f);
    expect(f.email).toBe('user@example.com');
  });

  it('does not overwrite an existing email', () => {
    const f = makeFields();
    f.email = 'primary@example.com';
    extractEmail('Email: other@example.com', f);
    expect(f.email).toBe('primary@example.com');
  });
});

describe('extractEmergencyContact', () => {
  it('extracts name and phone when both present', () => {
    const f = makeFields();
    extractEmergencyContact('Emergency Contact: John Doe - 9876543210', f);
    expect(f.emergencyContact?.name).toBe('John Doe');
    expect(f.emergencyContact?.phoneNumber).toBe('9876543210');
  });

  it('extracts name only when no phone', () => {
    const f = makeFields();
    extractEmergencyContact('Emergency: Mary Smith', f);
    expect(f.emergencyContact?.name).toBe('Mary Smith');
    expect(f.emergencyContact?.phoneNumber).toBe('');
  });
});
