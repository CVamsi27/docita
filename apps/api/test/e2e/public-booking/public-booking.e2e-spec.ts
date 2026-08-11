import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PublicBookingService } from '@/domains/public-booking/application/services/public-booking.service';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';

describe('PublicBookingController (e2e)', () => {
  let app: INestApplication;
  const mockPublicBookingService = {
    getClinicSummary: jest.fn(),
    listDoctors: jest.fn(),
    listSlots: jest.fn(),
    checkPhoneStatus: jest.fn(),
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
    getBookingContext: jest.fn(),
    submitRequest: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PublicBookingService)
      .useValue(mockPublicBookingService)
      .overrideProvider(WhatsappMockToken)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /public/booking/clinics/:referralCode returns clinic summary', async () => {
    const payload = { id: 'c1', name: 'Test Clinic', referralCode: 'ABC123' };
    mockPublicBookingService.getClinicSummary.mockResolvedValue(payload);

    await request(app.getHttpServer())
      .get('/public/booking/clinics/ABC123')
      .expect(200)
      .expect(payload);

    expect(mockPublicBookingService.getClinicSummary).toHaveBeenCalledWith(
      'ABC123',
    );
  });

  it('GET /public/booking/clinics/:referralCode/context returns 401 without verification', async () => {
    mockPublicBookingService.getBookingContext.mockRejectedValue(
      new UnauthorizedException('Verification required'),
    );

    await request(app.getHttpServer())
      .get('/public/booking/clinics/ABC123/context')
      .expect(401);

    expect(mockPublicBookingService.getBookingContext).toHaveBeenCalledWith(
      'ABC123',
      undefined,
    );
  });

  it('POST /api/v1/public/booking/clinics/:referralCode/otp/request is not CSRF-forbidden without cookies', async () => {
    mockPublicBookingService.requestOtp.mockResolvedValue({
      message: 'If sent, WhatsApp carries the code.',
      expiresInSeconds: 600,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/public/booking/clinics/ABC123/otp/request')
      .send({ phoneNumber: '+919876543210' });

    expect(res.status).not.toBe(403);
  });

  it('POST /public/booking/clinics/:referralCode/otp/verify returns booking token payload', async () => {
    const payload = {
      bookingVerificationToken: 'signed.jwt.token',
      patient: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: undefined as string | undefined,
      },
    };
    mockPublicBookingService.verifyOtp.mockResolvedValue(payload);

    await request(app.getHttpServer())
      .post('/public/booking/clinics/ABC123/otp/verify')
      .send({ phoneNumber: '+919876543210', otp: '123456' })
      .expect(201);

    expect(mockPublicBookingService.verifyOtp).toHaveBeenCalledWith('ABC123', {
      phoneNumber: '+919876543210',
      otp: '123456',
    });
  });

  it('POST /public/booking/clinics/:referralCode/requests forwards body and authorization', async () => {
    const payload = {
      requestId: 'req-1',
      message: 'Your request has been received.',
    };
    mockPublicBookingService.submitRequest.mockResolvedValue(payload);

    await request(app.getHttpServer())
      .post('/public/booking/clinics/ABC123/requests')
      .set('Authorization', 'Bearer booking.jwt')
      .send({
        phoneNumber: '+919876543210',
        firstName: 'Ada',
        lastName: 'Lovelace',
        preferredDoctorId: 'doc-1',
        slotCalendarDate: '2026-05-10',
        requestedSlotStart: '2026-05-10T10:00:00.000Z',
        requestedSlotEnd: '2026-05-10T10:30:00.000Z',
        turnstileToken: 'turnstile-token',
        bookingVerificationToken: 'booking.jwt',
      })
      .expect(201)
      .expect(payload);

    expect(mockPublicBookingService.submitRequest).toHaveBeenCalledWith(
      'ABC123',
      expect.objectContaining({
        phoneNumber: '+919876543210',
        firstName: 'Ada',
        lastName: 'Lovelace',
        preferredDoctorId: 'doc-1',
        slotCalendarDate: '2026-05-10',
        requestedSlotStart: '2026-05-10T10:00:00.000Z',
        requestedSlotEnd: '2026-05-10T10:30:00.000Z',
        turnstileToken: 'turnstile-token',
        bookingVerificationToken: 'booking.jwt',
      }),
      'Bearer booking.jwt',
      expect.any(String),
      undefined,
    );
  });
});
