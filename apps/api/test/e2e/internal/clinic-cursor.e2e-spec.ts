import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { internalClinicListResponseSchema } from '@workspace/types';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicManagementService } from '@/shared/modules/internal/clinic-management.service';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';
import { factories, setPrismaInstance } from '../../factories';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';

describe('Internal clinic cursor contract (e2e)', () => {
  let app: INestApplication;
  let service: ClinicManagementService;

  beforeAll(async () => {
    setupTestDatabase();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappMockToken)
      .useValue(mockWhatsappService)
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
    service = module.get(ClinicManagementService);
    setPrismaInstance(module.get(PrismaService));
  });
  beforeEach(async () => {
    await resetDatabase();
  });
  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  it('returns all tied-time facilities across two valid cursor pages without overlap', async () => {
    const createdAt = new Date('2026-10-08T00:00:00Z');
    const seeded = await Promise.all(
      Array.from({ length: 51 }, (_, index) =>
        factories.clinic({
          name: `Cursor Facility ${index}`,
          email: `cursor-${index}@example.test`,
          createdAt,
        }),
      ),
    );
    const first = internalClinicListResponseSchema.parse(
      await service.getAllClinics({ limit: 50 }),
    );
    expect(first.items).toHaveLength(50);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).toBeDefined();
    const second = internalClinicListResponseSchema.parse(
      await service.getAllClinics({ limit: 50, cursor: first.nextCursor }),
    );
    expect(second.items).toHaveLength(1);
    expect(second.hasMore).toBe(false);
    const combined = [...first.items, ...second.items].map(
      (clinic) => clinic.id,
    );
    expect(new Set(combined).size).toBe(51);
    expect(combined.sort()).toEqual(seeded.map((clinic) => clinic.id).sort());
    const repeated = internalClinicListResponseSchema.parse(
      await service.getAllClinics({ limit: 50 }),
    );
    expect(repeated.items.map((clinic) => clinic.id)).toEqual(
      first.items.map((clinic) => clinic.id),
    );
  });
});
