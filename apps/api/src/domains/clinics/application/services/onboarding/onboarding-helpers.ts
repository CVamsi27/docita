/** Pure onboarding helpers — no @Injectable, no DI. */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UploadSessionPurpose } from '@workspace/db';
import { type ClinicPersistencePort } from '@/domains/clinics/application/ports/clinic-persistence.port';
import { UploadsService } from '@/domains/documents/application/services/uploads.service';

/**
 * Returns true if any clinic linked to a user with the given email already has
 * a Subscription on record — trial OR paid. Used to enforce the once-per-account
 * free trial: an email that has ever onboarded (including a lapsed 30-day trial
 * with no payment) must use checkout instead of starting another free trial.
 */
export async function hasPriorSubscriptionForEmail(
  persistence: ClinicPersistencePort,
  email: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  // RLS-BYPASS: onboarding creates clinic records before membership tenant binding
  return persistence.runUnrestricted(async () => {
    const users = await persistence.user.findMany({
      where: { email: normalized },
      select: { clinicId: true },
    });
    const clinicIds = users
      .map((u) => u.clinicId)
      .filter((id): id is string => !!id);
    if (clinicIds.length === 0) return false;
    const existing = await persistence.subscription.findFirst({
      where: { clinicId: { in: clinicIds } },
      select: { id: true },
    });
    return !!existing;
  });
}

/** Creates a new upload session for an SLA signature. */
export async function createSlaSignatureSession(
  onboardingId: string,
  uploadsService: UploadsService,
) {
  void onboardingId;
  return uploadsService.createSession({
    expiresInMinutes: 20,
    purpose: UploadSessionPurpose.GENERAL,
  });
}

/** Handles the multipart SLA signature upload; invalidates the session after upload. */
export async function uploadSlaSignature(
  persistence: ClinicPersistencePort,
  uploadsService: UploadsService,
  onboardingId: string,
  sessionId: string,
  file: Express.Multer.File,
  uploadSecret: string,
  now: Date,
  context?: {
    modifiedBy?: string;
    modifiedByRole?: string;
    ipAddress?: string;
    userAgent?: string;
  },
) {
  const session = await persistence.uploadSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new NotFoundException('Signature session not found');
  }
  if (session.expiresAt < now) {
    throw new BadRequestException(
      'This signature link has expired. Please generate a new link from onboarding.',
    );
  }
  if (session.status === 'uploaded' && session.fileUrl) {
    throw new BadRequestException('This signature link has already been used.');
  }

  const updated = await uploadsService.updateSession(sessionId, file, {
    onboardingId,
    modifiedBy: context?.modifiedBy,
    modifiedByRole: context?.modifiedByRole,
    authMethod: context?.modifiedBy ? 'session-auth' : 'onboarding-session',
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
    uploadSecret,
  });

  // One-time onboarding signature links should not be reused after upload.
  await persistence.uploadSession.update({
    where: { id: sessionId },
    data: { expiresAt: now },
  });

  return updated;
}

/** Returns the upload/upload status of a signature session. */
export async function getSlaSignatureSessionStatus(
  persistence: ClinicPersistencePort,
  onboardingId: string,
  sessionId: string,
): Promise<{ status: string; uploaded: boolean; fileUrl: string | null }> {
  void onboardingId;
  const session = await persistence.uploadSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new NotFoundException('Signature session not found');
  if (session.purpose !== UploadSessionPurpose.GENERAL) {
    throw new NotFoundException('Signature session not found');
  }
  return {
    status: session.status,
    uploaded: session.status === 'uploaded' || !!session.fileUrl,
    fileUrl: session.fileUrl,
  };
}
