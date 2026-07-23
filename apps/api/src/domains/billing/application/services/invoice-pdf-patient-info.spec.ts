import type { InvoiceDetail } from '@/domains/billing/core/repositories/invoice.repository';
import { buildPdfPatientInfo } from './invoice-pdf-patient-info';

describe('buildPdfPatientInfo', () => {
  it('maps patient fields correctly with full name', () => {
    const patient = {
      id: 'pat-1234567890',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '1234567890',
      email: 'john@example.com',
      address: '456 Oak Ave',
    };
    const result = buildPdfPatientInfo(patient as NonNullable<InvoiceDetail['patient']>);
    expect(result.name).toBe('John Doe');
    expect(result.phoneNumber).toBe('1234567890');
    expect(result.email).toBe('john@example.com');
    expect(result.address).toBe('456 Oak Ave');
    expect(result.patientId).toBe('PAT-1234');
  });

  it('handles missing optional fields', () => {
    const patient = {
      id: 'pat-abc',
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: null,
      email: null,
      address: null,
    };
    const result = buildPdfPatientInfo(patient as NonNullable<InvoiceDetail['patient']>);
    expect(result.phoneNumber).toBe('');
    expect(result.email).toBeUndefined();
    expect(result.address).toBeUndefined();
  });

  it('uses getPatientFullName for name composition', () => {
    const patient = {
      id: 'pat-1',
      firstName: 'Alice',
      lastName: 'Wonderland',
      phoneNumber: null,
      email: null,
      address: null,
    };
    const result = buildPdfPatientInfo(patient as NonNullable<InvoiceDetail['patient']>);
    expect(result.name).toBe('Alice Wonderland');
  });

  it('truncates patient ID to first 8 characters uppercased', () => {
    const patient = {
      id: 'pat-very-long-id-here',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: null,
      email: null,
      address: null,
    };
    const result = buildPdfPatientInfo(patient as NonNullable<InvoiceDetail['patient']>);
    expect(result.patientId).toBe('PAT-VERY');
  });

  it('handles single-word names', () => {
    const patient = {
      id: 'pat-1',
      firstName: 'Cher',
      lastName: '',
      phoneNumber: null,
      email: null,
      address: null,
    };
    const result = buildPdfPatientInfo(patient as NonNullable<InvoiceDetail['patient']>);
    expect(result.name).toBe('Cher');
  });
});
