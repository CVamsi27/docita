import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PublicStatsService } from '@/shared/modules/public/public-stats.service';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';

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
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
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
      uptime: 'live-uptime',
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
