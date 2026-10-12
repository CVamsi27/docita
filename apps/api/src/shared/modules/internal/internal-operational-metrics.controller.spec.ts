import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { Role } from '@workspace/db';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { InternalOperationalMetricsController } from './internal-operational-metrics.controller';
import { InternalOperationalMetricsService } from './internal-operational-metrics.service';

describe('Internal operational metrics access', () => {
  let app: INestApplication;
  const metrics = {
    getMetrics: jest.fn().mockResolvedValue({ measured: true }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InternalOperationalMetricsController],
      providers: [
        Reflector,
        { provide: InternalOperationalMetricsService, useValue: metrics },
        {
          provide: AppConfigService,
          useValue: { getInternalAllowedEmails: () => [] },
        },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    // This isolated route test injects identities; production uses the global JWT guard.
    app.use(
      (
        req: { headers: Record<string, string>; user?: { role: string } },
        _res: unknown,
        next: () => void,
      ) => {
        if (req.headers['x-test-role'])
          req.user = { role: req.headers['x-test-role'] };
        next();
      },
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('rejects anonymous requests', async () => {
    await request(app.getHttpServer())
      .get('/internal/operational-metrics')
      .expect(403);
  });
  it('rejects clinician requests', async () => {
    await request(app.getHttpServer())
      .get('/internal/operational-metrics')
      .set('x-test-role', Role.DOCTOR)
      .expect(403);
  });
  it('allows internal operators', async () => {
    await request(app.getHttpServer())
      .get('/internal/operational-metrics')
      .set('x-test-role', Role.INTERNAL)
      .expect(200);
    expect(metrics.getMetrics).toHaveBeenCalledTimes(1);
  });
});
