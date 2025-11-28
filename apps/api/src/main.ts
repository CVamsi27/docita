import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
}
bootstrap();
