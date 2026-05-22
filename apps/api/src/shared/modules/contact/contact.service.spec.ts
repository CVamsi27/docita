import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { ContactService } from './contact.service';

const supportInquiryCreate = jest.fn();
const supportInquiryFindMany = jest.fn();
const prismaMock = {
  supportInquiry: {
    create: supportInquiryCreate,
    findMany: supportInquiryFindMany,
  },
} as unknown as PrismaService;

describe('ContactService', () => {
  let service: ContactService;
  let inquiryCounter = 0;

  beforeEach(async () => {
    supportInquiryCreate.mockReset();
    supportInquiryFindMany.mockReset();
    inquiryCounter = 0;

    supportInquiryCreate.mockImplementation(async () => ({
      id: `inquiry_${++inquiryCounter}`,
    }));
    supportInquiryFindMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
    jest.spyOn(service['logger'], 'log').mockImplementation();
  });

  describe('Dependency Injection', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('submitInquiry', () => {
    const validInquiry = {
      name: 'Dr. Smith',
      email: 'smith@example.com',
      clinic: 'City Medical Center',
      message: 'I would like to learn more about your services.',
    };

    it('should submit a valid inquiry successfully', async () => {
      const result = await service.submitInquiry(validInquiry);

      expect(result).toEqual({
        success: true,
        id: 'inquiry_1',
        message: 'Thank you for your inquiry. We will get back to you soon.',
      });
    });

    it('should log the inquiry', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.submitInquiry(validInquiry);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'New contact inquiry received: inquiry_1 from sm***@example.com',
        ),
      );
      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('smith@example.com'),
      );
    });

    it('should accept inquiry without clinic field', async () => {
      const inquiryWithoutClinic = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'General inquiry',
      };

      const result = await service.submitInquiry(inquiryWithoutClinic);

      expect(result.success).toBe(true);
      expect(result.id).toBe('inquiry_1');
    });

    it('should generate unique inquiry IDs', async () => {
      const result1 = await service.submitInquiry(validInquiry);
      const result2 = await service.submitInquiry(validInquiry);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toBe('inquiry_1');
      expect(result2.id).toBe('inquiry_2');
    });

    describe('Validation Errors', () => {
      it('should throw BadRequestException when name is missing', async () => {
        const invalidInquiry = {
          name: '',
          email: 'test@example.com',
          message: 'Test message',
        };

        await expect(service.submitInquiry(invalidInquiry)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.submitInquiry(invalidInquiry)).rejects.toThrow(
          'Name, email, and message are required fields',
        );
      });

      it('should throw BadRequestException when email is missing', async () => {
        const invalidInquiry = {
          name: 'Test User',
          email: '',
          message: 'Test message',
        };

        await expect(service.submitInquiry(invalidInquiry)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.submitInquiry(invalidInquiry)).rejects.toThrow(
          'Name, email, and message are required fields',
        );
      });

      it('should throw BadRequestException when message is missing', async () => {
        const invalidInquiry = {
          name: 'Test User',
          email: 'test@example.com',
          message: '',
        };

        await expect(service.submitInquiry(invalidInquiry)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.submitInquiry(invalidInquiry)).rejects.toThrow(
          'Name, email, and message are required fields',
        );
      });

      it('should throw BadRequestException for invalid email format', async () => {
        const invalidEmailInquiry = {
          name: 'Test User',
          email: 'invalid-email',
          message: 'Test message',
        };

        await expect(
          service.submitInquiry(invalidEmailInquiry),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.submitInquiry(invalidEmailInquiry),
        ).rejects.toThrow('Invalid email format');
      });

      it('should reject email without domain', async () => {
        const invalidInquiry = {
          name: 'Test User',
          email: 'test@',
          message: 'Test message',
        };

        await expect(service.submitInquiry(invalidInquiry)).rejects.toThrow(
          'Invalid email format',
        );
      });

      it('should reject email without @ symbol', async () => {
        const invalidInquiry = {
          name: 'Test User',
          email: 'testexample.com',
          message: 'Test message',
        };

        await expect(service.submitInquiry(invalidInquiry)).rejects.toThrow(
          'Invalid email format',
        );
      });

      it('should reject email with spaces', async () => {
        const invalidInquiry = {
          name: 'Test User',
          email: 'test @example.com',
          message: 'Test message',
        };

        await expect(service.submitInquiry(invalidInquiry)).rejects.toThrow(
          'Invalid email format',
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long messages', async () => {
        const longMessage = 'A'.repeat(5000);
        const inquiry = {
          name: 'Test User',
          email: 'test@example.com',
          message: longMessage,
        };

        const result = await service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should handle special characters in message', async () => {
        const inquiry = {
          name: 'Test User',
          email: 'test@example.com',
          message: 'Special chars: <script>alert("test")</script> & © ® ™',
        };

        const result = await service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should handle special characters in name', async () => {
        const inquiry = {
          name: "O'Reilly-Smith Jr.",
          email: 'test@example.com',
          message: 'Test message',
        };

        const result = await service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should accept valid international email', async () => {
        const inquiry = {
          name: 'Test User',
          email: 'test@example.co.uk',
          message: 'Test message',
        };

        const result = await service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should accept email with subdomain', async () => {
        const inquiry = {
          name: 'Test User',
          email: 'user@mail.example.com',
          message: 'Test message',
        };

        const result = await service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should accept email with plus addressing', async () => {
        const inquiry = {
          name: 'Test User',
          email: 'user+tag@example.com',
          message: 'Test message',
        };

        const result = await service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should handle optional clinic field as null', async () => {
        const inquiry = {
          name: 'Test User',
          email: 'test@example.com',
          clinic: undefined,
          message: 'Test message',
        };

        const result = await service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should handle optional clinic field as undefined', async () => {
        const inquiry = {
          name: 'Test User',
          email: 'test@example.com',
          clinic: undefined,
          message: 'Test message',
        };

        const result = await service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('listInquiries', () => {
    it('should return inquiries newest first with normalized clinic values', async () => {
      supportInquiryFindMany.mockResolvedValue([
        {
          id: 'a',
          name: 'First',
          email: 'first@example.com',
          clinic: null,
          message: 'Hello',
          status: 'NEW',
          createdAt: new Date('2025-01-01T10:00:00Z'),
          updatedAt: new Date('2025-01-01T10:00:00Z'),
          reviewedAt: null,
          reviewedBy: null,
          internalNotes: null,
        },
      ]);

      const result = await service.listInquiries(50);

      expect(supportInquiryFindMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(result[0].clinic).toBeNull();
    });
  });

  describe('isValidEmail (private method)', () => {
    it('should validate correct email formats', async () => {
      const validEmails = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com',
        'user123@test.org',
      ];

      for (const email of validEmails) {
        const inquiry = {
          name: 'Test',
          email,
          message: 'Test',
        };
        await expect(service.submitInquiry(inquiry)).resolves.toMatchObject({
          success: true,
        });
      }
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'plaintext',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      for (const email of invalidEmails) {
        const inquiry = {
          name: 'Test',
          email,
          message: 'Test',
        };
        await expect(service.submitInquiry(inquiry)).rejects.toThrow(
          BadRequestException,
        );
      }
    });
  });
});
