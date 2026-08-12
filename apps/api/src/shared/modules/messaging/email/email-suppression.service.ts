import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { EmailSuppressionReason } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';

/** Normalises an email for stable hashing/matching. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Opaque, non-PHI key for an address (sha256 of the normalised email). */
function hashEmail(email: string): string {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex');
}

/** `j***@example.com` — enough for operators to recognise, not full PHI. */
export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.indexOf('@');
  if (at <= 0) return '***';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at);
  const head = local.slice(0, 1);
  return `${head}***${domain}`;
}

/**
 * Tracks email addresses we must not send to again (hard bounces, spam
 * complaints, unsubscribes), populated from the ESP delivery webhook and
 * consulted by {@link EmailService} before every send.
 */
@Injectable()
export class EmailSuppressionService {
  private readonly logger = new Logger(EmailSuppressionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async isSuppressed(email: string): Promise<boolean> {
    if (!email) return false;
    try {
      const hit = await this.prisma.emailSuppression.findUnique({
        where: { emailHash: hashEmail(email) },
        select: { id: true },
      });
      return hit !== null;
    } catch (error) {
      // Fail open: a suppression-lookup failure must not block legitimate mail.
      this.logger.warn(
        `Email suppression lookup failed (allowing send): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  async recordSuppression(
    email: string,
    reason: EmailSuppressionReason,
    detail?: string,
    provider = 'zeptomail',
  ): Promise<void> {
    const emailHash = hashEmail(email);
    await this.prisma.emailSuppression.upsert({
      where: { emailHash },
      create: {
        emailHash,
        maskedEmail: maskEmail(email),
        reason,
        detail,
        provider,
      },
      update: { reason, detail, provider },
    });
    this.logger.log(
      `Email suppressed (${reason}) for ${maskEmail(email)} via ${provider}`,
    );
  }
}
