import { Test, TestingModule } from '@nestjs/testing';
import { InvoicePdfService } from './invoice-pdf.service';
import {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFInvoiceItem,
  PDFPatientInfo,
} from '@workspace/types';
import PDFDocument from 'pdfkit';

// Mock pdfkit
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const listeners: Record<string, Function[]> = {};
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

describe('InvoicePdfService', () => {
  let service: InvoicePdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvoicePdfService],
    }).compile();

    service = module.get<InvoicePdfService>(InvoicePdfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a PDF buffer', async () => {
    const mockData = {
      invoiceId: 'inv-123',
      clinic: {
        name: 'Test Clinic',
        address: '123 Test St',
      } as PDFClinicInfo,
      patient: {
        name: 'John Doe',
      } as PDFPatientInfo,
      items: [
        {
          description: 'Consultation',
          quantity: 1,
          unitPrice: 500,
          amount: 500,
          gstRate: 18,
        },
      ] as PDFInvoiceItem[],
      date: new Date(),
    };

    const buffer = await service.generate(mockData);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('should handle empty items list', async () => {
    const mockData = {
      invoiceId: 'inv-123',
      clinic: { name: 'Test Clinic' } as PDFClinicInfo,
      patient: { name: 'John Doe' } as PDFPatientInfo,
      items: [],
      date: new Date(),
    };

    const buffer = await service.generate(mockData);
    expect(buffer).toBeInstanceOf(Buffer);
  });
});
