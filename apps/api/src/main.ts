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
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
