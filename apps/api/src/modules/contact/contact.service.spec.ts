import { Test, TestingModule } from '@nestjs/testing';
import { ContactService } from './contact.service';
import { BadRequestException } from '@nestjs/common';

describe('ContactService', () => {
  let service: ContactService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactService],
    }).compile();

    service = module.get<ContactService>(ContactService);

    // Spy on logger to prevent console output during tests
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

    it('should submit a valid inquiry successfully', () => {
      const result = service.submitInquiry(validInquiry);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('id');
      expect(result.id).toMatch(/^inquiry_\d+$/);
      expect(result).toHaveProperty('message');
      expect(result.message).toBe(
        'Thank you for your inquiry. We will get back to you soon.',
      );
    });

    it('should log the inquiry', () => {
      const logSpy = jest.spyOn(service['logger'], 'log');

      service.submitInquiry(validInquiry);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('New contact inquiry from Dr. Smith'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('smith@example.com'),
      );
    });

    it('should accept inquiry without clinic field', () => {
      const inquiryWithoutClinic = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'General inquiry',
      };

      const result = service.submitInquiry(inquiryWithoutClinic);

      expect(result.success).toBe(true);
    });

    it('should generate unique inquiry IDs', async () => {
      const result1 = service.submitInquiry(validInquiry);
      
      // Wait 5ms to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 5));
      
      const result2 = service.submitInquiry(validInquiry);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toMatch(/^inquiry_\d+$/);
      expect(result2.id).toMatch(/^inquiry_\d+$/);
    });

    describe('Validation Errors', () => {
      it('should throw BadRequestException when name is missing', () => {
        const invalidInquiry = {
          name: '',
          email: 'test@example.com',
          message: 'Test message',
        };

        expect(() => service.submitInquiry(invalidInquiry)).toThrow(
          BadRequestException,
        );
        expect(() => service.submitInquiry(invalidInquiry)).toThrow(
          'Name, email, and message are required fields',
        );
      });

      it('should throw BadRequestException when email is missing', () => {
        const invalidInquiry = {
          name: 'Test User',
          email: '',
          message: 'Test message',
        };

        expect(() => service.submitInquiry(invalidInquiry)).toThrow(
          BadRequestException,
        );
        expect(() => service.submitInquiry(invalidInquiry)).toThrow(
          'Name, email, and message are required fields',
        );
      });

      it('should throw BadRequestException when message is missing', () => {
        const invalidInquiry = {
          name: 'Test User',
          email: 'test@example.com',
          message: '',
        };

        expect(() => service.submitInquiry(invalidInquiry)).toThrow(
          BadRequestException,
        );
        expect(() => service.submitInquiry(invalidInquiry)).toThrow(
          'Name, email, and message are required fields',
        );
      });

      it('should throw BadRequestException for invalid email format', () => {
        const invalidEmailInquiry = {
          name: 'Test User',
          email: 'invalid-email',
          message: 'Test message',
        };

        expect(() => service.submitInquiry(invalidEmailInquiry)).toThrow(
          BadRequestException,
        );
        expect(() => service.submitInquiry(invalidEmailInquiry)).toThrow(
          'Invalid email format',
        );
      });

      it('should reject email without domain', () => {
        const invalidInquiry = {
          name: 'Test User',
          email: 'test@',
          message: 'Test message',
        };

        expect(() => service.submitInquiry(invalidInquiry)).toThrow(
          'Invalid email format',
        );
      });

      it('should reject email without @ symbol', () => {
        const invalidInquiry = {
          name: 'Test User',
          email: 'testexample.com',
          message: 'Test message',
        };

        expect(() => service.submitInquiry(invalidInquiry)).toThrow(
          'Invalid email format',
        );
      });

      it('should reject email with spaces', () => {
        const invalidInquiry = {
          name: 'Test User',
          email: 'test @example.com',
          message: 'Test message',
        };

        expect(() => service.submitInquiry(invalidInquiry)).toThrow(
          'Invalid email format',
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long messages', () => {
        const longMessage = 'A'.repeat(5000);
        const inquiry = {
          name: 'Test User',
          email: 'test@example.com',
          message: longMessage,
        };

        const result = service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should handle special characters in message', () => {
        const inquiry = {
          name: 'Test User',
          email: 'test@example.com',
          message: 'Special chars: <script>alert("test")</script> & © ® ™',
        };

        const result = service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should handle special characters in name', () => {
        const inquiry = {
          name: "O'Reilly-Smith Jr.",
          email: 'test@example.com',
          message: 'Test message',
        };

        const result = service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should accept valid international email', () => {
        const inquiry = {
          name: 'Test User',
          email: 'test@example.co.uk',
          message: 'Test message',
        };

        const result = service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should accept email with subdomain', () => {
        const inquiry = {
          name: 'Test User',
          email: 'user@mail.example.com',
          message: 'Test message',
        };

        const result = service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should accept email with plus addressing', () => {
        const inquiry = {
          name: 'Test User',
          email: 'user+tag@example.com',
          message: 'Test message',
        };

        const result = service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should handle optional clinic field as null', () => {
        const inquiry = {
          name: 'Test User',
          email: 'test@example.com',
          clinic: null as unknown as string,
          message: 'Test message',
        };

        const result = service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });

      it('should handle optional clinic field as undefined', () => {
        const inquiry = {
          name: 'Test User',
          email: 'test@example.com',
          clinic: undefined,
          message: 'Test message',
        };

        const result = service.submitInquiry(inquiry);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('isValidEmail (private method)', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com',
        'user123@test.org',
      ];

      validEmails.forEach((email) => {
        const inquiry = {
          name: 'Test',
          email,
          message: 'Test',
        };
        expect(() => service.submitInquiry(inquiry)).not.toThrow();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'plaintext',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      invalidEmails.forEach((email) => {
        const inquiry = {
          name: 'Test',
          email,
          message: 'Test',
        };
        expect(() => service.submitInquiry(inquiry)).toThrow(
          BadRequestException,
        );
      });
    });
  });
});
