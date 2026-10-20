import { randomBytes } from 'node:crypto';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import {
  Prisma,
  PaymentSessionStatus,
  createUtcPoolConfig,
} from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { EncryptionService } from '@/shared/common/encryption.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { buildAppConfigService } from '@/shared/modules/config/app-config.builder';
import { getCurrentTenant } from '@/shared/common/middleware/tenant.middleware';
import { activeTxStorage } from '@/shared/modules/rls/active-tx.storage';
import { RlsService } from '@/shared/modules/rls/rls.service';
import { PublicPatientDocumentsController } from '@/shared/modules/public/public-patient-documents.controller';
import { PublicPatientDocumentsService } from '@/shared/modules/public/public-patient-documents.service';
import { PublicDocumentTokenService } from '@/shared/modules/public/public-document-token.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { PrescriptionPdfOrchestratorService } from '@/domains/prescriptions/application/services/prescription-pdf-orchestrator.service';
import { InvoicesService } from '@/domains/billing/application/services/invoices.service';
import {
  closeDatabase,
  getPrismaInstance,
  resetDatabase,
  setupTestDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

describe('Anonymous patient capabilities with tenant guards and non-owner RLS', () => {
  let app: INestApplication;
  let raw: ReturnType<typeof getPrismaInstance>;
  let guarded: PrismaService;
  let tokenService: PublicDocumentTokenService;
  let admin: Client;
  let clinicId: string;
  let invoiceId: string;
  let prescriptionId: string;
  let sessionId: string;
  const appRole = `public_capability_${randomBytes(8).toString('hex')}`;
  const storedFiles = new Map<string, Buffer>();

  async function assertDocumentScope(model: 'Invoice' | 'Prescription') {
    const tenant = getCurrentTenant();
    expect(tenant).toMatchObject({ clinicId });
    expect(tenant?.bypassed).not.toBe(true);
    const tx = activeTxStorage.getStore()?.tx;
    if (!tx) throw new Error('Document generation has no scoped transaction');
    const scope = await tx.$queryRaw<
      Array<{ enabled: string; clinic: string }>
    >`SELECT current_setting('app.rls_enabled') AS enabled,
        current_setting('app.current_clinic_id') AS clinic`;
    expect(scope).toEqual([{ enabled: 'on', clinic: clinicId }]);
    const rows = await tx.$queryRaw<Array<{ count: number }>>(
      model === 'Invoice'
        ? Prisma.sql`SELECT count(*)::int AS count FROM "Invoice"`
        : Prisma.sql`SELECT count(*)::int AS count FROM "Prescription"`,
    );
    expect(rows).toEqual([{ count: 1 }]);
  }

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('An owned test DATABASE_URL is required');
    const url = new URL(databaseUrl);
    expect(['localhost', '127.0.0.1', '[::1]']).toContain(url.hostname);
    expect(url.pathname).toMatch(
      /^\/docita_(?:test|[a-z_]+(?:_test|stability))$/,
    );
    setupTestDatabase();
    raw = getPrismaInstance();
    setPrismaInstance(raw);
    admin = new Client(createUtcPoolConfig({ connectionString: databaseUrl }));
    await admin.connect();
    const password = randomBytes(24).toString('hex');
    await admin.query(
      `CREATE ROLE ${appRole} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD '${password}'`,
    );
    await admin.query(`GRANT USAGE ON SCHEMA public TO ${appRole}`);
    await admin.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${appRole}`,
    );
    for (const table of ['PaymentSession', 'Invoice', 'Prescription']) {
      await admin.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      await admin.query(`CREATE POLICY tenant_isolation ON "${table}"
        USING (current_setting('app.rls_enabled', true) IS DISTINCT FROM 'on'
          OR "clinicId" = current_setting('app.current_clinic_id', true))
        WITH CHECK (current_setting('app.rls_enabled', true) IS DISTINCT FROM 'on'
          OR "clinicId" = current_setting('app.current_clinic_id', true))`);
    }
    url.username = appRole;
    url.password = password;
    url.searchParams.delete('user');
    url.searchParams.delete('password');
    const config = buildAppConfigService();
    jest.spyOn(config, 'getDatabaseUrl').mockReturnValue(url.toString());
    jest.spyOn(config, 'isRlsEnabled').mockReturnValue(true);
    const moduleFixture = await Test.createTestingModule({
      controllers: [PublicPatientDocumentsController],
      providers: [
        { provide: AppConfigService, useValue: config },
        EncryptionService,
        PrismaService,
        RlsService,
        PublicDocumentTokenService,
        PublicPatientDocumentsService,
        {
          provide: StorageProvider,
          useValue: {
            getObject: async (key: string) => {
              const buffer = storedFiles.get(key);
              if (!buffer) throw new NotFoundException('Stored PDF not found');
              return { buffer, contentType: 'application/pdf' };
            },
          },
        },
        {
          provide: PrescriptionPdfOrchestratorService,
          useValue: {
            generatePDF: async (id: string, resolvedClinic: string) => {
              expect(id).toBe(prescriptionId);
              expect(resolvedClinic).toBe(clinicId);
              await assertDocumentScope('Prescription');
              await guarded.prescription.findUniqueOrThrow({
                where: { id, clinicId: resolvedClinic },
              });
              return Buffer.from('%PDF-generated-prescription');
            },
          },
        },
        {
          provide: InvoicesService,
          useValue: {
            generatePDF: async (id: string, resolvedClinic: string) => {
              expect(id).toBe(invoiceId);
              expect(resolvedClinic).toBe(clinicId);
              await assertDocumentScope('Invoice');
              return Buffer.from('%PDF-generated-invoice');
            },
            findOne: async (id: string, resolvedClinic: string) => {
              expect(resolvedClinic).toBe(clinicId);
              return guarded.invoice.findUniqueOrThrow({
                where: { id, clinicId: resolvedClinic },
              });
            },
            uploadAndPersist: async (id: string, resolvedClinic: string) => {
              expect(resolvedClinic).toBe(clinicId);
              await assertDocumentScope('Invoice');
              await guarded.invoice.update({
                where: { id, clinicId: resolvedClinic },
                data: { pdfUrl: `synthetic-invoice/${id}.pdf` },
              });
            },
          },
        },
      ],
    }).compile();
    app = moduleFixture.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    await app.init();
    guarded = moduleFixture.get(PrismaService);
    tokenService = moduleFixture.get(PublicDocumentTokenService);
  });

  beforeEach(async () => {
    await resetDatabase();
    storedFiles.clear();
    const clinic = await factories.clinic();
    clinicId = clinic.id;
    const patient = await factories.patient(clinicId);
    const { user } = await factories.user({ clinicId });
    const appointment = await factories.appointment(
      patient.id,
      user.id,
      clinicId,
    );
    const invoice = await factories.invoice(patient.id, {
      clinicId,
      totalCents: 10000,
    });
    invoiceId = invoice.id;
    const prescription = await factories.prescription(
      appointment.id,
      patient.id,
      user.id,
      { clinicId },
    );
    prescriptionId = prescription.id;
    const session = await raw.paymentSession.create({
      data: {
        clinicId,
        patientId: patient.id,
        invoiceId,
        provider: 'razorpay',
        amount: 10000,
        currency: 'INR',
        status: 'CREATED',
        shortUrl: 'https://rzp.io/l/public-capability',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    sessionId = session.id;
    const otherClinic = await factories.clinic();
    const otherPatient = await factories.patient(otherClinic.id);
    const { user: otherDoctor } = await factories.user({
      clinicId: otherClinic.id,
    });
    const otherAppointment = await factories.appointment(
      otherPatient.id,
      otherDoctor.id,
      otherClinic.id,
    );
    await factories.invoice(otherPatient.id, { clinicId: otherClinic.id });
    await factories.prescription(
      otherAppointment.id,
      otherPatient.id,
      otherDoctor.id,
      { clinicId: otherClinic.id },
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
    if (admin) {
      for (const table of ['PaymentSession', 'Invoice', 'Prescription']) {
        await admin.query(
          `DROP POLICY IF EXISTS tenant_isolation ON "${table}"`,
        );
      }
      await admin.query(`DROP OWNED BY ${appRole}`);
      await admin.query(`DROP ROLE ${appRole}`);
      await admin.end();
    }
    jest.restoreAllMocks();
  });

  it('redirects an anonymous active payment capability with the real tenant extension enabled', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/public/patient/pay/${sessionId}`)
      .expect(302)
      .expect('Location', 'https://rzp.io/l/public-capability');
    await expect(
      guarded.paymentSession.findUnique({ where: { id: sessionId } }),
    ).rejects.toThrow(/without a valid tenant context/);
  });

  it('returns 404 for an unknown payment capability rather than a tenant-context 500', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/public/patient/pay/synthetic-invalid-capability')
      .expect(404);
  });

  it.each([
    PaymentSessionStatus.CAPTURED,
    PaymentSessionStatus.PAID,
    PaymentSessionStatus.EXPIRED,
    PaymentSessionStatus.CANCELLED,
  ])('denies a %s payment capability without redirecting', async (status) => {
    await raw.paymentSession.update({
      where: { id: sessionId },
      data: { status },
    });
    await request(app.getHttpServer())
      .get(`/api/v1/public/patient/pay/${sessionId}`)
      .expect(404);
  });

  it.each(['prescription', 'invoice'] as const)(
    'serves a stored %s PDF only after verifying its capability',
    async (type) => {
      const id = type === 'prescription' ? prescriptionId : invoiceId;
      const key = `synthetic/${type}/${id}.pdf`;
      const expectedPdf = Buffer.from(`%PDF-stored-${type}`);
      storedFiles.set(key, expectedPdf);
      if (type === 'prescription') {
        await raw.prescription.update({ where: { id }, data: { pdfUrl: key } });
      } else {
        await raw.invoice.update({ where: { id }, data: { pdfUrl: key } });
      }
      const route = type === 'prescription' ? 'rx' : 'inv';
      const token = tokenService.sign(type, id);
      const response = await request(app.getHttpServer())
        .get(`/api/v1/public/patient/${route}/${token}/pdf`)
        .expect(200)
        .expect('Content-Type', /application\/pdf/)
        .expect('Cache-Control', /no-store/);
      expect(response.body).toEqual(expectedPdf);
      const forged = `${Buffer.from(`${type}:another-tenant-document`).toString('base64url')}.${token.split('.')[1]}`;
      await request(app.getHttpServer())
        .get(`/api/v1/public/patient/${route}/${forged}/pdf`)
        .expect(400);
    },
  );

  it.each(['prescription', 'invoice'] as const)(
    'generates an anonymous %s PDF inside the resolved tenant and RLS transaction',
    async (type) => {
      const id = type === 'prescription' ? prescriptionId : invoiceId;
      const route = type === 'prescription' ? 'rx' : 'inv';
      const token = tokenService.sign(type, id);
      const response = await request(app.getHttpServer())
        .get(`/api/v1/public/patient/${route}/${token}/pdf`)
        .expect(200);
      expect(response.body).toEqual(Buffer.from(`%PDF-generated-${type}`));
      if (type === 'invoice') {
        const invoice = await raw.invoice.findUniqueOrThrow({
          where: { id },
          select: { pdfUrl: true },
        });
        expect(invoice.pdfUrl).toBe(`synthetic-invoice/${id}.pdf`);
      }
    },
  );
});
