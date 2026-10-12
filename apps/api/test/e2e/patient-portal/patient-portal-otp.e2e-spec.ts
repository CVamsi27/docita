import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { PatientPortalAuthService } from '@/domains/patient-portal/application/services/patient-portal-auth.service';
import {
  PORTAL_AUTH_REPOSITORY_TOKEN,
  type IPortalAuthRepository,
} from '@/domains/patient-portal/core/repositories/portal-auth.repository.interface';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

/**
 * S02 — single-use capability consumption races.
 *
 * The portal OTP must mint at most one session. Two concurrent verifies that
 * both present the same valid code can both pass attempt consumption and
 * bcrypt.compare, so the `usedAt: null` conditional claim is the only thing
 * that decides the winner; the loser must receive a controlled rejection.
 */
describe('Patient portal OTP single-use claim (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: PatientPortalAuthService;
  let repository: IPortalAuthRepository;

  const PHONE = '+919876500123';

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
    authService = moduleFixture.get<PatientPortalAuthService>(
      PatientPortalAuthService,
    );
    repository = moduleFixture.get<IPortalAuthRepository>(
      PORTAL_AUTH_REPOSITORY_TOKEN,
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  async function seedOtp(phone: string): Promise<{ id: string }> {
    const clinic = await factories.clinic();
    await factories.patient(clinic.id, { phoneNumber: phone });
    return prisma.patientOtp.create({
      data: {
        phoneNumber: phone,
        otpHash: await bcrypt.hash('123456', 4),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  }

  it('issues exactly one session when two verifies race with the same valid OTP', async () => {
    await seedOtp(PHONE);

    const results = await Promise.allSettled([
      authService.verifyOtp(PHONE, '123456'),
      authService.verifyOtp(PHONE, '123456'),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const otp = await prisma.patientOtp.findFirst({
      where: { phoneNumber: PHONE },
      orderBy: { createdAt: 'desc' },
    });
    expect(otp?.usedAt).not.toBeNull();
  });

  it('elects exactly one winner among parallel single-use claims', async () => {
    const otp = await seedOtp(PHONE);

    const claims = await Promise.all(
      Array.from({ length: 10 }, () => repository.tryMarkOtpUsed(otp.id)),
    );

    expect(claims.filter(Boolean)).toHaveLength(1);

    const row = await prisma.patientOtp.findUnique({ where: { id: otp.id } });
    expect(row?.usedAt).not.toBeNull();
  });
});
