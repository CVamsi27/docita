import {
  Inject,
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { nanoid } from 'nanoid';
import { EmailService } from '@/shared/modules/messaging/email/email.service';

@Injectable()
export class AuthEmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async sendVerificationEmail(userId: string): Promise<{ message: string }> {
    // RLS-BYPASS: auth resolves users before clinic tenant context is established
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, emailVerified: true },
      });

      if (!user) throw new BadRequestException('User not found');

      if (user.emailVerified)
        throw new BadRequestException('Email is already verified');

      const token = nanoid(64);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: token,
          emailVerificationExpiresAt: new Date(
            this.clock.now().getTime() + 24 * 60 * 60 * 1000,
          ),
        },
      });

      const result = await this.emailService.sendVerificationEmail(
        user.email,
        user.name,
        token,
      );

      if (!result.success)
        throw new ServiceUnavailableException(
          'We could not send the verification email right now. Please try again.',
        );

      return { message: 'Verification email sent' };
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    // RLS-BYPASS: auth resolves users before clinic tenant context is established
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpiresAt: { gt: this.clock.now() },
          emailVerified: false,
        },
        select: { id: true },
      });

      if (!user)
        throw new BadRequestException('Invalid or expired verification token');

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      });

      return { message: 'Email verified successfully' };
    });
  }
}
