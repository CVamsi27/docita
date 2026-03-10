import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService, VersioningType } from '@nestjs/common';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
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
import * as redis from 'redis';
import { PrismaService } from './prisma/prisma.service';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = validateEnv();

process.on('warning', (warning) => {
  if (warning.name === 'TimeoutNegativeWarning') {
    return;
  }
});

import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

const API_LOG_MODE = (process.env.API_LOG_MODE ?? 'access-and-errors')
  .toLowerCase()
  .trim();
const ACCESS_AND_ERRORS_ONLY = API_LOG_MODE !== 'default';
const ACCESS_LOG_CONTEXTS = new Set(['RequestLoggingInterceptor']);

function extractLogContext(optionalParams: unknown[]): string | undefined {
  const contextCandidates = optionalParams.filter(
    (param): param is string => typeof param === 'string',
  );

  return contextCandidates.length > 0
    ? contextCandidates[contextCandidates.length - 1]
    : undefined;
}

function shouldEmitAccessLog(optionalParams: unknown[]): boolean {
  const context = extractLogContext(optionalParams);
  return Boolean(context && ACCESS_LOG_CONTEXTS.has(context));
}

function createFilteredBootstrapLogger(baseLogger: Logger): LoggerService {
  return {
    log(message: unknown, ...optionalParams: unknown[]) {
      if (ACCESS_AND_ERRORS_ONLY && !shouldEmitAccessLog(optionalParams)) {
        return;
      }

      baseLogger.log(message, ...optionalParams);
    },
    error(message: unknown, ...optionalParams: unknown[]) {
      baseLogger.error(message, ...optionalParams);
    },
    warn(message: unknown, ...optionalParams: unknown[]) {
      if (ACCESS_AND_ERRORS_ONLY) {
        return;
      }

      baseLogger.warn(message, ...optionalParams);
    },
    debug(message: unknown, ...optionalParams: unknown[]) {
      if (ACCESS_AND_ERRORS_ONLY) {
        return;
      }

      baseLogger.debug?.(message, ...optionalParams);
    },
    verbose(message: unknown, ...optionalParams: unknown[]) {
      if (ACCESS_AND_ERRORS_ONLY) {
        return;
      }

      baseLogger.verbose?.(message, ...optionalParams);
    },
    fatal(message: unknown, ...optionalParams: unknown[]) {
      baseLogger.fatal?.(message, ...optionalParams);
    },
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    }),
  ]);
}

async function logExternalDependencyStatus(
  logger: Logger,
  appConfigService: AppConfigService,
  prisma: PrismaService,
): Promise<void> {
  if (!ACCESS_AND_ERRORS_ONLY) {
    logger.log('Running external dependency checks...');
  }

  // Database connection check
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000);
    if (!ACCESS_AND_ERRORS_ONLY) {
      logger.log('Dependency check: database connected');
    }
  } catch (error) {
    logger.error(
      `Dependency check: database unavailable (${error instanceof Error ? error.message : String(error)})`,
    );
  }

  // Redis connection check (required when redis cache/queue is configured)
  const redisConfig = appConfigService.getRedisConfig();
  const cacheProvider = appConfigService.getCacheProvider();
  const queueProvider = appConfigService.getQueueProvider();
  const redisConfigured =
    Boolean(redisConfig.url) || Boolean(redisConfig.host && redisConfig.port);
  const redisExpected = cacheProvider === 'redis' || queueProvider === 'bull';

  if (!redisConfigured) {
    if (redisExpected) {
      logger.error(
        'Dependency check: redis configuration missing while cache/queue expects redis',
      );
    } else if (!ACCESS_AND_ERRORS_ONLY) {
      logger.warn(
        'Dependency check: redis not configured (optional in current mode)',
      );
    }
  } else {
    const redisClient = redis.createClient(
      redisConfig.url
        ? { url: redisConfig.url }
        : {
            socket: {
              host: redisConfig.host,
              port: redisConfig.port,
            },
            username: redisConfig.username,
            password: redisConfig.password,
          },
    );

    try {
      await withTimeout(redisClient.connect(), 4000);
      await withTimeout(redisClient.ping(), 4000);
      if (!ACCESS_AND_ERRORS_ONLY) {
        logger.log('Dependency check: redis connected');
      }
    } catch (error) {
      if (redisExpected) {
        logger.error(
          `Dependency check: redis unavailable (${error instanceof Error ? error.message : String(error)})`,
        );
      } else if (!ACCESS_AND_ERRORS_ONLY) {
        logger.warn(
          `Dependency check: redis unavailable (${error instanceof Error ? error.message : String(error)})`,
        );
      }
    } finally {
      await redisClient.quit().catch(() => undefined);
    }
  }
}

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
  const logger = app.get(Logger);
  app.useLogger(createFilteredBootstrapLogger(logger));

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
  const prismaService = app.get(PrismaService);

  await logExternalDependencyStatus(logger, appConfigService, prismaService);

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
    SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document), {
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
