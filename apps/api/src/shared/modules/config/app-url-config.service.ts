import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';
import { resolveCurrencyFromLocale } from './app-config-currency.helpers';
import { emailLinkBaseUrlFromAppUrl } from './app-config-url.helpers';
import { getSharedCookieDomainFromConfig } from './app-configuration-values';
import { EnvironmentConfigService } from './environment-config.service';

@Injectable()
export class AppUrlConfigService {
  constructor(private readonly environmentConfig: EnvironmentConfigService) {}

  getAppUrl(): string {
    return getEnv().APP_URL;
  }

  getEmailLinkBaseUrl(): string {
    return emailLinkBaseUrlFromAppUrl(
      this.getAppUrl(),
      this.environmentConfig.isDevelopment(),
    );
  }

  getFrontendAppUrl(): string {
    return getEnv().FRONTEND_URL;
  }

  getApiUrl(): string {
    return getEnv().API_PUBLIC_URL;
  }

  /**
   * Partner self-service portal URL. Defaults to the frontend app URL with
   * `/partner` appended, but can be overridden via `PARTNER_PORTAL_URL` env
   * (useful if the partner portal is ever hosted on a separate subdomain).
   */
  getPartnerPortalUrl(): string {
    const override = getEnv().PARTNER_PORTAL_URL;
    if (override && override.length > 0) {
      return override.replace(/\/$/, '');
    }
    return `${this.getFrontendAppUrl().replace(/\/$/, '')}/partner`;
  }

  getSharedCookieDomain(): string | undefined {
    return getSharedCookieDomainFromConfig(getEnv());
  }

  getCurrencyCode(acceptLanguage?: string): string {
    return resolveCurrencyFromLocale(acceptLanguage);
  }

  getPort(): number {
    return getEnv().PORT;
  }
}
