import { Test } from '@nestjs/testing';
import { PrismaClient, createUtcPoolConfig } from '@workspace/db';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { lastValueFrom, of } from 'rxjs';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { rlsRoutingExtension } from '@/shared/common/extensions/rls-routing.extension';
import { applyRlsScope } from '@/shared/modules/rls/apply-rls-scope';
import {
  activeTxStorage,
  runWithActiveTx,
} from '@/shared/modules/rls/active-tx.storage';
import { PatientDataAuditInterceptor } from '@/shared/common/interceptors/patient-audit.interceptor';
import { clockPortTestProvider } from '@/test-utils';
import { closeDatabase, resetDatabase, setupTestDatabase } from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const withRouting = (client: PrismaClient) =>
  client.$extends(rlsRoutingExtension);

describe('Awaited audit transaction ownership (real PostgreSQL)', () => {
  let owner: ReturnType<typeof setupTestDatabase>;
  let raw: PrismaClient;
  let audit: AuditService;
  let clinicId: string;
  let otherClinicId: string;
  let userId: string;

  beforeAll(async () => {
    // setupTestDatabase resets its target; this extra guard restricts this DDL
    // and role/policy regression to the documented disposable local database.
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/docita_test'
    ) {
      throw new Error(
        'Audit transaction regression requires loopback docita_test',
      );
    }
    owner = setupTestDatabase();
    setPrismaInstance(owner);
    await owner.$executeRawUnsafe(`DO $$ BEGIN
      CREATE ROLE docita_audit_tx_test NOLOGIN NOSUPERUSER NOBYPASSRLS;
      EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`);
    await owner.$executeRawUnsafe(
      'GRANT USAGE ON SCHEMA public TO docita_audit_tx_test',
    );
    await owner.$executeRawUnsafe(
      'GRANT SELECT, INSERT, UPDATE ON "Clinic", "User", "AuditLog" TO docita_audit_tx_test',
    );
    await owner.$executeRawUnsafe(
      'ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY',
    );
    await owner.$executeRawUnsafe(`CREATE POLICY audit_tx_test ON "AuditLog"
      TO docita_audit_tx_test
      USING (current_setting('app.rls_enabled', true) IS DISTINCT FROM 'on'
        OR "clinicId" = current_setting('app.current_clinic_id', true))
      WITH CHECK (current_setting('app.rls_enabled', true) IS DISTINCT FROM 'on'
        OR "clinicId" = current_setting('app.current_clinic_id', true))`);

    const pool = new Pool(
      createUtcPoolConfig({
        connectionString: process.env.DATABASE_URL,
        max: 2,
        connectionTimeoutMillis: 500,
        options: '-c role=docita_audit_tx_test',
      }),
    );
    raw = new PrismaClient({
      adapter: new PrismaPg(pool, { disposeExternalPool: true }),
    });
    const roles = await raw.$queryRaw<
      Array<{
        rolname: string;
        rolsuper: boolean;
        rolbypassrls: boolean;
      }>
    >`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
    expect(roles).toEqual([
      {
        rolname: 'docita_audit_tx_test',
        rolsuper: false,
        rolbypassrls: false,
      },
    ]);
    const client = withRouting(raw);
    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        clockPortTestProvider(),
        {
          provide: PrismaService,
          useValue: Object.assign(client, {
            runUnrestricted: <T>(fn: () => Promise<T>) => fn(),
          }),
        },
      ],
    }).compile();
    audit = module.get(AuditService);
  });

  beforeEach(async () => {
    await resetDatabase();
    clinicId = (await factories.clinic()).id;
    otherClinicId = (await factories.clinic()).id;
    userId = (await factories.user({ clinicId })).user.id;
  });

  afterAll(async () => {
    if (raw) await raw.$disconnect();
    if (owner) {
      await owner.$executeRawUnsafe(
        'DROP POLICY IF EXISTS audit_tx_test ON "AuditLog"',
      );
      await owner.$executeRawUnsafe(
        'ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY',
      );
    }
    await closeDatabase();
  });

  const logData = () => ({
    clinicId,
    userId,
    actionType: 'VIEW_PROFILE',
    resourceType: 'Patient',
    resourceId: 'synthetic',
  });

  it('completes concurrent awaited audits when request transactions fill the pool', async () => {
    const full = deferred();
    let entered = 0;
    const results = await Promise.allSettled(
      Array.from({ length: 2 }, () =>
        raw.$transaction(
          async (tx) => {
            await applyRlsScope(tx, clinicId);
            entered += 1;
            if (entered === 2) full.resolve();
            await full.promise;
            await runWithActiveTx(tx, () => audit.logAction(logData()));
          },
          { timeout: 5_000 },
        ),
      ),
    );
    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'fulfilled',
    ]);
    expect(await owner.auditLog.count()).toBe(2);
  });

  it('rolls back the business write and awaited audit together', async () => {
    await expect(
      raw.$transaction(async (tx) => {
        await applyRlsScope(tx, clinicId);
        await runWithActiveTx(tx, async () => {
          await tx.clinic.update({
            where: { id: clinicId },
            data: { name: 'rolled back' },
          });
          await audit.logAction(logData());
          throw new Error('rollback');
        });
      }),
    ).rejects.toThrow('rollback');
    expect(
      (await owner.clinic.findUniqueOrThrow({ where: { id: clinicId } })).name,
    ).not.toBe('rolled back');
    expect(await owner.auditLog.count()).toBe(0);
  });

  it('propagates audit validation failure and rolls back the business write', async () => {
    await expect(
      raw.$transaction(async (tx) => {
        await applyRlsScope(tx, clinicId);
        await runWithActiveTx(tx, async () => {
          await tx.clinic.update({
            where: { id: clinicId },
            data: { name: 'rolled back' },
          });
          await audit.logAction({ ...logData(), userId: 'missing-user' });
        });
      }),
    ).rejects.toThrow('User missing-user not found');
    expect(
      (await owner.clinic.findUniqueOrThrow({ where: { id: clinicId } })).name,
    ).not.toBe('rolled back');
    expect(await owner.auditLog.count()).toBe(0);
  });

  it('does not let an awaited audit escape its database tenant policy', async () => {
    await expect(
      raw.$transaction(async (tx) => {
        await applyRlsScope(tx, clinicId);
        await runWithActiveTx(tx, () =>
          audit.logAction({ ...logData(), clinicId: otherClinicId }),
        );
      }),
    ).rejects.toThrow();
    expect(await owner.auditLog.count()).toBe(0);
  });

  it('lets explicitly detached work outlive the request transaction', async () => {
    const responseSent = deferred();
    const interceptor = new PatientDataAuditInterceptor(audit);
    const originalLogAction = audit.logAction.bind(audit);
    let background: Promise<void> = Promise.resolve();
    let inheritedRequestTx = true;
    // Delay only the background start; persistence, ALS, routing and the pool
    // remain real so using a completed request tx fails this regression.
    const delayed = jest
      .spyOn(audit, 'logAction')
      .mockImplementation((data) => {
        inheritedRequestTx = Boolean(activeTxStorage.getStore()?.tx);
        background = responseSent.promise.then(() => originalLogAction(data));
        return background;
      });
    try {
      await raw.$transaction(async (tx) => {
        await applyRlsScope(tx, clinicId);
        await runWithActiveTx(tx, async () => {
          const context = new ExecutionContextHost([
            {
              user: { id: userId, clinicId, role: 'ADMIN_DOCTOR' },
              method: 'PATCH',
              url: '/patients/synthetic',
              params: { id: 'synthetic' },
              query: {},
              body: {},
              headers: {},
            },
          ]);
          await lastValueFrom(
            interceptor.intercept(context, { handle: () => of({ ok: true }) }),
          );
        });
      });
      responseSent.resolve();
      await background;
      expect(inheritedRequestTx).toBe(false);
      expect(await owner.auditLog.count()).toBe(1);
    } finally {
      responseSent.resolve();
      delayed.mockRestore();
    }
  });
});
