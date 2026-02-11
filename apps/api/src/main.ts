import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { MonitoringService } from './modules/monitoring/monitoring.service';
import {
  getCorsOrigins,
  validateEnv,
  isDevelopment,
} from './common/config/app-config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as path from 'path';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

// Load environment variables first
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Validate environment configuration (fail fast if invalid)
validateEnv();

// Suppress TimeoutNegativeWarning from third-party libraries
// This occurs when a calculated timeout value is negative (Node corrects to 1ms)
process.on('warning', (warning) => {
  if (warning.name === 'TimeoutNegativeWarning') {
    return; // Suppress this specific warning
  }
  console.warn(warning);
});

import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

async function bootstrap() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    ),
    profilesSampleRate: 1.0,
  });

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Request body size limits
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));

  // Security Headers
  app.use(helmet());

  // Cookie Parser
  app.use(cookieParser());

  // Get monitoring service for filters and interceptors
  const monitoringService = app.get(MonitoringService);

  // Global exception filter for better error messages and error logging
  app.useGlobalFilters(new AllExceptionsFilter(monitoringService));

  // Global Zod Validation Pipe
  app.useGlobalPipes(new ZodValidationPipe());

  // Global interceptor for request logging and performance monitoring
  app.useGlobalInterceptors(new RequestLoggingInterceptor(monitoringService));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Global cache interceptor is now registered in AppModule to support DI

  // Enable compression (gzip/brotli) for responses
  app.use(
    compression({
      filter: (req, res) => {
        // Don't compress responses with this header
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Compress all other responses
        return compression.filter(req, res);
      },
      // Compression level (0-9, higher = better compression but slower)
      level: 6,
      // Minimum response size to compress (in bytes)
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
    maxAge: 86400, // Cache preflight response for 24 hours
  });

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Swagger/OpenAPI Documentation (only in development)
  if (isDevelopment()) {
    const config = new DocumentBuilder()
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

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    console.log('📚 Swagger docs available at /api/docs');
  }

  const port = process.env.PORT || 3001;
  const server = await app.listen(port);

  // Graceful shutdown handler for zero-downtime deployments
  // Allows active connections to drain before process exit
  const gracefulShutdown = (signal: string) => {
    // Stop accepting new connections
    server.close(async () => {
      // Close NestJS app (closes database, caches, etc.)
      await app.close();

      process.exit(0);
    });

    // Force exit after 15 seconds if connections don't drain
    setTimeout(() => {
      console.error('Graceful shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, 15000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}
bootstrap();
