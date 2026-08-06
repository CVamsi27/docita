import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { DoctorVerificationStatus, Role } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';
import { signE2eAccessToken } from '../../e2e-auth-token';

const OVERRIDE_ACTION = 'DOCTOR_VERIFICATION_OVERRIDDEN';

describe('Doctor verification override audit trail (P5.18 e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let clinicId: string;
  let doctorId: string;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();

    const clinic = await factories.clinic();
    clinicId = clinic.id;

    const doctor = await factories.user({
      clinicId,
      role: Role.DOCTOR,
      registrationNumber: 'MCI-12345',
      registrationCouncil: 'MCI',
      verificationStatus: DoctorVerificationStatus.UNVERIFIED,
    });
    doctorId = doctor.user.id;

    const admin = await factories.user({
      clinicId,
      role: Role.INTERNAL,
    });
    adminId = admin.user.id;

    adminToken = signE2eAccessToken(jwtService, {
      sub: admin.user.id,
      email: admin.user.email,
      role: admin.user.role,
      name: admin.user.name,
      clinicId: admin.user.clinicId,
    });
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  const findOverrideAuditRows = () =>
    prisma.auditLog.findMany({
      where: {
        entityType: 'Doctor',
        entityId: doctorId,
        action: OVERRIDE_ACTION,
      },
      orderBy: { createdAt: 'desc' },
    });

  // JSON columns may arrive as parsed objects or as strings depending on the
  // driver; normalize before asserting so the spec is adapter-agnostic.
  const asRecord = (value: unknown): Record<string, unknown> => {
    if (typeof value === 'string') return JSON.parse(value);
    if (value && typeof value === 'object')
      return value as Record<string, unknown>;
    return {};
  };

  it('rejects an override without a support ticket id (400, no audit row, no status change)', async () => {
    const before = await prisma.auditLog.count();

    await request(app.getHttpServer())
      .post(`/internal/doctors/${doctorId}/admin-verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'looks good' })
      .expect(400);

    const after = await prisma.auditLog.count();
    expect(after).toBe(before);

    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    expect(doctor?.verificationStatus).toBe(
      DoctorVerificationStatus.UNVERIFIED,
    );
  });

  it('verifies a doctor with a ticket id and writes the audit row', async () => {
    await request(app.getHttpServer())
      .post(`/internal/doctors/${doctorId}/admin-verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ticketId: 'SUP-12345', note: 'verified via support' })
      .expect(201);

    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    expect(doctor?.verificationStatus).toBe(DoctorVerificationStatus.VERIFIED);
    expect(doctor?.verificationSource).toBe('MANUAL_ADMIN');
    expect(doctor?.verifiedByAdminId).toBe(adminId);

    const rows = await findOverrideAuditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe(adminId);
    expect(rows[0]?.clinicId).toBe(clinicId);
    expect(asRecord(rows[0]?.metadata)).toMatchObject({
      ticketId: 'SUP-12345',
      decision: DoctorVerificationStatus.VERIFIED,
      note: 'verified via support',
    });
    expect(asRecord(rows[0]?.newValue)).toMatchObject({
      verificationStatus: {
        before: DoctorVerificationStatus.UNVERIFIED,
        after: DoctorVerificationStatus.VERIFIED,
      },
    });
  });

  it('rejects a doctor with a ticket id and writes the audit row', async () => {
    await request(app.getHttpServer())
      .post(`/internal/doctors/${doctorId}/admin-reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ticketId: 'SUP-67890', reason: 'Invalid registration document' })
      .expect(201);

    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    expect(doctor?.verificationStatus).toBe(DoctorVerificationStatus.REJECTED);
    expect(doctor?.verificationReason).toBe('Invalid registration document');

    const rows = await findOverrideAuditRows();
    expect(rows).toHaveLength(1);
    expect(asRecord(rows[0]?.metadata)).toMatchObject({
      ticketId: 'SUP-67890',
      decision: DoctorVerificationStatus.REJECTED,
    });
  });

  it('blocks non-INTERNAL roles from overriding verification (403)', async () => {
    const doctorUser = await factories.user({
      clinicId,
      role: Role.DOCTOR,
    });
    const doctorToken = signE2eAccessToken(jwtService, {
      sub: doctorUser.user.id,
      email: doctorUser.user.email,
      role: doctorUser.user.role,
      name: doctorUser.user.name,
      clinicId: doctorUser.user.clinicId,
    });

    await request(app.getHttpServer())
      .post(`/internal/doctors/${doctorId}/admin-verify`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ ticketId: 'SUP-12345' })
      .expect(403);

    const rows = await findOverrideAuditRows();
    expect(rows).toHaveLength(0);

    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    expect(doctor?.verificationStatus).toBe(
      DoctorVerificationStatus.UNVERIFIED,
    );
  });
});
