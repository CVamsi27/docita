import {
  CallHandler,
  Controller,
  ForbiddenException,
  Get,
  Module,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Request, Response } from 'express';
import { from, lastValueFrom, of } from 'rxjs';

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
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [InterceptorPipelineTestModule],
    }).compile();
  });

  it('applies global interceptors on request lifecycle', async () => {
    const requestId = 'integration-request-001';

    const response = await runPipeline({
      moduleFixture,
      request: {
        headers: { 'x-request-id': requestId },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(response.headers['X-Request-ID']).toBe(requestId);
    expect(response.headers['x-correlation-id']).toBe(requestId);
    expect(
      response.cookies.some((cookie) => cookie.startsWith('XSRF-TOKEN=')),
    ).toBe(true);
  });

  it('enforces break-the-glass eligibility checks from interceptor chain', async () => {
    await expect(
      runPipeline({
        moduleFixture,
        request: {
          headers: {
            'x-break-the-glass': 'true',
            'x-btg-reason': 'Emergency access validation',
          },
        },
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});

type PipelineRequest = Partial<RequestWithUser> & {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
};

type PipelineResponse = {
  body: unknown;
  cookies: string[];
  headers: Record<string, string>;
  statusCode: number;
};

async function runPipeline({
  moduleFixture,
  request,
}: {
  moduleFixture: TestingModule;
  request: PipelineRequest;
}): Promise<PipelineResponse> {
  const headers: Record<string, string> = {};
  const cookies: string[] = [];
  let statusCode = 200;

  const req = createRequest(request);
  const res = createResponse(headers, cookies, (code) => {
    statusCode = code;
  });

  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => PipelineController.prototype.getHealth,
  };

  const interceptors = [
    new CsrfInterceptor(moduleFixture.get(AppConfigService)),
    new RequestIdInterceptor(),
    new RequestContextInterceptor(),
    new TimeoutInterceptor(moduleFixture.get(AppConfigService)),
    new TenantContextInterceptor(),
    new CacheInterceptor(moduleFixture.get(CACHE_MANAGER)),
    new PatientDataAuditInterceptor(moduleFixture.get(AuditService)),
    new BreakTheGlassInterceptor(
      moduleFixture.get(Reflector),
      moduleFixture.get(AuditService),
    ),
  ];

  const body = await invokeInterceptors(interceptors, context);

  return {
    body,
    cookies,
    headers,
    statusCode,
  };
}

function createRequest(request: PipelineRequest): RequestWithUser {
  const headers = request.headers ?? {};

  return {
    method: 'GET',
    url: '/pipeline/health',
    headers,
    cookies: request.cookies ?? {},
    params: request.params ?? {},
    query: request.query ?? {},
    body: request.body ?? {},
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    user: {
      id: 'test-user-1',
      clinicId: 'test-clinic-1',
      role: 'ADMIN',
    },
    get: jest.fn((name: string) => headers[name.toLowerCase()]),
    ...request,
  } as RequestWithUser;
}

function createResponse(
  headers: Record<string, string>,
  cookies: string[],
  setStatusCode: (code: number) => void,
): Response {
  return {
    cookie: jest.fn((name: string, value: string) => {
      cookies.push(`${name}=${value}`);
    }),
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    status: jest.fn((code: number) => {
      setStatusCode(code);
      return undefined;
    }),
  } as unknown as Response;
}

async function invokeInterceptors(
  interceptors: Array<{
    intercept: (
      context: unknown,
      next: CallHandler,
    ) =>
      | ReturnType<CallHandler['handle']>
      | Promise<ReturnType<CallHandler['handle']>>;
  }>,
  context: {
    switchToHttp: () => {
      getRequest: () => RequestWithUser;
      getResponse: () => Response;
    };
    getHandler: () => typeof PipelineController.prototype.getHealth;
  },
  index = 0,
): Promise<unknown> {
  if (index >= interceptors.length) {
    return { ok: true };
  }

  const interceptor = interceptors[index];
  const next: CallHandler = {
    handle: () => from(invokeInterceptors(interceptors, context, index + 1)),
  };

  return lastValueFrom(
    await Promise.resolve(interceptor.intercept(context, next)),
  );
}
