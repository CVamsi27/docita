import { Test, TestingModule } from '@nestjs/testing';
import { OCRFacadeService as OCRService } from './ocr-facade.service';
import { ImagePreprocessorService } from './image-preprocessor.service';
import { TextExtractorService } from './text-extractor.service';
import { DocumentClassifierService } from './document-classifier.service';
import { TextParserService } from './text-parser.service';
import { ConfidenceScorerService } from './confidence-scorer.service';
import { Logger as _Logger } from '@nestjs/common';

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
  let textExtractorService: {
    initialize: jest.Mock;
    cleanup: jest.Mock;
    extractText: jest.Mock;
  };

  beforeEach(async () => {
    const mockImagePreprocessor = {
      preprocessImage: jest.fn().mockResolvedValue(Buffer.from('mock')),
    };

    const mockTextExtractor = {
      initialize: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      extractText: jest.fn().mockResolvedValue('mock text'),
    };

    const mockDocumentClassifier = {
      classifyDocument: jest.fn().mockResolvedValue('MEDICAL_REPORT'),
    };

    const mockTextParser = {
      parseText: jest.fn().mockResolvedValue({ parsed: 'data' }),
      parseExtractedText: jest.fn().mockImplementation((text) => {
        const medications = text?.includes('Medications')
          ? [
              {
                name: 'Paracetamol',
                dosage: '500mg',
                frequency: '1x daily',
                startDate: '',
                endDate: '',
                instructions: '',
              },
              {
                name: 'Amoxicillin',
                dosage: '250mg',
                frequency: 'bd',
                startDate: '',
                endDate: '',
                instructions: '',
              },
            ]
          : [];

        return {
          firstName: 'John',
          lastName: 'Doe',
          mrn: 'DOC-12345',
          preferredName: '',
          pronouns: '',
          address: '123 Main St, Anytown',
          preferredLanguage: '',
          age: '45',
          gender: 'MALE',
          phoneNumber: '555-1234',
          email: 'john@example.com',
          bloodType: 'O+',
          emergencyContact: {
            name: 'Jane Doe',
            phoneNumber: '9876543410',
            relation: '',
          },
          dateOfBirth: '01/01/1980',
          visitDate: '12/12/2023',
          invoiceDate: '01/01/2024',
          admissionDate: '',
          clinicName: 'City General Hospital',
          doctorName: 'Dr. Smith',
          diagnosis: 'Test Diagnosis',
          symptoms: [],
          allergies: [],
          medications,
          vitals: {
            bloodPressure: '120/80',
            bp: '120/80',
            temperature: '98.6',
            temp: '98.6',
            heartRate: '72',
            respiratoryRate: '16',
            oxygenSaturation: '98',
          },
          labValues: {
            hemoglobin: '13.5',
            glucose: '95 ',
            creatinine: '1.0',
            sodium: '135',
            potassium: '4.0',
          },
          procedures: [],
          assessments: [],
          plan: '',
          notes: '',
          invoiceNumber: 'INV-2024-001',
          invoice: {
            subtotal: 1700,
            tax: 100,
            total: 1800,
            paymentStatus: 'PENDING',
            items: [
              {
                description: 'Consultation Fee',
                quantity: 1,
                unitPrice: 500,
                total: 500,
              },
              {
                description: 'Lab Tests',
                quantity: 1,
                unitPrice: 1200,
                total: 1200,
              },
            ],
          },
          confidenceScores: {
            firstName: 0.95,
            lastName: 0.95,
            diagnosis: 0.85,
          },
        };
      }),
    };

    const mockConfidenceScorer = {
      scoreConfidence: jest.fn().mockReturnValue(0.95),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OCRService,
        { provide: ImagePreprocessorService, useValue: mockImagePreprocessor },
        { provide: TextExtractorService, useValue: mockTextExtractor },
        {
          provide: DocumentClassifierService,
          useValue: mockDocumentClassifier,
        },
        { provide: TextParserService, useValue: mockTextParser },
        { provide: ConfidenceScorerService, useValue: mockConfidenceScorer },
      ],
    }).compile();

    service = module.get<OCRService>(OCRService);
    textExtractorService = module.get(TextExtractorService) as {
      initialize: jest.Mock;
      cleanup: jest.Mock;
      extractText: jest.Mock;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Lifecycle', () => {
    it('should defer worker initialization until OCR is used', async () => {
      await service.onModuleInit();
      expect(textExtractorService.initialize).not.toHaveBeenCalled();
    });

    it('should terminate worker on module destroy', async () => {
      await service.onModuleDestroy();
      expect(textExtractorService.cleanup).toHaveBeenCalled();
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
        Emergency Contact: Jane Doe 9876543410
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
        phoneNumber: '9876543410',
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
