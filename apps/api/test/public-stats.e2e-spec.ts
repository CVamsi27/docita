import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PublicStatsService } from '@/shared/modules/public/public-stats.service';
import { RazorpaySubscriptionGateway } from '@/gateways/razorpay-subscription.gateway';
import { mockRazorpayGateway } from './razorpay.provider';
import { WhatsappService } from '@/shared/modules/messaging/whatsapp/whatsapp.service';
import { mockWhatsappService } from './whatsapp.provider';

describe('PublicStatsController (e2e)', () => {
  let app: INestApplication;
  const mockPublicStatsService = {
    getPlatformStats: jest.fn(),
  };

  beforeEach(async () => {
    mockPublicStatsService.getPlatformStats.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PublicStatsService)
      .useValue(mockPublicStatsService)
      .overrideProvider(RazorpaySubscriptionGateway)
      .useValue(mockRazorpayGateway)
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /public/platform-stats returns platform stats payload', async () => {
    const payload = {
      clinics: 10,
      doctors: 20,
      patients: 30,
      prescriptions: 40,
      appointments: 50,
      uptime: '99.9%',
    };
    mockPublicStatsService.getPlatformStats.mockResolvedValue(payload);

    await request(app.getHttpServer())
      .get('/public/platform-stats')
      .expect(200)
      .expect(payload);

    expect(mockPublicStatsService.getPlatformStats).toHaveBeenCalledTimes(1);
  });

  it('GET /public/platform-stats returns 500 when stats service throws', async () => {
    mockPublicStatsService.getPlatformStats.mockRejectedValue(
      new Error('stats unavailable'),
    );

    await request(app.getHttpServer())
      .get('/public/platform-stats')
      .expect(500);

    expect(mockPublicStatsService.getPlatformStats).toHaveBeenCalledTimes(1);
  });
});
