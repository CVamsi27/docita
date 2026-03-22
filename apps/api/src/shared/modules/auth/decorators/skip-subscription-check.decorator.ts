import { SetMetadata } from '@nestjs/common';
import { SKIP_SUBSCRIPTION_CHECK_KEY } from '@/shared/modules/auth/guards/subscription-status.guard';

export const SkipSubscriptionCheck = () =>
  SetMetadata(SKIP_SUBSCRIPTION_CHECK_KEY, true);
