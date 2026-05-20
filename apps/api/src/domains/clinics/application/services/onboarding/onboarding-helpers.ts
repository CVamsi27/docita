/** Pure onboarding helpers — no @Injectable, no DI. */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UploadSessionPurpose } from '@workspace/db';
import { type ClinicPersistencePort } from '@/domains/clinics/application/ports/clinic-persistence.port';
import { UploadsService } from '@/domains/documents/application/services/uploads.service';

/**
 * Returns true if any clinic linked to a user with the given email has
 * a `paid` SubscriptionPayment on record. Used to gate the free-trial
 * offer so each customer can only consume it once.
 */
export async function hasPriorPaidSubscriptionForEmail(
  persistence: ClinicPersistencePort,
  email: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return persistence.runUnrestricted(async () => {
    const users = await persistence.user.findMany({
      where: { email: normalized },
      select: { clinicId: true },
    });
    const clinicIds = users
      .map((u) => u.clinicId)
      .filter((id): id is string => !!id);
    if (clinicIds.length === 0) return false;
    const paid = await persistence.subscriptionPayment.findFirst({
      where: { clinicId: { in: clinicIds }, status: 'paid' },
      select: { id: true },
    });
    return !!paid;
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
