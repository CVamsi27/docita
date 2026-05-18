/** Pure onboarding helpers — no @Injectable, no DI. */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UploadSessionPurpose } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { UploadsService } from '@/domains/documents/application/services/uploads.service';

/**
 * Returns true if any clinic linked to a user with the given email has
 * a `paid` SubscriptionPayment on record. Used to gate the free-trial
 * offer so each customer can only consume it once.
 */
export async function hasPriorPaidSubscriptionForEmail(
  prisma: PrismaService,
  email: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return prisma.runUnrestricted(async () => {
    const users = await prisma.user.findMany({
      where: { email: normalized },
      select: { clinicId: true },
    });
    const clinicIds = users
      .map((u) => u.clinicId)
      .filter((id): id is string => !!id);
    if (clinicIds.length === 0) return false;
    const paid = await prisma.subscriptionPayment.findFirst({
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
  prisma: PrismaService,
  uploadsService: UploadsService,
  onboardingId: string,
  sessionId: string,
  file: Express.Multer.File,
  uploadSecret: string,
  context?: {
    modifiedBy?: string;
    modifiedByRole?: string;
    ipAddress?: string;
    userAgent?: string;
  },
) {
  const session = await prisma.uploadSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new NotFoundException('Signature session not found');
  }
  if (session.expiresAt < new Date()) {
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
  await prisma.uploadSession.update({
    where: { id: sessionId },
    data: { expiresAt: new Date() },
  });

  return updated;
}

/** Returns the upload/upload status of a signature session. */
export async function getSlaSignatureSessionStatus(
  prisma: PrismaService,
  onboardingId: string,
  sessionId: string,
): Promise<{ status: string; uploaded: boolean; fileUrl: string | null }> {
  void onboardingId;
  const session = await prisma.uploadSession.findUnique({
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
