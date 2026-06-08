import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';
import { resolveCurrencyFromLocale } from './app-config-currency.helpers';
import { emailLinkBaseUrlFromAppUrl } from './app-config-url.helpers';
import { getSharedCookieDomainFromConfig } from './app-configuration-values';
import { EnvironmentConfigService } from './environment-config.service';

@Injectable()
export class AppUrlConfigService {
  constructor(
    private readonly environmentConfig: EnvironmentConfigService,
  ) {}

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
    return getEnv().NEXT_PUBLIC_APP_URL;
  }

  getApiUrl(): string {
    return getEnv().NEXT_PUBLIC_API_URL;
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
