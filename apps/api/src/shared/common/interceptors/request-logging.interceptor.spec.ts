import {
  Controller,
  Get,
  INestApplication,
  LoggerService,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RequestLoggingInterceptor } from './request-logging.interceptor';
import { MonitoringService } from '@/shared/modules/monitoring/monitoring/monitoring.service';
import type {
  ApiRequestInput,
  ErrorLogInput,
} from '@/shared/modules/monitoring/monitoring/schemas/monitoring.schema';
import { AllExceptionsFilter } from '@/shared/modules/error-handling/filters/http-exception.filter';

@Controller()
class CapabilityRequestController {
  @Post('api/v1/doctors/signature/upload/:token')
  upload() {
    return { accepted: true };
  }

  @Get('api/v1/public/patient/rx/:token/pdf')
  reject(@Param('token') token: string) {
    throw new UnauthorizedException(
      `Invalid capability at /api/v1/public/patient/rx/${token}/pdf`,
    );
  }
}

describe('request observability capability privacy', () => {
  let app: INestApplication;
  const requests: ApiRequestInput[] = [];
  const errors: ErrorLogInput[] = [];
  const messages: unknown[][] = [];
  const logger: LoggerService = {
    log: (...args: unknown[]) => {
      messages.push(args);
    },
    warn: (...args: unknown[]) => {
      messages.push(args);
    },
    error: (...args: unknown[]) => {
      messages.push(args);
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CapabilityRequestController],
      providers: [
        RequestLoggingInterceptor,
        {
          provide: MonitoringService,
          useValue: {
            logRequest: (data: ApiRequestInput) => requests.push(data),
            logError: (data: ErrorLogInput) => errors.push(data),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(logger);
    app.useGlobalInterceptors(app.get(RequestLoggingInterceptor));
    app.useGlobalFilters(new AllExceptionsFilter(app.get(MonitoringService)));
    await app.init();
  });

  beforeEach(() => {
    requests.length = 0;
    errors.length = 0;
    messages.length = 0;
  });
  afterAll(async () => {
    await app.close();
  });

  it('sanitizes successful requests before persistence and log delivery', async () => {
    const canary = 'synthetic-capability-canary';
    await request(app.getHttpServer())
      .post(`/api/v1/doctors/signature/upload/${canary}?signature=${canary}`)
      .expect(201);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.path).toBe(
      '/api/v1/doctors/signature/upload/[REDACTED]',
    );
    expect(requests[0]?.statusCode).toBe(201);
    expect(JSON.stringify({ requests, messages })).not.toContain(canary);
    expect(JSON.stringify(messages)).toContain(
      'POST /api/v1/doctors/signature/upload/[REDACTED] 201',
    );
  });

  it('sanitizes failed request paths and errors without changing the client response status', async () => {
    const canary = 'synthetic-capability-canary';
    await request(app.getHttpServer())
      .get(`/api/v1/public/patient/rx/${canary}/pdf`)
      .expect(401);

    expect(requests[0]?.path).toBe('/api/v1/public/patient/rx/[REDACTED]/pdf');
    expect(errors[0]?.path).toBe('/api/v1/public/patient/rx/[REDACTED]/pdf');
    expect(JSON.stringify({ requests, errors, messages })).not.toContain(
      canary,
    );
    expect(errors[0]?.statusCode).toBe(401);
  });
});
