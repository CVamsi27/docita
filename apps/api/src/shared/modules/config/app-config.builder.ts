// Shared `AppConfigService` builder used by the API entrypoint and the
// background worker. The composition of 12 focused config services was
// previously duplicated between `apps/api/src/main.ts` and
// `apps/worker/src/main.ts` — adding a new env-backed config meant
// updating both files (and the worker, which boots before the API
// container, was easy to miss).
//
// Now both entrypoints import `buildAppConfigService` from this module so
// the construction graph is single-sourced. Test code can also import the
// builder and stub any leaf service with the real `AppConfigService`
// constructor (the type is exported by `@workspace/types` indirectly via
// the `app-configuration.service` module).

import { AppConfigService } from './app-configuration.service';
import { AppUrlConfigService } from './app-url-config.service';
import { AuthSecurityConfigService } from './auth-security-config.service';
import { CommunicationConfigService } from './communication-config.service';
import { EmailConfigService } from './email-config.service';
import { EnvironmentConfigService } from './environment-config.service';
import { ExternalIntegrationsConfigService } from './external-integrations-config.service';
import { OpsConfigService } from './ops-config.service';
import { PaymentConfigService } from './payment-config.service';
import { PlatformInfrastructureConfigService } from './platform-infrastructure-config.service';
import { RazorpayConfigService } from './razorpay-config.service';
import { SmsConfigService } from './sms-config.service';
import { StorageConfigService } from './storage-config.service';
import { WhatsappConfigService } from './whatsapp-config.service';

/**
 * Build the canonical `AppConfigService` tree. Both `apps/api/src/main.ts`
 * and `apps/worker/src/main.ts` call this at process start before the
 * Nest container exists, so all sub-services are constructed by hand.
 *
 * Adding a new env-backed setting: extend the `AppConfigService` constructor
 * here in lockstep with the relevant `*ConfigService` leaf — the API and
 * worker will pick it up on the next deploy.
 */
export function buildAppConfigService(): AppConfigService {
  const env = new EnvironmentConfigService();
  return new AppConfigService(
    env,
    new AppUrlConfigService(env),
    new StorageConfigService(),
    new AuthSecurityConfigService(),
    new CommunicationConfigService(
      new EmailConfigService(),
      new SmsConfigService(),
      new WhatsappConfigService(),
    ),
    new PaymentConfigService(
      new RazorpayConfigService(),
      new OpsConfigService(),
    ),
    new PlatformInfrastructureConfigService(),
    new ExternalIntegrationsConfigService(),
  );
}
