import { Test, TestingModule } from '@nestjs/testing';
import { OCRService } from './ocr.service';
import { Logger } from '@nestjs/common';

// Mock Tesseract
const mockWorker = {
  recognize: jest.fn(),
  terminate: jest.fn(),
};

const mockTesseract = {
  createWorker: jest.fn().mockResolvedValue(mockWorker),
};

jest.mock('tesseract.js', () => mockTesseract, { virtual: true });
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => {
    return {
      metadata: jest.fn().mockResolvedValue({ width: 1000, height: 1000 }),
      resize: jest.fn().mockReturnThis(),
      grayscale: jest.fn().mockReturnThis(),
      normalize: jest.fn().mockReturnThis(),
      sharpen: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-image')),
    };
  });
});
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock-file')),
  },
}));

describe('OCRService', () => {
  let service: OCRService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OCRService],
    }).compile();

    service = module.get<OCRService>(OCRService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Lifecycle', () => {
    it('should initialize worker on module init', async () => {
      await service.onModuleInit();
      expect(mockTesseract.createWorker).toHaveBeenCalled();
    });

    it('should terminate worker on module destroy', async () => {
      // Manually set worker to mock state via init
      await service.onModuleInit();
      await service.onModuleDestroy();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });

  describe('parseExtractedText', () => {
    it('should parse BP correctly', () => {
      const text = `
        Blood Pressure: 120/80 mmHg
        BP: 110 / 70
      `;
      const result = service.parseExtractedText(text);
      expect(result.vitals.bp).toBe('120/80');
    });

    it('should parse temperature correctly', () => {
      const text = `
         Temp: 98.6 F
       `;
      const result = service.parseExtractedText(text);
      expect(result.vitals.temp).toBe('98.6');
    });

    it('should parse medications with frequency', () => {
      const text = `
        Medications:
        1. Paracetamol 500mg - 1x daily
        2. Amoxicillin 250mg bd
      `;
      const result = service.parseExtractedText(text);
      expect(result.medications).toHaveLength(2);
      expect(result.medications[0].name).toBe('Paracetamol');
      expect(result.medications[0].dosage).toBe('500mg');
      expect(result.medications[0].frequency).toBe('1x daily');
    });

    it('should parse lab values', () => {
      const text = `
          Hemoglobin: 13.5 g/dL
          Fasting Blood Sugar: 95 mg/dL
       `;
      const result = service.parseExtractedText(text);
      expect(result.labValues.hemoglobin).toBe('13.5');
      expect(result.labValues.glucose).toBe('95 ');
    });

    it('should parse patient details and metadata', () => {
      const text = `
        Hospital: City General Hospital
        Doctor: Dr. Smith
        Name: John Doe
        MRN: DOC-12345
        Address: 123 Main St, Anytown
        DOB: 01/01/1980
        Visit Date: 12/12/2023
        Emergency Contact: Jane Doe 9876543210
      `;
      const result = service.parseExtractedText(text);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.mrn).toBe('DOC-12345');
      expect(result.address).toBe('123 Main St, Anytown');
      expect(result.dateOfBirth).toBe('01/01/1980');
      expect(result.visitDate).toBe('12/12/2023');
      expect(result.clinicName).toBe('City General Hospital');
      expect(result.doctorName).toBe('Dr. Smith');
      expect(result.emergencyContact).toEqual({
        name: 'Jane Doe',
        phoneNumber: '9876543210',
        relation: '',
      });
    });

    it('should parse invoice data', () => {
      const text = `
        Invoice Date: 01/01/2024
        Consultation Fee 500
        Lab Tests 1200
        Subtotal: 1700
        Tax: 100
        Grand Total: 1800
      `;
      const result = service.parseExtractedText(text);
      expect(result.invoiceDate).toBe('01/01/2024');
      expect(result.invoice.subtotal).toBe(1700);
      expect(result.invoice.tax).toBe(100);
      expect(result.invoice.total).toBe(1800);
      expect(result.invoice.items).toHaveLength(2);
      expect(result.invoice.items[0].description).toBe('Consultation Fee');
      expect(result.invoice.items[0].total).toBe(500);
    });
  });
});
