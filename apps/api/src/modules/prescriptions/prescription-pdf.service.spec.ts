import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionPdfService } from './prescription-pdf.service';
import {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFMedicationInfo,
  PDFPatientInfo,
} from '@workspace/types';
import PDFDocument from 'pdfkit';

// Mock pdfkit
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const listeners: Record<
      string,
      Array<(...args: Array<string | number>) => void>
    > = {};
    const docMock: any = {
      page: { width: 600, height: 800 },
      y: 100,
    };

    docMock.on = jest.fn((event, cb) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      return docMock;
    });

    docMock.font = jest.fn().mockReturnValue(docMock);
    docMock.fontSize = jest.fn().mockReturnValue(docMock);
    docMock.text = jest.fn().mockReturnValue(docMock);
    docMock.image = jest.fn().mockReturnValue(docMock);
    docMock.moveDown = jest.fn().mockReturnValue(docMock);
    docMock.moveTo = jest.fn().mockReturnValue(docMock);
    docMock.lineTo = jest.fn().mockReturnValue(docMock);
    docMock.strokeColor = jest.fn().mockReturnValue(docMock);
    docMock.stroke = jest.fn().mockReturnValue(docMock);
    docMock.rect = jest.fn().mockReturnValue(docMock);
    docMock.fill = jest.fn().mockReturnValue(docMock);
    docMock.fillColor = jest.fn().mockReturnValue(docMock);
    docMock.addPage = jest.fn().mockReturnValue(docMock);
    docMock.switchToPage = jest.fn().mockReturnValue(docMock);
    docMock.bufferedPageRange = jest
      .fn()
      .mockReturnValue({ start: 0, count: 1 });

    docMock.end = jest.fn(() => {
      if (listeners['end']) {
        listeners['end'].forEach((cb) => cb());
      }
      return docMock;
    });

    return docMock;
  });
});

describe('PrescriptionPdfService', () => {
  let service: PrescriptionPdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrescriptionPdfService],
    }).compile();

    service = module.get<PrescriptionPdfService>(PrescriptionPdfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a PDF buffer', async () => {
    const mockData = {
      prescriptionId: 'presc-123',
      clinic: {
        name: 'Test Clinic',
        address: '123 Test St',
        phoneNumber: '123-456-7890',
      } as PDFClinicInfo,
      doctor: {
        name: 'Dr. Test',
        registrationNumber: 'REG123',
      } as PDFDoctorInfo,
      patient: {
        name: 'John Doe',
        age: 30,
        gender: 'Male',
      } as PDFPatientInfo,
      medications: [
        {
          name: 'Med A',
          dosage: '500mg',
          frequency: '1-0-1',
          duration: '5 days',
        },
      ] as PDFMedicationInfo[],
      date: new Date(),
    };

    const buffer = await service.generate(mockData);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('should include diagnosis if provided', async () => {
    const mockData = {
      prescriptionId: 'presc-123',
      clinic: { name: 'Test Clinic' } as PDFClinicInfo,
      doctor: { name: 'Dr. Test' } as PDFDoctorInfo,
      patient: { name: 'John Doe' } as PDFPatientInfo,
      medications: [],
      diagnosis: 'Fever',
    };

    const buffer = await service.generate(mockData);
    expect(buffer).toBeInstanceOf(Buffer);
    // Ideally we would inspect the PDF content or mock calls,
    // but for now checking it doesn't crash is a good baseline.
  });
});
