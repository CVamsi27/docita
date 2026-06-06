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

import { CsrfInterceptor } from '@/shared/common/interceptors/csrf.interceptor';
import { RequestIdInterceptor } from '@/shared/common/interceptors/request-id.interceptor';
import { RequestContextInterceptor } from '@/shared/common/interceptors/request-context.interceptor';
import { TimeoutInterceptor } from '@/shared/common/interceptors/timeout.interceptor';
import { TenantContextInterceptor } from '@/shared/common/interceptors/tenant-context.interceptor';
import { CacheInterceptor } from '@/shared/common/interceptors/cache.interceptor';
import { PatientDataAuditInterceptor } from '@/shared/common/interceptors/patient-audit.interceptor';
import { BreakTheGlassInterceptor } from '@/shared/common/interceptors/emergency-access.interceptor';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { PrismaService } from '@/prisma/prisma.service';
import { clockPortTestProvider } from '@/test-utils';

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
            if (key === 'NODE_ENV') return 'test';

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
    clockPortTestProvider(),
    {
      provide: AppConfigService,
      useValue: {
        getConfig: jest.fn().mockReturnValue({}),
        getAppUrl: jest.fn().mockReturnValue('http://localhost:3000'),
        getFrontendAppUrl: jest.fn().mockReturnValue('http://localhost:3000'),
        getApiUrl: jest.fn().mockReturnValue('http://localhost:3001/api/v1'),
        getSharedCookieDomain: jest.fn().mockReturnValue(undefined),
        getEnvironment: jest.fn().mockReturnValue('test'),
        isProduction: jest.fn().mockReturnValue(false),
        isRlsEnabled: jest.fn().mockReturnValue(false),
        getRequestTimeoutMs: jest.fn().mockReturnValue(5000),
      },
    },
    {
      provide: PrismaService,
      useValue: {
        $transaction: jest
          .fn<(fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>>()
          .mockImplementation((fn) =>
            fn({
              $executeRawUnsafe: jest
                .fn<() => Promise<number>>()
                .mockResolvedValue(0),
            }),
          ),
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

type PipelineHttpResponse = {
  cookie: (name: string, value: string) => void;
  setHeader: (name: string, value: string) => void;
  status: (code: number) => PipelineHttpResponse;
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
    new TenantContextInterceptor(
      moduleFixture.get(PrismaService),
      moduleFixture.get(AppConfigService),
    ),
    new CacheInterceptor(moduleFixture.get(CACHE_MANAGER)),
    new PatientDataAuditInterceptor(moduleFixture.get(AuditService)),
    new BreakTheGlassInterceptor(
      moduleFixture.get(Reflector),
      moduleFixture.get(AuditService),
      { now: () => new Date('2026-05-19T12:00:00.000Z') },
    ),
  ];

  const body = await invokeInterceptors(
    interceptors as Parameters<typeof invokeInterceptors>[0],
    context,
  );

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
): PipelineHttpResponse {
  const response: PipelineHttpResponse = {
    cookie: jest.fn((name: string, value: string) => {
      cookies.push(`${name}=${value}`);
    }),
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    status: jest.fn((code: number) => {
      setStatusCode(code);
      return response;
    }),
  };

  return response;
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
      getResponse: () => PipelineHttpResponse;
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
