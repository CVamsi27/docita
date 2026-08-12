import { Module } from '@nestjs/common';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { TurnstileSiteverifyClient } from './turnstile-siteverify.client';
import { TurnstileVerifyService } from './turnstile-verify.service';

/**
 * Cloudflare Turnstile verification, shared by the public-booking surface and
 * the auth surface (P5.17). Promoted from `domains/public-booking` so the
 * auth module can consume it without a cross-domain import.
 */
@Module({
  imports: [AppConfigModule],
  providers: [TurnstileSiteverifyClient, TurnstileVerifyService],
  exports: [TurnstileVerifyService],
})
export class TurnstileModule {}
