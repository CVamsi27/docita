import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import cookieParser from 'cookie-parser';

import { CsrfInterceptor } from '../interceptors/csrf.interceptor';
import { RequestIdInterceptor } from '../interceptors/request-id.interceptor';
import { RequestContextInterceptor } from '../interceptors/request-context.interceptor';
import { TimeoutInterceptor } from '../interceptors/timeout.interceptor';
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor';
import { CacheInterceptor } from '../interceptors/cache.interceptor';
import { PatientDataAuditInterceptor } from '../interceptors/patient-audit.interceptor';
import { BreakTheGlassInterceptor } from '../interceptors/emergency-access.interceptor';
import { AuditService } from '../../modules/audit/audit.service';

@Controller('pipeline')
class PipelineController {
  @Get('health')
  getHealth() {
    return { ok: true };
  }
}

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
        get: jest.fn().mockImplementation((key: string) => {
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
        get: jest.fn().mockResolvedValue(undefined),
        set: jest.fn().mockResolvedValue(undefined),
      },
    },
    {
      provide: AuditService,
      useValue: {
        logAction: jest.fn().mockResolvedValue(undefined),
      },
    },
    {
      provide: Reflector,
      useValue: {
        get: jest.fn().mockReturnValue(false),
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('applies global interceptors on request lifecycle', async () => {
    const requestId = 'integration-request-001';

    const response = await request(app.getHttpServer())
      .get('/pipeline/health')
      .set('x-request-id', requestId)
      .expect(200);

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
