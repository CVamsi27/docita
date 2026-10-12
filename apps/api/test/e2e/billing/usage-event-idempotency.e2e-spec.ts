import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { UsageType } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';
import { UsageTrackingCommandService } from '@/domains/billing/core/services/usage-tracking-command.service';
import {
  USAGE_REPOSITORY_TOKEN,
  type IUsageRepository,
} from '@/domains/billing/core/repositories/usage.repository';

describe('Usage event accounting identity (e2e)', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;
  let usageRepo: IUsageRepository;
  let usageCommands: UsageTrackingCommandService;
  let clinicId: string;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappMockToken)
      .useValue(mockWhatsappService)
      .compile();

    const nestApp = moduleFixture.createNestApplication();
    nestApp.useLogger(false);
    nestApp.useGlobalPipes(new ZodValidationPipe());
    await nestApp.init();
    app = nestApp;

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);

    usageRepo = nestApp.get<IUsageRepository>(USAGE_REPOSITORY_TOKEN, {
      strict: false,
    });
    usageCommands = nestApp.get<UsageTrackingCommandService>(
      UsageTrackingCommandService,
      { strict: false },
    );
  });

  beforeEach(async () => {
    if (!prisma) throw new Error('E2E app not initialized');
    await resetDatabase();
    const clinic = await factories.clinic();
    clinicId = clinic.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  // Deliberately unannotated: annotating the return as CreateUsageEventParams
  // widens entityType to `string | null`, which the command service's
  // `entityType?: string` parameter rejects. Each call site checks one contract.
  const appointmentEvent = (entityId: string, quantity: number) => ({
    clinicId,
    type: UsageType.APPOINTMENTS,
    quantity,
    entityType: 'Appointment',
    entityId,
    eventKey: `${clinicId}:APPOINTMENTS:Appointment:${entityId}`,
  });

  it('lets exactly one of many parallel duplicate eventKey writes win', async () => {
    if (!prisma) throw new Error('E2E app not initialized');
    const params = appointmentEvent('appt_race', 5);

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => usageRepo.createUsageEvent(params)),
    );

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    const outcomes = results.flatMap((r) =>
      r.status === 'fulfilled' ? [r.value] : [],
    );
    expect(outcomes.filter((won) => won === true)).toHaveLength(1);
    expect(outcomes.filter((won) => won === false)).toHaveLength(7);

    const rows = await prisma.usageEvent.findMany({
      where: { eventKey: params.eventKey },
      select: { quantity: true },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.quantity).toBe(5);
  });

  it('keeps repeated and retried service recordings to one row with unchanged totals', async () => {
    if (!prisma) throw new Error('E2E app not initialized');
    const params = appointmentEvent('appt_rerun', 7);

    await usageCommands.recordUsageEvent(params);
    await usageCommands.recordUsageEvent(params);

    const retried = await Promise.allSettled(
      Array.from({ length: 4 }, () => usageCommands.recordUsageEvent(params)),
    );
    expect(retried.every((r) => r.status === 'fulfilled')).toBe(true);

    const rows = await prisma.usageEvent.findMany({
      where: { eventKey: params.eventKey },
      select: { quantity: true },
    });
    expect(rows).toHaveLength(1);
    const total = rows.reduce((sum, row) => sum + row.quantity, 0);
    expect(total).toBe(7);
  });

  it('treats distinct entity ids as distinct accounting identities under parallelism', async () => {
    if (!prisma) throw new Error('E2E app not initialized');
    const entityIds = ['appt_a', 'appt_b', 'appt_c'];

    const results = await Promise.allSettled(
      entityIds.map((entityId) =>
        usageRepo.createUsageEvent(appointmentEvent(entityId, 3)),
      ),
    );

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(
      results.filter((r) => r.status === 'fulfilled' && r.value === true),
    ).toHaveLength(3);

    const rows = await prisma.usageEvent.count({
      where: { clinicId, type: UsageType.APPOINTMENTS },
    });
    expect(rows).toBe(3);
  });
});
