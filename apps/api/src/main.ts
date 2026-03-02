import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import * as Sentry from '@sentry/nestjs';
import { AllExceptionsFilter } from './shared/modules/error-handling/filters/http-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { MonitoringService } from './shared/modules/monitoring/monitoring/monitoring.service';
import { ObservabilityService } from './shared/modules/services/observability.service';
import {
  getCorsOrigins,
  validateEnv,
  isDevelopment,
  getEnv,
} from './shared/modules/config/app-config';
import { AppConfigService } from './shared/modules/config/app-configuration.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as path from 'path';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = validateEnv();

process.on('warning', (warning) => {
  if (warning.name === 'TimeoutNegativeWarning') {
    return;
  }
});

import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

async function bootstrap() {
  interface SentryIntegration {
    name: string;
    setupOnce: () => void;
  }
  const isSentryIntegration = (value: unknown): value is SentryIntegration => {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as {
      name?: unknown;
      setupOnce?: unknown;
    };
    return (
      typeof candidate.name === 'string' &&
      typeof candidate.setupOnce === 'function'
    );
  };

  const integrations: SentryIntegration[] = [];
  try {
    const { nodeProfilingIntegration } = await import('@sentry/profiling-node');
    const profilingIntegration = nodeProfilingIntegration();
    if (isSentryIntegration(profilingIntegration)) {
      integrations.push(profilingIntegration);
    }
  } catch (error) {
    // Sentry profiling integration failure ignored
  }

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    integrations,
    tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
    profilesSampleRate:
      config.NODE_ENV === 'production'
        ? config.SENTRY_PROFILES_SAMPLE_RATE
        : 1.0,
    maxBreadcrumbs: 50,
    attachStacktrace: true,
    initialScope: {
      tags: {
        service: 'docita-api',
        version: config.APP_VERSION,
      },
    },
  });

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  try {
    const { StartupValidationService } =
      await import('./shared/modules/services/startup-validation.service');
    const startupValidator = app.get(StartupValidationService);
    startupValidator.validate();
  } catch (error) {
    process.exit(1);
  }

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));

  const configService = app.get(AppConfigService);
  const apiUrl = configService.getApiUrl();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", apiUrl],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(cookieParser());

  const monitoringService = app.get(MonitoringService);
  const appConfigService = app.get(AppConfigService);

  app.useGlobalFilters(
    new AllExceptionsFilter(monitoringService, appConfigService),
  );

  app.useGlobalPipes(new ZodValidationPipe());

  app.useGlobalInterceptors(new RequestLoggingInterceptor(monitoringService));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024,
    }),
  );

  app.enableCors({
    origin: getCorsOrigins(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Cache-Control',
      'Pragma',
    ],
    credentials: true,
    maxAge: 86400,
  });

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  if (isDevelopment()) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Docita API')
      .setDescription(
        'Healthcare practice management API for appointments, patients, prescriptions, and billing.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('patients', 'Patient management')
      .addTag('appointments', 'Appointment scheduling')
      .addTag('prescriptions', 'Prescription management')
      .addTag('invoices', 'Billing and invoices')
      .addTag('clinics', 'Clinic management')
      .addTag('whatsapp', 'WhatsApp messaging')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = config.PORT;
  const server = await app.listen(port);

  const observabilityService = app.get(ObservabilityService);

  const gracefulShutdown = (signal: string) => {
    server.close(async () => {
      await observabilityService.flush(5000);

      await app.close();

      process.exit(0);
    });

    setTimeout(() => {
      process.exit(1);
    }, 15000);
  };

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });

  process.on('unhandledRejection', (reason) => {
    Sentry.captureException(
      reason instanceof Error ? reason : new Error(String(reason)),
    );
  });

  process.on('uncaughtException', (error) => {
    Sentry.captureException(error);
  });
}
bootstrap().catch((error: Error) => {
  Sentry.captureException(error);
  process.exit(1);
});
