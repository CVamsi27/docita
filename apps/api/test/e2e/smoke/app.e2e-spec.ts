import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';

/**
 * Smoke for the canonical health surface at `shared/common/controllers/health-check.controller.ts`
 * (HealthCheckController). The previous AppController-only stub at `/health` is removed
 * (see the deep-analysis audit 2026-08-10, §9.1); these probes pin the real probe paths
 * so a future refactor cannot silently break load-balancer readiness.
 */
describe('HealthCheckController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WhatsappMockToken)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health returns ping with version', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({ status: 'ok' });
        expect(response.body.version).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });
  });

  it('GET /health/live returns liveness payload', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'ok',
          service: 'docita-api',
        });
        expect(typeof response.body.uptime).toBe('number');
      });
  });

  it('GET /health/db returns database health', () => {
    return request(app.getHttpServer())
      .get('/health/db')
      .expect(200)
      .expect((response) => {
        expect(response.body).toBeDefined();
      });
  });
});
