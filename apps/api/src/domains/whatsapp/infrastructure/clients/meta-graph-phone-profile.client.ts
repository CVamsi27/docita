import { Injectable } from '@nestjs/common';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import { isRecord } from '@workspace/utils';

type MetaPhoneNumberProfile = {
  verified_name?: string;
  display_phone_number?: string;
  error?: { message?: string };
};

@Injectable()
export class MetaGraphPhoneProfileClient {
  private readonly apiVersion = 'v21.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  async fetchPhoneNumberProfile(
    phoneNumberId: string,
    accessToken: string,
  ): Promise<{ ok: boolean; data: MetaPhoneNumberProfile }> {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}?fields=verified_name,display_phone_number`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const raw: unknown = await response.json();
    const data: MetaPhoneNumberProfile = isRecord(raw)
      ? {
          verified_name:
            typeof raw.verified_name === 'string'
              ? raw.verified_name
              : undefined,
          display_phone_number:
            typeof raw.display_phone_number === 'string'
              ? raw.display_phone_number
              : undefined,
          error: isRecord(raw.error)
            ? {
                message:
                  typeof raw.error.message === 'string'
                    ? raw.error.message
                    : undefined,
              }
            : undefined,
        }
      : {};
    return { ok: response.ok, data };
  }
}
