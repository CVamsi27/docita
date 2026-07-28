import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({ status: 'ok' });
        expect(response.body.version).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });
  });
});
