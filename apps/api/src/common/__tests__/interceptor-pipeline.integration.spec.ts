import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeAll, afterAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NextFunction, Response } from 'express';
import cookieParser from 'cookie-parser';

import { CsrfInterceptor } from '@/common/interceptors/csrf.interceptor';
import { RequestIdInterceptor } from '@/common/interceptors/request-id.interceptor';
import { RequestContextInterceptor } from '@/common/interceptors/request-context.interceptor';
import { TimeoutInterceptor } from '@/common/interceptors/timeout.interceptor';
import { TenantContextInterceptor } from '@/shared/modules/interceptors/tenant-context.interceptor';
import { CacheInterceptor } from '@/common/interceptors/cache.interceptor';
import { PatientDataAuditInterceptor } from '@/common/interceptors/patient-audit.interceptor';
import { BreakTheGlassInterceptor } from '@/common/interceptors/emergency-access.interceptor';
import { RequestWithUser } from '@/common/types/common.types';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

class PipelineController {
  getHealth() {
    return { ok: true };
  }
}

Controller('pipeline')(PipelineController);
Get('health')(
  PipelineController.prototype,
  'getHealth',
  Object.getOwnPropertyDescriptor(PipelineController.prototype, 'getHealth')!,
);

@Module({
  controllers: [PipelineController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CsrfInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PatientDataAuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: BreakTheGlassInterceptor,
    },
    {
      provide: ConfigService,
      useValue: {
        get: jest
          .fn<(key: string) => string | undefined>()
          .mockImplementation((key) => {
            if (key === 'NODE_ENV') {
              return 'test';
            }

            return undefined;
          }),
      },
    },
    {
      provide: CACHE_MANAGER,
      useValue: {
        get: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
        set: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      },
    },
    {
      provide: AuditService,
      useValue: {
        logAction: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      },
    },
    {
      provide: Reflector,
      useValue: {
        get: jest.fn().mockReturnValue(false),
      },
    },
    {
      provide: AppConfigService,
      useValue: {
        getConfig: jest.fn().mockReturnValue({}),
        getAppUrl: jest.fn().mockReturnValue('http://localhost:3000'),
        getEnvironment: jest.fn().mockReturnValue('test'),
        isProduction: jest.fn().mockReturnValue(false),
        getRequestTimeoutMs: jest.fn().mockReturnValue(5000),
      },
    },
  ],
})
class InterceptorPipelineTestModule {}

describe('Interceptor Pipeline Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [InterceptorPipelineTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());

    app.use((req: RequestWithUser, _res: Response, next: NextFunction) => {
      (req as unknown as { user: RequestWithUser['user'] }).user = {
        id: 'test-user-1',
        clinicId: 'test-clinic-1',
        role: 'ADMIN',
      } as RequestWithUser['user'];
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('applies global interceptors on request lifecycle', async () => {
    const requestId = 'integration-request-001';

    const response = await request(app.getHttpServer())
      .get('/pipeline/health')
      .set('x-request-id', requestId);

    expect(response.status).toBe(200);
    const cookies = response.get('Set-Cookie') ?? [];

    expect(response.body).toEqual({ ok: true });
    expect(response.headers['x-request-id']).toBe(requestId);
    expect(response.headers['x-correlation-id']).toBe(requestId);
    expect(cookies.some((cookie) => cookie.startsWith('XSRF-TOKEN='))).toBe(
      true,
    );
  });

  it('enforces break-the-glass eligibility checks from interceptor chain', async () => {
    await request(app.getHttpServer())
      .get('/pipeline/health')
      .set('x-break-the-glass', 'true')
      .set('x-btg-reason', 'Emergency access validation')
      .expect(403);
  });
});
