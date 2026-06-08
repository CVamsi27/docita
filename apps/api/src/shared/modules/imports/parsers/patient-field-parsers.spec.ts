import { describe, expect, it } from '@jest/globals';
import type { ParsedMedicalFields } from '@workspace/types';
import {
  extractAddress,
  extractAge,
  extractEthnicity,
  extractGender,
  extractLanguage,
  extractMaritalStatus,
  extractPatientName,
  extractPreferredName,
  extractPronouns,
  extractRace,
} from './patient-field-parsers';

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
    maritalStatus: '',
    preferredLanguage: '',
    race: '',
    ethnicity: '',
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

describe('extractPatientName', () => {
  it("extracts name from 'Name: Asha Rao' pattern", () => {
    const f = makeFields();
    extractPatientName('Name: Asha Rao', 'name: asha rao', f);
    expect(f.firstName).toBe('Asha');
    expect(f.lastName).toBe('Rao');
  });

  it('falls back to capitalized line pattern when no prefix', () => {
    const f = makeFields();
    extractPatientName('John Smith', 'john smith', f);
    expect(f.firstName).toBe('John');
    expect(f.lastName).toBe('Smith');
  });
});

describe('extractGender', () => {
  it('sets FEMALE for explicit f/female pattern', () => {
    const f = makeFields();
    extractGender('Sex: F', 'sex: f', f);
    expect(f.gender).toBe('FEMALE');
  });

  it('sets MALE for explicit m/male pattern', () => {
    const f = makeFields();
    extractGender('Gender: M', 'gender: m', f);
    expect(f.gender).toBe('MALE');
  });
});

describe('extractAge', () => {
  it("extracts age with 'age' prefix", () => {
    const f = makeFields();
    extractAge('Age: 35', f);
    expect(f.age).toBe('35');
  });

  it("extracts age with 'yrs' prefix", () => {
    const f = makeFields();
    extractAge('yrs 42', f);
    expect(f.age).toBe('42');
  });
});

describe('extractAddress', () => {
  it('extracts address when longer than 5 chars', () => {
    const f = makeFields();
    extractAddress('address: 123 Main Street, City', f);
    expect(f.address).toBe('123 Main Street, City');
  });

  it('ignores address shorter than 5 chars', () => {
    const f = makeFields();
    extractAddress('address: 12', f);
    expect(f.address).toBe('');
  });
});

describe('extractMaritalStatus', () => {
  it('extracts marital status', () => {
    const f = makeFields();
    extractMaritalStatus('Marital Status: Single', f);
    expect(f.maritalStatus).toBe('Single');
  });
});

describe('extractLanguage', () => {
  it('extracts preferred language', () => {
    const f = makeFields();
    extractLanguage('Language: English', f);
    expect(f.preferredLanguage).toBe('English');
  });
});

describe('extractRace', () => {
  it('extracts race', () => {
    const f = makeFields();
    extractRace('Race: Asian', f);
    expect(f.race).toBe('Asian');
  });
});

describe('extractEthnicity', () => {
  it('extracts ethnicity', () => {
    const f = makeFields();
    extractEthnicity('Ethnicity: Indian', f);
    expect(f.ethnicity).toBe('Indian');
  });
});

describe('extractPreferredName', () => {
  it("extracts preferred name from 'alias' prefix", () => {
    const f = makeFields();
    extractPreferredName('Alias: Ash', f);
    expect(f.preferredName).toBe('Ash');
  });
});

describe('extractPronouns', () => {
  it('extracts pronouns', () => {
    const f = makeFields();
    extractPronouns('Pronouns: she/her', f);
    expect(f.pronouns).toBe('she/her');
  });
});
