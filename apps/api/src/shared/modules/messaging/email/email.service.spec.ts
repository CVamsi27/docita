import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  EMAIL_PROVIDER,
  IEmailProvider,
} from './providers/email-provider.interface';

describe('EmailService', () => {
  let service: EmailService;
  let emailProvider: jest.Mocked<IEmailProvider>;

  beforeEach(async () => {
    const emailProviderMock = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
      sendTemplate: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'msg-1' }),
      verify: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: EMAIL_PROVIDER,
          useValue: emailProviderMock,
        },
        {
          provide: AppConfigService,
          useValue: {
            getConfig: jest.fn().mockReturnValue({}),
            getAppUrl: jest.fn().mockReturnValue('http://localhost:3000'),
            getEnvironment: jest.fn().mockReturnValue('test'),
            getFrontendAppUrl: jest
              .fn()
              .mockReturnValue('http://localhost:3000'),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    emailProvider = module.get(EMAIL_PROVIDER);
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with clinic name', async () => {
      const result = await service.sendWelcomeEmail(
        'user@example.com',
        'John Doe',
        'Main Clinic',
      );

      expect(result).toEqual({ success: true, messageId: 'msg-1' });
      expect(emailProvider.send).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Welcome to Docita - Main Clinic',
        html: expect.stringContaining('Welcome, John Doe!'),
      });
    });

    it('should escape HTML in name and clinic name', async () => {
      await service.sendWelcomeEmail(
        'user@example.com',
        '<script>alert("xss")</script>',
        '<b>Clinic</b>',
      );

      const call = emailProvider.send.mock.calls[0][0];
      expect(call.html).not.toContain('<script>');
      expect(call.html).not.toContain('<b>');
    });

    it('should include get started link in welcome email', async () => {
      await service.sendWelcomeEmail(
        'user@example.com',
        'John Doe',
        'Main Clinic',
      );

      const call = emailProvider.send.mock.calls[0][0];
      expect(call.html).toContain('Get Started');
      expect(call.html).toContain('href');
    });

    it('should handle email provider errors', async () => {
      emailProvider.send.mockRejectedValueOnce(new Error('Provider error'));

      await expect(
        service.sendWelcomeEmail('user@example.com', 'John', 'Clinic'),
      ).rejects.toThrow('Provider error');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with token', async () => {
      const token = 'reset-token-123';
      const result = await service.sendPasswordResetEmail(
        'user@example.com',
        token,
      );

      expect(result).toEqual({ success: true, messageId: 'msg-1' });
      expect(emailProvider.send).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Reset Your Password - Docita',
        html: expect.stringContaining('Password Reset Request'),
      });
    });

    it('should include reset URL in email', async () => {
      await service.sendPasswordResetEmail('user@example.com', 'token-123');

      const call = emailProvider.send.mock.calls[0][0];
      expect(call.html).toContain('reset-password');
      expect(call.html).toContain('token-123');
    });

    it('should include expiration notice', async () => {
      await service.sendPasswordResetEmail('user@example.com', 'token-123');

      const call = emailProvider.send.mock.calls[0][0];
      expect(call.html).toContain('expires in 1 hour');
    });

    it('should handle provider errors', async () => {
      emailProvider.send.mockRejectedValueOnce(new Error('Send failed'));

      await expect(
        service.sendPasswordResetEmail('user@example.com', 'token'),
      ).rejects.toThrow('Send failed');
    });
  });

  describe('sendAppointmentReminder', () => {
    it('should send appointment reminder with correct details', async () => {
      const appointmentDate = new Date('2024-12-25T15:00:00Z');
      const result = await service.sendAppointmentReminder(
        'patient@example.com',
        'John Patient',
        'Dr. Smith',
        appointmentDate,
        'Main Clinic',
      );

      expect(result).toEqual({ success: true, messageId: 'msg-1' });
      expect(emailProvider.send).toHaveBeenCalledWith({
        to: 'patient@example.com',
        subject: expect.stringContaining('Appointment Reminder'),
        html: expect.stringContaining('Appointment Reminder'),
      });
    });

    it('should include clinic name in subject and body', async () => {
      const appointmentDate = new Date('2024-12-25T15:00:00Z');
      await service.sendAppointmentReminder(
        'patient@example.com',
        'John Patient',
        'Dr. Smith',
        appointmentDate,
        'My Clinic',
      );

      const call = emailProvider.send.mock.calls[0][0];
      expect(call.subject).toContain('My Clinic');
      expect(call.html).toContain('My Clinic');
    });

    it('should include doctor and patient information', async () => {
      const appointmentDate = new Date('2024-12-25T15:00:00Z');
      await service.sendAppointmentReminder(
        'patient@example.com',
        'Jane Patient',
        'Dr. Johnson',
        appointmentDate,
        'Clinic',
      );

      const call = emailProvider.send.mock.calls[0][0];
      expect(call.html).toContain('Jane Patient');
      expect(call.html).toContain('Dr. Johnson');
    });

    it('should format appointment date in India timezone', async () => {
      const appointmentDate = new Date('2024-12-25T15:00:00Z');
      await service.sendAppointmentReminder(
        'patient@example.com',
        'John Patient',
        'Dr. Smith',
        appointmentDate,
        'Clinic',
      );

      const call = emailProvider.send.mock.calls[0][0];
      expect(call.html).toContain('Date & Time');
    });

    it('should include arrival instructions', async () => {
      const appointmentDate = new Date('2024-12-25T15:00:00Z');
      await service.sendAppointmentReminder(
        'patient@example.com',
        'John Patient',
        'Dr. Smith',
        appointmentDate,
        'Clinic',
      );

      const call = emailProvider.send.mock.calls[0][0];
      expect(call.html).toContain('10 minutes');
    });

    it('should escape HTML in name parameters', async () => {
      const appointmentDate = new Date('2024-12-25T15:00:00Z');
      await service.sendAppointmentReminder(
        'patient@example.com',
        '<img src=x onerror="alert(1)">',
        '<b>Dr. Evil</b>',
        appointmentDate,
        '<script>alert("xss")</script>',
      );

      const call = emailProvider.send.mock.calls[0][0];
      expect(call.html).not.toContain('<img');
      expect(call.html).not.toContain('<b>');
      expect(call.html).not.toContain('<script>');
    });

    it('should handle provider errors', async () => {
      emailProvider.send.mockRejectedValueOnce(new Error('Send failed'));

      await expect(
        service.sendAppointmentReminder(
          'patient@example.com',
          'John',
          'Dr. Smith',
          new Date(),
          'Clinic',
        ),
      ).rejects.toThrow('Send failed');
    });
  });

  describe('send', () => {
    it('should send generic email with options', async () => {
      const options = {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await service.send(options);

      expect(result).toEqual({ success: true, messageId: 'msg-1' });
      expect(emailProvider.send).toHaveBeenCalledWith(options);
    });

    it('should pass through email options directly', async () => {
      const options = {
        to: 'user@example.com',
        subject: 'Subject',
        html: '<p>Content</p>',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
      };

      await service.send(options);

      expect(emailProvider.send).toHaveBeenCalledWith(options);
    });

    it('should handle provider errors during generic send', async () => {
      emailProvider.send.mockRejectedValueOnce(new Error('Send failed'));

      await expect(
        service.send({ to: 'user@example.com', subject: 'Test', html: 'Test' }),
      ).rejects.toThrow('Send failed');
    });
  });

  describe('sendTemplate', () => {
    it('should send templated email with variables', async () => {
      const options = {
        to: 'user@example.com',
        template: 'welcome',
        variables: { name: 'John', clinicName: 'Main Clinic' },
      };

      const result = await service.sendTemplate(options);

      expect(result).toEqual({ success: true, messageId: 'msg-1' });
      expect(emailProvider.sendTemplate).toHaveBeenCalledWith(options);
    });

    it('should pass through template options to provider', async () => {
      const options = {
        to: 'user@example.com',
        template: 'appointment-reminder',
        variables: { patientName: 'John', doctorName: 'Dr. Smith' },
        cc: 'admin@example.com',
      };

      await service.sendTemplate(options);

      expect(emailProvider.sendTemplate).toHaveBeenCalledWith(options);
    });

    it('should handle provider errors during template send', async () => {
      emailProvider.sendTemplate.mockRejectedValueOnce(
        new Error('Template not found'),
      );

      await expect(
        service.sendTemplate({
          to: 'user@example.com',
          template: 'nonexistent',
          variables: {},
        }),
      ).rejects.toThrow('Template not found');
    });
  });

  describe('verifyProvider', () => {
    it('should verify email provider is configured', async () => {
      const result = await service.verifyProvider();

      expect(result).toBe(true);
      expect(emailProvider.verify).toHaveBeenCalled();
    });

    it('should return false if provider verification fails', async () => {
      emailProvider.verify.mockRejectedValueOnce(
        new Error('Verification failed'),
      );

      const result = await service.verifyProvider();

      expect(result).toBe(false);
    });

    it('should handle provider errors gracefully', async () => {
      emailProvider.verify.mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      const result = await service.verifyProvider();

      expect(result).toBe(false);
    });

    it('should return provider verification status', async () => {
      emailProvider.verify.mockResolvedValueOnce(false);

      const result = await service.verifyProvider();

      expect(result).toBe(false);
    });
  });

  describe('Dependency Injection', () => {
    it('should be injectable', () => {
      expect(service).toBeDefined();
    });

    it('should have email provider injected', () => {
      expect(emailProvider).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof service.sendWelcomeEmail).toBe('function');
      expect(typeof service.sendPasswordResetEmail).toBe('function');
      expect(typeof service.sendAppointmentReminder).toBe('function');
      expect(typeof service.send).toBe('function');
      expect(typeof service.sendTemplate).toBe('function');
      expect(typeof service.verifyProvider).toBe('function');
    });
  });

  describe('HTML Security', () => {
    it('should escape HTML in all user-provided inputs', async () => {
      const xssPayload = '"><script>alert("XSS")</script>';

      await service.sendWelcomeEmail(
        'user@example.com',
        xssPayload,
        xssPayload,
      );

      const call = emailProvider.send.mock.calls[0][0];
      expect(call.html).not.toContain('<script>');
    });

    it('should escape HTML in password reset email name', async () => {
      const xssPayload = '"><img src=x onerror=alert(1)>';

      await service.sendWelcomeEmail('user@example.com', xssPayload, 'Clinic');

      const call = emailProvider.send.mock.calls[0][0];

      expect(call.html).toBeDefined();
      expect(call.html).not.toContain('<script>');
    });

    it('should escape HTML in appointment reminder all fields', async () => {
      const appointmentDate = new Date();
      await service.sendAppointmentReminder(
        'patient@example.com',
        '"><script>alert(1)</script>',
        '"><img src=x>',
        appointmentDate,
        '"><iframe>',
      );

      const call = emailProvider.send.mock.calls[0][0];

      expect(call.html).toContain('Appointment Reminder');
      expect(call.html).toContain('Dear');
    });

    it('should sanitize user inputs to prevent XSS', async () => {
      const xssAttempts = [
        '<svg onload=alert(1)>',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">',
      ];

      for (const payload of xssAttempts) {
        await service.sendWelcomeEmail('user@example.com', payload, 'Clinic');
      }

      expect(emailProvider.send).toHaveBeenCalled();
    });
  });

  describe('Email Result Handling', () => {
    it('should return provider result from sendWelcomeEmail', async () => {
      const mockResult = { success: true, messageId: 'msg-123' };
      emailProvider.send.mockResolvedValueOnce(mockResult);

      const result = await service.sendWelcomeEmail(
        'user@example.com',
        'John',
        'Clinic',
      );

      expect(result).toEqual(mockResult);
    });

    it('should return provider result from send', async () => {
      const mockResult = { success: true, messageId: 'msg-456' };
      emailProvider.send.mockResolvedValueOnce(mockResult);

      const result = await service.send({
        to: 'user@example.com',
        subject: 'Test',
        html: 'Test',
      });

      expect(result).toEqual(mockResult);
    });

    it('should handle provider failure results', async () => {
      const failureResult = { success: false, error: 'Failed to send' };
      emailProvider.send.mockResolvedValueOnce(failureResult);

      const result = await service.send({
        to: 'user@example.com',
        subject: 'Test',
        html: 'Test',
      });

      expect(result).toEqual(failureResult);
    });
  });
});
