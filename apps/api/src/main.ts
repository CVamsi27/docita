import './instrument';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  type INestApplication,
  LoggerService,
  VersioningType,
} from '@nestjs/common';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
import * as Sentry from '@sentry/nestjs';
import { AllExceptionsFilter } from './shared/modules/error-handling/filters/http-exception.filter';
import { RequestLoggingInterceptor } from './shared/common/interceptors/request-logging.interceptor';
import { CacheInterceptor as _CacheInterceptor } from './shared/common/interceptors/cache.interceptor';
import { MonitoringService } from './shared/modules/monitoring/monitoring/monitoring.service';
import { ObservabilityService } from './shared/modules/services/observability.service';
import {
  getCorsOrigins,
  validateEnv,
  isDevelopment,
} from './shared/modules/config/app-config';
import { AppConfigService } from './shared/modules/config/app-configuration.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {
  json,
  urlencoded,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from 'express';
import { PrismaService } from './prisma/prisma.service';

interface CloseableServer {
  close(callback?: (err?: Error) => void): void;
}

const config = validateEnv();
const appConfigService = new AppConfigService();

if (!isDevelopment()) {
  const originList = getCorsOrigins();
  const originLabels = originList.map((origin) =>
    typeof origin === 'string' ? origin : origin.toString(),
  );
  process.stdout.write(
    `API CORS allowlist (${originLabels.length} origins): ${originLabels.join(', ')}\n`,
  );
}

process.on('warning', (warning) => {
  if (warning.name === 'TimeoutNegativeWarning') {
    return;
  }
});

import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

const API_LOG_MODE = (config.API_LOG_MODE ?? 'access-and-errors')
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
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function waitForDatabase(
  prisma: PrismaService,
  logger: Logger,
): Promise<void> {
  const MAX_ATTEMPTS = 8;
  const BASE_DELAY_MS = 500;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await withTimeout(prisma.$queryRaw`SELECT 1`, 5000);
      if (!ACCESS_AND_ERRORS_ONLY) {
        logger.log(
          attempt === 1
            ? 'Dependency check: database connected'
            : `Dependency check: database connected (attempt ${attempt})`,
        );
      }
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        logger.error(
          `Dependency check: database unavailable after ${MAX_ATTEMPTS} attempts (${error instanceof Error ? error.message : String(error)})`,
        );
        return;
      }

      const delay = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), 8_000);
      logger.warn(
        `Dependency check: database not ready (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delay}ms...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function logExternalDependencyStatus(
  logger: Logger,
  _appConfigService: AppConfigService,
  prisma: PrismaService,
): Promise<void> {
  if (!ACCESS_AND_ERRORS_ONLY) {
    logger.log('Running external dependency checks...');
  }

  await waitForDatabase(prisma, logger);
}

function createBootstrapTimer(): (name: string) => void {
  const bootStart = Date.now();
  const phaseStart: Record<string, number> = {};
  return (name: string) => {
    const now = Date.now();
    const last = phaseStart[name] ?? bootStart;
    const delta = now - last;
    const total = now - bootStart;
    process.stdout.write(`[bootstrap] ${name} +${delta}ms (t=${total}ms)\n`);
    phaseStart[name] = now;
  };
}

function createRawBodySaver() {
  return (
    req: ExpressRequest & { rawBody?: Buffer },
    _res: unknown,
    buf: Buffer,
  ) => {
    if (buf.length > 0) {
      req.rawBody = Buffer.from(buf);
    }
  };
}

async function createApp(markPhase: (name: string) => void) {
  Sentry.setTag('version', appConfigService.getAppVersion());

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  markPhase('NestFactory.create');
  const logger = app.get(Logger);
  app.useLogger(createFilteredBootstrapLogger(logger));
  return { app, logger };
}

async function runStartupValidation(
  app: INestApplication,
  logger: Logger,
): Promise<void> {
  try {
    const { StartupValidationService } =
      await import('./shared/modules/services/startup-validation.service');
    const startupValidator = app.get(StartupValidationService);
    startupValidator.validate();
  } catch (error) {
    logger.error(
      `Startup validation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

function configureBodyParsing(app: INestApplication): void {
  const rawBodySaver = createRawBodySaver();
  app.use(json({ limit: '1mb', verify: rawBodySaver }));
  app.use(urlencoded({ limit: '1mb', extended: true, verify: rawBodySaver }));
}

function configureRobotsRoute(app: INestApplication): void {
  app.use('/robots.txt', (_req: ExpressRequest, res: ExpressResponse) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /');
  });
}

function configureSecurityHeaders(app: INestApplication, apiUrl: string): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
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
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
}

function configureDevelopmentDocsSecurity(
  app: INestApplication,
  apiUrl: string,
): void {
  if (isDevelopment()) {
    app.use(
      '/docs',
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              'https://cdn.jsdelivr.net',
            ],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
            connectSrc: ["'self'", apiUrl],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
          },
        },
      }),
    );
  }
}

function configureSecurity(app: INestApplication): void {
  const apiUrl = appConfigService.getApiUrl();
  configureSecurityHeaders(app, apiUrl);
  configureDevelopmentDocsSecurity(app, apiUrl);
}

function configureGlobalMiddleware(app: INestApplication): PrismaService {
  app.use(cookieParser());

  const monitoringService = app.get(MonitoringService);
  const prismaService = app.get(PrismaService);

  app.useGlobalFilters(
    new AllExceptionsFilter(monitoringService, appConfigService),
  );

  app.useGlobalPipes(new ZodValidationPipe());

  app.useGlobalInterceptors(new RequestLoggingInterceptor(monitoringService));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024,
    }),
  );
  return prismaService;
}

function configureCors(app: INestApplication): void {
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
      'X-XSRF-TOKEN',
      'x-xsrf-token',
    ],
    exposedHeaders: ['X-CSRF-Token'],
    credentials: true,
    maxAge: 86400,
  });
}

function configureRouting(app: INestApplication): void {
  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
}

function configureSwagger(app: INestApplication): void {
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
}

function registerShutdownHandlers(
  app: INestApplication,
  server: CloseableServer,
): void {
  const observabilityService = app.get(ObservabilityService);

  const gracefulShutdown = () => {
    server.close(async () => {
      await observabilityService.flush(5000);

      await app.close();

      process.exit(0);
    });

    setTimeout(() => {
      process.exit(1);
    }, 15000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

function registerExceptionTelemetry(): void {
  process.on('unhandledRejection', (reason) => {
    Sentry.captureException(
      reason instanceof Error ? reason : new Error(String(reason)),
    );
  });

  process.on('uncaughtException', (error) => {
    Sentry.captureException(error);
  });
}

function configureApplication(app: INestApplication): PrismaService {
  configureBodyParsing(app);
  configureRobotsRoute(app);
  configureSecurity(app);
  const prismaService = configureGlobalMiddleware(app);
  configureCors(app);
  configureRouting(app);
  configureSwagger(app);
  return prismaService;
}

async function bootstrap() {
  const markPhase = createBootstrapTimer();
  markPhase('start');

  const { app, logger } = await createApp(markPhase);
  await runStartupValidation(app, logger);

  const prismaService = configureApplication(app);
  markPhase('middleware-and-pipes');

  const server: CloseableServer = await app.listen(config.PORT, '0.0.0.0');
  markPhase('app.listen');

  await logExternalDependencyStatus(logger, appConfigService, prismaService);
  markPhase('dependency-checks');

  registerShutdownHandlers(app, server);
  registerExceptionTelemetry();
}
bootstrap().catch((error: Error) => {
  process.stderr.write(
    `Fatal bootstrap error: ${error?.message ?? String(error)}\n${error?.stack ?? ''}\n`,
  );
  Sentry.captureException(error);
  process.exit(1);
});
