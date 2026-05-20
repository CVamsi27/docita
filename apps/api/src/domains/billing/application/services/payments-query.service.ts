import {
  Injectable,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/payment-session.repository';

@Injectable()
export class PaymentsQueryService {
  constructor(
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly repository: IPaymentSessionRepository,
  ) {}

  async verifySessionOwnership(sessionId: string, clinicId: string) {
    const session = await this.repository.findById(sessionId, clinicId);
    if (!session) {
      throw new BadRequestException(
        'Payment session not found or access denied',
      );
    }
    return session;
  }

  async getPaymentSession(sessionId: string, clinicId: string) {
    const session = await this.repository.findById(sessionId, clinicId);
    if (!session) {
      throw new BadRequestException('Payment session not found');
    }
    return session;
  }
}
