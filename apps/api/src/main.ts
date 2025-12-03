import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { MonitoringService } from './monitoring/monitoring.service';
import * as dotenv from 'dotenv';
import * as path from 'path';
import compression from 'compression';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Suppress TimeoutNegativeWarning from third-party libraries
// This occurs when a calculated timeout value is negative (Node corrects to 1ms)
process.on('warning', (warning) => {
  if (warning.name === 'TimeoutNegativeWarning') {
    return; // Suppress this specific warning
  }
  console.warn(warning);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get monitoring service for filters and interceptors
  const monitoringService = app.get(MonitoringService);

  // Global exception filter for better error messages and error logging
  app.useGlobalFilters(new AllExceptionsFilter(monitoringService));

  // Global interceptor for request logging and performance monitoring
  app.useGlobalInterceptors(new RequestLoggingInterceptor(monitoringService));

  // Global cache interceptor for response caching
  app.useGlobalInterceptors(new CacheInterceptor());

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
    origin: [
      'https://landing.docita.work',
      'https://app.docita.work',
      'https://admin.docita.work',
      'http://localhost:3003', // landing dev
      'http://localhost:3000', // app dev
      'http://localhost:3002', // admin dev
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  const server = await app.listen(port);

  // Graceful shutdown handler for zero-downtime deployments
  // Allows active connections to drain before process exit
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received: starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
      console.log('HTTP server closed, waiting for connections to drain...');
      
      // Close NestJS app (closes database, caches, etc.)
      await app.close();
      console.log('NestJS app closed');
      
      process.exit(0);
    });

    // Force exit after 15 seconds if connections don't drain
    setTimeout(() => {
      console.error('Graceful shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, 15000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
bootstrap();
