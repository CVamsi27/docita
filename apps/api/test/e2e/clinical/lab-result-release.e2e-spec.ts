import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { LabResultNotificationStatus, LabTestOrderStatus } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { LabResultReleaseService } from '@/domains/clinical/application/services/lab-result-release.service';
import { PrismaLabRepository } from '@/domains/clinical/infrastructure/persistence/prisma-lab.repository';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

/**
 * Q02 — lab result release authorization and notification durability.
 *
 * Service-level tests cannot prove the claim: the guarantee is that two callers
 * racing on one row produce exactly one release and exactly one patient
 * notification, which only a real conditional UPDATE can establish.
 */
describe('Lab result release (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let releaseService: LabResultReleaseService;
  let labRepository: PrismaLabRepository;
  let sendMessage: {
    execute: jest.Mock<
      ReturnType<SendMessageUseCase['execute']>,
      Parameters<SendMessageUseCase['execute']>
    >;
  };

  beforeAll(async () => {
    setupTestDatabase();

    // The claim is what is under test, so the workflow repository stays real and
    // only the outbound message transport is replaced: sends become countable
    // while the conditional UPDATE runs against real Postgres.
    sendMessage = {
      execute: jest.fn(async (_request) => ({
        messageId: 'm1',
        providerMessageId: 'p1',
      })),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(SendMessageUseCase)
      .useValue(sendMessage)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    releaseService = moduleFixture.get(LabResultReleaseService);
    labRepository = moduleFixture.get(PrismaLabRepository);
    setPrismaInstance(prisma);
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    sendMessage.execute.mockClear();
    sendMessage.execute.mockResolvedValue({
      messageId: 'm1',
      providerMessageId: 'p1',
    });
  });

  /** Builds a releasable order: result uploaded, payment verified, not released. */
  const seedReleasableOrder = async (
    overrides: { phoneNumber?: string | null } = {},
  ): Promise<{ orderId: string; clinicId: string }> => {
    const clinic = await factories.clinic();
    const patient = await factories.patient(clinic.id, {
      phoneNumber:
        overrides.phoneNumber === undefined
          ? '+919999999999'
          : overrides.phoneNumber,
    });
    const labTest = await prisma.labTest.create({
      data: {
        clinicId: clinic.id,
        name: 'CBC',
        category: 'Haematology',
        price: 500,
      },
    });

    const order = await prisma.labTestOrder.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        labTestId: labTest.id,
        status: LabTestOrderStatus.RESULT_READY,
        orderedBy: 'user-1',
        resultUrl: 'lab-results/order.pdf',
        resultUploadedBy: 'user-1',
        resultUploadedAt: new Date('2026-10-03T10:00:00.000Z'),
        paidAt: new Date('2026-10-03T10:30:00.000Z'),
        paymentVerifiedBy: 'user-1',
        paymentMethod: 'CASH',
      },
    });

    return { orderId: order.id, clinicId: clinic.id };
  };

  describe('release claim', () => {
    it('releases exactly once when two callers race the same order', async () => {
      const { orderId, clinicId } = await seedReleasableOrder();

      const [first, second] = await Promise.all([
        releaseService.releaseResult({
          orderId,
          clinicId,
          releasedBy: 'clinician-a',
        }),
        releaseService.releaseResult({
          orderId,
          clinicId,
          releasedBy: 'clinician-b',
        }),
      ]);

      const outcomes = [first, second].sort();
      expect(outcomes).toEqual(['ALREADY_RELEASED', 'RELEASED_AND_NOTIFIED']);

      // The single effect: one notification attempt, not two.
      expect(sendMessage.execute).toHaveBeenCalledTimes(1);

      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.status).toBe(LabTestOrderStatus.COMPLETED);
      expect(row.resultNotificationStatus).toBe(
        LabResultNotificationStatus.SENT,
      );
      expect(row.resultNotificationAttempts).toBe(1);
      // The winning clinician is recorded, so the audit trail names one person.
      expect(['clinician-a', 'clinician-b']).toContain(row.releasedBy);
    });

    it('is a no-op for a third caller after the release settled', async () => {
      const { orderId, clinicId } = await seedReleasableOrder();

      await releaseService.releaseResult({
        orderId,
        clinicId,
        releasedBy: 'clinician-a',
      });
      const again = await releaseService.releaseResult({
        orderId,
        clinicId,
        releasedBy: 'clinician-c',
      });

      expect(again).toBe('ALREADY_RELEASED');
      expect(sendMessage.execute).toHaveBeenCalledTimes(1);
    });

    it('does not release an order that is already cancelled', async () => {
      const { orderId, clinicId } = await seedReleasableOrder();
      await prisma.labTestOrder.update({
        where: { id: orderId },
        data: { status: LabTestOrderStatus.CANCELLED },
      });

      const outcome = await releaseService.releaseResult({
        orderId,
        clinicId,
        releasedBy: 'clinician-a',
      });

      expect(outcome).toBe('ALREADY_RELEASED');
      expect(sendMessage.execute).not.toHaveBeenCalled();
      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.status).toBe(LabTestOrderStatus.CANCELLED);
    });

    it('refuses a release addressed to the wrong clinic', async () => {
      const { orderId } = await seedReleasableOrder();
      const otherClinic = await factories.clinic();

      // Without the clinicId predicate the claim would match on id alone and
      // release another tenant's order.
      await expect(
        releaseService.releaseResult({
          orderId,
          clinicId: otherClinic.id,
          releasedBy: 'clinician-a',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.status).toBe(LabTestOrderStatus.RESULT_READY);
      expect(row.releasedAt).toBeNull();
      expect(sendMessage.execute).not.toHaveBeenCalled();
    });
  });

  describe('notification durability', () => {
    /**
     * The defect: a failed send was logged and the release still completed, so
     * the order read as handled while the patient was never told.
     */
    it('leaves a failed notification retryable rather than silently handled', async () => {
      const { orderId, clinicId } = await seedReleasableOrder();
      sendMessage.execute.mockRejectedValue(new Error('provider timeout'));

      const outcome = await releaseService.releaseResult({
        orderId,
        clinicId,
        releasedBy: 'clinician-a',
      });

      expect(outcome).toBe('RELEASED_NOTIFICATION_PENDING');

      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      // Released, but the notification is an outstanding obligation.
      expect(row.status).toBe(LabTestOrderStatus.COMPLETED);
      expect(row.resultNotificationStatus).toBe(
        LabResultNotificationStatus.FAILED,
      );
      expect(row.resultNotifiedAt).toBeNull();
      expect(row.resultNotificationLastError).toContain('provider timeout');
      // The claim is cleared so the row never reads as in-flight forever.
      expect(row.resultNotificationClaimToken).toBeNull();

      const pending = await releaseService.retryPendingNotifications();
      expect(pending.attempted).toBe(1);
    });

    it('recovers a notification that a crashed process left in SENDING', async () => {
      const { orderId, clinicId } = await seedReleasableOrder();
      // A live claim blocks takeover; an expired one does not.
      await prisma.labTestOrder.update({
        where: { id: orderId },
        data: {
          status: LabTestOrderStatus.COMPLETED,
          releasedAt: new Date('2026-10-03T11:00:00.000Z'),
          completedAt: new Date('2026-10-03T11:00:00.000Z'),
          releaseClaimToken: 'crashed-worker',
          resultNotificationStatus: LabResultNotificationStatus.SENDING,
          resultNotificationClaimToken: 'crashed-worker',
          resultNotificationClaimedAt: new Date('2026-10-03T11:00:00.000Z'),
        },
      });

      const result = await releaseService.retryPendingNotifications();

      // The lease is 5 minutes; the stale claim is minutes old.
      expect(result.notified).toBe(1);
      expect(sendMessage.execute).toHaveBeenCalledTimes(1);

      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.resultNotificationStatus).toBe(
        LabResultNotificationStatus.SENT,
      );
      expect(row.resultNotifiedAt).not.toBeNull();
    });

    it('does not steal a notification claim that is still live', async () => {
      const { orderId } = await seedReleasableOrder();
      // Another worker claimed this seconds ago and is mid-send.
      await prisma.labTestOrder.update({
        where: { id: orderId },
        data: {
          status: LabTestOrderStatus.COMPLETED,
          releasedAt: new Date('2026-10-03T11:00:00.000Z'),
          completedAt: new Date('2026-10-03T11:00:00.000Z'),
          releaseClaimToken: 'live-worker',
          resultNotificationStatus: LabResultNotificationStatus.SENDING,
          resultNotificationClaimToken: 'live-worker',
          resultNotificationClaimedAt: new Date(),
        },
      });

      const result = await releaseService.retryPendingNotifications();

      // Seen as pending, but the live lease belongs to the other worker.
      expect(result.notified).toBe(0);
      expect(sendMessage.execute).not.toHaveBeenCalled();

      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      // The live holder keeps its token and its attempt count.
      expect(row.resultNotificationClaimToken).toBe('live-worker');
      expect(row.resultNotificationAttempts).toBe(0);
    });

    it('does not re-notify an order that was already told', async () => {
      const { orderId, clinicId } = await seedReleasableOrder();
      await releaseService.releaseResult({
        orderId,
        clinicId,
        releasedBy: 'clinician-a',
      });
      sendMessage.execute.mockClear();

      const result = await releaseService.retryPendingNotifications();

      expect(result.attempted).toBe(0);
      expect(sendMessage.execute).not.toHaveBeenCalled();
    });

    it('marks a patient with no phone number as skipped, not outstanding', async () => {
      const { orderId, clinicId } = await seedReleasableOrder({
        phoneNumber: '',
      });

      await releaseService.releaseResult({
        orderId,
        clinicId,
        releasedBy: 'clinician-a',
      });

      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.resultNotificationStatus).toBe(
        LabResultNotificationStatus.SKIPPED_NO_CONTACT,
      );
      expect(sendMessage.execute).not.toHaveBeenCalled();
      // A skipped notification is settled, so the retry sweep leaves it alone.
      const result = await releaseService.retryPendingNotifications();
      expect(result.attempted).toBe(0);
    });

    it('treats a whitespace-only phone number as no contact', async () => {
      const { orderId, clinicId } = await seedReleasableOrder({
        phoneNumber: '   ',
      });

      await releaseService.releaseResult({
        orderId,
        clinicId,
        releasedBy: 'clinician-a',
      });

      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.resultNotificationStatus).toBe(
        LabResultNotificationStatus.SKIPPED_NO_CONTACT,
      );
      expect(sendMessage.execute).not.toHaveBeenCalled();
    });

    it('records a system actor when the release is automatic', async () => {
      const { orderId, clinicId } = await seedReleasableOrder();

      await releaseService.releaseResult({
        orderId,
        clinicId,
        releasedBy: 'SYSTEM:auto-release',
      });

      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.releasedBy).toBe('SYSTEM:auto-release');
    });
  });

  /**
   * The lease and token guards on the repository claims are the last line of
   * defence: the service reaches them only through paths that pre-filter. These
   * call the repository directly, because a guard that is only ever exercised
   * through a filtered path can be deleted without any test noticing.
   */
  describe('claim fencing at the repository boundary', () => {
    const LEASE = 5 * 60 * 1000;

    /** Marks an order released, with a SENDING notification claim held. */
    const seedHeldNotificationClaim = async (
      claimToken: string,
      claimedAt: Date,
    ): Promise<{ orderId: string; clinicId: string }> => {
      const { orderId, clinicId } = await seedReleasableOrder();
      await prisma.labTestOrder.update({
        where: { id: orderId },
        data: {
          status: LabTestOrderStatus.COMPLETED,
          releasedAt: new Date('2026-10-03T11:00:00.000Z'),
          completedAt: new Date('2026-10-03T11:00:00.000Z'),
          releaseClaimToken: 'holder',
          resultNotificationStatus: LabResultNotificationStatus.SENDING,
          resultNotificationClaimToken: claimToken,
          resultNotificationClaimedAt: claimedAt,
        },
      });
      return { orderId, clinicId };
    };

    it('refuses to take a notification claim that is still live', async () => {
      const { orderId, clinicId } = await seedHeldNotificationClaim(
        'live',
        new Date(),
      );

      const claimed = await labRepository.claimResultNotification(
        { id: orderId, clinicId, claimToken: 'thief', now: new Date() },
        new Date(Date.now() - LEASE),
      );

      expect(claimed).toBe(false);
      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.resultNotificationClaimToken).toBe('live');
    });

    it('takes a notification claim whose lease has expired', async () => {
      const { orderId, clinicId } = await seedHeldNotificationClaim(
        'dead',
        new Date(Date.now() - 2 * LEASE),
      );

      const claimed = await labRepository.claimResultNotification(
        { id: orderId, clinicId, claimToken: 'rescuer', now: new Date() },
        new Date(Date.now() - LEASE),
      );

      expect(claimed).toBe(true);
      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.resultNotificationClaimToken).toBe('rescuer');
    });

    it('ignores a late settle from a holder whose claim was taken over', async () => {
      const { orderId, clinicId } = await seedHeldNotificationClaim(
        'stale-holder',
        new Date(Date.now() - 2 * LEASE),
      );
      // The stale holder's lease expired, so a second worker took over and is
      // mid-send. The original process now wakes up and reports its outcome.
      const takenOver = await labRepository.claimResultNotification(
        { id: orderId, clinicId, claimToken: 'rescuer', now: new Date() },
        new Date(Date.now() - LEASE),
      );
      expect(takenOver).toBe(true);

      await labRepository.completeResultNotification(
        orderId,
        clinicId,
        'stale-holder',
        { status: 'SENT', now: new Date() },
      );

      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      // The winner keeps its claim and its in-flight state.
      expect(row.resultNotificationStatus).toBe(
        LabResultNotificationStatus.SENDING,
      );
      expect(row.resultNotificationClaimToken).toBe('rescuer');
      expect(row.resultNotifiedAt).toBeNull();
    });

    it('applies a settle sent by the caller that holds the claim', async () => {
      const { orderId, clinicId } = await seedHeldNotificationClaim(
        'real-holder',
        new Date(),
      );

      await labRepository.completeResultNotification(
        orderId,
        clinicId,
        'real-holder',
        { status: 'SENT', now: new Date() },
      );

      const row = await prisma.labTestOrder.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(row.resultNotificationStatus).toBe(
        LabResultNotificationStatus.SENT,
      );
      expect(row.resultNotifiedAt).not.toBeNull();
      expect(row.resultNotificationClaimToken).toBeNull();
    });

    it('refuses a release claim for an order in another clinic', async () => {
      const { orderId } = await seedReleasableOrder();
      const otherClinic = await factories.clinic();

      const claimed = await labRepository.claimRelease({
        id: orderId,
        clinicId: otherClinic.id,
        claimToken: 'cross-tenant',
        now: new Date(),
        releasedBy: 'clinician-a',
      });

      expect(claimed).toBe(false);
    });
  });
});
